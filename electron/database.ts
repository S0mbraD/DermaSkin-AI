import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'dermaskin.db');
}

export function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

/* ── Students ── */

export function getAllStudents(): unknown[] {
  return db.prepare('SELECT * FROM students ORDER BY id').all().map(deserializeStudent);
}

export function getStudent(id: number): unknown | null {
  const row = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  return row ? deserializeStudent(row as Record<string, unknown>) : null;
}

export function upsertStudent(s: Record<string, unknown>): void {
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
    avatar: s.avatar ?? '',
    grade: s.grade ?? '',
    group_name: s.group ?? '',
    sessions_count: s.sessionsCount ?? 0,
    attendance: s.attendance ?? 0,
    avg_attention: s.avgAttention ?? 0,
    avg_engagement: s.avgEngagement ?? 0,
    knowledge_mastery: s.knowledgeMastery ?? 0,
    practice_hours: s.practiceHours ?? 0,
    interventions: s.interventions ?? 0,
    recent_scores: JSON.stringify(s.recentScores ?? []),
    skills: JSON.stringify(s.skills ?? {}),
    epa_progress: JSON.stringify(s.epaProgress ?? {}),
  });
}

export function deleteStudent(id: number): void {
  db.prepare('DELETE FROM students WHERE id = ?').run(id);
}

function deserializeStudent(row: Record<string, unknown>): Record<string, unknown> {
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
    recentScores: JSON.parse((row.recent_scores as string) || '[]'),
    skills: JSON.parse((row.skills as string) || '{}'),
    epaProgress: JSON.parse((row.epa_progress as string) || '{}'),
  };
}

/* ── Courses ── */

export function getAllCourses(): unknown[] {
  return db.prepare('SELECT * FROM courses ORDER BY id').all().map(deserializeCourse);
}

export function upsertCourse(c: Record<string, unknown>): void {
  db.prepare(`
    INSERT INTO courses (id, name, short_name, video_src, rubric, evidence_text)
    VALUES (@id, @name, @short_name, @video_src, @rubric, @evidence_text)
    ON CONFLICT(id) DO UPDATE SET
      name=@name, short_name=@short_name, video_src=@video_src,
      rubric=@rubric, evidence_text=@evidence_text
  `).run({
    id: c.id,
    name: c.name,
    short_name: c.shortName ?? '',
    video_src: c.videoSrc ?? '',
    rubric: JSON.stringify(c.rubric ?? []),
    evidence_text: JSON.stringify(c.evidenceText ?? {}),
  });
}

function deserializeCourse(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    videoSrc: row.video_src,
    rubric: JSON.parse((row.rubric as string) || '[]'),
    evidenceText: JSON.parse((row.evidence_text as string) || '{}'),
  };
}

/* ── Evaluations ── */

export function getEvaluations(courseId: string): unknown[] {
  return db.prepare(
    'SELECT * FROM evaluations WHERE course_id = ? ORDER BY evaluated_at DESC'
  ).all(courseId).map(deserializeEvaluation);
}

export function getStudentEvaluations(studentId: number): unknown[] {
  return db.prepare(
    'SELECT * FROM evaluations WHERE student_id = ? ORDER BY evaluated_at DESC'
  ).all(studentId).map(deserializeEvaluation);
}

export function upsertEvaluation(e: Record<string, unknown>): void {
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
      grade: e.grade ?? '',
      evaluated_at: e.evaluatedAt ?? new Date().toISOString(),
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
      grade: e.grade ?? '',
      evaluated_at: e.evaluatedAt ?? new Date().toISOString(),
    });
  }
}

function deserializeEvaluation(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    scores: JSON.parse((row.scores as string) || '[]'),
    timestamps: JSON.parse((row.timestamps as string) || '[]'),
    totalScore: row.total_score,
    grade: row.grade,
    evaluatedAt: row.evaluated_at,
  };
}

/* ── Analysis Results ── */

export function getAnalyses(courseId?: string): unknown[] {
  if (courseId) {
    return db.prepare(
      'SELECT * FROM analysis_results WHERE course_id = ? ORDER BY created_at DESC'
    ).all(courseId).map(deserializeAnalysis);
  }
  return db.prepare(
    'SELECT * FROM analysis_results ORDER BY created_at DESC'
  ).all().map(deserializeAnalysis);
}

export function getAnalysis(id: string): unknown | null {
  const row = db.prepare('SELECT * FROM analysis_results WHERE id = ?').get(id);
  return row ? deserializeAnalysis(row as Record<string, unknown>) : null;
}

export function saveAnalysis(a: Record<string, unknown>): void {
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
    video_path: a.videoPath ?? '',
    video_name: a.videoName ?? '',
    video_size: a.videoSize ?? 0,
    duration_seconds: a.durationSeconds ?? 0,
    dimension_scores: JSON.stringify(a.dimensionScores ?? []),
    overall_score: a.overallScore ?? 0,
    overall_comment: a.overallComment ?? '',
    evidence_details: JSON.stringify(a.evidenceDetails ?? []),
    key_moments: JSON.stringify(a.keyMoments ?? []),
    teaching_suggestions: JSON.stringify(a.teachingSuggestions ?? []),
    transcript: JSON.stringify(a.transcript ?? []),
    transcript_analysis: JSON.stringify(a.transcriptAnalysis ?? {}),
    frames_analyzed: a.framesAnalyzed ?? 0,
    ai_model: a.aiModel ?? '',
    analysis_duration_ms: a.analysisDurationMs ?? 0,
  });
}

export function deleteAnalysis(id: string): void {
  db.prepare('DELETE FROM analysis_results WHERE id = ?').run(id);
}

function deserializeAnalysis(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    videoPath: row.video_path,
    videoName: row.video_name,
    videoSize: row.video_size,
    durationSeconds: row.duration_seconds,
    dimensionScores: JSON.parse((row.dimension_scores as string) || '[]'),
    overallScore: row.overall_score,
    overallComment: row.overall_comment,
    evidenceDetails: JSON.parse((row.evidence_details as string) || '[]'),
    keyMoments: JSON.parse((row.key_moments as string) || '[]'),
    teachingSuggestions: JSON.parse((row.teaching_suggestions as string) || '[]'),
    transcript: JSON.parse((row.transcript as string) || '[]'),
    transcriptAnalysis: JSON.parse((row.transcript_analysis as string) || '{}'),
    framesAnalyzed: row.frames_analyzed,
    aiModel: row.ai_model,
    analysisDurationMs: row.analysis_duration_ms,
    createdAt: row.created_at,
  };
}

/* ── Settings ── */

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
  `).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as
    { key: string; value: string }[];
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value;
  return result;
}

/* ── Bulk seed (initial data import) ── */

export function seedStudentsIfEmpty(students: Record<string, unknown>[]): number {
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM students').get() as { cnt: number }).cnt;
  if (count > 0) return count;

  const insert = db.transaction((list: Record<string, unknown>[]) => {
    for (const s of list) upsertStudent(s);
  });
  insert(students);
  return students.length;
}

export function seedCoursesIfEmpty(courses: Record<string, unknown>[]): number {
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM courses').get() as { cnt: number }).cnt;
  if (count > 0) return count;

  const insert = db.transaction((list: Record<string, unknown>[]) => {
    for (const c of list) upsertCourse(c);
  });
  insert(courses);
  return courses.length;
}

export function getDb(): Database.Database {
  return db;
}
