import type { CourseConfig } from '@/types';
import { dermaFungal } from './courses/derma_fungal';
import { dermaBiopsy } from './courses/derma_biopsy';
import { dermaGonococcal } from './courses/derma_gonococcal';
import { dermaPatch } from './courses/derma_patch';
import { dermaTzanck } from './courses/derma_tzanck';
import { dermaDermoscopy } from './courses/derma_dermoscopy';

export { STUDENTS } from './students';
export { EPA_LIST } from './epa';
export { HISTORICAL_RECORDS, getRecordsByStudent, getRecordsByCourse, getStudentAvgScore } from './historicalRecords';
export type { HistoricalRecord } from './historicalRecords';

export const ALL_COURSES: CourseConfig[] = [
  dermaFungal,
  dermaBiopsy,
  dermaGonococcal,
  dermaPatch,
  dermaTzanck,
  dermaDermoscopy,
];
