import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {

  /* ── Database: Students ── */
  db: {
    students: {
      getAll: (): Promise<unknown[]> =>
        ipcRenderer.invoke('db:students:getAll'),
      get: (id: number): Promise<unknown | null> =>
        ipcRenderer.invoke('db:students:get', id),
      upsert: (student: Record<string, unknown>): Promise<void> =>
        ipcRenderer.invoke('db:students:upsert', student),
      delete: (id: number): Promise<void> =>
        ipcRenderer.invoke('db:students:delete', id),
    },

    courses: {
      getAll: (): Promise<unknown[]> =>
        ipcRenderer.invoke('db:courses:getAll'),
      upsert: (course: Record<string, unknown>): Promise<void> =>
        ipcRenderer.invoke('db:courses:upsert', course),
    },

    evaluations: {
      getByCourse: (courseId: string): Promise<unknown[]> =>
        ipcRenderer.invoke('db:evaluations:getByCourse', courseId),
      getByStudent: (studentId: number): Promise<unknown[]> =>
        ipcRenderer.invoke('db:evaluations:getByStudent', studentId),
      upsert: (evaluation: Record<string, unknown>): Promise<void> =>
        ipcRenderer.invoke('db:evaluations:upsert', evaluation),
    },

    analyses: {
      getAll: (courseId?: string): Promise<unknown[]> =>
        ipcRenderer.invoke('db:analyses:getAll', courseId),
      get: (id: string): Promise<unknown | null> =>
        ipcRenderer.invoke('db:analyses:get', id),
      save: (analysis: Record<string, unknown>): Promise<void> =>
        ipcRenderer.invoke('db:analyses:save', analysis),
      delete: (id: string): Promise<void> =>
        ipcRenderer.invoke('db:analyses:delete', id),
    },

    settings: {
      get: (key: string): Promise<string | null> =>
        ipcRenderer.invoke('db:settings:get', key),
      set: (key: string, value: string): Promise<void> =>
        ipcRenderer.invoke('db:settings:set', key, value),
      getAll: (): Promise<Record<string, string>> =>
        ipcRenderer.invoke('db:settings:getAll'),
    },

    seed: {
      students: (students: Record<string, unknown>[]): Promise<number> =>
        ipcRenderer.invoke('db:seed:students', students),
      courses: (courses: Record<string, unknown>[]): Promise<number> =>
        ipcRenderer.invoke('db:seed:courses', courses),
    },
  },

  /* ── File Operations ── */
  file: {
    openVideoDialog: (): Promise<{ path: string; name: string; size: number } | null> =>
      ipcRenderer.invoke('file:openVideoDialog'),
    readVideoAsUrl: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('file:readVideoAsUrl', filePath),
    saveReport: (html: string, defaultName: string): Promise<string | null> =>
      ipcRenderer.invoke('file:saveReport', html, defaultName),
    copyVideoToAppData: (srcPath: string): Promise<string> =>
      ipcRenderer.invoke('file:copyVideoToAppData', srcPath),
    getAppDataPath: (): Promise<string> =>
      ipcRenderer.invoke('file:getAppDataPath'),
  },

  /* ── App Controls ── */
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('app:getVersion'),
    minimize: (): void => ipcRenderer.send('app:minimize'),
    maximize: (): void => ipcRenderer.send('app:maximize'),
    close: (): void => ipcRenderer.send('app:close'),
  },

  updater: {
    check: (): Promise<unknown> => ipcRenderer.invoke('updater:check'),
    download: (): Promise<boolean> => ipcRenderer.invoke('updater:download'),
    install: (): void => { ipcRenderer.invoke('updater:install'); },
    onChecking: (cb: () => void) => {
      ipcRenderer.on('updater:checking', cb);
      return () => { ipcRenderer.removeListener('updater:checking', cb); };
    },
    onAvailable: (cb: (info: unknown) => void) => {
      ipcRenderer.on('updater:available', (_e, info) => cb(info));
      return () => { ipcRenderer.removeAllListeners('updater:available'); };
    },
    onNotAvailable: (cb: () => void) => {
      ipcRenderer.on('updater:not-available', cb);
      return () => { ipcRenderer.removeListener('updater:not-available', cb); };
    },
    onProgress: (cb: (progress: unknown) => void) => {
      ipcRenderer.on('updater:progress', (_e, p) => cb(p));
      return () => { ipcRenderer.removeAllListeners('updater:progress'); };
    },
    onDownloaded: (cb: (info: unknown) => void) => {
      ipcRenderer.on('updater:downloaded', (_e, info) => cb(info));
      return () => { ipcRenderer.removeAllListeners('updater:downloaded'); };
    },
    onError: (cb: (err: unknown) => void) => {
      ipcRenderer.on('updater:error', (_e, err) => cb(err));
      return () => { ipcRenderer.removeAllListeners('updater:error'); };
    },
  },

  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
