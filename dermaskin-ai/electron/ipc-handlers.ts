import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import * as database from './database';

export function registerIpcHandlers(): void {

  /* ════════ Students ════════ */

  ipcMain.handle('db:students:getAll', () => {
    return database.getAllStudents();
  });

  ipcMain.handle('db:students:get', (_e, id: number) => {
    return database.getStudent(id);
  });

  ipcMain.handle('db:students:upsert', (_e, student: Record<string, unknown>) => {
    database.upsertStudent(student);
    return { ok: true };
  });

  ipcMain.handle('db:students:delete', (_e, id: number) => {
    database.deleteStudent(id);
    return { ok: true };
  });

  /* ════════ Courses ════════ */

  ipcMain.handle('db:courses:getAll', () => {
    return database.getAllCourses();
  });

  ipcMain.handle('db:courses:upsert', (_e, course: Record<string, unknown>) => {
    database.upsertCourse(course);
    return { ok: true };
  });

  /* ════════ Evaluations ════════ */

  ipcMain.handle('db:evaluations:getByCourse', (_e, courseId: string) => {
    return database.getEvaluations(courseId);
  });

  ipcMain.handle('db:evaluations:getByStudent', (_e, studentId: number) => {
    return database.getStudentEvaluations(studentId);
  });

  ipcMain.handle('db:evaluations:upsert', (_e, evaluation: Record<string, unknown>) => {
    database.upsertEvaluation(evaluation);
    return { ok: true };
  });

  /* ════════ Analysis Results ════════ */

  ipcMain.handle('db:analyses:getAll', (_e, courseId?: string) => {
    return database.getAnalyses(courseId);
  });

  ipcMain.handle('db:analyses:get', (_e, id: string) => {
    return database.getAnalysis(id);
  });

  ipcMain.handle('db:analyses:save', (_e, analysis: Record<string, unknown>) => {
    database.saveAnalysis(analysis);
    return { ok: true };
  });

  ipcMain.handle('db:analyses:delete', (_e, id: string) => {
    database.deleteAnalysis(id);
    return { ok: true };
  });

  /* ════════ Settings ════════ */

  ipcMain.handle('db:settings:get', (_e, key: string) => {
    return database.getSetting(key);
  });

  ipcMain.handle('db:settings:set', (_e, key: string, value: string) => {
    database.setSetting(key, value);
    return { ok: true };
  });

  ipcMain.handle('db:settings:getAll', () => {
    return database.getAllSettings();
  });

  /* ════════ File Operations ════════ */

  ipcMain.handle('file:openVideoDialog', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      title: '选择操作视频文件',
      filters: [
        { name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const filePath = result.filePaths[0];
    const stat = fs.statSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
    };
  });

  ipcMain.handle('file:readVideoAsUrl', async (_e, filePath: string) => {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4', avi: 'video/x-msvideo', mov: 'video/quicktime',
      mkv: 'video/x-matroska', webm: 'video/webm', flv: 'video/x-flv',
    };
    const mime = mimeMap[ext] || 'video/mp4';
    const base64 = buffer.toString('base64');
    return `data:${mime};base64,${base64}`;
  });

  ipcMain.handle('file:saveReport', async (_e, html: string, defaultName: string) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    const result = await dialog.showSaveDialog(win, {
      title: '保存分析报告',
      defaultPath: defaultName,
      filters: [
        { name: 'HTML 文件', extensions: ['html'] },
        { name: 'PDF 文件', extensions: ['pdf'] },
      ],
    });

    if (result.canceled || !result.filePath) return null;

    if (result.filePath.endsWith('.pdf')) {
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        landscape: false,
      });
      fs.writeFileSync(result.filePath, pdfData);
    } else {
      fs.writeFileSync(result.filePath, html, 'utf-8');
    }

    return result.filePath;
  });

  ipcMain.handle('file:copyVideoToAppData', async (_e, srcPath: string) => {
    const videosDir = path.join(app.getPath('userData'), 'videos');
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

    const destName = `${Date.now()}_${path.basename(srcPath)}`;
    const destPath = path.join(videosDir, destName);
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  });

  ipcMain.handle('file:getAppDataPath', () => {
    return app.getPath('userData');
  });

  /* ════════ App Controls ════════ */

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.on('app:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.on('app:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.isMaximized() ? win.unmaximize() : win.maximize();
    }
  });

  ipcMain.on('app:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  /* ════════ Seed Data ════════ */

  ipcMain.handle('db:seed:students', (_e, students: Record<string, unknown>[]) => {
    return database.seedStudentsIfEmpty(students);
  });

  ipcMain.handle('db:seed:courses', (_e, courses: Record<string, unknown>[]) => {
    return database.seedCoursesIfEmpty(courses);
  });
}
