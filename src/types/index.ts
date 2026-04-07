export interface RubricDim {
  key: string;
  label: string;
  maxScore: number;
}

export interface CourseConfig {
  id: string;
  name: string;
  shortName: string;
  videoSrc: string;
  rubric: RubricDim[];
  evals: Record<number, {
    scores: number[];
    timestamps: number[];
  }>;
  evidenceText: Record<number, {
    excellent: string;
    pass: string;
    fail: string;
  }>;
  getLevel: (score: number, maxScore: number) => 'excellent' | 'pass' | 'fail';
  aiSuggestionGen: (
    studentName: string,
    total: number,
    weakDims: {
      key: string;
      label: string;
      score: number;
      maxScore: number;
      level: 'pass' | 'fail';
      idx: number;
    }[],
    evalData: { scores: number[]; timestamps: number[] } | undefined
  ) => string;
}

export interface Student {
  id: number;
  name: string;
  avatar: string;
  grade: string;
  group: string;
  sessionsCount: number;
  attendance: number;
  avgAttention: number;
  avgEngagement: number;
  knowledgeMastery: number;
  practiceHours: number;
  interventions: number;
  recentScores: number[];
  skills: Record<string, number>;
  epaProgress: Record<string, {
    level: 1 | 2 | 3 | 4;
    lastAssessed: string;
  }>;
}

export interface Milestone {
  id: string;
  level: 1 | 2 | 3 | 4;
  label: string;
  criteria: string;
}

export interface EPA {
  id: string;
  code: string;
  name: string;
  description: string;
  category: '基础操作' | '诊断技术' | '治疗操作' | '沟通能力';
  weight: number;
  milestones: Milestone[];
}

export interface EvidenceItem {
  id: string;
  studentId: number;
  courseId: string;
  epaId: string;
  milestoneId?: string;
  sessionId?: string;
  type: 'video_clip' | 'screenshot' | 'rubric_score' | 'observation' | 'self_reflection';
  videoSrc?: string;
  timestamp?: number;
  thumbnailBase64?: string;
  score?: number;
  comment?: string;
  aiGenerated?: boolean;
  createdAt: string;
}

export interface AnalysisSession {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  mode: 'real' | 'simulation';
  avgAttention: number;
  avgEngagement: number;
  totalStudents: number;
  totalInterventions: number;
  behaviorDistribution: {
    'T-L': number;
    'T-D': number;
    'T-Q': number;
    'S-L': number;
    'S-P': number;
    'S-A': number;
    'D-I': number;
  };
  timeline: { time: number; attention: number; engagement: number }[];
  behaviorTimeline: { time: number; behavior: string }[];
  studentRecords: {
    studentId: number;
    attention: number;
    engagement: number;
    behaviorCount: Record<string, number>;
    interventionCount: number;
  }[];
  detectedKeywords: string[];
  aiSuggestions: string[];
  transcriptSummary?: string;
  llmInsights?: string[];
  bloomLevel?: string;
  interactionQuality?: 'excellent' | 'good' | 'moderate' | 'poor';
}

export const LEVEL_META: Record<string, { color: string; label: string }> = {
  excellent: { color: '#05CD99', label: '优秀' },
  pass:      { color: '#4361EE', label: '合格' },
  fail:      { color: '#EF4444', label: '不合格' },
};

export const GRADE_COLOR = (score: number): string =>
  score >= 90 ? '#05CD99' : score >= 80 ? '#4361EE' : score >= 70 ? '#F59E0B' : '#EF4444';

export const GRADE_LABEL = (score: number): string =>
  score >= 90 ? '优秀' : score >= 80 ? '良好' : score >= 70 ? '合格' : '需加强';
