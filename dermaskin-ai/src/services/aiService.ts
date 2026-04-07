/**
 * AI Service — orchestrates Qwen multimodal API calls for video analysis.
 *
 * Uses the DashScope OpenAI-compatible endpoint:
 *   POST {baseUrl}/chat/completions
 *
 * Supported models:
 *   Vision: qwen-vl-max-latest, qwen-vl-plus-latest, qwen-omni-turbo-latest
 *   Audio:  qwen-audio-turbo-latest, qwen2-audio-instruct
 */

import type { CourseConfig } from '@/types';
import type { AIConfig } from '@/stores/useSettingsStore';
import {
  buildEvalSystemPrompt,
  buildFrameAnalysisMessage,
  buildTranscriptAnalysisPrompt,
  type AIEvalResult,
  type TranscriptResult,
  type FullAnalysisResult,
} from './prompts';
import { extractFrames, extractAudio, type ExtractedFrame } from './videoProcessor';

export type AnalysisStage =
  | 'idle'
  | 'extracting_frames'
  | 'extracting_audio'
  | 'analyzing_vision'
  | 'transcribing'
  | 'analyzing_transcript'
  | 'finalizing'
  | 'done'
  | 'error';

export interface AnalysisProgress {
  stage: AnalysisStage;
  percent: number;
  message: string;
  detail?: string;
  detailLog?: Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' }>;
}

type ProgressCallback = (progress: AnalysisProgress) => void;

/**
 * Call the Qwen OpenAI-compatible chat completions endpoint.
 */
async function callQwenChat(
  config: AIConfig,
  model: string,
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; [k: string]: unknown }>;
  }>,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`API 请求失败 (${res.status}): ${errBody || res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Call the Qwen audio model for speech-to-text.
 */
async function callQwenAudioSTT(
  config: AIConfig,
  audioBase64: string,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.audioModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: audioBase64,
                format: 'wav',
              },
            },
            {
              type: 'text',
              text: '请将这段音频转录为文字，保留说话人区分（如教师/学员），标注大致时间段。输出纯文本格式。',
            },
          ],
        },
      ],
      max_tokens: config.maxTokens,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`语音识别请求失败 (${res.status}): ${errBody || res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Send video frames to the vision model for evaluation.
 */
async function analyzeWithVision(
  config: AIConfig,
  course: CourseConfig,
  studentName: string,
  frames: ExtractedFrame[],
): Promise<AIEvalResult> {
  const systemPrompt = buildEvalSystemPrompt(course);
  const userText = buildFrameAnalysisMessage(course, studentName, frames.length);

  const imageContents = frames.map((f) => ({
    type: 'image_url' as const,
    image_url: { url: f.dataUrl },
  }));

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text' as const, text: userText },
        ...imageContents,
      ],
    },
  ];

  const rawResponse = await callQwenChat(config, config.visionModel, messages);

  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 未返回有效 JSON。原始回复：' + rawResponse.slice(0, 500));
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as AIEvalResult;
    validateEvalResult(result, course);
    return result;
  } catch (e) {
    throw new Error(
      `解析 AI 评估结果失败: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/**
 * Validate and normalize the evaluation result.
 */
function validateEvalResult(result: AIEvalResult, course: CourseConfig): void {
  const dimCount = course.rubric.length;

  if (!Array.isArray(result.scores) || result.scores.length !== dimCount) {
    result.scores = course.rubric.map(
      (_, i) => result.evidenceDetails?.[i]?.score ?? 0,
    );
  }

  result.scores = result.scores.map((s, i) =>
    Math.max(0, Math.min(course.rubric[i].maxScore, Math.round(s))),
  );

  if (!Array.isArray(result.timestamps) || result.timestamps.length !== dimCount) {
    result.timestamps = result.evidenceDetails?.map((e) => e.timestamp ?? 0) ??
      course.rubric.map(() => 0);
  }

  if (!Array.isArray(result.evidenceDetails)) {
    result.evidenceDetails = [];
  }

  while (result.evidenceDetails.length < dimCount) {
    const i = result.evidenceDetails.length;
    result.evidenceDetails.push({
      dimIndex: i,
      dimName: course.rubric[i].label,
      score: result.scores[i],
      maxScore: course.rubric[i].maxScore,
      level: course.getLevel(result.scores[i], course.rubric[i].maxScore),
      timestamp: result.timestamps[i],
      screenshotDesc: '',
      evidence: '暂无评分依据',
      suggestions: '',
    });
  }

  if (!result.overallComment) {
    result.overallComment = '';
  }
  if (!result.teachingSuggestions) {
    result.teachingSuggestions = '';
  }
  if (!Array.isArray(result.keyMoments)) {
    result.keyMoments = [];
  }
}

/**
 * Analyze transcript text with the language model.
 */
async function analyzeTranscript(
  config: AIConfig,
  transcript: string,
  course: CourseConfig,
): Promise<TranscriptResult> {
  const prompt = buildTranscriptAnalysisPrompt(transcript, course);

  const rawResponse = await callQwenChat(config, config.visionModel, [
    { role: 'user', content: prompt },
  ]);

  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      speakerSegments: [],
      keyInstructions: [],
      studentResponses: [],
      communicationScore: 0,
      communicationAnalysis: '',
      clinicalTermUsage: [],
      summary: transcript.slice(0, 200),
    };
  }

  try {
    return JSON.parse(jsonMatch[0]) as TranscriptResult;
  } catch {
    return {
      speakerSegments: [],
      keyInstructions: [],
      studentResponses: [],
      communicationScore: 0,
      communicationAnalysis: '',
      clinicalTermUsage: [],
      summary: transcript.slice(0, 200),
    };
  }
}

function fmtNow(base: number): string {
  const elapsed = ((Date.now() - base) / 1000).toFixed(1);
  return `${elapsed}s`;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/**
 * Full analysis pipeline with parallelized phases:
 *   Phase 1 (0-25%):  extractFrames ∥ extractAudio
 *   Phase 2 (25-85%): analyzeWithVision ∥ callQwenAudioSTT
 *   Phase 3 (85-100%): analyzeTranscript → finalize
 */
export async function analyzeVideo(
  file: File,
  course: CourseConfig,
  studentName: string,
  config: AIConfig,
  onProgress: ProgressCallback,
): Promise<FullAnalysisResult> {
  const startTime = Date.now();
  const detailLog: Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' }> = [];

  if (!config.apiKey) {
    throw new Error('请先在「系统设置 → AI 配置」中填入 API 密钥');
  }

  const emitProgress = (
    stage: AnalysisStage,
    percent: number,
    message: string,
    detail?: string,
  ) => {
    onProgress({ stage, percent, message, detail, detailLog: [...detailLog] });
  };

  const addLog = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    detailLog.push({ time: fmtNow(startTime), text, type });
  };

  /* ── Phase 1 (0-25%): Extract frames + audio in parallel ── */

  addLog(`开始提取关键帧，间隔 ${config.frameInterval}s`);
  emitProgress('extracting_frames', 2, '正在提取视频关键帧与音频...');

  const framePromise = extractFrames(
    file,
    config.frameInterval,
    config.maxFrames,
    (pct, _msg) => {
      const percent = 2 + Math.round(pct * 0.18);
      emitProgress('extracting_frames', Math.min(percent, 20), `正在提取关键帧 (${Math.round(pct * 100)}%)...`);
    },
  );

  let audioPromise: Promise<Blob | null> = Promise.resolve(null);
  if (config.enableTranscription) {
    addLog('开始分离音频轨道...');
    audioPromise = extractAudio(file, (pct, _msg) => {
      const percent = 2 + Math.round(pct * 0.18);
      emitProgress('extracting_audio', Math.min(percent, 20), `正在提取音频 (${Math.round(pct * 100)}%)...`);
    }).catch((err) => {
      addLog('音频提取失败，跳过语音转录', 'warning');
      console.warn('音频提取失败:', err);
      return null;
    });
  }

  const [{ frames, duration }, audioBlob] = await Promise.all([framePromise, audioPromise]);

  addLog(`帧提取完成，共 ${frames.length} 帧，视频时长 ${duration.toFixed(1)}s`, 'success');
  if (audioBlob) {
    addLog(`音频提取完成，大小 ${fmtBytes(audioBlob.size)}`, 'success');
  }
  emitProgress('extracting_frames', 25, '提取完成，准备 AI 分析...');

  /* ── Phase 2 (25-85%): Vision analysis + Audio STT in parallel ── */

  addLog(`发送 ${frames.length} 帧到 ${config.visionModel}，等待分析...`);
  emitProgress('analyzing_vision', 28, `正在发送 ${frames.length} 帧到 ${config.visionModel} 进行分析...`, '这可能需要 30-60 秒');

  const visionPromise = analyzeWithVision(config, course, studentName, frames).then((result) => {
    const dimCount = result.evidenceDetails?.length ?? result.scores?.length ?? 0;
    addLog(`AI 视觉分析完成，识别到 ${dimCount} 个评分维度`, 'success');
    emitProgress('analyzing_vision', 65, 'AI 视觉分析完成');
    return result;
  });

  let sttPromise: Promise<string | null> = Promise.resolve(null);
  if (audioBlob && config.enableTranscription) {
    addLog(`开始语音转文字，使用 ${config.audioModel}...`);
    emitProgress('transcribing', 30, '正在进行语音转文字...');

    const audioArray = await audioBlob.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioArray);
    sttPromise = callQwenAudioSTT(config, audioBase64).then((text) => {
      addLog(`语音转录完成，识别 ${text.length} 字`, 'success');
      return text;
    }).catch((err) => {
      addLog('语音识别失败，跳过转录', 'warning');
      console.warn('语音识别失败:', err);
      return null;
    });
  }

  const [evalResult, rawTranscript] = await Promise.all([visionPromise, sttPromise]);

  emitProgress('analyzing_vision', 85, 'AI 分析阶段完成');

  /* ── Phase 3 (85-100%): Transcript analysis + finalize ── */

  let transcriptResult: TranscriptResult | null = null;

  if (rawTranscript) {
    addLog('分析语音内容...');
    emitProgress('analyzing_transcript', 88, '正在分析语音内容...');
    transcriptResult = await analyzeTranscript(config, rawTranscript, course);
    addLog('语音分析完成', 'success');
  }

  addLog('正在生成最终报告...');
  emitProgress('finalizing', 95, '正在生成最终报告...');

  const totalScore = evalResult.scores.reduce((a, b) => a + b, 0);
  const maxScore = course.rubric.reduce((a, d) => a + d.maxScore, 0);

  const result: FullAnalysisResult = {
    eval: evalResult,
    transcript: transcriptResult,
    videoFrames: frames.map((f) => ({ time: f.time, dataUrl: f.dataUrl })),
    totalScore,
    maxScore,
    duration,
    analysisTime: (Date.now() - startTime) / 1000,
  };

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  addLog(`全部分析完成，耗时 ${totalTime}s`, 'success');
  emitProgress('done', 100, '分析完成！');

  return result;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Test API connection by sending a simple request.
 */
export async function testConnection(config: AIConfig): Promise<{
  ok: boolean;
  message: string;
  model?: string;
}> {
  try {
    const response = await callQwenChat(config, config.visionModel, [
      { role: 'user', content: '请回复"连接成功"' },
    ]);
    return {
      ok: true,
      message: `连接成功 — ${config.visionModel}`,
      model: config.visionModel,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
