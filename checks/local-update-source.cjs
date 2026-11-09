'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { createLocalUpdateSource } = require('../desktop/local-update-source.cjs');

async function fixture(t, { bundled = false, saved = false } = {}) {
  const temporaryParent = path.resolve(os.tmpdir());
  const root = await fs.mkdtemp(path.join(temporaryParent, 'comptoir-local-update-test-'));
  const userData = path.join(root, 'profile');
  const resourcesPath = path.join(root, 'resources');
  const updates = path.join(root, 'updates');
  await Promise.all([userData, resourcesPath, updates].map(dir => fs.mkdir(dir)));
  if (bundled) await fs.writeFile(path.join(resourcesPath, 'local-update-source.json'), JSON.stringify({ directory: updates }));
  if (saved) await fs.writeFile(path.join(userData, 'update-source.json'), JSON.stringify({ directory: updates }));
  const app = { getPath: name => name === 'userData' ? userData : root };
  let choice = { canceled: true, filePaths: [] };
  const dialog = { showOpenDialog: async () => choice };
  const instances = [];
  async function create() {
    const source = await createLocalUpdateSource({ app, dialog, resourcesPath, getWindow: () => null });
    instances.push(source); return source;
  }
  t.after(async () => {
    for (const source of instances) source.close();
    // Only remove this test's freshly-created directory within the temp parent.
    assert.equal(path.dirname(path.resolve(root)), temporaryParent);
    assert.ok(path.basename(root).startsWith('comptoir-local-update-test-'));
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return { root, userData, resourcesPath, updates, create, choose: value => { choice = value; } };
}

async function writeRelease(directory, overrides = {}) {
  const version = '0.5.0';
  const name = `Le-Petit-Comptoir-Bar-${version}-Setup.exe`;
  const content = Buffer.from('Local test installer payload; not executable.');
  const sha512 = createHash('sha512').update(content).digest('base64');
  const manifest = { version, files: [{ url: name, sha512, size: content.length }], path: name, sha512, ...overrides };
  await fs.writeFile(path.join(directory, name), content);
  await fs.writeFile(path.join(directory, 'latest.yml'), JSON.stringify(manifest));
  return { name, content, sha512, manifest };
}

test('closing while the local server starts settles the request safely', async t => {
  const f = await fixture(t, { bundled: true });
  const source = await f.create();
  const pending = source.prepare();
  source.close();
  assert.equal(await pending, null);
  assert.equal(await source.prepare(), null);
});

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(3000, () => req.destroy(new Error('Local update HTTP request timed out')));
    req.on('error', reject); req.end();
  });
}

test('without a selected or bundled directory no feed is started', async t => {
  const f = await fixture(t); const source = await f.create();
  assert.equal(source.getDirectory(), null);
  assert.equal(await source.prepare(), null);
  assert.equal(await source.prepare(), null);
});

test('local manifest is restricted and installer bytes match its checksum', async t => {
  const f = await fixture(t, { bundled: true });
  const release = await writeRelease(f.updates, {
    path: 'https://example.com/foreign.exe',
    packages: { x64: { path: 'https://example.com/package.7z' } },
    releaseNotes: '<img src="https://example.com/pixel">',
  });
  const source = await f.create(); const feed = await source.prepare();
  assert.equal(new URL(feed).hostname, '127.0.0.1');
  assert.equal(await source.prepare(), feed, 'Reuse the loopback listener');
  const manifestResponse = await request(feed + 'latest.yml');
  assert.equal(manifestResponse.status, 200);
  assert.equal(manifestResponse.headers['cache-control'], 'no-store');
  const manifest = JSON.parse(manifestResponse.body);
  assert.deepEqual(Object.keys(manifest).sort(), ['files', 'path', 'sha512', 'version']);
  assert.equal(manifest.path, release.name);
  assert.equal(manifest.files[0].url, release.name);
  assert.doesNotMatch(manifestResponse.body.toString(), /https:|releaseNotes|packages/);
  const installer = await request(feed + release.name);
  assert.equal(installer.status, 200);
  assert.deepEqual(installer.body, release.content);
  assert.equal(createHash('sha512').update(installer.body).digest('base64'), manifest.files[0].sha512);
  const head = await request(feed + release.name, { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), release.content.length);
});

test('server rejects wrong token, outside paths, unrelated files, methods and Host', async t => {
  const f = await fixture(t, { saved: true }); const release = await writeRelease(f.updates);
  await fs.writeFile(path.join(f.updates, 'private.txt'), 'not part of release');
  await fs.writeFile(path.join(f.root, 'outside.txt'), 'outside chosen directory');
  const source = await f.create(); const feed = await source.prepare();
  // Installers are not exposed until a valid manifest has authorized them.
  assert.equal((await request(feed + release.name)).status, 404);
  assert.equal((await request(feed + 'latest.yml')).status, 200);
  const origin = new URL(feed).origin;
  for (const url of [origin + '/latest.yml', origin + '/wrong-token/latest.yml',
    feed + 'private.txt', feed + '../outside.txt', feed + '%2e%2e/outside.txt',
    feed + '%2e%2e%2foutside.txt', feed + 'https://example.com/payload.exe']) {
    assert.equal((await request(url)).status, 404, url);
  }
  assert.equal((await request(feed + 'latest.yml', { method: 'POST' })).status, 403);
  assert.equal((await request(feed + 'latest.yml', { headers: { Host: 'example.com' } })).status, 403);
});

test('invalid and remote installer manifests are never authorized', async t => {
  const f = await fixture(t, { bundled: true });
  const release = await writeRelease(f.updates);
  const cases = [
    { ...release.manifest, files: [{ ...release.manifest.files[0], url: 'https://example.com/installer.exe' }] },
    { ...release.manifest, files: [{ ...release.manifest.files[0], url: '../outside.exe' }] },
    { ...release.manifest, files: [{ ...release.manifest.files[0], sha512: 'invalid' }] },
    { ...release.manifest, files: [{ ...release.manifest.files[0], size: release.content.length + 1 }] },
    { ...release.manifest, version: '0.5.0-beta.1' },
    { ...release.manifest, files: [] },
  ];
  for (const manifest of cases) {
    await fs.writeFile(path.join(f.updates, 'latest.yml'), JSON.stringify(manifest));
    const source = await f.create(); const feed = await source.prepare();
    const response = await request(feed + 'latest.yml');
    assert.equal(response.status, 503);
    assert.equal((await request(feed + release.name)).status, 404);
    source.close();
  }
});

test('folder selection is persisted, cancellation preserves it, and user choice overrides bundle', async t => {
  const f = await fixture(t, { bundled: true });
  const chosen = path.join(f.root, 'new-updates'); await fs.mkdir(chosen);
  const source = await f.create();
  f.choose({ canceled: false, filePaths: [chosen] });
  assert.ok(await source.choose());
  assert.equal(source.getDirectory(), await fs.realpath(chosen));
  const settings = JSON.parse(await fs.readFile(path.join(f.userData, 'update-source.json'), 'utf8'));
  assert.equal(settings.directory, await fs.realpath(chosen));
  f.choose({ canceled: true, filePaths: [] });
  assert.equal(await source.choose(), null);
  assert.equal(source.getDirectory(), settings.directory);
  const restored = await f.create();
  assert.equal(restored.getDirectory(), settings.directory);
});

test('changing folders invalidates previously authorized installers', async t => {
  const f = await fixture(t, { bundled: true }); const release = await writeRelease(f.updates);
  const other = path.join(f.root, 'other'); await fs.mkdir(other);
  const source = await f.create(); const feed = await source.prepare();
  assert.equal((await request(feed + 'latest.yml')).status, 200);
  assert.equal((await request(feed + release.name)).status, 200);
  f.choose({ canceled: false, filePaths: [other] });
  assert.equal(await source.choose(), feed);
  assert.equal((await request(feed + release.name)).status, 404);
  assert.equal((await request(feed + 'latest.yml')).status, 503);
});

test('oversized manifest is rejected before parsing', async t => {
  const f = await fixture(t, { saved: true });
  await fs.writeFile(path.join(f.updates, 'latest.yml'), ' '.repeat(65537));
  const source = await f.create(); const feed = await source.prepare();
  assert.equal((await request(feed + 'latest.yml')).status, 503);
});
