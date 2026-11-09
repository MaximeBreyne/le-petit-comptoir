'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { cleanReleases } = require('../scripts/clean-releases.cjs');

function fixture(t, { linkedRelease = false } = {}) {
  const temporaryParent = fs.realpathSync(os.tmpdir());
  const temporary = fs.mkdtempSync(path.join(temporaryParent, 'comptoir-release-cleanup-'));
  const root = path.join(temporary, 'project');
  const outside = path.join(temporary, 'outside-project');
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  t.after(() => {
    // Remove only this test's freshly-created tree, never an arbitrary path.
    assert.equal(path.dirname(path.resolve(temporary)), temporaryParent);
    assert.ok(path.basename(temporary).startsWith('comptoir-release-cleanup-'));
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  const release = path.join(root, 'release-final');
  if (linkedRelease) fs.symlinkSync(outside, release, 'junction');
  else fs.mkdirSync(release);
  const currentBuild = path.join(release, 'build-200');
  const oldBuild = path.join(release, 'build-100');
  const installer = 'Le-Petit-Comptoir-Bar-0.6.1-Setup.exe';
  const oldInstaller = 'Le-Petit-Comptoir-Bar-0.5.0-Setup.exe';
  const artifacts = [installer, installer + '.blockmap', 'latest.yml'];
  const data = Buffer.from('Current installer fixture, not an executable.');
  const sha512 = createHash('sha512').update(data).digest('base64');
  const manifest = JSON.stringify({ version: '0.6.1', files: [{ url: installer, size: data.length, sha512 }], path: installer, sha512 });
  const write = (name, value = 'fixture') => {
    fs.mkdirSync(path.dirname(name), { recursive: true });
    fs.writeFileSync(name, value);
    return name;
  };
  for (const directory of [currentBuild, release]) {
    write(path.join(directory, installer), data);
    write(path.join(directory, installer + '.blockmap'), 'current blockmap');
    write(path.join(directory, 'latest.yml'), manifest);
  }
  write(path.join(currentBuild, 'win-unpacked', 'resources', 'app.asar'), 'current unpacked game');
  write(path.join(oldBuild, 'win-unpacked', 'resources', 'app.asar'), 'old unpacked game');
  write(path.join(oldBuild, oldInstaller), 'old installer duplicate');
  write(path.join(release, oldInstaller), 'old root installer');
  write(path.join(release, oldInstaller + '.blockmap'), 'old root blockmap');
  const options = { root, currentBuild, artifacts };
  const oldPaths = [oldBuild, path.join(release, oldInstaller), path.join(release, oldInstaller + '.blockmap')];
  return { root, outside, release, currentBuild, oldBuild, installer, oldInstaller, artifacts, options, oldPaths, write };
}

function assertOldReleasePresent(f) {
  for (const entry of f.oldPaths) assert.ok(fs.existsSync(entry), 'Previous release must survive: ' + entry);
  assert.equal(fs.readFileSync(path.join(f.oldBuild, 'win-unpacked', 'resources', 'app.asar'), 'utf8'), 'old unpacked game');
}

test('successful publication removes obsolete builds and versioned artifacts, preserving current release and project data', t => {
  const f = fixture(t);
  // A failed partial build is disposable too, even if its timestamp sorts after the retained build.
  const orphan = path.join(f.release, 'build-999');
  f.write(path.join(orphan, 'win-unpacked', 'partial-download.tmp'), 'partial build');
  const prerelease = path.join(f.release, 'Le-Petit-Comptoir-Bar-0.6.0-beta.2-Setup.exe');
  f.write(prerelease, 'old prerelease');
  f.write(prerelease + '.blockmap', 'old prerelease blockmap');
  const preserved = [
    f.write(path.join(f.root, 'dist', 'game.js'), 'source'),
    f.write(path.join(f.root, '.build', 'toolchain', 'node.exe'), 'compiler'),
    f.write(path.join(f.root, '.build', 'builder-cache', 'archive.zip'), 'offline cache'),
    f.write(path.join(f.root, 'node_modules', 'electron', 'dist', 'electron.exe'), 'dependency'),
    f.write(path.join(f.root, 'profile', 'save.json'), 'player save'),
    f.write(path.join(f.release, 'notes.txt'), 'user notes'),
    f.write(path.join(f.release, 'another-game-0.1.0-Setup.exe'), 'unrelated program'),
    f.write(path.join(f.release, 'build-backup', 'save.json'), 'manual backup'),
  ];
  const expectedRemoved = [...f.oldPaths, orphan, prerelease, prerelease + '.blockmap'];
  const before = preserved.map(file => fs.readFileSync(file));
  const result = cleanReleases(f.options);
  assert.deepEqual(new Set(result.removed), new Set(expectedRemoved));
  assert.ok(result.removedBytes > 0, 'Report reclaimed disk space');
  assert.deepEqual(result.warnings, []);
  for (const entry of expectedRemoved) assert.equal(fs.existsSync(entry), false, entry);
  for (let index = 0; index < preserved.length; index++) assert.deepEqual(fs.readFileSync(preserved[index]), before[index]);
  for (const directory of [f.release, f.currentBuild]) {
    for (const name of f.artifacts) assert.ok(fs.existsSync(path.join(directory, name)), name);
  }
  assert.equal(fs.readFileSync(path.join(f.currentBuild, 'win-unpacked', 'resources', 'app.asar'), 'utf8'), 'current unpacked game');
  const again = cleanReleases(f.options);
  assert.deepEqual(again.removed, []);
  assert.equal(again.removedBytes, 0);
  assert.deepEqual(again.warnings, []);
});

test('a manifest not yet published prevents deletion of the previous working release', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.release, 'latest.yml'), JSON.stringify({ version: '0.5.0' }));
  assert.throws(() => cleanReleases(f.options));
  assertOldReleasePresent(f);
});

test('missing or truncated published artifacts prevent cleanup', async t => {
  for (const defect of ['installer missing', 'blockmap missing', 'manifest missing', 'installer truncated']) {
    await t.test(defect, st => {
      const f = fixture(st);
      if (defect === 'installer truncated') fs.writeFileSync(path.join(f.release, f.installer), 'incomplete');
      else {
        const file = defect.startsWith('installer') ? f.installer : defect.startsWith('blockmap') ? f.installer + '.blockmap' : 'latest.yml';
        fs.unlinkSync(path.join(f.release, file));
      }
      assert.throws(() => cleanReleases(f.options));
      assertOldReleasePresent(f);
    });
  }
});

test('missing retained build artifacts prevent cleanup', t => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.currentBuild, f.installer));
  assert.throws(() => cleanReleases(f.options));
  assertOldReleasePresent(f);
});

test('same-size corruption in a published installer or blockmap prevents deletion', async t => {
  for (const type of ['installer', 'blockmap']) {
    await t.test(type, st => {
      const f = fixture(st);
      const filename = type === 'installer' ? f.installer : f.installer + '.blockmap';
      const target = path.join(f.release, filename);
      const corrupted = fs.readFileSync(target);
      corrupted[0] ^= 0xff;
      fs.writeFileSync(target, corrupted);
      assert.throws(() => cleanReleases(f.options));
      assertOldReleasePresent(f);
    });
  }
});

test('retained build must be a real generated directory directly inside release-final', async t => {
  for (const kind of ['outside project', 'release root', 'unknown name', 'nested directory', 'regular file']) {
    await t.test(kind, st => {
      const f = fixture(st);
      let currentBuild;
      if (kind === 'outside project') currentBuild = path.join(f.outside, 'build-300');
      else if (kind === 'release root') currentBuild = f.release;
      else if (kind === 'unknown name') currentBuild = path.join(f.release, 'backup');
      else if (kind === 'nested directory') currentBuild = path.join(f.currentBuild, 'build-300');
      else currentBuild = f.write(path.join(f.release, 'build-300'), 'not a directory');
      if (!fs.existsSync(currentBuild)) fs.mkdirSync(currentBuild, { recursive: true });
      assert.throws(() => cleanReleases({ ...f.options, currentBuild }));
      assertOldReleasePresent(f);
    });
  }
});

test('release-final may not redirect outside the project through a junction', t => {
  const f = fixture(t, { linkedRelease: true });
  assert.throws(() => cleanReleases(f.options));
  assertOldReleasePresent(f);
});

test('a retained build junction is refused before any obsolete artifacts are removed', t => {
  const f = fixture(t);
  const redirected = path.join(f.release, 'build-300');
  const protectedFile = f.write(path.join(f.outside, 'important.txt'), 'keep outside file');
  fs.symlinkSync(f.outside, redirected, 'junction');
  assert.throws(() => cleanReleases({ ...f.options, currentBuild: redirected }));
  assertOldReleasePresent(f);
  assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'keep outside file');
});

test('obsolete build junctions are skipped with a warning without following their targets', t => {
  const f = fixture(t);
  const redirected = path.join(f.release, 'build-300');
  const protectedFile = f.write(path.join(f.outside, 'important.txt'), 'keep outside file');
  fs.symlinkSync(f.outside, redirected, 'junction');
  const result = cleanReleases(f.options);
  assert.ok(result.warnings.length > 0);
  assert.ok(fs.lstatSync(redirected).isSymbolicLink());
  assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'keep outside file');
  for (const old of f.oldPaths) assert.equal(fs.existsSync(old), false);
});

test('a junction nested in an obsolete build leaves that candidate untouched and reports it', t => {
  const f = fixture(t);
  const protectedFile = f.write(path.join(f.outside, 'important.txt'), 'keep outside file');
  fs.symlinkSync(f.outside, path.join(f.oldBuild, 'linked-resources'), 'junction');
  const result = cleanReleases(f.options);
  assert.ok(result.warnings.length > 0);
  assert.ok(fs.existsSync(f.oldBuild));
  assert.equal(fs.readFileSync(path.join(f.oldBuild, 'win-unpacked', 'resources', 'app.asar'), 'utf8'), 'old unpacked game');
  assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'keep outside file');
});
