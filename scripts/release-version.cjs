'use strict';
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

function versionParts(version, source) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Version invalide dans ${source} : un numéro majeur.mineur.correctif est requis.`);
  }
  const parts = version.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error(`Version trop grande dans ${source}.`);
  return parts;
}

function compare(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

function readVersion(file, parse) {
  let contents;
  try { contents = fs.readFileSync(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  let value;
  try { value = parse(contents); }
  catch { throw new Error(`Historique de version illisible : ${file}. Le numéro ne sera pas remis à zéro.`); }
  return versionParts(value?.version, file);
}

// Read only successful publications. A failed build can retry the same version.
// The local history survives removal of release-final and is ignored by Git.
function selectReleaseVersion(root, sourceVersion) {
  const baseline = versionParts(sourceVersion, 'package.json');
  const history = [
    readVersion(path.join(root, '.build', 'release-version.json'), JSON.parse),
    readVersion(path.join(root, 'release-final', 'latest.yml'), text => yaml.load(text, { schema: yaml.JSON_SCHEMA })),
  ].filter(Boolean);
  if (!history.length) return sourceVersion;
  const latest = history.reduce((a, b) => compare(a, b) >= 0 ? a : b);
  if (compare(baseline, latest) > 0) return sourceVersion;
  const next = [latest[0], latest[1], latest[2] + 1];
  const version = next.join('.');
  versionParts(version, 'la prochaine compilation');
  return version;
}

function writeReleaseVersion(root, version) {
  versionParts(version, 'la compilation vérifiée');
  const directory = path.join(root, '.build');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'release-version.json'), pending = file + '.tmp';
  fs.writeFileSync(pending, JSON.stringify({ version }, null, 2) + '\n');
  fs.renameSync(pending, file);
}

module.exports = { selectReleaseVersion, writeReleaseVersion };
