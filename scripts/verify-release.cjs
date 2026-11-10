'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const asar = require('@electron/asar');
const { verifyAppIcon } = require('./verify-app-icon.cjs');

function verifyRelease(directory, expectedPackage) {
  const root = path.resolve(directory);
  const metadata = yaml.load(fs.readFileSync(path.join(root, 'latest.yml'), 'utf8'));
  // The build supplies its selected version. Standalone verification uses the
  // published version, which can advance independently of the source package.
  expectedPackage ??= { ...require('../package.json'), version: metadata?.version };
  assert.match(metadata?.version || '', /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Numéro de version invalide.');
  assert.equal(metadata.version, expectedPackage.version, 'La version de latest.yml diffère du jeu.');
  assert.ok(Array.isArray(metadata.files) && metadata.files.length > 0, 'latest.yml ne contient aucun installateur.');
  const entries = metadata.files.filter(file => typeof file.url === 'string' && file.url.endsWith('.exe'));
  assert.equal(entries.length, 1, 'Un seul installateur Windows x64 est attendu.');
  const entry = entries[0];
  const installer = decodeURIComponent(entry.url);
  assert.equal(installer, `Le-Petit-Comptoir-Bar-${metadata.version}-Setup.exe`, 'Le nom de l’installateur diffère de sa version.');
  assert.equal(path.basename(installer), installer, 'Le manifeste doit désigner un fichier local sans sous-dossier.');
  assert.ok(!installer.includes('/') && !installer.includes('\\'), 'Chemin de fichier invalide.');
  const data = fs.readFileSync(path.join(root, installer));
  assert.equal(data.length, entry.size, 'La taille de l’installateur ne correspond pas au manifeste.');
  assert.equal(crypto.createHash('sha512').update(data).digest('base64'), entry.sha512,
    'L’empreinte SHA-512 de l’installateur ne correspond pas au manifeste.');
  assert.ok(fs.statSync(path.join(root, installer + '.blockmap')).size > 0, 'La blockmap est absente ou vide.');

  const resources = path.join(root, 'win-unpacked', 'resources');
  const feed = yaml.load(fs.readFileSync(path.join(resources, 'app-update.yml'), 'utf8'));
  const configured = Array.isArray(expectedPackage.build.publish) ? expectedPackage.build.publish[0] : expectedPackage.build.publish;
  assert.ok(configured, 'La publication des mises à jour n’est pas configurée.');
  for (const key of ['provider', 'owner', 'repo', 'url', 'channel']) {
    if (configured[key] !== undefined) assert.equal(feed[key], configured[key], `Source de mise à jour incorrecte : ${key}.`);
  }
  assert.ok(!feed.token && !feed.requestHeaders, 'Le paquet ne doit contenir aucun secret de publication.');
  const localSource = JSON.parse(fs.readFileSync(path.join(resources, 'local-update-source.json'), 'utf8'));
  assert.ok(path.isAbsolute(localSource.directory), 'Le dossier de mise à jour par défaut doit être absolu.');
  const archive = path.join(resources, 'app.asar');
  const packed = JSON.parse(asar.extractFile(archive, 'package.json').toString('utf8'));
  assert.equal(packed.version, metadata.version, 'La version installée diffère du manifeste.');
  for (const file of ['dist/orders.js', 'dist/orders.css', 'dist/preparation.css']) {
    assert.ok(asar.extractFile(archive, file).equals(fs.readFileSync(path.resolve(__dirname, '..', file))), `Interface des préparations embarquée incorrecte : ${file}.`);
  }
  const iconPath = path.resolve(__dirname, '..', expectedPackage.build.win.icon);
  verifyAppIcon(path.join(root, 'win-unpacked', `${expectedPackage.build.productName}.exe`), iconPath);
  verifyAppIcon(path.join(root, installer), iconPath);
  for (const name of ['logo.png', 'icon.ico', 'app-icon.png', 'logo-128.png', 'favicon.png']) {
    const file = path.join('dist', 'assets', 'brand', name);
    assert.ok(asar.extractFile(archive, file).equals(fs.readFileSync(path.resolve(__dirname, '..', file))), `Logo embarqué incorrect : ${name}.`);
  }
  assert.ok(packed.dependencies?.['electron-updater'], 'electron-updater doit être une dépendance de production.');
  const updater = JSON.parse(asar.extractFile(archive, path.join('node_modules', 'electron-updater', 'package.json')).toString('utf8'));
  assert.equal(updater.version, expectedPackage.dependencies['electron-updater'], 'La version embarquée du programme de mise à jour est incorrecte.');
  for (const file of ['desktop/updater.cjs', 'desktop/local-update-source.cjs', 'desktop/preload.cjs', 'desktop/game-window.cjs', 'dist/updates.js', 'dist/scene.js', 'dist/venue.js', 'dist/game.js', 'dist/controls.js', 'dist/index.html', 'dist/renderer.js', 'dist/menus.js', 'dist/menus.css', 'dist/hud.css', 'dist/interaction.js', 'dist/interaction.css', 'dist/tablet.js', 'dist/tablet.css', 'dist/engine.js', 'dist/preparation.js', 'dist/service-direct.js', 'dist/service-direct.css']) {
    assert.ok(asar.extractFile(archive, path.normalize(file)).length > 0, `Fichier du jeu absent : ${file}.`);
  }
  return { version: metadata.version, installer, artifacts: [installer, installer + '.blockmap', 'latest.yml'] };
}

module.exports = { verifyRelease };
if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage : node scripts/verify-release.cjs release-final/build-<date>');
    console.log('Publication vérifiée :', JSON.stringify(verifyRelease(process.argv[2])));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
