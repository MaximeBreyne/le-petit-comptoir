'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { verifyRelease } = require('./verify-release.cjs');

const root = path.resolve(__dirname, '..');
process.chdir(root);
const runtime = path.join(root, '.build', 'electron-runtime');
fs.mkdirSync(runtime, { recursive: true });
// First installation on this PC already knows where subsequent builds appear.
fs.writeFileSync(path.join(root, '.build', 'local-update-source.json'), JSON.stringify({
  directory: path.join(root, 'release-final'),
}, null, 2) + '\n');
// Keep the installed Electron runtime intact; do not ship its demonstration app.
fs.cpSync(path.join(root, 'node_modules', 'electron', 'dist'), runtime, {
  recursive: true,
  filter: source => path.basename(source) !== 'default_app.asar',
});
const cli = path.join(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');
const destination = path.join(root, 'release-final');
const output = path.join(destination, 'build-' + Date.now());
// Local builds never publish, even when GitHub credentials exist in the environment.
const result = cp.spawnSync(process.execPath, [
  cli, '--win', 'nsis', '--x64', '--publish', 'never',
  '--config.electronDist=' + runtime,
  '--config.directories.output=' + output,
], { stdio: 'inherit', env: process.env });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

try {
  const verified = verifyRelease(output);
  // Expose metadata last and atomically: a running game sees only a complete build.
  for (const file of verified.artifacts.filter(file => file !== 'latest.yml')) {
    fs.copyFileSync(path.join(output, file), path.join(destination, file));
  }
  const pendingManifest = path.join(destination, 'latest.yml.tmp');
  fs.copyFileSync(path.join(output, 'latest.yml'), pendingManifest);
  fs.renameSync(pendingManifest, path.join(destination, 'latest.yml'));
  console.log(`Installateur Windows ${verified.version} vérifié : ${path.join(destination, verified.installer)}`);
  console.log(`Fichiers de mise à jour : ${verified.artifacts.join(', ')}`);
} catch (error) {
  console.error('La vérification de la publication a échoué :', error.message);
  process.exit(1);
}
