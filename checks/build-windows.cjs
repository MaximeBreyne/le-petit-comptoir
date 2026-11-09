'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { buildWindows } = require('../scripts/build-windows.cjs');

function fixture(t) {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'comptoir-build-pipeline-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), parent);
    assert.ok(path.basename(root).startsWith('comptoir-build-pipeline-'));
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  const write = (file, data) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    return file;
  };
  write(path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'), 'fake runtime, never executed');
  write(path.join(root, 'node_modules', 'electron', 'dist', 'resources', 'default_app.asar'), 'Electron demo');
  fs.mkdirSync(path.join(root, '.build'));
  const release = path.join(root, 'release-final');
  const previous = {
    installer: write(path.join(release, 'Le-Petit-Comptoir-Bar-0.6.0-Setup.exe'), 'previous working installer'),
    blockmap: write(path.join(release, 'Le-Petit-Comptoir-Bar-0.6.0-Setup.exe.blockmap'), 'previous blockmap'),
    manifest: write(path.join(release, 'latest.yml'), JSON.stringify({ version: '0.6.0' })),
    unpacked: write(path.join(release, 'build-100', 'win-unpacked', 'resources', 'app.asar'), 'previous working game'),
  };
  const previousBytes = Object.fromEntries(Object.entries(previous).map(([key, file]) => [key, fs.readFileSync(file)]));
  const installer = 'Le-Petit-Comptoir-Bar-0.6.1-Setup.exe';
  const verified = { version: '0.6.1', installer, artifacts: [installer, installer + '.blockmap', 'latest.yml'] };
  const manifest = JSON.stringify({ version: verified.version, path: installer });
  let output;
  const logs = [];
  const warnings = [];
  const logger = { log: value => logs.push(value), warn: value => warnings.push(value) };
  const spawnSync = (command, args, options) => {
    assert.equal(command, process.execPath);
    assert.equal(options.cwd, root);
    assert.equal(args[args.indexOf('--publish') + 1], 'never', 'Builds must remain local');
    output = args.find(value => value.startsWith('--config.directories.output=')).split('=').slice(1).join('=');
    assert.equal(path.dirname(output), release);
    write(path.join(output, installer), 'new verified installer');
    write(path.join(output, installer + '.blockmap'), 'new verified blockmap');
    write(path.join(output, 'latest.yml'), manifest);
    write(path.join(output, 'win-unpacked', 'resources', 'app.asar'), 'new unpacked game');
    return { status: 0 };
  };
  const verify = directory => {
    assert.equal(directory, output);
    return verified;
  };
  const previousIntact = () => {
    for (const [key, file] of Object.entries(previous)) assert.deepEqual(fs.readFileSync(file), previousBytes[key], key);
  };
  return {
    root, release, previous, previousIntact, verified, manifest, write, spawnSync, verify, logger, logs, warnings,
    lock: path.join(root, '.build', 'windows-build.lock'),
    options: { root, spawnSync, verify, logger },
    get output() { return output; },
  };
}

test('a successful build verifies and publishes every artifact before removing the previous release', t => {
  const f = fixture(t);
  let verified = false;
  let published = false;
  const result = buildWindows({
    ...f.options,
    verify: directory => {
      f.previousIntact();
      verified = true;
      return f.verify(directory);
    },
    logger: {
      log: message => {
        if (message.startsWith('Installateur Windows')) {
          assert.ok(verified);
          for (const name of f.verified.artifacts) {
            assert.deepEqual(fs.readFileSync(path.join(f.release, name)), fs.readFileSync(path.join(f.output, name)));
          }
          assert.ok(fs.existsSync(f.previous.installer), 'Cleanup follows complete publication');
          assert.ok(fs.existsSync(f.previous.unpacked));
          published = true;
        }
        f.logger.log(message);
      },
      warn: f.logger.warn,
    },
  });
  assert.ok(published);
  assert.equal(result.output, f.output);
  assert.equal(result.version, '0.6.1');
  assert.equal(result.cleanup.removed.length, 3);
  assert.deepEqual(f.warnings, []);
  assert.equal(fs.existsSync(f.previous.installer), false);
  assert.equal(fs.existsSync(f.previous.blockmap), false);
  assert.equal(fs.existsSync(path.join(f.release, 'build-100')), false);
  assert.equal(fs.readFileSync(f.previous.manifest, 'utf8'), f.manifest);
  assert.ok(fs.existsSync(path.join(f.output, 'win-unpacked', 'resources', 'app.asar')));
  assert.equal(fs.existsSync(f.lock), false);
  assert.equal(fs.existsSync(path.join(f.root, '.build', 'electron-runtime', 'resources', 'default_app.asar')), false);
  assert.ok(fs.existsSync(path.join(f.root, 'node_modules', 'electron', 'dist', 'resources', 'default_app.asar')));
});

test('builder failures keep all previous release bytes and release the build lock', async t => {
  for (const failure of ['exit status', 'spawn error', 'thrown exception']) {
    await t.test(failure, st => {
      const f = fixture(st);
      let verifyCalls = 0;
      assert.throws(() => buildWindows({
        ...f.options,
        spawnSync: (...args) => {
          f.spawnSync(...args);
          if (failure === 'exit status') return { status: 7 };
          if (failure === 'spawn error') return { status: null, error: new Error('Unable to start fake builder') };
          throw new Error('Fake builder exception');
        },
        verify: () => { verifyCalls++; return f.verified; },
      }));
      assert.equal(verifyCalls, 0);
      f.previousIntact();
      assert.equal(fs.existsSync(f.lock), false);
      assert.ok(fs.existsSync(f.output), 'Unverified output is kept until a subsequent successful build');
      assert.deepEqual(f.logs, []);
    });
  }
});

test('verification failure preserves the previous installer, manifest and unpacked build', t => {
  const f = fixture(t);
  assert.throws(() => buildWindows({
    ...f.options,
    verify: () => {
      f.previousIntact();
      throw new Error('Installer checksum mismatch');
    },
  }), /checksum mismatch/);
  f.previousIntact();
  assert.equal(fs.existsSync(path.join(f.release, f.verified.installer)), false);
  assert.equal(fs.existsSync(f.lock), false);
});

test('a concurrent build is refused without disturbing the active lock; a failed build can be retried', t => {
  const f = fixture(t);
  let concurrentSpawnCalls = 0;
  assert.throws(() => buildWindows({
    ...f.options,
    spawnSync: (...args) => {
      assert.equal(JSON.parse(fs.readFileSync(f.lock, 'utf8')).pid, process.pid);
      assert.throws(() => buildWindows({
        ...f.options,
        spawnSync: () => { concurrentSpawnCalls++; return { status: 0 }; },
      }), /déjà en cours/);
      assert.ok(fs.existsSync(f.lock), 'The refused build must not remove the active build lock');
      f.spawnSync(...args);
      return { status: 7 };
    },
  }));
  assert.equal(concurrentSpawnCalls, 0);
  assert.equal(fs.existsSync(f.lock), false);
  f.previousIntact();
  const next = buildWindows(f.options);
  assert.equal(next.version, '0.6.1');
  assert.ok(next.cleanup.removed.length >= 3);
  assert.equal(fs.existsSync(f.lock), false);
});

test('a lock left by an exited process is retained until its remaining builder processes can be checked', t => {
  const f = fixture(t);
  const exited = cp.spawnSync(process.execPath, ['-e', 'process.exit(0)'], { windowsHide: true });
  assert.equal(exited.status, 0);
  assert.throws(() => process.kill(exited.pid, 0), { code: 'ESRCH' });
  const staleLock = JSON.stringify({ pid: exited.pid });
  fs.writeFileSync(f.lock, staleLock);
  let spawned = false;
  assert.throws(() => buildWindows({
    ...f.options,
    spawnSync: () => { spawned = true; return { status: 0 }; },
  }));
  assert.equal(spawned, false);
  assert.equal(fs.readFileSync(f.lock, 'utf8'), staleLock);
  f.previousIntact();
});

test('an unreadable lock is retained and does not start a build or delete old releases', t => {
  const f = fixture(t);
  fs.writeFileSync(f.lock, 'incomplete lock');
  let spawned = false;
  assert.throws(() => buildWindows({
    ...f.options,
    spawnSync: () => { spawned = true; return { status: 0 }; },
  }), /illisible/);
  assert.equal(spawned, false);
  assert.equal(fs.readFileSync(f.lock, 'utf8'), 'incomplete lock');
  f.previousIntact();
});
