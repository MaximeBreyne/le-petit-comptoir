'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');

const START_DELAY_MS = 10_000;
const CHECK_INTERVAL_MS = 60 * 1000;

/** Update downloads never interrupt a game. NSIS installs after a normal quit. */
function setupUpdater({
  app,
  ipcMain,
  powerMonitor,
  getWindow,
  localSource,
  autoUpdater: providedUpdater,
  platform = process.platform,
  trustedUrl = pathToFileURL(path.join(__dirname, '../dist/index.html')).href,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
}) {
  const enabled = app.isPackaged && platform === 'win32';
  const autoUpdater = enabled ? providedUpdater || require('electron-updater').autoUpdater : null;
  let status = {
    state: enabled ? 'idle' : 'disabled',
    version: app.getVersion(),
    sourceDirectory: localSource?.getDirectory() || null,
    message: enabled
      ? localSource?.getDirectory()
        ? 'Les mises à jour sont recherchées dans votre dossier local.'
        : 'Choisissez le dossier contenant les mises à jour.'
      : 'Les mises à jour automatiques sont disponibles dans le jeu installé sous Windows.',
  };
  let started = false;
  let disposed = false;
  let closing = false;
  let checking = null;
  let choosing = null;
  let initialTimer;
  let intervalTimer;
  let boundWindow;
  const updaterListeners = [];

  const getStatus = () => ({ ...status });
  const currentWindow = () => {
    const win = getWindow();
    return win && !win.isDestroyed() && !win.webContents.isDestroyed() ? win : null;
  };

  function publish(patch) {
    if (disposed) return;
    status = { ...status, ...patch };
    const win = currentWindow();
    if (win && win.webContents.getURL() === trustedUrl) {
      win.webContents.send('update:status', getStatus());
    }
  }

  function assertTrustedSender(event) {
    const win = currentWindow();
    if (!win || event.sender !== win.webContents ||
        event.senderFrame !== win.webContents.mainFrame ||
        event.senderFrame?.url !== trustedUrl) {
      throw new Error('Demande de mise à jour non autorisée.');
    }
  }

  function failed() {
    publish({
      state: 'error',
      progress: undefined,
      message: 'Mise à jour indisponible. Vous pouvez continuer à jouer ; un nouvel essai aura lieu automatiquement.',
    });
  }

  function versionFrom(info) {
    const version = info?.version;
    return typeof version === 'string' && version.length <= 64 &&
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)
      ? version : undefined;
  }

  async function check() {
    if (!enabled || disposed || closing) return getStatus();
    if (choosing) return getStatus();
    if (checking) return checking;
    if (status.state === 'downloading' || status.state === 'ready') return getStatus();
    publish({ state: 'checking', progress: undefined, message: 'Recherche de mises à jour…' });
    checking = Promise.resolve().then(async () => {
      try {
        const url = await localSource?.prepare();
        const sourceDirectory = localSource?.getDirectory() || null;
        if (!url) {
          publish({ state: 'idle', sourceDirectory, progress: undefined,
            message: 'Choisissez le dossier contenant les mises à jour.' });
          return getStatus();
        }
        if (disposed || closing) return getStatus();
        // The feed is served exclusively from a user-selected local folder.
        // Reject a programming/configuration mistake before any network call.
        const feed = new URL(url);
        if (feed.protocol !== 'http:' || feed.hostname !== '127.0.0.1' ||
            feed.username || feed.password) throw new Error('Invalid local update feed');
        autoUpdater.setFeedURL({ provider: 'generic', url: feed.href });
        autoUpdater.channel = 'latest';
        autoUpdater.allowDowngrade = false;
        publish({ sourceDirectory });
        const result = await autoUpdater.checkForUpdates();
        // The check can finish before the automatic download. Observe that promise
        // too: a network failure must not become an unhandled rejection.
        result?.downloadPromise?.catch(failed);
      } catch {
        failed();
      }
      return getStatus();
    });
    try {
      return await checking;
    } finally {
      checking = null;
    }
  }

  async function chooseSource() {
    if (!enabled || disposed || closing || checking || choosing ||
        status.state === 'downloading' || status.state === 'ready') return getStatus();
    if (!localSource) return getStatus();
    const previous = getStatus();
    choosing = Promise.resolve().then(() => localSource.choose());
    publish({ state: 'checking', message: 'Choisissez le dossier contenant les mises à jour.' });
    let selected;
    try {
      selected = await choosing;
    } catch {
      failed();
      return getStatus();
    } finally {
      choosing = null;
    }
    if (!selected) {
      publish(previous);
      return getStatus();
    }
    publish({ sourceDirectory: localSource.getDirectory() || null });
    return check();
  }

  function stopTimers() {
    closing = true;
    if (initialTimer !== undefined) timers.clearTimeout(initialTimer);
    if (intervalTimer !== undefined) timers.clearInterval(intervalTimer);
    initialTimer = intervalTimer = undefined;
  }

  // Do not launch an installer while Windows is shutting down or logging out.
  // The next ordinary game launch can discover the cached download again.
  function suspendInstall() {
    if (autoUpdater) autoUpdater.autoInstallOnAppQuit = false;
    stopTimers();
  }

  function listen(name, callback) {
    autoUpdater.on(name, callback);
    updaterListeners.push([name, callback]);
  }

  if (autoUpdater) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.autoRunAppAfterInstall = false;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.disableWebInstaller = true;
    autoUpdater.disableDifferentialDownload = true;

    listen('checking-for-update', () => publish({
      state: 'checking', progress: undefined, message: 'Recherche de mises à jour…',
    }));
    listen('update-not-available', () => publish({
      state: 'current', availableVersion: undefined, progress: undefined,
      message: 'Votre jeu est à jour.',
    }));
    listen('update-available', info => publish({
      state: 'downloading', availableVersion: versionFrom(info), progress: 0,
      message: 'Une nouvelle version se télécharge. Vous pouvez continuer à jouer.',
    }));
    listen('download-progress', info => publish({
      state: 'downloading',
      progress: Number.isFinite(info?.percent) ? Math.max(0, Math.min(100, Math.round(info.percent))) : 0,
      message: 'Téléchargement de la mise à jour en cours…',
    }));
    listen('update-downloaded', info => publish({
      state: 'ready', availableVersion: versionFrom(info), progress: 100,
      message: 'Mise à jour prête. Elle sera installée lorsque vous fermerez le jeu.',
    }));
    listen('error', failed);
  }

  ipcMain.handle('update:status', event => {
    assertTrustedSender(event);
    return getStatus();
  });
  ipcMain.handle('update:check', event => {
    assertTrustedSender(event);
    return check();
  });
  ipcMain.handle('update:choose-source', event => {
    assertTrustedSender(event);
    return chooseSource();
  });

  function start() {
    if (started || disposed || !enabled) return;
    started = true;
    boundWindow = currentWindow();
    boundWindow?.on('query-session-end', suspendInstall);
    boundWindow?.on('session-end', suspendInstall);
    powerMonitor?.on('shutdown', suspendInstall);
    app.on('before-quit', stopTimers);
    initialTimer = timers.setTimeout(() => { void check(); }, START_DELAY_MS);
    intervalTimer = timers.setInterval(() => { void check(); }, CHECK_INTERVAL_MS);
    initialTimer?.unref?.();
    intervalTimer?.unref?.();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopTimers();
    ipcMain.removeHandler('update:status');
    ipcMain.removeHandler('update:check');
    ipcMain.removeHandler('update:choose-source');
    app.removeListener('before-quit', stopTimers);
    powerMonitor?.removeListener('shutdown', suspendInstall);
    boundWindow?.removeListener('query-session-end', suspendInstall);
    boundWindow?.removeListener('session-end', suspendInstall);
    for (const [name, callback] of updaterListeners) autoUpdater.removeListener(name, callback);
    // Keep autoInstallOnAppQuit unchanged: disposing app listeners must not
    // cancel the updater's own installation handler on an ordinary quit.
  }

  return { start, check, chooseSource, getStatus, suspendInstall, dispose };
}

module.exports = { setupUpdater };
