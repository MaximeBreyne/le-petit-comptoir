'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ResEdit = require('resedit');

const digest = data => crypto.createHash('sha256').update(Buffer.from(data)).digest('hex');

function iconFrames(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.readUInt16LE(0), 0, 'En-tête ICO invalide.');
  assert.equal(data.readUInt16LE(2), 1, 'Le fichier doit être une icône ICO.');
  const count = data.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const entry = 6 + index * 16;
    const start = data.readUInt32LE(entry + 12), length = data.readUInt32LE(entry + 8);
    assert.ok(start >= 6 + count * 16 && start + length <= data.length, 'Image ICO tronquée.');
    return { size: data[entry] || 256, digest: digest(data.subarray(start, start + length)) };
  });
}

function verifyAppIcon(executablePath, iconPath) {
  const expected = iconFrames(iconPath);
  assert.deepEqual(expected.map(frame => frame.size), [16, 24, 32, 48, 64, 128, 256], 'Tailles Windows manquantes.');
  const executable = ResEdit.NtExecutable.from(fs.readFileSync(executablePath), { ignoreCert: true });
  const resources = ResEdit.NtExecutableResource.from(executable).entries;
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(resources);
  const matching = groups.find(group => expected.every(frame => group.icons.some(icon => {
    const data = resources.find(entry => entry.type === 3 && entry.id === icon.iconID && entry.lang === group.lang);
    return (icon.width || 256) === frame.size && data && digest(data.bin) === frame.digest;
  })));
  assert.ok(matching, `Le logo du jeu n'est pas intégré dans ${executablePath}.`);
  return { group: matching.id, sizes: expected.map(frame => frame.size) };
}

module.exports = { verifyAppIcon, iconFrames };
if (require.main === module) {
  try {
    assert.ok(process.argv[2] && process.argv[3], 'Usage : node scripts/verify-app-icon.cjs application.exe icon.ico');
    console.log('Icône Windows vérifiée :', JSON.stringify(verifyAppIcon(process.argv[2], process.argv[3])));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
