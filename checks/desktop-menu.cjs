'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { gameWindowOptions, setupGameWindow } = require('../desktop/game-window.cjs');

function fixture() {
  const trustedUrl = 'file:///C:/game/dist/index.html';
  let fullscreen = true, closes = 0;
  const sent = [], deferred = [], handlers = new Map();
  const contents = Object.assign(new EventEmitter(), {
    isDestroyed: () => false, mainFrame: { url: trustedUrl },
    getURL: () => trustedUrl, send: (...args) => sent.push(args),
  });
  const win = Object.assign(new EventEmitter(), {
    webContents: contents, isDestroyed: () => false,
    isFullScreen: () => fullscreen, setFullScreen: value => { fullscreen = value; },
    close: () => { closes++; }, destroy: () => assert.fail('Never force-destroy the game'),
  });
  const controller = setupGameWindow({
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    getWindow: () => win, trustedUrl, defer: fn => deferred.push(fn),
  });
  controller.attach(win);
  const event = { sender: contents, senderFrame: contents.mainFrame };
  function key(input) {
    let prevented = false;
    contents.emit('before-input-event', { preventDefault: () => { prevented = true; } }, input);
    return prevented;
  }
  return { win, contents, handlers, event, key, sent, deferred, closes: () => closes };
}

test('each new game window starts in native fullscreen with isolated renderer', () => {
  const options = gameWindowOptions('C:\\game\\desktop\\preload.cjs');
  assert.equal(options.fullscreen, true);
  assert.equal(options.show, false);
  assert.ok(options.icon.endsWith(require('node:path').join('assets', 'brand', 'icon.ico')));
  assert.deepEqual(options.webPreferences, {
    preload: 'C:\\game\\desktop\\preload.cjs', nodeIntegration: false, contextIsolation: true, sandbox: true,
  });
});

test('Escape reaches the menu once and does not exit native fullscreen', () => {
  const f = fixture();
  assert.equal(f.key({ type: 'keyDown', key: 'Escape' }), true);
  assert.deepEqual(f.sent, [['game:escape']]);
  assert.equal(f.win.isFullScreen(), true);
  assert.equal(f.key({ type: 'keyDown', key: 'Escape', isAutoRepeat: true }), true);
  assert.equal(f.key({ type: 'keyUp', key: 'Escape' }), true);
  assert.equal(f.sent.length, 1);
  assert.equal(f.key({ type: 'keyDown', key: 'a', code: 'KeyA' }), false);
});

test('F11 and settings toggle the same native fullscreen state', () => {
  const f = fixture();
  assert.equal(f.key({ type: 'keyDown', key: 'F11' }), true);
  assert.equal(f.win.isFullScreen(), false);
  f.key({ type: 'keyDown', key: 'F11', isAutoRepeat: true });
  assert.equal(f.win.isFullScreen(), false);
  assert.equal(f.handlers.get('game:fullscreen:toggle')(f.event), true);
  assert.equal(f.handlers.get('game:fullscreen:get')(f.event), true);
});

test('quit schedules an ordinary close so save and updater hooks can run', () => {
  const f = fixture();
  assert.equal(f.handlers.get('game:quit')(f.event), true);
  assert.equal(f.closes(), 0);
  assert.equal(f.deferred.length, 1);
  f.deferred[0]();
  assert.equal(f.closes(), 1);
});

test('window commands reject foreign windows, frames and navigated documents', () => {
  const f = fixture();
  for (const handler of f.handlers.values()) {
    assert.throws(() => handler({ ...f.event, sender: {} }), /non autorisée/);
    assert.throws(() => handler({ ...f.event, senderFrame: { url: f.event.senderFrame.url } }), /non autorisée/);
  }
  f.contents.mainFrame.url = 'https://example.com';
  for (const handler of f.handlers.values()) assert.throws(() => handler(f.event), /non autorisée/);
  f.contents.getURL = () => 'https://example.com';
  f.key({ type: 'keyDown', key: 'Escape' });
  assert.equal(f.sent.length, 0);
});
