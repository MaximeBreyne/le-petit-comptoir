'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { setupUpdater } = require('../desktop/updater.cjs');

function fixture(options = {}) {
  const trustedUrl = 'file:///C:/game/dist/index.html';
  const app = Object.assign(new EventEmitter(), { isPackaged: true, getVersion: () => '0.4.0' });
  const powerMonitor = new EventEmitter();
  const sent = [];
  const webContents = {
    mainFrame: { url: trustedUrl }, isDestroyed: () => false,
    getURL: () => trustedUrl, send: (...args) => sent.push(args),
  };
  const win = Object.assign(new EventEmitter(), { webContents, isDestroyed: () => false });
  const handlers = new Map();
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn), removeHandler: name => handlers.delete(name) };
  const scheduled = new Map();
  const addTimer = (type, fn, delay) => { const token = { type, fn, delay, unref() {} }; scheduled.set(token, token); return token; };
  const timers = {
    setTimeout: (fn, delay) => addTimer('timeout', fn, delay),
    setInterval: (fn, delay) => addTimer('interval', fn, delay),
    clearTimeout: token => scheduled.delete(token), clearInterval: token => scheduled.delete(token),
  };
  let checks = 0;
  const autoUpdater = Object.assign(new EventEmitter(), {
    checkForUpdates: async () => { checks++; autoUpdater.emit('update-not-available'); return {}; },
    quitAndInstall: () => assert.fail('The updater must never interrupt the game'),
    setFeedURL: feed => { autoUpdater.feed = feed; },
  });
  const localSource = {
    directory: options.noSource ? null : 'C:\\game-updates',
    getDirectory() { return this.directory; },
    async prepare() { return this.directory ? 'http://127.0.0.1:12345/' : null; },
    async choose() { this.directory = 'D:\\new-updates'; return 'http://127.0.0.1:12345/'; },
  };
  Object.assign(app, options.app);
  const controller = setupUpdater({ app, ipcMain, powerMonitor, getWindow: () => win, autoUpdater, localSource,
    trustedUrl, platform: options.platform || 'win32', timers });
  const event = { sender: webContents, senderFrame: webContents.mainFrame };
  return { app, powerMonitor, win, webContents, handlers, scheduled, autoUpdater, localSource, controller, event, sent, checks: () => checks };
}

test('packaged Windows checks after startup and periodically; background downloads never restart', async () => {
  const f = fixture();
  f.controller.start(); f.controller.start();
  assert.deepEqual([...f.scheduled.values()].map(t => t.delay), [10_000, 60 * 1000]);
  assert.equal(f.checks(), 0);
  const initial = [...f.scheduled.values()].find(t => t.type === 'timeout');
  initial.fn(); await f.controller.check();
  assert.equal(f.checks(), 1);
  assert.equal(f.controller.getStatus().state, 'current');
  assert.equal(f.autoUpdater.autoDownload, true);
  assert.equal(f.autoUpdater.autoInstallOnAppQuit, true);
  assert.equal(f.autoUpdater.allowPrerelease, false);
  assert.equal(f.autoUpdater.allowDowngrade, false);
  assert.equal(f.autoUpdater.disableWebInstaller, true);
  assert.equal(f.autoUpdater.disableDifferentialDownload, true);
  assert.deepEqual(f.autoUpdater.feed, { provider: 'generic', url: 'http://127.0.0.1:12345/' });
  f.autoUpdater.emit('update-available', { version: '0.5.0' });
  f.autoUpdater.emit('download-progress', { percent: 37.6 });
  assert.equal(f.controller.getStatus().progress, 38);
  await f.controller.check();
  assert.equal(f.checks(), 1, 'Do not check again while a download is active');
  f.autoUpdater.emit('update-downloaded', { version: '0.5.0' });
  assert.equal(f.controller.getStatus().state, 'ready');
  await f.controller.check();
  assert.equal(f.checks(), 1, 'Do not replace a ready update');
  f.app.emit('before-quit');
  assert.equal(f.scheduled.size, 0);
  assert.equal(f.autoUpdater.autoInstallOnAppQuit, true, 'Ordinary exit still installs');
  f.controller.dispose();
  assert.equal(f.autoUpdater.autoInstallOnAppQuit, true);
});

test('development and other platforms never check or schedule updates', async () => {
  for (const options of [{ app: { isPackaged: false } }, { platform: 'linux' }]) {
    const f = fixture(options); f.controller.start();
    assert.equal((await f.controller.check()).state, 'disabled');
    assert.equal(f.scheduled.size, 0);
    assert.equal(f.checks(), 0);
    assert.equal(f.autoUpdater.autoDownload, undefined);
    f.controller.dispose();
  }
});

test('concurrent checks share a request and network failures can be retried', async () => {
  const f = fixture(); let reject; let requests = 0;
  f.autoUpdater.checkForUpdates = () => { requests++; return new Promise((_, fail) => { reject = fail; }); };
  const first = f.controller.check(), second = f.controller.check();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(requests, 1);
  reject(new Error('offline with private URL/token'));
  await Promise.all([first, second]);
  assert.equal(f.controller.getStatus().state, 'error');
  assert.doesNotMatch(f.controller.getStatus().message, /private URL|token/);
  f.autoUpdater.checkForUpdates = async () => { requests++; f.autoUpdater.emit('update-not-available'); return {}; };
  await f.controller.check();
  assert.equal(requests, 2);
  assert.equal(f.controller.getStatus().state, 'current');
  f.controller.dispose();
});

test('download failures are observed and UI receives only sanitized fields', async () => {
  const f = fixture();
  f.autoUpdater.checkForUpdates = async () => ({ downloadPromise: Promise.reject(new Error('failed download')) });
  await f.controller.check(); await Promise.resolve();
  assert.equal(f.controller.getStatus().state, 'error');
  f.autoUpdater.emit('update-available', { version: '<img onerror=bad>', releaseNotes: '<script>bad</script>', token: 'secret' });
  f.autoUpdater.emit('download-progress', { percent: Infinity, transferred: 'secret' });
  assert.equal(f.controller.getStatus().availableVersion, undefined);
  assert.equal(f.controller.getStatus().progress, 0);
  assert.doesNotMatch(JSON.stringify(f.sent), /<script>|<img|secret/);
  f.autoUpdater.emit('download-progress', { percent: 200 });
  assert.equal(f.controller.getStatus().progress, 100);
  f.autoUpdater.emit('error', new Error('offline'));
  assert.equal(f.controller.getStatus().state, 'error');
  f.controller.dispose();
});

test('IPC rejects foreign windows, subframes and unexpected documents', async () => {
  const f = fixture();
  assert.equal(f.handlers.get('update:status')(f.event).version, '0.4.0');
  const requests = ['update:status', 'update:check', 'update:choose-source'];
  for (const name of requests) {
    assert.throws(() => f.handlers.get(name)({ ...f.event, sender: {} }), /non autorisée/);
    assert.throws(() => f.handlers.get(name)({ ...f.event, senderFrame: { url: f.webContents.mainFrame.url } }), /non autorisée/);
    const original = f.webContents.mainFrame.url;
    f.webContents.mainFrame.url = 'https://example.com';
    assert.throws(() => f.handlers.get(name)(f.event), /non autorisée/);
    f.webContents.mainFrame.url = original;
  }
  await f.handlers.get('update:check')(f.event);
  assert.equal(f.checks(), 1);
  f.controller.dispose(); assert.equal(f.handlers.size, 0);
});

test('Windows session end and OS shutdown suppress install; normal quit does not', () => {
  for (const event of ['query-session-end', 'session-end', 'shutdown']) {
    const f = fixture(); f.controller.start();
    f.autoUpdater.emit('update-downloaded', { version: '0.5.0' });
    (event === 'shutdown' ? f.powerMonitor : f.win).emit(event);
    assert.equal(f.autoUpdater.autoInstallOnAppQuit, false);
    assert.equal(f.scheduled.size, 0);
    f.controller.dispose();
    assert.equal(f.win.listenerCount('query-session-end'), 0);
    assert.equal(f.powerMonitor.listenerCount('shutdown'), 0);
  }
});

test('no selected source means no update network request; selection enables local checks', async () => {
  const f = fixture({ noSource: true });
  assert.equal(f.controller.getStatus().sourceDirectory, null);
  await f.controller.check();
  assert.equal(f.checks(), 0);
  assert.equal(f.autoUpdater.feed, undefined);
  assert.equal(f.controller.getStatus().state, 'idle');
  assert.match(f.controller.getStatus().message, /Choisissez le dossier/);
  await f.handlers.get('update:choose-source')(f.event);
  assert.equal(f.checks(), 1);
  assert.equal(f.controller.getStatus().sourceDirectory, 'D:\\new-updates');
  assert.equal(f.controller.getStatus().state, 'current');
  f.controller.dispose();
});

test('source changes are blocked during a check, download or ready installation', async () => {
  const f = fixture(); let choices = 0; let finish;
  f.localSource.choose = async () => { choices++; return 'http://127.0.0.1:12345/'; };
  f.localSource.prepare = () => new Promise(resolve => { finish = resolve; });
  const pending = f.controller.check();
  await Promise.resolve();
  await f.controller.chooseSource();
  assert.equal(choices, 0);
  finish('http://127.0.0.1:12345/'); await pending;
  f.autoUpdater.emit('update-available', { version: '0.5.0' });
  await f.controller.chooseSource(); assert.equal(choices, 0);
  f.autoUpdater.emit('update-downloaded', { version: '0.5.0' });
  await f.controller.chooseSource(); assert.equal(choices, 0);
  f.controller.dispose();
});

test('cancelling a folder chooser preserves status and does not issue requests', async () => {
  const f = fixture();
  await f.controller.check();
  const prior = f.controller.getStatus();
  f.localSource.choose = async () => null;
  await f.controller.chooseSource();
  assert.deepEqual(f.controller.getStatus(), prior);
  assert.equal(f.checks(), 1);
  f.controller.dispose();
});

test('an external feed is rejected before invoking electron-updater', async () => {
  const f = fixture();
  f.localSource.prepare = async () => 'https://example.com/releases/';
  await f.controller.check();
  assert.equal(f.checks(), 0);
  assert.equal(f.autoUpdater.feed, undefined);
  assert.equal(f.controller.getStatus().state, 'error');
  f.controller.dispose();
});
