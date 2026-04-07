import type { CourseConfig } from '@/types';

/**
 * Build the system prompt for a given course evaluation.
 * The AI receives video frames and must return structured JSON.
 */
export function buildEvalSystemPrompt(course: CourseConfig): string {
  const dimDescriptions = course.rubric
    .map(
      (d, i) =>
        `  ${i + 1}. ${d.label} (满分${d.maxScore}分): 评估学员在此维度的操作规范性、熟练程度和正确性`,
    )
    .join('\n');

  return `你是一位资深的皮肤科临床教学专家，正在观看一段住院医师的操作训练视频，需要根据标准化评分量表进行专业评估。

## 当前评估课程
课程名称：${course.name}

## 评分维度及标准
${dimDescriptions}

## 评分等级标准
- 优秀(≥85%): 操作规范、动作流畅、要点完整
- 合格(60%-84%): 基本完成操作，存在轻微不足
- 不合格(<60%): 操作错误或遗漏关键步骤

## 输出要求
请以严格的 JSON 格式输出评估结果，包含以下字段：
{
  "scores": [每个维度的得分数组],
  "timestamps": [每个维度对应的关键操作时间戳(秒)数组],
  "evidenceDetails": [
    {
      "dimIndex": 维度序号(从0开始),
      "dimName": "维度名称",
      "score": 得分,
      "maxScore": 满分,
      "level": "excellent|pass|fail",
      "timestamp": 关键时间戳秒数,
      "screenshotDesc": "该时间点画面中的操作描述",
      "evidence": "详细的评分依据说明(100-200字)，包含具体操作描述和评分理由",
      "suggestions": "针对该维度的改进建议"
    }
  ],
  "overallComment": "整体评价(200-300字)，分析优势和不足",
  "teachingSuggestions": "循证教学建议(200-300字)，基于证据提出具体教学改进方案",
  "keyMoments": [
    {"time": 秒数, "description": "关键操作节点描述", "quality": "good|neutral|concern"}
  ]
}

请确保：
1. 每个维度都必须给出分数和依据
2. 时间戳必须与视频实际内容对应
3. 评分依据要引用具体操作细节
4. 建议要具有可操作性
5. 只输出JSON，不要附加其他内容`;
}

/**
 * Build the user message for frame-based analysis.
 */
export function buildFrameAnalysisMessage(
  course: CourseConfig,
  studentName: string,
  frameCount: number,
): string {
  return `这是${studentName}进行"${course.name}"操作训练的视频关键帧截图（共${frameCount}帧，按时间顺序排列）。请根据评分量表对每个维度进行评分，并给出带有时间戳的循证评分依据。`;
}

/**
 * Build prompt for video-level analysis (when model supports video input).
 */
export function buildVideoAnalysisMessage(
  course: CourseConfig,
  studentName: string,
): string {
  return `这是${studentName}进行"${course.name}"操作训练的视频。请仔细观看整个视频，根据评分量表对每个维度进行评分，并标注关键操作对应的视频时间戳，给出详细的循证评分依据。`;
}

/**
 * Build prompt for speech-to-text result analysis.
 */
export function buildTranscriptAnalysisPrompt(
  transcript: string,
  course: CourseConfig,
): string {
  return `以下是"${course.name}"操作训练视频中的语音转录文本：

"""
${transcript}
"""

请分析该转录内容，提取以下信息（JSON格式）：
{
  "speakerSegments": [
    {"startTime": 秒数, "endTime": 秒数, "speaker": "instructor|student", "text": "内容"}
  ],
  "keyInstructions": ["教师给出的关键指导要点"],
  "studentResponses": ["学员的口头回应和反馈"],
  "communicationScore": 0-100的沟通能力评分,
  "communicationAnalysis": "对学员沟通能力的分析",
  "clinicalTermUsage": ["学员使用的专业术语"],
  "summary": "语音内容总结(100字)"
}`;
}

/**
 * Result types for AI analysis.
 */
export interface AIEvalResult {
  scores: number[];
  timestamps: number[];
  evidenceDetails: {
    dimIndex: number;
    dimName: string;
    score: number;
    maxScore: number;
    level: 'excellent' | 'pass' | 'fail';
    timestamp: number;
    screenshotDesc: string;
    evidence: string;
    suggestions: string;
  }[];
  overallComment: string;
  teachingSuggestions: string;
  keyMoments: {
    time: number;
    description: string;
    quality: 'good' | 'neutral' | 'concern';
  }[];
}

export interface TranscriptResult {
  speakerSegments: {
    startTime: number;
    endTime: number;
    speaker: 'instructor' | 'student';
    text: string;
  }[];
  keyInstructions: string[];
  studentResponses: string[];
  communicationScore: number;
  communicationAnalysis: string;
  clinicalTermUsage: string[];
  summary: string;
}

export interface FullAnalysisResult {
  eval: AIEvalResult;
  transcript: TranscriptResult | null;
  videoFrames: { time: number; dataUrl: string }[];
  totalScore: number;
  maxScore: number;
  duration: number;
  analysisTime: number;
}
