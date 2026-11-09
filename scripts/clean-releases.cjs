'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const buildName = /^build-\d+$/;
const installerName = /^Le-Petit-Comptoir-Bar-\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?-Setup\.exe$/;

function assertOrdinaryPath(target, directory) {
  const info = fs.lstatSync(target);
  if (info.isSymbolicLink() || fs.realpathSync(target) !== target ||
      (directory ? !info.isDirectory() : !info.isFile())) {
    throw new Error(`Chemin de compilation inhabituel, conservé : ${target}`);
  }
  return info;
}

function releaseDirectory(root) {
  const destination = path.join(fs.realpathSync(root), 'release-final');
  assertOrdinaryPath(destination, true);
  return destination;
}

function checksum(file) {
  const hash = crypto.createHash('sha512');
  const descriptor = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let length;
    while ((length = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, length));
    }
    return hash.digest('hex');
  } finally {
    fs.closeSync(descriptor);
  }
}

// Inspect without following links/junctions before any recursive deletion.
function treeSize(target) {
  const info = fs.lstatSync(target);
  if (info.isSymbolicLink() || fs.realpathSync(target) !== target) {
    throw new Error(`Lien ou jonction conservé : ${target}`);
  }
  if (info.isFile()) return info.size;
  if (!info.isDirectory()) throw new Error(`Fichier inhabituel conservé : ${target}`);
  return fs.readdirSync(target).reduce((sum, name) => sum + treeSize(path.join(target, name)), 0);
}

function cleanReleases({ root, currentBuild, artifacts }) {
  const destination = releaseDirectory(root);
  const current = path.resolve(currentBuild);
  if (path.dirname(current) !== destination || !buildName.test(path.basename(current))) {
    throw new Error('Le build à conserver doit être un dossier build-<date> dans release-final.');
  }
  assertOrdinaryPath(current, true);
  const installer = artifacts?.find(name => typeof name === 'string' && installerName.test(name));
  if (!installer || artifacts.length !== 3 || new Set(artifacts).size !== 3 ||
      !artifacts.includes(installer + '.blockmap') || !artifacts.includes('latest.yml')) {
    throw new Error('Les trois fichiers de la nouvelle version sont requis avant le nettoyage.');
  }
  // Never discard a previous build until all published bytes match the verified build.
  for (const name of artifacts) {
    const source = path.join(current, name);
    const published = path.join(destination, name);
    const sourceInfo = assertOrdinaryPath(source, false);
    const publishedInfo = assertOrdinaryPath(published, false);
    if (!sourceInfo.size || sourceInfo.size !== publishedInfo.size || checksum(source) !== checksum(published)) {
      throw new Error(`Publication incomplète ou différente du build : ${name}. Aucun ancien build supprimé.`);
    }
  }

  const report = { removed: [], removedBytes: 0, warnings: [] };
  for (const entry of fs.readdirSync(destination, { withFileTypes: true })) {
    if (entry.name === path.basename(current) || artifacts.includes(entry.name)) continue;
    const oldBuild = buildName.test(entry.name);
    const oldInstaller = installerName.test(entry.name.replace(/\.blockmap$/, ''));
    if (!oldBuild && !oldInstaller) continue;
    const target = path.resolve(destination, entry.name);
    try {
      // Only direct children of the checked release directory can be removed.
      if (path.dirname(target) !== destination || target === current) throw new Error('Chemin hors du dossier de compilation.');
      assertOrdinaryPath(target, oldBuild);
      const bytes = treeSize(target);
      fs.rmSync(target, { recursive: oldBuild, force: true, maxRetries: 3, retryDelay: 100 });
      report.removed.push(target);
      report.removedBytes += bytes;
    } catch (error) {
      report.warnings.push(`${entry.name} : ${error.message}`);
    }
  }
  return report;
}

module.exports = { cleanReleases, releaseDirectory };
