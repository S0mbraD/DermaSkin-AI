import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';

const logger = {
  info: (...args: unknown[]) => console.log('[Updater]', ...args),
  error: (...args: unknown[]) => console.error('[Updater]', ...args),
};

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.logger = logger as any;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  function sendToRenderer(channel: string, data?: unknown) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  }

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('updater:checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('updater:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('updater:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('updater:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    logger.error('Update error:', err);
    sendToRenderer('updater:error', { message: err?.message || String(err) });
  });

  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result?.updateInfo ?? null;
    } catch (err) {
      logger.error('Check failed:', err);
      return null;
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return true;
    } catch (err) {
      logger.error('Download failed:', err);
      return false;
    }
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 10000);
}
