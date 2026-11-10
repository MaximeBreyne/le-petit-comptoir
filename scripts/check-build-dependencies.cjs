'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sortedEntries = value => Object.entries(value || {}).sort(([a], [b]) => a.localeCompare(b));
const fileExists = file => { try { return fs.statSync(file).isFile(); } catch { return false; } };

function packageDirectory(root, name) {
  const directory = path.resolve(root, name), modules = path.join(root, 'node_modules');
  if (!name.startsWith('node_modules/') || !directory.startsWith(modules + path.sep)) {
    throw new Error(`Chemin de dépendance invalide dans le verrouillage : ${name}.`);
  }
  return directory;
}

// npm's hidden lock records the installed tree. Compare it with the project lock
// and the actual package files, rather than trusting that node_modules exists.
// This check never writes either source manifest or runs an installation.
function checkBuildDependencies(root = path.resolve(__dirname, '..')) {
  root = path.resolve(root);
  const pkg = readJson(path.join(root, 'package.json'));
  const lock = readJson(path.join(root, 'package-lock.json'));
  if (!lock.packages?.[''] || ![2, 3].includes(lock.lockfileVersion)) {
    throw new Error('Le fichier package-lock.json doit contenir un verrouillage npm valide.');
  }
  for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (!isDeepStrictEqual(sortedEntries(pkg[kind]), sortedEntries(lock.packages[''][kind]))) {
      throw new Error('Les dépendances de package.json et package-lock.json diffèrent. Synchronisez-les avec npm install avant de fabriquer la mise à jour.');
    }
  }
  const expected = Object.entries(lock.packages).filter(([name]) => name !== '');
  // Reject malformed source paths before reading any installed package.
  for (const [name, entry] of expected) {
    packageDirectory(root, name);
    if (!entry || typeof entry.version !== 'string' || entry.link) {
      throw new Error(`Dépendance non valide dans package-lock.json : ${name}.`);
    }
  }
  let installed;
  try { installed = readJson(path.join(root, 'node_modules', '.package-lock.json')); }
  catch { return { ready: false, reason: 'Le relevé des dépendances installées est absent ou illisible.' }; }
  if (!installed?.packages || typeof installed.packages !== 'object') {
    return { ready: false, reason: 'Le relevé des dépendances installées est incomplet.' };
  }
  for (const name of Object.keys(installed.packages)) {
    if (name !== '' && !Object.hasOwn(lock.packages, name)) {
      return { ready: false, reason: 'Des dépendances installées ne correspondent plus au verrouillage.' };
    }
  }
  for (const [name, entry] of expected) {
    const directory = packageDirectory(root, name), actual = installed.packages[name];
    // npm may omit optional packages for another OS, or after an optional failure.
    if (!actual && entry.optional === true && !fs.existsSync(directory)) continue;
    if (!actual || ['version', 'resolved', 'integrity'].some(key => actual[key] !== entry[key])) {
      return { ready: false, reason: `La dépendance ${name} doit être installée depuis le verrouillage.` };
    }
    let metadata;
    try { metadata = readJson(path.join(directory, 'package.json')); }
    catch { return { ready: false, reason: `La dépendance ${name} est absente ou endommagée.` }; }
    if (metadata.version !== entry.version) {
      return { ready: false, reason: `La version installée de ${name} ne correspond pas au verrouillage.` };
    }
  }
  for (const file of ['node_modules/electron/dist/electron.exe', 'node_modules/electron-builder/out/cli/cli.js']) {
    if (!fileExists(path.join(root, file))) {
      return { ready: false, reason: `Un outil de compilation manque : ${file}.` };
    }
  }
  let executable;
  try { executable = fs.readFileSync(path.join(root, 'node_modules', 'electron', 'path.txt'), 'utf8').trim(); }
  catch { return { ready: false, reason: 'L’installation du moteur Electron est incomplète.' }; }
  if (executable !== 'electron.exe') return { ready: false, reason: 'Le moteur Electron installé ne correspond pas à Windows.' };
  return { ready: true, reason: 'Dépendances déjà installées et conformes au verrouillage : réutilisation.' };
}

module.exports = { checkBuildDependencies };
if (require.main === module) {
  try {
    const result = checkBuildDependencies();
    console.log(result.reason);
    if (!result.ready) console.log('Une installation avec npm ci est nécessaire.');
    process.exitCode = result.ready ? 0 : 1;
  } catch (error) {
    console.error('Vérification des dépendances impossible :', error.message);
    process.exitCode = 2;
  }
}
