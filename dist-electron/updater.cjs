"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/updater.ts
var updater_exports = {};
__export(updater_exports, {
  setupAutoUpdater: () => setupAutoUpdater
});
module.exports = __toCommonJS(updater_exports);
var import_electron_updater = require("electron-updater");
var import_electron = require("electron");
var logger = {
  info: (...args) => console.log("[Updater]", ...args),
  error: (...args) => console.error("[Updater]", ...args)
};
function setupAutoUpdater(mainWindow) {
  import_electron_updater.autoUpdater.logger = logger;
  import_electron_updater.autoUpdater.autoDownload = false;
  import_electron_updater.autoUpdater.autoInstallOnAppQuit = true;
  function sendToRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  }
  import_electron_updater.autoUpdater.on("checking-for-update", () => {
    sendToRenderer("updater:checking");
  });
  import_electron_updater.autoUpdater.on("update-available", (info) => {
    sendToRenderer("updater:available", {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    });
  });
  import_electron_updater.autoUpdater.on("update-not-available", () => {
    sendToRenderer("updater:not-available");
  });
  import_electron_updater.autoUpdater.on("download-progress", (progress) => {
    sendToRenderer("updater:progress", {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });
  import_electron_updater.autoUpdater.on("update-downloaded", (info) => {
    sendToRenderer("updater:downloaded", { version: info.version });
  });
  import_electron_updater.autoUpdater.on("error", (err) => {
    logger.error("Update error:", err);
    sendToRenderer("updater:error", { message: err?.message || String(err) });
  });
  import_electron.ipcMain.handle("updater:check", async () => {
    try {
      const result = await import_electron_updater.autoUpdater.checkForUpdates();
      return result?.updateInfo ?? null;
    } catch (err) {
      logger.error("Check failed:", err);
      return null;
    }
  });
  import_electron.ipcMain.handle("updater:download", async () => {
    try {
      await import_electron_updater.autoUpdater.downloadUpdate();
      return true;
    } catch (err) {
      logger.error("Download failed:", err);
      return false;
    }
  });
  import_electron.ipcMain.handle("updater:install", () => {
    import_electron_updater.autoUpdater.quitAndInstall(false, true);
  });
  setTimeout(() => {
    import_electron_updater.autoUpdater.checkForUpdates().catch(() => {
    });
  }, 1e4);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  setupAutoUpdater
});
