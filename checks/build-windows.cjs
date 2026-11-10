'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { buildWindows } = require('../scripts/build-windows.cjs');
const { selectReleaseVersion, writeReleaseVersion } = require('../scripts/release-version.cjs');
const { checkBuildDependencies } = require('../scripts/check-build-dependencies.cjs');

function fixture(t, version = '0.6.0') {
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
  const sourcePackage = { name: 'comptoir-fixture', version, description: 'Local build fixture', dependencies: { 'electron-updater': '6.8.11' } };
  const packageFile = write(path.join(root, 'package.json'), JSON.stringify(sourcePackage, null, 4) + '\r\n');
  const lockFile = write(path.join(root, 'package-lock.json'), JSON.stringify({ name: sourcePackage.name, version, lockfileVersion: 3, packages: { '': sourcePackage } }, null, 2) + '\n');
  const sourceBytes = [packageFile, lockFile].map(file => [file, fs.readFileSync(file)]);
  const sourceIntact = () => {
    for (const [file, bytes] of sourceBytes) assert.deepEqual(fs.readFileSync(file), bytes, 'Source manifest must stay byte-for-byte unchanged: ' + path.basename(file));
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
  let verified, manifest;
  const generated = version => {
    const installer = 'Le-Petit-Comptoir-Bar-' + version + '-Setup.exe';
    verified = { version, installer, artifacts: [installer, installer + '.blockmap', 'latest.yml'] };
    manifest = JSON.stringify({ version, path: installer });
  };
  generated('0.6.1');
  let output;
  const logs = [];
  const warnings = [];
  const logger = { log: value => logs.push(value), warn: value => warnings.push(value) };
  const spawnSync = (command, args, options) => {
    assert.equal(command, process.execPath);
    assert.equal(options.cwd, root);
    assert.equal(args[args.indexOf('--publish') + 1], 'never', 'Builds must remain local');
    const injected = args.find(value => value.startsWith('--config.extraMetadata.version='));
    assert.ok(injected, 'Version is injected into the package copy created by electron-builder');
    generated(injected.slice('--config.extraMetadata.version='.length));
    const { installer } = verified;
    sourceIntact();
    output = args.find(value => value.startsWith('--config.directories.output=')).split('=').slice(1).join('=');
    assert.equal(path.dirname(output), release);
    write(path.join(output, installer), 'new verified installer');
    write(path.join(output, installer + '.blockmap'), 'new verified blockmap');
    write(path.join(output, 'latest.yml'), manifest);
    write(path.join(output, 'win-unpacked', 'resources', 'app.asar'), 'new unpacked game');
    return { status: 0 };
  };
  const verify = (directory, expectedPackage) => {
    assert.equal(directory, output);
    assert.deepEqual(expectedPackage, { ...sourcePackage, version: verified.version }, 'Verification uses the injected version and unchanged dependency metadata');
    sourceIntact();
    return verified;
  };
  const previousIntact = () => {
    for (const [key, file] of Object.entries(previous)) assert.deepEqual(fs.readFileSync(file), previousBytes[key], key);
  };
  return {
    root, release, previous, previousIntact, sourceIntact, sourcePackage, write, spawnSync, verify, logger, logs, warnings,
    lock: path.join(root, '.build', 'windows-build.lock'),
    versionFile: path.join(root, '.build', 'release-version.json'),
    options: { root, spawnSync, verify, logger },
    get output() { return output; },
    get verified() { return verified; },
    get manifest() { return manifest; },
  };
}

test('a successful build verifies and publishes every artifact before removing the previous release', t => {
  const f = fixture(t);
  let verified = false;
  let published = false;
  const result = buildWindows({
    ...f.options,
    verify: (directory, expectedPackage) => {
      f.previousIntact();
      verified = true;
      return f.verify(directory, expectedPackage);
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
  assert.equal(JSON.parse(fs.readFileSync(f.versionFile, 'utf8')).version, '0.6.1');
  f.sourceIntact();
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
      assert.ok(!f.logs.some(message => message.startsWith('Installateur Windows')));
      assert.equal(fs.existsSync(f.versionFile), false, 'Failed builds do not consume a release number');
      f.sourceIntact();
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
  assert.equal(fs.existsSync(f.versionFile), false, 'Failed verification does not consume a release number');
  f.sourceIntact();
});

test('successive builds increase the installer version without touching either source manifest', t => {
  const f = fixture(t);
  const first = buildWindows(f.options);
  const second = buildWindows(f.options);
  assert.equal(first.version, '0.6.1');
  assert.equal(second.version, '0.6.2');
  assert.equal(JSON.parse(fs.readFileSync(f.versionFile, 'utf8')).version, '0.6.2');
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.release, 'latest.yml'), 'utf8')).version, '0.6.2');
  assert.equal(fs.existsSync(path.join(f.release, first.installer)), false, 'Cleanup removes the older automatic version');
  assert.ok(fs.existsSync(path.join(f.release, second.installer)));
  f.sourceIntact();
});

test('a higher source version is used for a new series, then automatic patch numbering resumes', t => {
  const f = fixture(t, '0.7.0');
  const first = buildWindows(f.options);
  assert.equal(first.version, '0.7.0');
  assert.equal(buildWindows(f.options).version, '0.7.1');
  f.sourceIntact();
});

test('the first build uses the source version when no successful release is recorded', t => {
  const f = fixture(t);
  fs.unlinkSync(f.previous.manifest);
  assert.equal(selectReleaseVersion(f.root, '0.6.0'), '0.6.0');
  assert.equal(buildWindows(f.options).version, '0.6.0');
  f.sourceIntact();
});

test('the retained local version prevents a downgrade after release artifacts have been removed', t => {
  const f = fixture(t);
  const first = buildWindows(f.options);
  assert.equal(first.version, '0.6.1');
  assert.equal(path.dirname(path.resolve(f.release)), f.root);
  fs.rmSync(f.release, { recursive: true, force: true });
  assert.equal(selectReleaseVersion(f.root, '0.6.0'), '0.6.2');
  const second = buildWindows(f.options);
  assert.equal(second.version, '0.6.2');
  f.sourceIntact();
});

test('version selection reconciles both successful records using numeric version order', t => {
  const f = fixture(t);
  writeReleaseVersion(f.root, '0.9.10');
  fs.writeFileSync(f.previous.manifest, 'version: 0.9.9\n');
  assert.equal(selectReleaseVersion(f.root, '0.6.0'), '0.9.11');
  fs.writeFileSync(f.previous.manifest, 'version: 0.10.2\n');
  assert.equal(selectReleaseVersion(f.root, '0.6.0'), '0.10.3');
  assert.equal(selectReleaseVersion(f.root, '1.0.0'), '1.0.0');
  assert.deepEqual(fs.readdirSync(path.dirname(f.versionFile)), ['release-version.json'], 'Atomic recording leaves no temporary version file');
  f.sourceIntact();
});

test('a failed build leaves an existing successful version record untouched and retries the same number', t => {
  const f = fixture(t);
  writeReleaseVersion(f.root, '0.6.0');
  const bytes = fs.readFileSync(f.versionFile);
  assert.throws(() => buildWindows({ ...f.options, spawnSync: (...args) => { f.spawnSync(...args); return { status: 1 }; } }));
  assert.deepEqual(fs.readFileSync(f.versionFile), bytes);
  assert.equal(selectReleaseVersion(f.root, '0.6.0'), '0.6.1');
  assert.equal(buildWindows(f.options).version, '0.6.1');
  f.sourceIntact();
});

test('a blocked local history write keeps the successful release and derives the next version from its manifest', t => {
  const f = fixture(t);
  writeReleaseVersion(f.root, '0.6.0');
  fs.mkdirSync(f.versionFile + '.tmp');
  const result = buildWindows(f.options);
  assert.equal(result.version, '0.6.1');
  assert.equal(JSON.parse(fs.readFileSync(f.previous.manifest, 'utf8')).version, '0.6.1');
  assert.equal(JSON.parse(fs.readFileSync(f.versionFile, 'utf8')).version, '0.6.0', 'The last valid history file survives');
  assert.equal(selectReleaseVersion(f.root, '0.6.0'), '0.6.2');
  assert.equal(result.cleanup.removed.length, 3);
  assert.equal(f.warnings.length, 1);
  assert.match(f.warnings[0], /latest\.yml/);
  assert.equal(fs.existsSync(f.lock), false);
  f.sourceIntact();
});

test('invalid existing version records fail safely instead of resetting the release sequence', async t => {
  for (const [file, data] of [
    ['release-final/latest.yml', 'version: invalid\n'],
    ['release-final/latest.yml', 'version: 0.6.2-beta.1\n'],
    ['release-final/latest.yml', 'version: ['],
    ['.build/release-version.json', '{'],
    ['.build/release-version.json', '{}'],
    ['.build/release-version.json', '{"version":"0.06.2"}'],
  ]) {
    await t.test(file + ': ' + data, st => {
      const f = fixture(st), record = path.join(f.root, file);
      f.write(record, data);
      let spawned = false;
      assert.throws(() => buildWindows({ ...f.options, spawnSync: () => { spawned = true; return { status: 0 }; } }));
      assert.equal(spawned, false);
      assert.equal(fs.existsSync(f.lock), false);
      assert.equal(fs.readFileSync(record, 'utf8'), data);
      assert.ok(fs.existsSync(f.previous.installer));
      f.sourceIntact();
    });
  }
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

function dependencyFixture(t) {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'comptoir-dependency-check-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), parent);
    assert.ok(path.basename(root).startsWith('comptoir-dependency-check-'));
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  const write = (relative, value) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  };
  const source = { name: 'dependency-fixture', version: '1.0.0', devDependencies: { electron: '45.2.3', 'electron-builder': '26.18.0' } };
  const packages = Object.fromEntries([
    ['electron', '45.2.3'], ['electron-builder', '26.18.0'], ['transitive-helper', '1.2.3'],
  ].map(([name, version]) => ['node_modules/' + name, { version, resolved: 'https://registry.npmjs.org/' + name + '/-/' + name + '-' + version + '.tgz', integrity: 'sha512-fixture-' + name }]));
  const lock = { name: source.name, version: source.version, lockfileVersion: 3, packages: { '': source, ...packages } };
  const installed = { name: source.name, version: source.version, lockfileVersion: 3, packages: structuredClone(packages) };
  write('package.json', source);write('package-lock.json', lock);write('node_modules/.package-lock.json', installed);
  for (const [directory, entry] of Object.entries(packages)) write(directory + '/package.json', { name: path.basename(directory), version: entry.version });
  write('node_modules/electron/path.txt', 'electron.exe');
  write('node_modules/electron/dist/electron.exe', 'Fixture binary, never executed');
  write('node_modules/electron-builder/out/cli/cli.js', '// Fixture CLI, never executed');
  const sourceBytes = ['package.json', 'package-lock.json', 'node_modules/.package-lock.json'].map(file => [file, fs.readFileSync(path.join(root, file))]);
  const unchanged = () => {
    for (const [file, bytes] of sourceBytes) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Read-only dependency checking preserves ' + file);
  };
  return { root, write, source, lock, installed, unchanged };
}

test('an intact locked dependency installation is reused without writing manifests or starting a process', t => {
  const f = dependencyFixture(t);
  const spawn = t.mock.method(cp, 'spawnSync', () => assert.fail('Checking dependencies must remain read-only'));
  const result = checkBuildDependencies(f.root);
  assert.equal(result.ready, true);
  assert.equal(typeof result.reason, 'string');
  assert.equal(spawn.mock.callCount(), 0);
  f.unchanged();
});

test('missing installed dependencies request installation instead of trusting an existing directory', t => {
  const f = dependencyFixture(t);
  const modules = path.join(f.root, 'node_modules');
  assert.equal(path.dirname(path.resolve(modules)), f.root);
  fs.rmSync(modules, { recursive: true });
  assert.equal(checkBuildDependencies(f.root).ready, false);
  fs.mkdirSync(modules);
  assert.equal(checkBuildDependencies(f.root).ready, false);
});

test('changed declarations must have an updated source lock before dependency preparation', t => {
  const f = dependencyFixture(t);
  f.source.devDependencies['electron-builder'] = '26.19.0';
  f.write('package.json', f.source);
  assert.throws(() => checkBuildDependencies(f.root));
});

test('a changed transitive version or stale installed lock requests a clean installation', async t => {
  for (const change of ['actual version', 'installed version', 'installed integrity', 'installed source', 'extra package', 'missing required package', 'corrupt installed lock']) {
    await t.test(change, st => {
      const f = dependencyFixture(st), location = 'node_modules/transitive-helper';
      switch (change) {
        case 'actual version': f.write(location + '/package.json', { name: 'transitive-helper', version: '1.2.4' });break;
        case 'installed version': f.installed.packages[location].version = '1.2.4';break;
        case 'installed integrity': f.installed.packages[location].integrity = 'sha512-other';break;
        case 'installed source': f.installed.packages[location].resolved = 'https://example.invalid/package.tgz';break;
        case 'extra package': f.installed.packages['node_modules/extra'] = { version: '1.0.0' };break;
        case 'missing required package': delete f.installed.packages[location];break;
        case 'corrupt installed lock': f.write('node_modules/.package-lock.json', '{');break;
      }
      if (!['actual version', 'corrupt installed lock'].includes(change)) f.write('node_modules/.package-lock.json', f.installed);
      assert.equal(checkBuildDependencies(f.root).ready, false);
    });
  }
});

test('an optional dependency omitted by npm does not force endless reinstalls', t => {
  const f = dependencyFixture(t);
  f.lock.packages['node_modules/platform-optional'] = { version: '1.0.0', optional: true, os: ['darwin'], cpu: ['arm64'] };
  f.write('package-lock.json', f.lock);
  assert.equal(checkBuildDependencies(f.root).ready, true);
});

test('an incomplete Electron runtime or builder CLI triggers dependency repair', async t => {
  for (const file of ['node_modules/electron/path.txt', 'node_modules/electron/dist/electron.exe', 'node_modules/electron-builder/out/cli/cli.js']) {
    await t.test(file, st => {
      const f = dependencyFixture(st);
      fs.unlinkSync(path.join(f.root, file));
      assert.equal(checkBuildDependencies(f.root).ready, false);
    });
  }
  await t.test('wrong runtime entry point', st => {
    const f = dependencyFixture(st);
    f.write('node_modules/electron/path.txt', 'missing.exe');
    assert.equal(checkBuildDependencies(f.root).ready, false);
  });
});

test('malformed source metadata cannot silently bypass dependency verification', async t => {
  for (const file of ['package.json', 'package-lock.json']) {
    await t.test(file, st => {
      const f = dependencyFixture(st);
      f.write(file, '{');
      assert.throws(() => checkBuildDependencies(f.root));
    });
  }
});

test('lock entries outside node_modules are rejected', t => {
  const f = dependencyFixture(t);
  f.lock.packages['node_modules/../../outside'] = { version: '1.0.0' };
  f.write('package-lock.json', f.lock);
  assert.throws(() => checkBuildDependencies(f.root));
});
