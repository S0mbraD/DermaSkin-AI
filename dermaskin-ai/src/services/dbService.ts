/**
 * Database service abstraction layer.
 *
 * In Electron: delegates to main process via IPC (window.electronAPI.db).
 * In Browser:  returns in-memory data from src/data/ (read-only fallback).
 */

import type { Student, CourseConfig } from '@/types';
import type { ElectronAPI, VideoFileInfo } from '@/types/electron';

/* ── runtime detection ── */

export function isElectron(): boolean {
  return !!(window as Window).electronAPI?.isElectron;
}

function api(): ElectronAPI {
  return (window as Window).electronAPI!;
}

/* ════════════════════════════════════════
   Students
   ════════════════════════════════════════ */

export async function dbGetStudents(): Promise<Student[]> {
  if (!isElectron()) return [];
  return (await api().db.students.getAll()) as Student[];
}

export async function dbGetStudent(id: number): Promise<Student | null> {
  if (!isElectron()) return null;
  return (await api().db.students.get(id)) as Student | null;
}

export async function dbUpsertStudent(s: Student): Promise<void> {
  if (!isElectron()) return;
  await api().db.students.upsert(s as unknown as Record<string, unknown>);
}

export async function dbDeleteStudent(id: number): Promise<void> {
  if (!isElectron()) return;
  await api().db.students.delete(id);
}

/* ════════════════════════════════════════
   Courses
   ════════════════════════════════════════ */

export async function dbGetCourses(): Promise<Record<string, unknown>[]> {
  if (!isElectron()) return [];
  return (await api().db.courses.getAll()) as Record<string, unknown>[];
}

export async function dbUpsertCourse(c: Record<string, unknown>): Promise<void> {
  if (!isElectron()) return;
  await api().db.courses.upsert(c);
}

/* ════════════════════════════════════════
   Evaluations
   ════════════════════════════════════════ */

export interface DBEvaluation {
  id?: number;
  studentId: number;
  courseId: string;
  scores: number[];
  timestamps: number[];
  totalScore: number;
  grade: string;
  evaluatedAt?: string;
}

export async function dbGetEvaluationsByCourse(courseId: string): Promise<DBEvaluation[]> {
  if (!isElectron()) return [];
  return (await api().db.evaluations.getByCourse(courseId)) as DBEvaluation[];
}

export async function dbGetEvaluationsByStudent(studentId: number): Promise<DBEvaluation[]> {
  if (!isElectron()) return [];
  return (await api().db.evaluations.getByStudent(studentId)) as DBEvaluation[];
}

export async function dbUpsertEvaluation(e: DBEvaluation): Promise<void> {
  if (!isElectron()) return;
  await api().db.evaluations.upsert(e as unknown as Record<string, unknown>);
}

/* ════════════════════════════════════════
   Analysis Results
   ════════════════════════════════════════ */

export interface DBAnalysis {
  id: string;
  studentId?: number;
  courseId: string;
  videoPath?: string;
  videoName?: string;
  videoSize?: number;
  durationSeconds?: number;
  dimensionScores?: unknown[];
  overallScore?: number;
  overallComment?: string;
  evidenceDetails?: unknown[];
  keyMoments?: unknown[];
  teachingSuggestions?: string[];
  transcript?: unknown[];
  transcriptAnalysis?: unknown;
  framesAnalyzed?: number;
  aiModel?: string;
  analysisDurationMs?: number;
  createdAt?: string;
}

export async function dbGetAnalyses(courseId?: string): Promise<DBAnalysis[]> {
  if (!isElectron()) return [];
  return (await api().db.analyses.getAll(courseId)) as DBAnalysis[];
}

export async function dbGetAnalysis(id: string): Promise<DBAnalysis | null> {
  if (!isElectron()) return null;
  return (await api().db.analyses.get(id)) as DBAnalysis | null;
}

export async function dbSaveAnalysis(a: DBAnalysis): Promise<void> {
  if (!isElectron()) return;
  await api().db.analyses.save(a as unknown as Record<string, unknown>);
}

export async function dbDeleteAnalysis(id: string): Promise<void> {
  if (!isElectron()) return;
  await api().db.analyses.delete(id);
}

/* ════════════════════════════════════════
   Settings
   ════════════════════════════════════════ */

export async function dbGetSetting(key: string): Promise<string | null> {
  if (!isElectron()) return null;
  return api().db.settings.get(key);
}

export async function dbSetSetting(key: string, value: string): Promise<void> {
  if (!isElectron()) return;
  await api().db.settings.set(key, value);
}

export async function dbGetAllSettings(): Promise<Record<string, string>> {
  if (!isElectron()) return {};
  return api().db.settings.getAll();
}

/* ════════════════════════════════════════
   File Operations
   ════════════════════════════════════════ */

export async function openVideoDialog(): Promise<VideoFileInfo | null> {
  if (!isElectron()) return null;
  return api().file.openVideoDialog();
}

export async function readVideoAsUrl(filePath: string): Promise<string> {
  if (!isElectron()) return '';
  return api().file.readVideoAsUrl(filePath);
}

export async function saveReport(html: string, defaultName: string): Promise<string | null> {
  if (!isElectron()) return null;
  return api().file.saveReport(html, defaultName);
}

export async function copyVideoToAppData(srcPath: string): Promise<string> {
  if (!isElectron()) return '';
  return api().file.copyVideoToAppData(srcPath);
}

/* ════════════════════════════════════════
   Seed (initial data import from in-memory)
   ════════════════════════════════════════ */

export async function seedInitialData(
  students: Student[],
  courses: CourseConfig[],
): Promise<{ studentCount: number; courseCount: number }> {
  if (!isElectron()) return { studentCount: 0, courseCount: 0 };

  const studentCount = await api().db.seed.students(
    students as unknown as Record<string, unknown>[]
  );

  const courseData = courses.map(c => ({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    videoSrc: c.videoSrc,
    rubric: c.rubric,
    evidenceText: c.evidenceText,
  }));
  const courseCount = await api().db.seed.courses(courseData);

  return { studentCount, courseCount };
}

/* ════════════════════════════════════════
   App Controls
   ════════════════════════════════════════ */

export function appMinimize(): void {
  if (isElectron()) api().app.minimize();
}

export function appMaximize(): void {
  if (isElectron()) api().app.maximize();
}

export function appClose(): void {
  if (isElectron()) api().app.close();
}

export async function appGetVersion(): Promise<string> {
  if (!isElectron()) return '0.0.0 (web)';
  return api().app.getVersion();
}
