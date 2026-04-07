import { useMemo } from 'react';
import { ALL_COURSES, STUDENTS } from '@/data';
import { useAnalysisStore } from '@/stores/useAnalysisStore';

export interface AnalysisSummary {
  id: string;
  studentId: number;
  courseId: string;
  totalScore: number;
  overallComment: string;
  dimensionScores: { label: string; score: number; max: number }[];
  createdAt: string;
}

export function useUnifiedData() {
  const { analyses } = useAnalysisStore();

  const analysisMap = useMemo(() => {
    const map = new Map<string, Map<number, AnalysisSummary>>();
    for (const a of analyses) {
      if (!a.courseId || a.studentId == null) continue;
      if (!map.has(a.courseId)) map.set(a.courseId, new Map());
      const courseMap = map.get(a.courseId)!;
      const existing = courseMap.get(a.studentId);
      if (!existing || (a.createdAt && existing.createdAt && a.createdAt > existing.createdAt)) {
        courseMap.set(a.studentId, {
          id: a.id,
          studentId: a.studentId,
          courseId: a.courseId,
          totalScore: a.overallScore ?? 0,
          overallComment: (a.overallComment as string) ?? '',
          dimensionScores: (a.dimensionScores as { label: string; score: number; max: number }[]) ?? [],
          createdAt: a.createdAt ?? '',
        });
      }
    }
    return map;
  }, [analyses]);

  const hasRealAnalysis = useMemo(() => {
    return (studentId: number, courseId: string): boolean => {
      return analysisMap.get(courseId)?.has(studentId) ?? false;
    };
  }, [analysisMap]);

  const getRealAnalysis = useMemo(() => {
    return (studentId: number, courseId: string): AnalysisSummary | null => {
      return analysisMap.get(courseId)?.get(studentId) ?? null;
    };
  }, [analysisMap]);

  const realAnalysisCount = analyses.length;

  const recentAnalyses = useMemo(() => {
    return [...analyses]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 10);
  }, [analyses]);

  const getAnalysesByCourse = useMemo(() => {
    return (courseId: string) => analyses.filter(a => a.courseId === courseId);
  }, [analyses]);

  const getAnalysesByStudent = useMemo(() => {
    return (studentId: number) => analyses.filter(a => a.studentId === studentId);
  }, [analyses]);

  return {
    students: STUDENTS,
    courses: ALL_COURSES,
    analyses,
    analysisMap,
    hasRealAnalysis,
    getRealAnalysis,
    realAnalysisCount,
    recentAnalyses,
    getAnalysesByCourse,
    getAnalysesByStudent,
  };
}
