'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { verifyRelease } = require('./verify-release.cjs');
const { cleanReleases, releaseDirectory } = require('./clean-releases.cjs');

// Prevent another build from publishing or being cleaned up while this one runs.
function acquireBuildLock(root) {
  const directory = path.join(root, '.build');
  fs.mkdirSync(directory, { recursive: true });
  if (fs.realpathSync(directory) !== directory) throw new Error('Le dossier .build doit rester dans le projet.');
  const lock = path.join(directory, 'windows-build.lock');
  let descriptor;
  try {
    descriptor = fs.openSync(lock, 'wx');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let pid;
    try { pid = JSON.parse(fs.readFileSync(lock, 'utf8')).pid; } catch {}
    if (!Number.isSafeInteger(pid) || pid <= 0) {
      throw new Error(`Verrou de compilation illisible : ${lock}. Fermez les compilations avant de retirer ce fichier.`);
    }
    try {
      process.kill(pid, 0);
    } catch (probe) {
      // A killed parent may leave electron-builder running. Never reclaim its lock automatically.
      if (probe.code === 'ESRCH') {
        throw new Error(`Une compilation interrompue a laissé ${lock}. Fermez tous les processus de compilation, puis retirez ce fichier avant de recommencer.`);
      }
    }
    throw new Error('Une compilation Windows est déjà en cours. Attendez sa fin avant de recommencer.');
  }
  try { fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid })); }
  finally { fs.closeSync(descriptor); }
  return () => {
    try { fs.unlinkSync(lock); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  };
}

function buildWindows({ root = path.resolve(__dirname, '..'), spawnSync = cp.spawnSync,
  verify = verifyRelease, logger = console } = {}) {
  root = fs.realpathSync(root);
  const unlock = acquireBuildLock(root);
  try {
    fs.mkdirSync(path.join(root, 'release-final'), { recursive: true });
    const destination = releaseDirectory(root);
    const runtime = path.join(root, '.build', 'electron-runtime');
    fs.mkdirSync(runtime, { recursive: true });
    // First installation on this PC already knows where subsequent builds appear.
    fs.writeFileSync(path.join(root, '.build', 'local-update-source.json'), JSON.stringify({
      directory: destination,
    }, null, 2) + '\n');
    // Keep the installed Electron runtime intact; do not ship its demonstration app.
    fs.cpSync(path.join(root, 'node_modules', 'electron', 'dist'), runtime, {
      recursive: true,
      filter: source => path.basename(source) !== 'default_app.asar',
    });
    const cli = path.join(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');
    const output = path.join(destination, 'build-' + Date.now());
    // Local builds never publish, even when GitHub credentials exist in the environment.
    const result = spawnSync(process.execPath, [
      cli, '--win', 'nsis', '--x64', '--publish', 'never',
      '--config.electronDist=' + runtime,
      '--config.directories.output=' + output,
    ], { stdio: 'inherit', env: process.env, cwd: root });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`La compilation Windows a échoué (code ${result.status ?? 'inconnu'}).`);

    const verified = verify(output);
    // Expose metadata last and atomically: a running game sees only a complete build.
    for (const file of verified.artifacts.filter(file => file !== 'latest.yml')) {
      fs.copyFileSync(path.join(output, file), path.join(destination, file));
    }
    const pendingManifest = path.join(destination, 'latest.yml.tmp');
    fs.copyFileSync(path.join(output, 'latest.yml'), pendingManifest);
    fs.renameSync(pendingManifest, path.join(destination, 'latest.yml'));
    logger.log(`Installateur Windows ${verified.version} vérifié : ${path.join(destination, verified.installer)}`);
    logger.log(`Fichiers de mise à jour : ${verified.artifacts.join(', ')}`);

    // Cleanup is deliberately last: failed builds leave the previous release available.
    try {
      const report = cleanReleases({ root, currentBuild: output, artifacts: verified.artifacts });
      logger.log(`Nettoyage : ${report.removed.length} anciens fichiers/dossiers supprimés, ${(report.removedBytes / 1024 ** 2).toFixed(1)} Mo libérés.`);
      for (const warning of report.warnings) logger.warn(`Ancien fichier conservé (nouvel essai au prochain build) : ${warning}`);
      return { ...verified, output, cleanup: report };
    } catch (error) {
      logger.warn(`Installateur créé ; nettoyage reporté au prochain build : ${error.message}`);
      return { ...verified, output, cleanup: null };
    }
  } finally {
    unlock();
  }
}

module.exports = { buildWindows };
if (require.main === module) {
  try { buildWindows(); }
  catch (error) {
    console.error('La fabrication de l’installateur a échoué :', error.message);
    process.exitCode = 1;
  }
}
