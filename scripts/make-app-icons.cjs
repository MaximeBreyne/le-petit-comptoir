'use strict';
// Mechanical PNG resizing and ICO packaging; the generated artwork is unchanged.
// Run with Electron: electron scripts/make-app-icons.cjs
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

app.whenReady().then(() => {
  try {
    const directory = path.resolve(__dirname, '../dist/assets/brand');
    const source = nativeImage.createFromPath(path.join(directory, 'logo.png'));
    assert.ok(!source.isEmpty(), 'Le logo PNG est introuvable ou illisible.');
    const dimensions = source.getSize();
    assert.equal(dimensions.width, dimensions.height, 'Le logo doit être carré.');
    assert.ok(dimensions.width >= 256, 'Le logo doit mesurer au moins 256 pixels.');
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const images = sizes.map(size => source.resize({ width: size, height: size, quality: 'best' }).toPNG());
    const header = Buffer.alloc(6 + 16 * sizes.length);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((size, index) => {
      const entry = 6 + index * 16;
      header[entry] = size === 256 ? 0 : size;
      header[entry + 1] = size === 256 ? 0 : size;
      header.writeUInt16LE(1, entry + 4);
      header.writeUInt16LE(32, entry + 6);
      header.writeUInt32LE(images[index].length, entry + 8);
      header.writeUInt32LE(offset, entry + 12);
      offset += images[index].length;
    });
    fs.writeFileSync(path.join(directory, 'icon.ico'), Buffer.concat([header, ...images]));
    for (const [name, size] of [['app-icon.png', 256], ['logo-128.png', 128], ['favicon.png', 32]]) {
      fs.writeFileSync(path.join(directory, name), images[sizes.indexOf(size)]);
    }
    console.log('Icônes créées :', JSON.stringify({ source: dimensions, sizes, directory }));
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
