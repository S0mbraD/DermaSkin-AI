/**
 * Initialize Electron-specific features on app startup.
 * Seeds the SQLite database with built-in demo data if empty.
 */

import { isElectron, seedInitialData } from './dbService';
import { STUDENTS, ALL_COURSES } from '@/data';

let initialized = false;

export async function initElectronServices(): Promise<void> {
  if (initialized || !isElectron()) return;
  initialized = true;

  try {
    const { studentCount, courseCount } = await seedInitialData(STUDENTS, ALL_COURSES);
    console.log(
      `[Electron DB] Seeded: ${studentCount} students, ${courseCount} courses`
    );
  } catch (err) {
    console.error('[Electron DB] Seed failed:', err);
  }
}
