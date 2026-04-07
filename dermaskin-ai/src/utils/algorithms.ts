import type { CourseConfig, Student } from '@/types';

export const computeCourseTotal = (studentId: number, course: CourseConfig): number => {
  const ev = course.evals[studentId];
  return ev ? ev.scores.reduce((a, b) => a + b, 0) : 0;
};

export const computeMaxTotal = (course: CourseConfig): number =>
  course.rubric.reduce((s, r) => s + r.maxScore, 0);

export const computeDimClassAvg = (dimIdx: number, course: CourseConfig): number => {
  const evals = Object.values(course.evals);
  if (evals.length === 0) return 0;
  return evals.reduce((sum, ev) =>
    sum + ev.scores[dimIdx] / course.rubric[dimIdx].maxScore * 100, 0
  ) / evals.length;
};

export const computeClassAvg = (course: CourseConfig, studentIds: number[]): number => {
  const validStudents = studentIds.filter(id => course.evals[id]);
  if (validStudents.length === 0) return 0;
  const total = validStudents.reduce((sum, id) => sum + computeCourseTotal(id, course), 0);
  return Math.round(total / validStudents.length);
};

export const findWeakestDimIdx = (studentId: number, course: CourseConfig): number => {
  const ev = course.evals[studentId];
  if (!ev) return 0;
  return course.rubric.reduce((wIdx, dim, i) =>
    ev.scores[i] / dim.maxScore < ev.scores[wIdx] / course.rubric[wIdx].maxScore ? i : wIdx, 0);
};

export const findClassStrongestDim = (course: CourseConfig): { label: string; avgPct: number } => {
  const dimAvgs = course.rubric.map((dim, i) => ({
    label: dim.label,
    avgPct: Math.round(computeDimClassAvg(i, course)),
  }));
  return dimAvgs.sort((a, b) => b.avgPct - a.avgPct)[0] ?? { label: '-', avgPct: 0 };
};

export const findClassWeakestDim = (course: CourseConfig): { label: string; avgPct: number } => {
  const dimAvgs = course.rubric.map((dim, i) => ({
    label: dim.label,
    avgPct: Math.round(computeDimClassAvg(i, course)),
  }));
  return dimAvgs.sort((a, b) => a.avgPct - b.avgPct)[0] ?? { label: '-', avgPct: 0 };
};

export const computeStudentRisk = (student: Student, course: CourseConfig): number => {
  const total = computeCourseTotal(student.id, course);
  const maxTotal = computeMaxTotal(course);
  const scorePct = total / maxTotal * 100;
  const skillRisk = (100 - scorePct) * 0.40;
  const attentionRisk = (1 - student.avgAttention) * 100 * 0.25;
  const attendanceRisk = (1 - student.attendance) * 100 * 0.20;
  const trendRisk = (() => {
    const scores = student.recentScores;
    if (scores.length < 2) return 0;
    const delta = scores[scores.length - 1] - scores[scores.length - 2];
    return delta < -5 ? 15 : delta < 0 ? 8 : 0;
  })();
  return Math.round(Math.min(100, skillRisk + attentionRisk + attendanceRisk + trendRisk));
};

export const SKILL_TO_EPA_MAP: Record<string, string> = {
  'introFlow': 'epa-derm-7',
  'specimen': 'epa-derm-2',
  'slidePrep': 'epa-derm-3',
  'microscopy': 'epa-derm-3',
  'clinicalMeaning': 'epa-derm-8',
  'consent': 'epa-derm-7',
  'prepSterile': 'epa-derm-1',
  'sampling': 'epa-derm-4',
  'specimenHandle': 'epa-derm-2',
  'woundClosure': 'epa-derm-4',
  'documentation': 'epa-derm-8',
  'deviceSetup': 'epa-derm-1',
  'contactTech': 'epa-derm-5',
  'systematicScan': 'epa-derm-5',
  'structureId': 'epa-derm-5',
  'reportComm': 'epa-derm-8',
  'preparation': 'epa-derm-7',
  'siteSelection': 'epa-derm-6',
  'application': 'epa-derm-6',
  'reading': 'epa-derm-6',
  'guidance': 'epa-derm-8',
  'sitePrep': 'epa-derm-2',
  'smearMaking': 'epa-derm-3',
  'staining': 'epa-derm-3',
  'microscopyRead': 'epa-derm-3',
  'resultExplain': 'epa-derm-8',
};
