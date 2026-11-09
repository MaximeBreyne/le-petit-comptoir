'use strict';

function gameWindowOptions(preload) {
  return {
    width: 1440, height: 960, minWidth: 1100, minHeight: 760,
    fullscreen: true, backgroundColor: '#192f2a', show: false,
    webPreferences: { preload, nodeIntegration: false, contextIsolation: true, sandbox: true },
  };
}

/** Only the game's own main document may operate its window. */
function setupGameWindow({ ipcMain, getWindow, trustedUrl, defer = setImmediate }) {
  function currentWindow() {
    const win = getWindow();
    return win && !win.isDestroyed() && !win.webContents.isDestroyed() ? win : null;
  }

  function trustedWindow(event) {
    const win = currentWindow();
    if (!win || event.sender !== win.webContents ||
        event.senderFrame !== win.webContents.mainFrame ||
        event.senderFrame?.url !== trustedUrl) {
      throw new Error('Commande de fenêtre non autorisée.');
    }
    return win;
  }

  ipcMain.handle('game:quit', event => {
    const win = trustedWindow(event);
    // A normal close runs beforeunload (save) and the updater's ordinary quit hook.
    defer(() => { if (!win.isDestroyed()) win.close(); });
    return true;
  });
  ipcMain.handle('game:fullscreen:get', event => trustedWindow(event).isFullScreen());
  ipcMain.handle('game:fullscreen:toggle', event => {
    const win = trustedWindow(event);
    const fullscreen = !win.isFullScreen();
    win.setFullScreen(fullscreen);
    return fullscreen;
  });

  function attach(win) {
    const contents = win.webContents;
    const listener = (event, input) => {
      const escape = input.key === 'Escape' || input.code === 'Escape';
      const fullscreen = input.key === 'F11' || input.code === 'F11';
      if (!escape && !fullscreen) return;
      // Suppress Chromium's Escape handling and renderer keydown so a single key
      // does not both open and close the menu, or leave the native fullscreen.
      event.preventDefault();
      if (input.type !== 'keyDown' || input.isAutoRepeat || input.isComposing) return;
      if (win !== currentWindow() || contents.getURL() !== trustedUrl) return;
      if (escape) contents.send('game:escape');
      else win.setFullScreen(!win.isFullScreen());
    };
    contents.on('before-input-event', listener);
    win.once('closed', () => contents.removeListener('before-input-event', listener));
  }

  return { attach };
}

module.exports = { gameWindowOptions, setupGameWindow };
