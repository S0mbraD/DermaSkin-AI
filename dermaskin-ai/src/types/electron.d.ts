export interface VideoFileInfo {
  path: string;
  name: string;
  size: number;
}

export interface ElectronDBApi {
  students: {
    getAll(): Promise<unknown[]>;
    get(id: number): Promise<unknown | null>;
    upsert(student: Record<string, unknown>): Promise<void>;
    delete(id: number): Promise<void>;
  };
  courses: {
    getAll(): Promise<unknown[]>;
    upsert(course: Record<string, unknown>): Promise<void>;
  };
  evaluations: {
    getByCourse(courseId: string): Promise<unknown[]>;
    getByStudent(studentId: number): Promise<unknown[]>;
    upsert(evaluation: Record<string, unknown>): Promise<void>;
  };
  analyses: {
    getAll(courseId?: string): Promise<unknown[]>;
    get(id: string): Promise<unknown | null>;
    save(analysis: Record<string, unknown>): Promise<void>;
    delete(id: string): Promise<void>;
  };
  settings: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    getAll(): Promise<Record<string, string>>;
  };
  seed: {
    students(students: Record<string, unknown>[]): Promise<number>;
    courses(courses: Record<string, unknown>[]): Promise<number>;
  };
}

export interface ElectronFileApi {
  openVideoDialog(): Promise<VideoFileInfo | null>;
  readVideoAsUrl(filePath: string): Promise<string>;
  saveReport(html: string, defaultName: string): Promise<string | null>;
  copyVideoToAppData(srcPath: string): Promise<string>;
  getAppDataPath(): Promise<string>;
}

export interface ElectronAppApi {
  getVersion(): Promise<string>;
  minimize(): void;
  maximize(): void;
  close(): void;
}

export interface ElectronAPI {
  db: ElectronDBApi;
  file: ElectronFileApi;
  app: ElectronAppApi;
  isElectron: true;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
