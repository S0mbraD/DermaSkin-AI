"use strict";

// electron/preload.ts
var import_electron = require("electron");
var electronAPI = {
  /* ── Database: Students ── */
  db: {
    students: {
      getAll: () => import_electron.ipcRenderer.invoke("db:students:getAll"),
      get: (id) => import_electron.ipcRenderer.invoke("db:students:get", id),
      upsert: (student) => import_electron.ipcRenderer.invoke("db:students:upsert", student),
      delete: (id) => import_electron.ipcRenderer.invoke("db:students:delete", id)
    },
    courses: {
      getAll: () => import_electron.ipcRenderer.invoke("db:courses:getAll"),
      upsert: (course) => import_electron.ipcRenderer.invoke("db:courses:upsert", course)
    },
    evaluations: {
      getByCourse: (courseId) => import_electron.ipcRenderer.invoke("db:evaluations:getByCourse", courseId),
      getByStudent: (studentId) => import_electron.ipcRenderer.invoke("db:evaluations:getByStudent", studentId),
      upsert: (evaluation) => import_electron.ipcRenderer.invoke("db:evaluations:upsert", evaluation)
    },
    analyses: {
      getAll: (courseId) => import_electron.ipcRenderer.invoke("db:analyses:getAll", courseId),
      get: (id) => import_electron.ipcRenderer.invoke("db:analyses:get", id),
      save: (analysis) => import_electron.ipcRenderer.invoke("db:analyses:save", analysis),
      delete: (id) => import_electron.ipcRenderer.invoke("db:analyses:delete", id)
    },
    settings: {
      get: (key) => import_electron.ipcRenderer.invoke("db:settings:get", key),
      set: (key, value) => import_electron.ipcRenderer.invoke("db:settings:set", key, value),
      getAll: () => import_electron.ipcRenderer.invoke("db:settings:getAll")
    },
    seed: {
      students: (students) => import_electron.ipcRenderer.invoke("db:seed:students", students),
      courses: (courses) => import_electron.ipcRenderer.invoke("db:seed:courses", courses)
    }
  },
  /* ── File Operations ── */
  file: {
    openVideoDialog: () => import_electron.ipcRenderer.invoke("file:openVideoDialog"),
    readVideoAsUrl: (filePath) => import_electron.ipcRenderer.invoke("file:readVideoAsUrl", filePath),
    saveReport: (html, defaultName) => import_electron.ipcRenderer.invoke("file:saveReport", html, defaultName),
    copyVideoToAppData: (srcPath) => import_electron.ipcRenderer.invoke("file:copyVideoToAppData", srcPath),
    getAppDataPath: () => import_electron.ipcRenderer.invoke("file:getAppDataPath")
  },
  /* ── App Controls ── */
  app: {
    getVersion: () => import_electron.ipcRenderer.invoke("app:getVersion"),
    minimize: () => import_electron.ipcRenderer.send("app:minimize"),
    maximize: () => import_electron.ipcRenderer.send("app:maximize"),
    close: () => import_electron.ipcRenderer.send("app:close")
  },
  updater: {
    check: () => import_electron.ipcRenderer.invoke("updater:check"),
    download: () => import_electron.ipcRenderer.invoke("updater:download"),
    install: () => {
      import_electron.ipcRenderer.invoke("updater:install");
    },
    onChecking: (cb) => {
      import_electron.ipcRenderer.on("updater:checking", cb);
      return () => {
        import_electron.ipcRenderer.removeListener("updater:checking", cb);
      };
    },
    onAvailable: (cb) => {
      import_electron.ipcRenderer.on("updater:available", (_e, info) => cb(info));
      return () => {
        import_electron.ipcRenderer.removeAllListeners("updater:available");
      };
    },
    onNotAvailable: (cb) => {
      import_electron.ipcRenderer.on("updater:not-available", cb);
      return () => {
        import_electron.ipcRenderer.removeListener("updater:not-available", cb);
      };
    },
    onProgress: (cb) => {
      import_electron.ipcRenderer.on("updater:progress", (_e, p) => cb(p));
      return () => {
        import_electron.ipcRenderer.removeAllListeners("updater:progress");
      };
    },
    onDownloaded: (cb) => {
      import_electron.ipcRenderer.on("updater:downloaded", (_e, info) => cb(info));
      return () => {
        import_electron.ipcRenderer.removeAllListeners("updater:downloaded");
      };
    },
    onError: (cb) => {
      import_electron.ipcRenderer.on("updater:error", (_e, err) => cb(err));
      return () => {
        import_electron.ipcRenderer.removeAllListeners("updater:error");
      };
    }
  },
  isElectron: true
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
