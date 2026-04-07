"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron4 = require("electron");
var import_path3 = __toESM(require("path"), 1);

// electron/database.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_path = __toESM(require("path"), 1);
var import_electron = require("electron");
var db;
function getDbPath() {
  const userDataPath = import_electron.app.getPath("userData");
  return import_path.default.join(userDataPath, "dermaskin.db");
}
function initDatabase() {
  if (db) return db;
  const dbPath = getDbPath();
  db = new import_better_sqlite3.default(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  createTables();
  return db;
}
function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id            INTEGER PRIMARY KEY,
      name          TEXT NOT NULL,
      avatar        TEXT DEFAULT '',
      grade         TEXT DEFAULT '',
      group_name    TEXT DEFAULT '',
      sessions_count  INTEGER DEFAULT 0,
      attendance      REAL DEFAULT 0,
      avg_attention   REAL DEFAULT 0,
      avg_engagement  REAL DEFAULT 0,
      knowledge_mastery REAL DEFAULT 0,
      practice_hours  REAL DEFAULT 0,
      interventions   INTEGER DEFAULT 0,
      recent_scores   TEXT DEFAULT '[]',
      skills          TEXT DEFAULT '{}',
      epa_progress    TEXT DEFAULT '{}',
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      short_name  TEXT NOT NULL,
      video_src   TEXT DEFAULT '',
      rubric      TEXT NOT NULL DEFAULT '[]',
      evidence_text TEXT DEFAULT '{}',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL,
      course_id   TEXT NOT NULL,
      scores      TEXT NOT NULL DEFAULT '[]',
      timestamps  TEXT NOT NULL DEFAULT '[]',
      total_score INTEGER DEFAULT 0,
      grade       TEXT DEFAULT '',
      evaluated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      id                TEXT PRIMARY KEY,
      student_id        INTEGER,
      course_id         TEXT NOT NULL,
      video_path        TEXT,
      video_name        TEXT,
      video_size        INTEGER,
      duration_seconds  REAL,
      dimension_scores  TEXT DEFAULT '[]',
      overall_score     REAL DEFAULT 0,
      overall_comment   TEXT DEFAULT '',
      evidence_details  TEXT DEFAULT '[]',
      key_moments       TEXT DEFAULT '[]',
      teaching_suggestions TEXT DEFAULT '[]',
      transcript        TEXT DEFAULT '[]',
      transcript_analysis TEXT DEFAULT '{}',
      frames_analyzed   INTEGER DEFAULT 0,
      ai_model          TEXT DEFAULT '',
      analysis_duration_ms INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_evaluations_student ON evaluations(student_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_course  ON evaluations(course_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_course     ON analysis_results(course_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_student    ON analysis_results(student_id);
  `);
}
function getAllStudents() {
  return db.prepare("SELECT * FROM students ORDER BY id").all().map(deserializeStudent);
}
function getStudent(id) {
  const row = db.prepare("SELECT * FROM students WHERE id = ?").get(id);
  return row ? deserializeStudent(row) : null;
}
function upsertStudent(s) {
  db.prepare(`
    INSERT INTO students (id, name, avatar, grade, group_name, sessions_count,
      attendance, avg_attention, avg_engagement, knowledge_mastery,
      practice_hours, interventions, recent_scores, skills, epa_progress, updated_at)
    VALUES (@id, @name, @avatar, @grade, @group_name, @sessions_count,
      @attendance, @avg_attention, @avg_engagement, @knowledge_mastery,
      @practice_hours, @interventions, @recent_scores, @skills, @epa_progress, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name=@name, avatar=@avatar, grade=@grade, group_name=@group_name,
      sessions_count=@sessions_count, attendance=@attendance,
      avg_attention=@avg_attention, avg_engagement=@avg_engagement,
      knowledge_mastery=@knowledge_mastery, practice_hours=@practice_hours,
      interventions=@interventions, recent_scores=@recent_scores,
      skills=@skills, epa_progress=@epa_progress, updated_at=datetime('now')
  `).run({
    id: s.id,
    name: s.name,
    avatar: s.avatar ?? "",
    grade: s.grade ?? "",
    group_name: s.group ?? "",
    sessions_count: s.sessionsCount ?? 0,
    attendance: s.attendance ?? 0,
    avg_attention: s.avgAttention ?? 0,
    avg_engagement: s.avgEngagement ?? 0,
    knowledge_mastery: s.knowledgeMastery ?? 0,
    practice_hours: s.practiceHours ?? 0,
    interventions: s.interventions ?? 0,
    recent_scores: JSON.stringify(s.recentScores ?? []),
    skills: JSON.stringify(s.skills ?? {}),
    epa_progress: JSON.stringify(s.epaProgress ?? {})
  });
}
function deleteStudent(id) {
  db.prepare("DELETE FROM students WHERE id = ?").run(id);
}
function deserializeStudent(row) {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    grade: row.grade,
    group: row.group_name,
    sessionsCount: row.sessions_count,
    attendance: row.attendance,
    avgAttention: row.avg_attention,
    avgEngagement: row.avg_engagement,
    knowledgeMastery: row.knowledge_mastery,
    practiceHours: row.practice_hours,
    interventions: row.interventions,
    recentScores: JSON.parse(row.recent_scores || "[]"),
    skills: JSON.parse(row.skills || "{}"),
    epaProgress: JSON.parse(row.epa_progress || "{}")
  };
}
function getAllCourses() {
  return db.prepare("SELECT * FROM courses ORDER BY id").all().map(deserializeCourse);
}
function upsertCourse(c) {
  db.prepare(`
    INSERT INTO courses (id, name, short_name, video_src, rubric, evidence_text)
    VALUES (@id, @name, @short_name, @video_src, @rubric, @evidence_text)
    ON CONFLICT(id) DO UPDATE SET
      name=@name, short_name=@short_name, video_src=@video_src,
      rubric=@rubric, evidence_text=@evidence_text
  `).run({
    id: c.id,
    name: c.name,
    short_name: c.shortName ?? "",
    video_src: c.videoSrc ?? "",
    rubric: JSON.stringify(c.rubric ?? []),
    evidence_text: JSON.stringify(c.evidenceText ?? {})
  });
}
function deserializeCourse(row) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    videoSrc: row.video_src,
    rubric: JSON.parse(row.rubric || "[]"),
    evidenceText: JSON.parse(row.evidence_text || "{}")
  };
}
function getEvaluations(courseId) {
  return db.prepare(
    "SELECT * FROM evaluations WHERE course_id = ? ORDER BY evaluated_at DESC"
  ).all(courseId).map(deserializeEvaluation);
}
function getStudentEvaluations(studentId) {
  return db.prepare(
    "SELECT * FROM evaluations WHERE student_id = ? ORDER BY evaluated_at DESC"
  ).all(studentId).map(deserializeEvaluation);
}
function upsertEvaluation(e) {
  if (e.id) {
    db.prepare(`
      UPDATE evaluations SET scores=@scores, timestamps=@timestamps,
        total_score=@total_score, grade=@grade, evaluated_at=@evaluated_at
      WHERE id=@id
    `).run({
      id: e.id,
      scores: JSON.stringify(e.scores ?? []),
      timestamps: JSON.stringify(e.timestamps ?? []),
      total_score: e.totalScore ?? 0,
      grade: e.grade ?? "",
      evaluated_at: e.evaluatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
    });
  } else {
    db.prepare(`
      INSERT INTO evaluations (student_id, course_id, scores, timestamps, total_score, grade, evaluated_at)
      VALUES (@student_id, @course_id, @scores, @timestamps, @total_score, @grade, @evaluated_at)
    `).run({
      student_id: e.studentId,
      course_id: e.courseId,
      scores: JSON.stringify(e.scores ?? []),
      timestamps: JSON.stringify(e.timestamps ?? []),
      total_score: e.totalScore ?? 0,
      grade: e.grade ?? "",
      evaluated_at: e.evaluatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function deserializeEvaluation(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    scores: JSON.parse(row.scores || "[]"),
    timestamps: JSON.parse(row.timestamps || "[]"),
    totalScore: row.total_score,
    grade: row.grade,
    evaluatedAt: row.evaluated_at
  };
}
function getAnalyses(courseId) {
  if (courseId) {
    return db.prepare(
      "SELECT * FROM analysis_results WHERE course_id = ? ORDER BY created_at DESC"
    ).all(courseId).map(deserializeAnalysis);
  }
  return db.prepare(
    "SELECT * FROM analysis_results ORDER BY created_at DESC"
  ).all().map(deserializeAnalysis);
}
function getAnalysis(id) {
  const row = db.prepare("SELECT * FROM analysis_results WHERE id = ?").get(id);
  return row ? deserializeAnalysis(row) : null;
}
function saveAnalysis(a) {
  db.prepare(`
    INSERT INTO analysis_results (id, student_id, course_id, video_path, video_name,
      video_size, duration_seconds, dimension_scores, overall_score, overall_comment,
      evidence_details, key_moments, teaching_suggestions, transcript,
      transcript_analysis, frames_analyzed, ai_model, analysis_duration_ms)
    VALUES (@id, @student_id, @course_id, @video_path, @video_name,
      @video_size, @duration_seconds, @dimension_scores, @overall_score, @overall_comment,
      @evidence_details, @key_moments, @teaching_suggestions, @transcript,
      @transcript_analysis, @frames_analyzed, @ai_model, @analysis_duration_ms)
    ON CONFLICT(id) DO UPDATE SET
      dimension_scores=@dimension_scores, overall_score=@overall_score,
      overall_comment=@overall_comment, evidence_details=@evidence_details,
      key_moments=@key_moments, teaching_suggestions=@teaching_suggestions,
      transcript=@transcript, transcript_analysis=@transcript_analysis,
      frames_analyzed=@frames_analyzed, ai_model=@ai_model,
      analysis_duration_ms=@analysis_duration_ms
  `).run({
    id: a.id,
    student_id: a.studentId ?? null,
    course_id: a.courseId,
    video_path: a.videoPath ?? "",
    video_name: a.videoName ?? "",
    video_size: a.videoSize ?? 0,
    duration_seconds: a.durationSeconds ?? 0,
    dimension_scores: JSON.stringify(a.dimensionScores ?? []),
    overall_score: a.overallScore ?? 0,
    overall_comment: a.overallComment ?? "",
    evidence_details: JSON.stringify(a.evidenceDetails ?? []),
    key_moments: JSON.stringify(a.keyMoments ?? []),
    teaching_suggestions: JSON.stringify(a.teachingSuggestions ?? []),
    transcript: JSON.stringify(a.transcript ?? []),
    transcript_analysis: JSON.stringify(a.transcriptAnalysis ?? {}),
    frames_analyzed: a.framesAnalyzed ?? 0,
    ai_model: a.aiModel ?? "",
    analysis_duration_ms: a.analysisDurationMs ?? 0
  });
}
function deleteAnalysis(id) {
  db.prepare("DELETE FROM analysis_results WHERE id = ?").run(id);
}
function deserializeAnalysis(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    videoPath: row.video_path,
    videoName: row.video_name,
    videoSize: row.video_size,
    durationSeconds: row.duration_seconds,
    dimensionScores: JSON.parse(row.dimension_scores || "[]"),
    overallScore: row.overall_score,
    overallComment: row.overall_comment,
    evidenceDetails: JSON.parse(row.evidence_details || "[]"),
    keyMoments: JSON.parse(row.key_moments || "[]"),
    teachingSuggestions: JSON.parse(row.teaching_suggestions || "[]"),
    transcript: JSON.parse(row.transcript || "[]"),
    transcriptAnalysis: JSON.parse(row.transcript_analysis || "{}"),
    framesAnalyzed: row.frames_analyzed,
    aiModel: row.ai_model,
    analysisDurationMs: row.analysis_duration_ms,
    createdAt: row.created_at
  };
}
function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value ?? null;
}
function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
  `).run(key, value);
}
function getAllSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const result = {};
  for (const r of rows) result[r.key] = r.value;
  return result;
}
function seedStudentsIfEmpty(students) {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM students").get().cnt;
  if (count > 0) return count;
  const insert = db.transaction((list) => {
    for (const s of list) upsertStudent(s);
  });
  insert(students);
  return students.length;
}
function seedCoursesIfEmpty(courses) {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM courses").get().cnt;
  if (count > 0) return count;
  const insert = db.transaction((list) => {
    for (const c of list) upsertCourse(c);
  });
  insert(courses);
  return courses.length;
}

// electron/ipc-handlers.ts
var import_electron2 = require("electron");
var import_fs = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
function registerIpcHandlers() {
  import_electron2.ipcMain.handle("db:students:getAll", () => {
    return getAllStudents();
  });
  import_electron2.ipcMain.handle("db:students:get", (_e, id) => {
    return getStudent(id);
  });
  import_electron2.ipcMain.handle("db:students:upsert", (_e, student) => {
    upsertStudent(student);
    return { ok: true };
  });
  import_electron2.ipcMain.handle("db:students:delete", (_e, id) => {
    deleteStudent(id);
    return { ok: true };
  });
  import_electron2.ipcMain.handle("db:courses:getAll", () => {
    return getAllCourses();
  });
  import_electron2.ipcMain.handle("db:courses:upsert", (_e, course) => {
    upsertCourse(course);
    return { ok: true };
  });
  import_electron2.ipcMain.handle("db:evaluations:getByCourse", (_e, courseId) => {
    return getEvaluations(courseId);
  });
  import_electron2.ipcMain.handle("db:evaluations:getByStudent", (_e, studentId) => {
    return getStudentEvaluations(studentId);
  });
  import_electron2.ipcMain.handle("db:evaluations:upsert", (_e, evaluation) => {
    upsertEvaluation(evaluation);
    return { ok: true };
  });
  import_electron2.ipcMain.handle("db:analyses:getAll", (_e, courseId) => {
    return getAnalyses(courseId);
  });
  import_electron2.ipcMain.handle("db:analyses:get", (_e, id) => {
    return getAnalysis(id);
  });
  import_electron2.ipcMain.handle("db:analyses:save", (_e, analysis) => {
    saveAnalysis(analysis);
    return { ok: true };
  });
  import_electron2.ipcMain.handle("db:analyses:delete", (_e, id) => {
    deleteAnalysis(id);
    return { ok: true };
  });
  import_electron2.ipcMain.handle("db:settings:get", (_e, key) => {
    return getSetting(key);
  });
  import_electron2.ipcMain.handle("db:settings:set", (_e, key, value) => {
    setSetting(key, value);
    return { ok: true };
  });
  import_electron2.ipcMain.handle("db:settings:getAll", () => {
    return getAllSettings();
  });
  import_electron2.ipcMain.handle("file:openVideoDialog", async () => {
    const win = import_electron2.BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await import_electron2.dialog.showOpenDialog(win, {
      title: "\u9009\u62E9\u64CD\u4F5C\u89C6\u9891\u6587\u4EF6",
      filters: [
        { name: "\u89C6\u9891\u6587\u4EF6", extensions: ["mp4", "avi", "mov", "mkv", "webm", "flv"] },
        { name: "\u6240\u6709\u6587\u4EF6", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const stat = import_fs.default.statSync(filePath);
    return {
      path: filePath,
      name: import_path2.default.basename(filePath),
      size: stat.size
    };
  });
  import_electron2.ipcMain.handle("file:readVideoAsUrl", async (_e, filePath) => {
    const buffer = import_fs.default.readFileSync(filePath);
    const ext = import_path2.default.extname(filePath).toLowerCase().slice(1);
    const mimeMap = {
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
      webm: "video/webm",
      flv: "video/x-flv"
    };
    const mime = mimeMap[ext] || "video/mp4";
    const base64 = buffer.toString("base64");
    return `data:${mime};base64,${base64}`;
  });
  import_electron2.ipcMain.handle("file:saveReport", async (_e, html, defaultName) => {
    const win = import_electron2.BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await import_electron2.dialog.showSaveDialog(win, {
      title: "\u4FDD\u5B58\u5206\u6790\u62A5\u544A",
      defaultPath: defaultName,
      filters: [
        { name: "HTML \u6587\u4EF6", extensions: ["html"] },
        { name: "PDF \u6587\u4EF6", extensions: ["pdf"] }
      ]
    });
    if (result.canceled || !result.filePath) return null;
    if (result.filePath.endsWith(".pdf")) {
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        landscape: false
      });
      import_fs.default.writeFileSync(result.filePath, pdfData);
    } else {
      import_fs.default.writeFileSync(result.filePath, html, "utf-8");
    }
    return result.filePath;
  });
  import_electron2.ipcMain.handle("file:copyVideoToAppData", async (_e, srcPath) => {
    const videosDir = import_path2.default.join(import_electron2.app.getPath("userData"), "videos");
    if (!import_fs.default.existsSync(videosDir)) import_fs.default.mkdirSync(videosDir, { recursive: true });
    const destName = `${Date.now()}_${import_path2.default.basename(srcPath)}`;
    const destPath = import_path2.default.join(videosDir, destName);
    import_fs.default.copyFileSync(srcPath, destPath);
    return destPath;
  });
  import_electron2.ipcMain.handle("file:getAppDataPath", () => {
    return import_electron2.app.getPath("userData");
  });
  import_electron2.ipcMain.handle("app:getVersion", () => {
    return import_electron2.app.getVersion();
  });
  import_electron2.ipcMain.on("app:minimize", () => {
    import_electron2.BrowserWindow.getFocusedWindow()?.minimize();
  });
  import_electron2.ipcMain.on("app:maximize", () => {
    const win = import_electron2.BrowserWindow.getFocusedWindow();
    if (win) {
      win.isMaximized() ? win.unmaximize() : win.maximize();
    }
  });
  import_electron2.ipcMain.on("app:close", () => {
    import_electron2.BrowserWindow.getFocusedWindow()?.close();
  });
  import_electron2.ipcMain.handle("db:seed:students", (_e, students) => {
    return seedStudentsIfEmpty(students);
  });
  import_electron2.ipcMain.handle("db:seed:courses", (_e, courses) => {
    return seedCoursesIfEmpty(courses);
  });
}

// electron/updater.ts
var import_electron_updater = require("electron-updater");
var import_electron3 = require("electron");
var logger = {
  info: (...args) => console.log("[Updater]", ...args),
  error: (...args) => console.error("[Updater]", ...args)
};
function setupAutoUpdater(mainWindow2) {
  import_electron_updater.autoUpdater.logger = logger;
  import_electron_updater.autoUpdater.autoDownload = false;
  import_electron_updater.autoUpdater.autoInstallOnAppQuit = true;
  function sendToRenderer(channel, data) {
    if (mainWindow2 && !mainWindow2.isDestroyed()) {
      mainWindow2.webContents.send(channel, data);
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
  import_electron3.ipcMain.handle("updater:check", async () => {
    try {
      const result = await import_electron_updater.autoUpdater.checkForUpdates();
      return result?.updateInfo ?? null;
    } catch (err) {
      logger.error("Check failed:", err);
      return null;
    }
  });
  import_electron3.ipcMain.handle("updater:download", async () => {
    try {
      await import_electron_updater.autoUpdater.downloadUpdate();
      return true;
    } catch (err) {
      logger.error("Download failed:", err);
      return false;
    }
  });
  import_electron3.ipcMain.handle("updater:install", () => {
    import_electron_updater.autoUpdater.quitAndInstall(false, true);
  });
  setTimeout(() => {
    import_electron_updater.autoUpdater.checkForUpdates().catch(() => {
    });
  }, 1e4);
}

// electron/main.ts
var isDev = !import_electron4.app.isPackaged;
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron4.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "DermaSkin AI \u2014 \u76AE\u80A4\u79D1\u6280\u80FD\u8BC4\u4F30\u7CFB\u7EDF",
    webPreferences: {
      preload: import_path3.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    backgroundColor: "#F4F7FE"
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    import_electron4.shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(import_path3.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron4.app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();
  setupAutoUpdater(mainWindow);
  import_electron4.app.on("activate", () => {
    if (import_electron4.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron4.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron4.app.quit();
  }
});
