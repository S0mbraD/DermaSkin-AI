import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Tag, Button, Progress, Space, Typography, Select,
  Upload, Steps, Table, Avatar, Modal, Tabs, Divider, Tooltip, Badge,
  message, Timeline, Alert,
} from 'antd';
import {
  VideoCameraOutlined, UploadOutlined, PlayCircleOutlined,
  CloudUploadOutlined, CheckCircleOutlined, LoadingOutlined,
  ExperimentOutlined, RobotOutlined, ScanOutlined,
  ClockCircleOutlined, BarChartOutlined, FileSearchOutlined,
  EyeOutlined, CameraOutlined, ReloadOutlined, ArrowLeftOutlined,
  BulbOutlined, WarningOutlined, SoundOutlined, AudioOutlined,
  UserOutlined, DeleteOutlined, SettingOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { ALL_COURSES, STUDENTS } from '@/data';
import { GRADE_COLOR, GRADE_LABEL, LEVEL_META } from '@/types';
import type { Student } from '@/types';
import { computeCourseTotal, computeMaxTotal, findWeakestDimIdx } from '@/utils/algorithms';
import { fmtTime } from '@/utils/format';
import { analyzeVideo, type AnalysisProgress, type AnalysisStage } from '@/services/aiService';
import type { FullAnalysisResult } from '@/services/prompts';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { isElectron, openVideoDialog, readVideoAsUrl } from '@/services/dbService';

const { Text } = Typography;

const DIM_COLORS = [
  '#4361EE', '#7C3AED', '#05CD99', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#8B5CF6', '#10B981', '#F97316',
];

const STAGE_STEP_MAP: Record<AnalysisStage, number> = {
  idle: -1,
  extracting_frames: 0,
  extracting_audio: 1,
  analyzing_vision: 2,
  transcribing: 3,
  analyzing_transcript: 4,
  finalizing: 5,
  done: 6,
  error: -1,
};

const PROGRESS_STEPS = [
  { title: '帧提取', description: '视频关键帧' },
  { title: '音频分离', description: '音频轨道' },
  { title: 'AI 视觉', description: '多模态分析' },
  { title: '语音转录', description: '语音→文字' },
  { title: '语音分析', description: '沟通评估' },
  { title: '报告生成', description: '汇总结果' },
];

const fmtFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

interface HistoryEntry {
  id: string;
  studentName: string;
  courseName: string;
  result: FullAnalysisResult;
  date: string;
}

const VideoWorkbench: React.FC = () => {
  /* ------------------------------------------------------------------ */
  /*  State                                                               */
  /* ------------------------------------------------------------------ */

  const [view, setView] = useState<'main' | 'progress' | 'report'>('main');
  const [selectedCourse, setSelectedCourse] = useState(ALL_COURSES[0].id);
  const [selectedStudent, setSelectedStudent] = useState<number>(STUDENTS[0].id);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    stage: 'idle', percent: 0, message: '',
  });
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [viewingResult, setViewingResult] = useState<FullAnalysisResult | null>(null);
  const [reportStudentId, setReportStudentId] = useState<number>(STUDENTS[0].id);
  const [activeEvidence, setActiveEvidence] = useState<number>(0);
  const [cancelModal, setCancelModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisAbortedRef = useRef(false);

  const { settings } = useSettingsStore();

  /* ------------------------------------------------------------------ */
  /*  Computed                                                            */
  /* ------------------------------------------------------------------ */

  const course = useMemo(
    () => ALL_COURSES.find(c => c.id === selectedCourse) ?? ALL_COURSES[0],
    [selectedCourse],
  );
  const reportStudent = useMemo(
    () => STUDENTS.find(s => s.id === reportStudentId) ?? STUDENTS[0],
    [reportStudentId],
  );
  const ev = useMemo(() => course.evals[reportStudentId], [course, reportStudentId]);
  const total = useMemo(() => computeCourseTotal(reportStudentId, course), [reportStudentId, course]);
  const maxTotal = useMemo(() => computeMaxTotal(course), [course]);

  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setVideoUrl(null);
    return undefined;
  }, [uploadedFile]);

  const queueData = useMemo(() => {
    const realItems = analysisHistory.map(h => ({
      key: `real-${h.id}`,
      student: STUDENTS.find(s => s.name === h.studentName) ?? STUDENTS[0],
      courseName: h.courseName,
      total: h.result.totalScore,
      grade: GRADE_LABEL(h.result.totalScore),
      gradeColor: GRADE_COLOR(h.result.totalScore),
      date: h.date,
      status: 'done' as const,
      isReal: true as const,
      result: h.result as FullAnalysisResult | null,
    }));

    const mockItems = STUDENTS.map((s, idx) => {
      const t = computeCourseTotal(s.id, course);
      const status: string = idx < 3 ? 'done' : idx === 3 ? 'analyzing' : 'pending';
      return {
        key: `mock-${s.id}`,
        student: s,
        courseName: course.shortName,
        total: t,
        grade: GRADE_LABEL(t),
        gradeColor: GRADE_COLOR(t),
        date: `2026-03-${String(10 + idx).padStart(2, '0')}`,
        status,
        isReal: false as const,
        result: null as FullAnalysisResult | null,
      };
    });

    return [...realItems, ...mockItems];
  }, [course, analysisHistory]);

  const stats = useMemo(() => {
    const totals = Object.keys(course.evals).map(id => computeCourseTotal(Number(id), course));
    return {
      count: totals.length + analysisHistory.length,
      avg: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
      max: totals.length ? Math.max(...totals) : 0,
      min: totals.length ? Math.min(...totals) : 0,
    };
  }, [course, analysisHistory]);

  const classAvgScores = useMemo(
    () =>
      course.rubric.map((_, i) => {
        const evals = Object.values(course.evals);
        return evals.length
          ? Math.round(evals.reduce((s, e) => s + e.scores[i], 0) / evals.length)
          : 0;
      }),
    [course],
  );

  /* ------------------------------------------------------------------ */
  /*  ECharts Options                                                     */
  /* ------------------------------------------------------------------ */

  const radarOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' as const },
      radar: {
        indicator: course.rubric.map(d => ({ name: d.label, max: d.maxScore })),
        shape: 'polygon' as const,
        splitNumber: 4,
        radius: '65%',
        axisName: { fontSize: 10, color: '#707EAE' },
      },
      series: [{
        type: 'radar' as const,
        data: [{
          value: classAvgScores,
          name: '班级均值',
          areaStyle: { color: 'rgba(67,97,238,0.15)' },
          lineStyle: { color: '#4361EE', width: 2 },
          itemStyle: { color: '#4361EE' },
        }],
      }],
    }),
    [course, classAvgScores],
  );

  const mockGaugeOption = useMemo(
    () => ({
      series: [{
        type: 'gauge' as const,
        radius: '100%',
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: maxTotal,
        pointer: { show: false },
        progress: { show: true, width: 14, roundCap: true, itemStyle: { color: GRADE_COLOR(total) } },
        axisLine: { lineStyle: { width: 14, color: [[1, '#F4F7FE']] as const } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true, fontSize: 26, fontWeight: 800,
          color: GRADE_COLOR(total), offsetCenter: [0, '10%'],
          formatter: `{value}/${maxTotal}`,
        },
        data: [{ value: total }],
      }],
    }),
    [total, maxTotal],
  );

  const mockReportRadarOption = useMemo(() => {
    if (!ev) return {};
    return {
      tooltip: { trigger: 'item' as const },
      legend: { data: [reportStudent.name, '班级均值'], bottom: 0, textStyle: { fontSize: 11 } },
      radar: {
        indicator: course.rubric.map(d => ({ name: d.label, max: d.maxScore })),
        shape: 'polygon' as const,
        splitNumber: 4,
        radius: '60%',
        axisName: { fontSize: 10, color: '#707EAE' },
      },
      series: [{
        type: 'radar' as const,
        data: [
          {
            value: ev.scores,
            name: reportStudent.name,
            areaStyle: { color: 'rgba(124,58,237,0.18)' },
            lineStyle: { color: '#7C3AED', width: 2 },
            itemStyle: { color: '#7C3AED' },
          },
          {
            value: classAvgScores,
            name: '班级均值',
            areaStyle: { color: 'rgba(67,97,238,0.08)' },
            lineStyle: { color: '#4361EE', width: 2, type: 'dashed' as const },
            itemStyle: { color: '#4361EE' },
          },
        ],
      }],
    };
  }, [course, ev, reportStudent, classAvgScores]);

  const mockTrendOption = useMemo(() => {
    if (!ev) return {};
    const sessions = ['第1次', '第2次', '第3次', '第4次', '本次'];
    const factors = [0.72, 0.80, 0.87, 0.94, 1.0];
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: course.rubric.map(d => d.label), bottom: 0, textStyle: { fontSize: 10 } },
      grid: { top: 30, right: 20, bottom: 60, left: 40 },
      xAxis: { type: 'category' as const, data: sessions, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value' as const, min: 0 },
      series: course.rubric.map((dim, i) => ({
        name: dim.label,
        type: 'line' as const,
        smooth: true,
        symbol: 'circle' as const,
        symbolSize: 6,
        lineStyle: { width: 2, color: DIM_COLORS[i % DIM_COLORS.length] },
        itemStyle: { color: DIM_COLORS[i % DIM_COLORS.length] },
        data: factors.map(f => Math.round(Math.min(dim.maxScore, ev.scores[i] * f))),
      })),
    };
  }, [course, ev]);

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                            */
  /* ------------------------------------------------------------------ */

  const { saveAnalysis } = useAnalysisStore();

  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
    message.success(`已选择: ${file.name} (${fmtFileSize(file.size)})`);
    return false;
  }, []);

  const handleNativeOpen = useCallback(async () => {
    const info = await openVideoDialog();
    if (!info) return;
    const dataUrl = await readVideoAsUrl(info.path);
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    const file = new File([blob], info.name, { type: blob.type });
    setUploadedFile(file);
    message.success(`已选择: ${info.name} (${fmtFileSize(info.size)})`);
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!uploadedFile) {
      message.warning('请先上传视频文件');
      return;
    }
    if (!settings.ai.apiKey) {
      message.warning('请先在设置中配置 API 密钥');
      return;
    }

    setView('progress');
    setError(null);
    setAnalysisProgress({ stage: 'idle', percent: 0, message: '准备开始...' });
    analysisAbortedRef.current = false;

    const studentObj = STUDENTS.find(s => s.id === selectedStudent);
    const studentName = studentObj?.name ?? '学员';

    try {
      const result = await analyzeVideo(
        uploadedFile,
        course,
        studentName,
        settings.ai,
        (progress) => {
          if (!analysisAbortedRef.current) setAnalysisProgress(progress);
        },
      );

      if (analysisAbortedRef.current) return;

      setAnalysisResult(result);
      const entryId = Date.now().toString();
      setAnalysisHistory(prev => [{
        id: entryId,
        studentName,
        courseName: course.name,
        result,
        date: new Date().toISOString().slice(0, 10),
      }, ...prev]);

      saveAnalysis({
        id: entryId,
        studentId: selectedStudent,
        courseId: selectedCourse,
        videoName: uploadedFile.name,
        videoSize: uploadedFile.size,
        durationSeconds: result.duration,
        dimensionScores: result.eval.scores.map((s, i) => ({
          label: course.rubric[i]?.label ?? `D${i}`,
          score: s,
          max: course.rubric[i]?.maxScore ?? 0,
        })),
        overallScore: result.totalScore,
        overallComment: result.eval.overallComment,
        evidenceDetails: result.eval.evidenceDetails,
        keyMoments: result.eval.keyMoments,
        teachingSuggestions: [result.eval.teachingSuggestions],
        transcript: result.transcript?.speakerSegments ?? [],
        transcriptAnalysis: result.transcript ?? undefined,
        framesAnalyzed: result.videoFrames.length,
        aiModel: settings.ai.visionModel,
        analysisDurationMs: result.analysisTime,
        createdAt: new Date().toISOString(),
      });
      message.success('分析完成！');
    } catch (err) {
      if (analysisAbortedRef.current) return;
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setAnalysisProgress(prev => ({ ...prev, stage: 'error', message: errMsg }));
      message.error('分析失败: ' + errMsg);
    }
  }, [uploadedFile, settings.ai, selectedStudent, course]);

  const handleViewRealReport = useCallback((result: FullAnalysisResult, studentId?: number) => {
    setViewingResult(result);
    if (studentId) setReportStudentId(studentId);
    setActiveEvidence(0);
    setView('report');
  }, []);

  const handleViewMockReport = useCallback((studentId: number) => {
    setViewingResult(null);
    setReportStudentId(studentId);
    setActiveEvidence(findWeakestDimIdx(studentId, course));
    setView('report');
  }, [course]);

  const handleCancelAnalysis = useCallback(() => {
    analysisAbortedRef.current = true;
    setCancelModal(false);
    setView('main');
    setAnalysisProgress({ stage: 'idle', percent: 0, message: '' });
  }, []);

  const seekVideo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Render helpers                                                      */
  /* ------------------------------------------------------------------ */

  const numCircle = (num: number, color: string, size = 24) => (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%',
        background: `${color}18`, color, fontSize: size * 0.5, fontWeight: 800, flexShrink: 0,
      }}
    >
      {num}
    </span>
  );

  const levelTag = (level: string) => {
    const m = LEVEL_META[level];
    if (!m) return null;
    return (
      <Tag style={{
        background: `${m.color}14`, color: m.color, border: 'none',
        fontWeight: 600, fontSize: 10, margin: 0,
      }}>
        {m.label}
      </Tag>
    );
  };

  const statusTag = (status: string) => {
    if (status === 'done')
      return <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 10 }}>完成</Tag>;
    if (status === 'analyzing')
      return <Tag color="processing" icon={<LoadingOutlined />} style={{ fontSize: 10 }}>分析中</Tag>;
    return <Tag style={{ fontSize: 10 }}>待分析</Tag>;
  };

  const findClosestFrame = (timestamp: number, frames: { time: number; dataUrl: string }[]) => {
    if (!frames.length) return null;
    return frames.reduce((closest, f) =>
      Math.abs(f.time - timestamp) < Math.abs(closest.time - timestamp) ? f : closest,
    );
  };

  /* ================================================================== */
  /*  MAIN VIEW                                                          */
  /* ================================================================== */

  const renderMainView = () => {
    const hasApiKey = !!settings.ai.apiKey;

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2B3674', margin: 0 }}>
              <VideoCameraOutlined style={{ marginRight: 8, color: '#4361EE' }} />
              视频分析工作台
            </h2>
            <Select
              value={selectedCourse}
              onChange={setSelectedCourse}
              style={{ width: 200 }}
              options={ALL_COURSES.map(c => ({ value: c.id, label: c.name }))}
            />
            <Select
              value={selectedStudent}
              onChange={setSelectedStudent}
              style={{ width: 150 }}
              options={STUDENTS.map(s => ({ value: s.id, label: s.name }))}
            />
            <Button
              type="primary"
              icon={<ScanOutlined />}
              onClick={handleStartAnalysis}
              disabled={!uploadedFile || !hasApiKey}
              style={{ background: (!uploadedFile || !hasApiKey) ? undefined : '#4361EE', borderColor: '#4361EE' }}
            >
              开始 AI 分析
            </Button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Badge count={stats.count} style={{ background: '#4361EE' }} overflowCount={999}>
                <Tag style={{ fontSize: 11, padding: '2px 8px' }}>总分析</Tag>
              </Badge>
              <Badge count={course.rubric.length} style={{ background: '#7C3AED' }}>
                <Tag style={{ fontSize: 11, padding: '2px 8px' }}>评分维度</Tag>
              </Badge>
            </div>
          </div>
        </motion.div>

        <Row gutter={[16, 16]}>
          {/* ---------- left: upload + queue ---------- */}
          <Col xs={24} lg={16}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 20 } }}>
                {!hasApiKey && (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message="未配置 API 密钥"
                    description="请先在「系统设置 → AI 配置」中填入 API 密钥，才能使用真实 AI 分析功能。"
                    style={{ marginBottom: 16, borderRadius: 10 }}
                    action={
                      <Button size="small" icon={<SettingOutlined />} onClick={() => { window.location.hash = '#/settings'; }}>
                        前往设置
                      </Button>
                    }
                  />
                )}
                <Tabs
                  size="small"
                  items={[
                    {
                      key: 'upload',
                      label: <span><UploadOutlined style={{ marginRight: 4 }} />文件上传</span>,
                      children: (
                        <>
                          <Upload.Dragger
                            accept="video/*"
                            showUploadList={false}
                            beforeUpload={handleFileUpload}
                            style={{
                              borderRadius: 14,
                              border: '2px dashed transparent',
                              background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#4361EE40,#7C3AED40,#05CD9940) border-box',
                              padding: '24px 0',
                            }}
                          >
                            <CloudUploadOutlined style={{ fontSize: 48, color: '#4361EE', marginBottom: 8 }} />
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#2B3674', margin: '8px 0 4px' }}>
                              点击或拖拽视频文件至此处
                            </p>
                            <p style={{ fontSize: 12, color: '#A3AED0', margin: 0 }}>
                              支持 MP4、MOV、AVI 格式，建议时长 3–10 分钟
                            </p>
                            {isElectron() && (
                              <Button
                                type="link"
                                icon={<UploadOutlined />}
                                onClick={(e) => { e.stopPropagation(); handleNativeOpen(); }}
                                style={{ marginTop: 4, fontWeight: 600, fontSize: 13 }}
                              >
                                从本地文件系统选择
                              </Button>
                            )}
                          </Upload.Dragger>

                          {uploadedFile && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              transition={{ duration: 0.3 }}
                            >
                              <div style={{
                                marginTop: 12, padding: '10px 14px', background: '#F4F7FE',
                                borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
                              }}>
                                <VideoCameraOutlined style={{ fontSize: 20, color: '#4361EE' }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2B3674' }}>
                                    {uploadedFile.name}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#707EAE' }}>
                                    {fmtFileSize(uploadedFile.size)}
                                  </div>
                                </div>
                                <Button
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  danger
                                  onClick={() => setUploadedFile(null)}
                                >
                                  移除
                                </Button>
                              </div>
                            </motion.div>
                          )}

                          {videoUrl && (
                            <div style={{
                              marginTop: 12, borderRadius: 12, overflow: 'hidden',
                              background: '#0A0A14', position: 'relative',
                            }}>
                              <video
                                ref={videoRef}
                                src={videoUrl}
                                controls
                                style={{ width: '100%', height: 240, objectFit: 'contain', background: '#000', display: 'block' }}
                              />
                            </div>
                          )}

                          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <Button
                              type="primary"
                              icon={<ScanOutlined />}
                              onClick={handleStartAnalysis}
                              disabled={!uploadedFile || !hasApiKey}
                              style={{ background: (!uploadedFile || !hasApiKey) ? undefined : '#4361EE' }}
                            >
                              开始 AI 分析
                            </Button>
                            <Button icon={<VideoCameraOutlined />}>摄像头录制</Button>
                            <Button icon={<PlayCircleOutlined />}>导入示例视频</Button>
                          </div>
                        </>
                      ),
                    },
                    {
                      key: 'import',
                      label: <span><CloudUploadOutlined style={{ marginRight: 4 }} />在线导入</span>,
                      children: (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#A3AED0', fontSize: 13 }}>
                          <VideoCameraOutlined style={{ fontSize: 36, marginBottom: 8 }} />
                          <p>输入视频 URL 或从云存储导入（开发中）</p>
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card
                title={
                  <span style={{ fontWeight: 700 }}>
                    <BarChartOutlined style={{ marginRight: 6, color: '#4361EE' }} />
                    分析队列
                  </span>
                }
                style={{ borderRadius: 14 }}
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  dataSource={queueData}
                  pagination={false}
                  size="small"
                  rowKey="key"
                  columns={[
                    {
                      title: '学员',
                      dataIndex: 'student',
                      width: 140,
                      render: (s: Student) => (
                        <Space>
                          <Avatar
                            size={30}
                            style={{
                              background: GRADE_COLOR(computeCourseTotal(s.id, course)),
                              fontWeight: 700, fontSize: 12,
                            }}
                          >
                            {s.avatar}
                          </Avatar>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                        </Space>
                      ),
                    },
                    {
                      title: '课程',
                      dataIndex: 'courseName',
                      width: 100,
                      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
                    },
                    {
                      title: '总分',
                      dataIndex: 'total',
                      width: 70,
                      render: (v: number, r: (typeof queueData)[0]) => (
                        <span style={{ fontWeight: 800, color: r.gradeColor, fontSize: 14 }}>{v}</span>
                      ),
                    },
                    {
                      title: '等级',
                      dataIndex: 'grade',
                      width: 80,
                      render: (v: string, r: (typeof queueData)[0]) => (
                        <Tag style={{
                          background: `${r.gradeColor}14`, color: r.gradeColor,
                          border: 'none', fontWeight: 600, fontSize: 10,
                        }}>
                          {v}
                        </Tag>
                      ),
                    },
                    {
                      title: '日期',
                      dataIndex: 'date',
                      width: 110,
                      render: (v: string) => <span style={{ fontSize: 11, color: '#707EAE' }}>{v}</span>,
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      width: 110,
                      render: (v: string, r: (typeof queueData)[0]) => (
                        <Space size={4}>
                          {statusTag(v)}
                          {r.isReal && <Tag color="purple" style={{ fontSize: 9, margin: 0 }}>AI</Tag>}
                        </Space>
                      ),
                    },
                    {
                      title: '操作',
                      width: 180,
                      render: (_: unknown, r: (typeof queueData)[0]) => (
                        <Space>
                          {r.status === 'done' && r.isReal && r.result && (
                            <Button
                              size="small"
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewRealReport(r.result!, r.student.id)}
                              style={{ fontSize: 11, padding: 0 }}
                            >
                              查看报告
                            </Button>
                          )}
                          {r.status === 'done' && !r.isReal && (
                            <Button
                              size="small"
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewMockReport(r.student.id)}
                              style={{ fontSize: 11, padding: 0, color: '#707EAE' }}
                            >
                              查看报告
                            </Button>
                          )}
                          <Button
                            size="small"
                            type="link"
                            icon={<ReloadOutlined />}
                            style={{ fontSize: 11, padding: 0, color: '#707EAE' }}
                          >
                            重新分析
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            </motion.div>
          </Col>

          {/* ---------- right: radar + stats ---------- */}
          <Col xs={24} lg={8}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card
                title={
                  <span style={{ fontWeight: 700 }}>
                    <ExperimentOutlined style={{ marginRight: 6, color: '#7C3AED' }} />
                    课程维度雷达
                  </span>
                }
                style={{ borderRadius: 14, marginBottom: 16 }}
                styles={{ body: { padding: '8px 12px' } }}
              >
                <ReactECharts option={radarOption} style={{ height: 260 }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {course.rubric.map((dim, i) => (
                    <Tag
                      key={dim.key}
                      style={{
                        fontSize: 10,
                        borderColor: `${DIM_COLORS[i % DIM_COLORS.length]}40`,
                        color: DIM_COLORS[i % DIM_COLORS.length],
                      }}
                    >
                      {dim.label} ({dim.maxScore}分)
                    </Tag>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
                <Row gutter={[12, 12]}>
                  {([
                    { label: '总分析次数', value: stats.count, color: '#4361EE', icon: <BarChartOutlined /> },
                    { label: '平均得分', value: stats.avg, color: '#7C3AED', icon: <ExperimentOutlined /> },
                    { label: '最高分', value: stats.max, color: '#05CD99', icon: <CheckCircleOutlined /> },
                    { label: '最低分', value: stats.min, color: '#EF4444', icon: <ClockCircleOutlined /> },
                  ] as const).map((item, i) => (
                    <Col span={12} key={i}>
                      <div style={{
                        background: `${item.color}08`, borderRadius: 10,
                        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: `${item.color}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: item.color, fontSize: 16,
                        }}>
                          {item.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#A3AED0' }}>{item.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </>
    );
  };

  /* ================================================================== */
  /*  PROGRESS VIEW                                                      */
  /* ================================================================== */

  const renderProgressView = () => {
    const currentStep = STAGE_STEP_MAP[analysisProgress.stage] ?? -1;
    const isDone = analysisProgress.stage === 'done';
    const isError = analysisProgress.stage === 'error';
    const currentStudentObj = STUDENTS.find(s => s.id === selectedStudent);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setCancelModal(true)}>
            取消
          </Button>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2B3674', margin: 0 }}>
            <RobotOutlined style={{ marginRight: 8, color: '#4361EE' }} />
            AI 分析进行中
          </h2>
          {!isDone && !isError && (
            <Tag color="processing" icon={<LoadingOutlined />}>
              {currentStudentObj?.name ?? '—'} · {course.shortName}
            </Tag>
          )}
        </div>

        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 24 } }}>
          {videoUrl && (
            <div style={{
              marginBottom: 20, borderRadius: 12, overflow: 'hidden',
              background: '#0A0A14', display: 'flex', gap: 16,
              alignItems: 'center', padding: '0 16px 0 0',
            }}>
              <video
                src={videoUrl}
                controls
                muted
                style={{ width: 320, height: 180, objectFit: 'contain', background: '#000', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2B3674', marginBottom: 6 }}>
                  {uploadedFile?.name ?? '视频分析中'}
                </div>
                <div style={{ fontSize: 12, color: '#707EAE', marginBottom: 8 }}>
                  {uploadedFile ? `${(uploadedFile.size / 1048576).toFixed(1)} MB` : ''} · {course.shortName}
                </div>
                <Tag color="processing" icon={undefined} style={{ fontSize: 11 }}>
                  {analysisProgress.message || '准备中...'}
                </Tag>
              </div>
            </div>
          )}
          <Steps
            current={isDone ? 6 : currentStep}
            status={isError ? 'error' : undefined}
            items={PROGRESS_STEPS.map((item, i) => ({
              ...item,
              icon:
                i < currentStep ? (
                  <CheckCircleOutlined style={{ color: '#05CD99' }} />
                ) : i === currentStep && !isDone && !isError ? (
                  <LoadingOutlined style={{ color: '#4361EE' }} />
                ) : undefined,
            }))}
            style={{ marginBottom: 32 }}
          />

          {/* Progress bar */}
          {!isDone && !isError && (
            <div style={{ background: '#F4F7FE', borderRadius: 14, padding: 20 }}>
              <Progress
                percent={analysisProgress.percent}
                strokeColor={{
                  '0%': '#4361EE',
                  '100%': '#7C3AED',
                }}
                style={{ marginBottom: 16 }}
              />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2B3674', marginBottom: 6 }}>
                <ScanOutlined style={{ marginRight: 8, color: '#4361EE' }} />
                {analysisProgress.message}
              </div>
              {analysisProgress.detail && (
                <div style={{ fontSize: 12, color: '#707EAE' }}>
                  {analysisProgress.detail}
                </div>
              )}
              {/* Real-time detail nodes */}
              {analysisProgress.detailLog && analysisProgress.detailLog.length > 0 && (
                <div style={{
                  marginTop: 16,
                  maxHeight: 240,
                  overflowY: 'auto',
                  borderRadius: 10,
                  border: '1px solid #E9EDF7',
                  background: '#fff',
                }}>
                  {analysisProgress.detailLog.map((entry, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 14px',
                      borderBottom: idx < analysisProgress.detailLog!.length - 1 ? '1px solid #F4F7FE' : 'none',
                      fontSize: 12,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                        background: entry.type === 'success' ? '#05CD99' : entry.type === 'warning' ? '#F59E0B' : '#4361EE',
                      }} />
                      <span style={{ color: '#A3AED0', fontSize: 11, flexShrink: 0, minWidth: 55 }}>{entry.time}</span>
                      <span style={{
                        color: entry.type === 'success' ? '#05CD99' : entry.type === 'warning' ? '#F59E0B' : '#2B3674',
                        fontWeight: entry.type === 'success' ? 600 : 400,
                        flex: 1,
                      }}>{entry.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {isError && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center', padding: '40px 0' }}
            >
              <WarningOutlined style={{ fontSize: 56, color: '#EF4444', marginBottom: 16 }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', marginBottom: 6 }}>
                分析失败
              </div>
              <div style={{
                fontSize: 13, color: '#707EAE', marginBottom: 20,
                maxWidth: 500, margin: '0 auto 20px',
                padding: '12px 16px', background: '#FEF2F2', borderRadius: 10,
                wordBreak: 'break-all',
              }}>
                {error ?? analysisProgress.message}
              </div>
              <Space size={12}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ReloadOutlined />}
                  onClick={handleStartAnalysis}
                  style={{ background: '#4361EE', borderRadius: 10 }}
                >
                  重试
                </Button>
                <Button
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => { setView('main'); setError(null); }}
                  style={{ borderRadius: 10 }}
                >
                  返回工作台
                </Button>
              </Space>
            </motion.div>
          )}

          {/* Done state */}
          {isDone && analysisResult && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center', padding: '40px 0' }}
            >
              <CheckCircleOutlined style={{ fontSize: 56, color: '#05CD99', marginBottom: 16 }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: '#2B3674', marginBottom: 6 }}>
                分析完成
              </div>
              <div style={{ fontSize: 13, color: '#707EAE', marginBottom: 8 }}>
                已完成 {course.rubric.length} 个维度的 AI 评分分析，总分{' '}
                {analysisResult.totalScore}/{analysisResult.maxScore}
              </div>
              <div style={{ fontSize: 12, color: '#A3AED0', marginBottom: 20 }}>
                分析耗时 {analysisResult.analysisTime.toFixed(1)} 秒
                {analysisResult.transcript && ' · 含语音转录'}
              </div>
              <Space size={12}>
                <Button
                  type="primary"
                  size="large"
                  icon={<FileSearchOutlined />}
                  onClick={() => handleViewRealReport(analysisResult, selectedStudent)}
                  style={{ background: '#4361EE', borderRadius: 10 }}
                >
                  查看详细报告
                </Button>
                <Button
                  size="large"
                  icon={<ReloadOutlined />}
                  onClick={() => { setView('main'); }}
                  style={{ borderRadius: 10 }}
                >
                  返回工作台
                </Button>
              </Space>
            </motion.div>
          )}

          {!isDone && !isError && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Button danger onClick={() => setCancelModal(true)}>取消分析</Button>
            </div>
          )}
        </Card>

        <Modal
          title="确认取消"
          open={cancelModal}
          onOk={handleCancelAnalysis}
          onCancel={() => setCancelModal(false)}
          okText="确认取消"
          cancelText="继续分析"
          okButtonProps={{ danger: true }}
        >
          <p>分析正在进行中，确定要取消吗？已发送的 API 请求将继续完成但结果不会保存。</p>
        </Modal>
      </motion.div>
    );
  };

  /* ================================================================== */
  /*  REAL REPORT VIEW (AI data)                                         */
  /* ================================================================== */

  const renderRealReport = () => {
    if (!viewingResult) return null;

    const rScores = viewingResult.eval.scores;
    const rTotal = viewingResult.totalScore;
    const rMax = viewingResult.maxScore;
    const rPct = rMax > 0 ? Math.round((rTotal / rMax) * 100) : 0;
    const rGradeColor = GRADE_COLOR(rPct);

    const rGaugeOption = {
      series: [{
        type: 'gauge' as const,
        radius: '100%',
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: rMax,
        pointer: { show: false },
        progress: { show: true, width: 14, roundCap: true, itemStyle: { color: rGradeColor } },
        axisLine: { lineStyle: { width: 14, color: [[1, '#F4F7FE']] as const } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true, fontSize: 26, fontWeight: 800,
          color: rGradeColor, offsetCenter: [0, '10%'],
          formatter: `{value}/${rMax}`,
        },
        data: [{ value: rTotal }],
      }],
    };

    const rRadarOption = {
      tooltip: { trigger: 'item' as const },
      legend: { data: [reportStudent.name, '班级均值'], bottom: 0, textStyle: { fontSize: 11 } },
      radar: {
        indicator: course.rubric.map(d => ({ name: d.label, max: d.maxScore })),
        shape: 'polygon' as const,
        splitNumber: 4,
        radius: '60%',
        axisName: { fontSize: 10, color: '#707EAE' },
      },
      series: [{
        type: 'radar' as const,
        data: [
          {
            value: rScores,
            name: reportStudent.name,
            areaStyle: { color: 'rgba(124,58,237,0.18)' },
            lineStyle: { color: '#7C3AED', width: 2 },
            itemStyle: { color: '#7C3AED' },
          },
          {
            value: classAvgScores,
            name: '班级均值',
            areaStyle: { color: 'rgba(67,97,238,0.08)' },
            lineStyle: { color: '#4361EE', width: 2, type: 'dashed' as const },
            itemStyle: { color: '#4361EE' },
          },
        ],
      }],
    };

    const rTrendOption = {
      tooltip: { trigger: 'axis' as const },
      legend: { data: course.rubric.map(d => d.label), bottom: 0, textStyle: { fontSize: 10 } },
      grid: { top: 30, right: 20, bottom: 60, left: 40 },
      xAxis: {
        type: 'category' as const,
        data: ['第1次', '第2次', '第3次', '第4次', '本次(AI)'],
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: 'value' as const, min: 0 },
      series: course.rubric.map((dim, i) => ({
        name: dim.label,
        type: 'line' as const,
        smooth: true,
        symbol: 'circle' as const,
        symbolSize: 6,
        lineStyle: { width: 2, color: DIM_COLORS[i % DIM_COLORS.length] },
        itemStyle: { color: DIM_COLORS[i % DIM_COLORS.length] },
        data: [0.72, 0.80, 0.87, 0.94].map(f =>
          Math.round(Math.min(dim.maxScore, (rScores[i] ?? 0) * f)),
        ).concat([rScores[i] ?? 0]),
      })),
    };

    const transcript = viewingResult.transcript;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {/* ---- HEADER ---- */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: '16px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setView('main')} style={{ borderRadius: 10 }}>
                返回
              </Button>
              <Avatar size={44} style={{ background: rGradeColor, fontWeight: 800, fontSize: 18 }}>
                {reportStudent.avatar}
              </Avatar>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2B3674' }}>{reportStudent.name}</div>
                <div style={{ fontSize: 12, color: '#707EAE' }}>
                  {reportStudent.grade} · {reportStudent.group}
                </div>
              </div>
              <Tag style={{
                fontSize: 13, padding: '4px 12px', fontWeight: 700,
                background: '#4361EE10', color: '#4361EE', border: 'none',
              }}>
                {course.name}
              </Tag>
              <Tag style={{
                fontSize: 11, padding: '2px 8px', fontWeight: 600,
                background: '#7C3AED10', color: '#7C3AED', border: 'none',
              }}>
                <RobotOutlined style={{ marginRight: 4 }} />AI 真实分析
              </Tag>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 100, height: 100 }}>
                  <ReactECharts option={rGaugeOption} style={{ height: 100, width: 100 }} />
                </div>
                <Tag style={{
                  fontSize: 14, padding: '6px 16px', fontWeight: 800,
                  background: `${rGradeColor}14`, color: rGradeColor,
                  border: `1px solid ${rGradeColor}30`, borderRadius: 8,
                }}>
                  {GRADE_LABEL(rPct)}
                </Tag>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ---- SECTION 1: Video + Scoring Table ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={14}>
              <Card
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: 16 } }}
                title={
                  <span style={{ fontWeight: 700 }}>
                    <PlayCircleOutlined style={{ marginRight: 6, color: '#4361EE' }} />
                    操作视频
                  </span>
                }
              >
                <div style={{ borderRadius: 12, overflow: 'hidden', background: '#1a1a2e', position: 'relative' }}>
                  {videoUrl ? (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      style={{ width: '100%', height: 300, objectFit: 'contain', background: '#000', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at center, #2B367420, transparent 70%)',
                      }} />
                      <PlayCircleOutlined style={{ fontSize: 64, color: '#ffffff80' }} />
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 12, left: 16, right: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    pointerEvents: 'none',
                  }}>
                    <Tag style={{ background: '#00000060', color: '#fff', border: 'none', fontSize: 10 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {viewingResult.duration > 0 ? `${fmtTime(viewingResult.duration)} 总时长` : '时长未知'}
                    </Tag>
                    <Tag style={{ background: '#4361EE90', color: '#fff', border: 'none', fontSize: 10 }}>
                      分析耗时 {viewingResult.analysisTime.toFixed(1)}s
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: 16 } }}
                title={
                  <span style={{ fontWeight: 700 }}>
                    <BarChartOutlined style={{ marginRight: 6, color: '#7C3AED' }} />
                    评分表
                  </span>
                }
              >
                {course.rubric.map((dim, i) => {
                  const score = rScores[i] ?? 0;
                  const pct = dim.maxScore > 0 ? Math.round((score / dim.maxScore) * 100) : 0;
                  const level = course.getLevel(score, dim.maxScore);
                  const color = LEVEL_META[level].color;
                  return (
                    <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      {numCircle(i + 1, DIM_COLORS[i % DIM_COLORS.length])}
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: '#2B3674' }}>{dim.label}</span>
                      <Progress percent={pct} size="small" style={{ width: 80 }} strokeColor={color} showInfo={false} />
                      <span style={{ fontWeight: 800, fontSize: 13, color, minWidth: 50, textAlign: 'right' }}>
                        {score}/{dim.maxScore}
                      </span>
                      {levelTag(level)}
                    </div>
                  );
                })}
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, flex: 1, color: '#2B3674' }}>总分</span>
                  <Progress
                    percent={rPct}
                    size="small"
                    style={{ width: 80 }}
                    strokeColor={rGradeColor}
                    showInfo={false}
                  />
                  <span style={{ fontWeight: 900, fontSize: 16, color: rGradeColor, minWidth: 50, textAlign: 'right' }}>
                    {rTotal}/{rMax}
                  </span>
                  <Tag style={{
                    background: `${rGradeColor}14`, color: rGradeColor,
                    border: 'none', fontWeight: 700, fontSize: 11, margin: 0,
                  }}>
                    {GRADE_LABEL(rPct)}
                  </Tag>
                </div>
              </Card>
            </Col>
          </Row>
        </motion.div>

        {/* ---- SECTION 2: 循证评分依据 — AI 分析 ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card
            title={
              <span style={{ fontWeight: 700 }}>
                <CameraOutlined style={{ marginRight: 6, color: '#4361EE' }} />
                循证评分依据 — AI 分析
              </span>
            }
            style={{ borderRadius: 14, marginBottom: 16 }}
            styles={{ body: { padding: 16 } }}
          >
            <Row gutter={[12, 12]}>
              {course.rubric.map((dim, i) => {
                const detail = viewingResult.eval.evidenceDetails[i];
                if (!detail) return null;
                const dimColor = DIM_COLORS[i % DIM_COLORS.length];
                const levelColor = LEVEL_META[detail.level]?.color ?? '#A3AED0';
                const isActive = activeEvidence === i;
                const pct = detail.maxScore > 0 ? Math.round((detail.score / detail.maxScore) * 100) : 0;
                const closestFrame = findClosestFrame(detail.timestamp, viewingResult.videoFrames);

                return (
                  <Col xs={24} md={12} key={dim.key}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <div
                        onClick={() => setActiveEvidence(i)}
                        style={{
                          borderRadius: 12, padding: 14, cursor: 'pointer',
                          background: `${levelColor}0F`,
                          border: isActive ? `2px solid ${dimColor}` : '2px solid transparent',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          {numCircle(i + 1, dimColor, 28)}
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#2B3674', flex: 1 }}>
                            {detail.dimName}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: 13, color: levelColor }}>
                            {detail.score}/{detail.maxScore}
                          </span>
                          {levelTag(detail.level)}
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                          {/* Frame thumbnail */}
                          <div style={{
                            width: 160, minWidth: 160, height: 90, borderRadius: 8,
                            background: '#2B3674', position: 'relative',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, overflow: 'hidden',
                          }}>
                            {closestFrame ? (
                              <img
                                src={closestFrame.dataUrl}
                                alt={`Frame at ${fmtTime(detail.timestamp)}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <>
                                <div style={{
                                  position: 'absolute', inset: 0,
                                  background: 'linear-gradient(135deg, #2B367480, #1a1a2e)',
                                }} />
                                <CameraOutlined style={{ fontSize: 24, color: '#ffffff50', position: 'relative' }} />
                              </>
                            )}
                            <div style={{
                              position: 'absolute', bottom: 4, left: 6,
                              background: '#00000080', borderRadius: 4,
                              padding: '1px 6px', fontSize: 10, color: '#fff', fontWeight: 600,
                            }}>
                              ⏱ {fmtTime(detail.timestamp)}
                            </div>
                          </div>

                          {/* Evidence text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <a
                              style={{ fontSize: 11, color: '#4361EE', fontWeight: 600, cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); seekVideo(detail.timestamp); }}
                            >
                              <PlayCircleOutlined style={{ marginRight: 4 }} />
                              跳转 {fmtTime(detail.timestamp)}
                            </a>

                            <div style={{ fontSize: 11, fontWeight: 700, color: '#2B3674', margin: '4px 0 2px' }}>
                              AI 评分依据：
                            </div>
                            <Tooltip title={detail.evidence}>
                              <div style={{
                                fontSize: 11, color: '#707EAE', lineHeight: 1.6, marginBottom: 4,
                                display: '-webkit-box', WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              }}>
                                {detail.evidence}
                              </div>
                            </Tooltip>

                            {detail.screenshotDesc && (
                              <Tooltip title={detail.screenshotDesc}>
                                <div style={{
                                  fontSize: 10, color: '#A3AED0', marginBottom: 4,
                                  display: '-webkit-box', WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                  截图描述：{detail.screenshotDesc}
                                </div>
                              </Tooltip>
                            )}

                            {detail.suggestions && (
                              <Tooltip title={detail.suggestions}>
                                <div style={{
                                  fontSize: 10, color: '#F59E0B', marginBottom: 4,
                                  display: '-webkit-box', WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                  改进建议：{detail.suggestions}
                                </div>
                              </Tooltip>
                            )}

                            <Progress percent={pct} size="small" strokeColor={levelColor} showInfo={false} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </motion.div>

        {/* ---- SECTION 3: 语音转录与分析 ---- */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card
              title={
                <span style={{ fontWeight: 700 }}>
                  <SoundOutlined style={{ marginRight: 6, color: '#7C3AED' }} />
                  视频语音转录内容
                </span>
              }
              style={{ borderRadius: 14, marginBottom: 16 }}
              styles={{ body: { padding: 20 } }}
            >
              {/* Speaker segments */}
              {transcript.speakerSegments.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2B3674', marginBottom: 12 }}>
                    <AudioOutlined style={{ marginRight: 6 }} />
                    对话记录
                  </div>
                  <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                    {transcript.speakerSegments.map((seg, idx) => {
                      const isInstructor = seg.speaker === 'instructor';
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: isInstructor ? -10 : 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          style={{
                            display: 'flex',
                            gap: 10,
                            marginBottom: 10,
                            flexDirection: isInstructor ? 'row' : 'row-reverse',
                          }}
                        >
                          <Avatar
                            size={28}
                            style={{
                              background: isInstructor ? '#4361EE' : '#05CD99',
                              flexShrink: 0, fontSize: 12,
                            }}
                            icon={<UserOutlined />}
                          />
                          <div style={{
                            maxWidth: '75%',
                            background: isInstructor ? '#EEF2FF' : '#ECFDF5',
                            borderRadius: 10, padding: '8px 12px',
                            border: `1px solid ${isInstructor ? '#4361EE20' : '#05CD9920'}`,
                          }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', marginBottom: 4,
                            }}>
                              <Tag style={{
                                fontSize: 9, margin: 0, border: 'none',
                                background: isInstructor ? '#4361EE18' : '#05CD9918',
                                color: isInstructor ? '#4361EE' : '#05CD99',
                                fontWeight: 700,
                              }}>
                                {isInstructor ? '教师' : '学员'}
                              </Tag>
                              <span style={{ fontSize: 10, color: '#A3AED0' }}>
                                {fmtTime(seg.startTime)} - {fmtTime(seg.endTime)}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#2B3674', lineHeight: 1.6 }}>
                              {seg.text}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Divider style={{ margin: '16px 0' }} />

              {/* Summary */}
              {transcript.summary && (
                <div style={{
                  background: '#F4F7FE', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3674', marginBottom: 6 }}>
                    语音内容摘要
                  </div>
                  <div style={{ fontSize: 12, color: '#707EAE', lineHeight: 1.8 }}>
                    {transcript.summary}
                  </div>
                </div>
              )}

              <Row gutter={[16, 16]}>
                {/* Communication score */}
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3674', marginBottom: 6 }}>
                      沟通能力评分
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Progress
                        type="circle"
                        percent={transcript.communicationScore}
                        size={60}
                        strokeColor={
                          transcript.communicationScore >= 80 ? '#05CD99' :
                          transcript.communicationScore >= 60 ? '#4361EE' : '#EF4444'
                        }
                        format={(p) => <span style={{ fontSize: 14, fontWeight: 800 }}>{p}</span>}
                      />
                      <div style={{ flex: 1 }}>
                        <Progress
                          percent={transcript.communicationScore}
                          strokeColor={{
                            '0%': '#4361EE',
                            '100%': '#7C3AED',
                          }}
                          size="small"
                        />
                      </div>
                    </div>
                  </div>

                  {transcript.communicationAnalysis && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3674', marginBottom: 4 }}>
                        沟通分析
                      </div>
                      <div style={{ fontSize: 11, color: '#707EAE', lineHeight: 1.8 }}>
                        {transcript.communicationAnalysis}
                      </div>
                    </div>
                  )}

                  {transcript.clinicalTermUsage.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3674', marginBottom: 6 }}>
                        专业术语使用
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {transcript.clinicalTermUsage.map((term, idx) => (
                          <Tag
                            key={idx}
                            style={{
                              fontSize: 10, fontWeight: 600, border: 'none',
                              background: '#7C3AED14', color: '#7C3AED',
                            }}
                          >
                            {term}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Col>

                {/* Key instructions + student responses */}
                <Col xs={24} md={12}>
                  {transcript.keyInstructions.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#4361EE', marginBottom: 6 }}>
                        教师关键指导
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {transcript.keyInstructions.map((inst, idx) => (
                          <li key={idx} style={{ fontSize: 11, color: '#2B3674', lineHeight: 2 }}>
                            {inst}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {transcript.studentResponses.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#05CD99', marginBottom: 6 }}>
                        学员回应
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {transcript.studentResponses.map((resp, idx) => (
                          <li key={idx} style={{ fontSize: 11, color: '#2B3674', lineHeight: 2 }}>
                            {resp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Col>
              </Row>
            </Card>
          </motion.div>
        )}

        {/* ---- SECTION 4: 能力雷达对比 + 评分对照表 ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={10}>
              <Card
                title={
                  <span style={{ fontWeight: 700 }}>
                    <ExperimentOutlined style={{ marginRight: 6, color: '#7C3AED' }} />
                    能力雷达对比
                  </span>
                }
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: '8px 12px' } }}
              >
                <ReactECharts option={rRadarOption} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card
                title={
                  <span style={{ fontWeight: 700 }}>
                    <BarChartOutlined style={{ marginRight: 6, color: '#4361EE' }} />
                    详细评分对比
                  </span>
                }
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  dataSource={course.rubric.map((dim, i) => ({
                    key: i,
                    idx: i + 1,
                    label: dim.label,
                    maxScore: dim.maxScore,
                    score: rScores[i] ?? 0,
                    level: course.getLevel(rScores[i] ?? 0, dim.maxScore),
                    pct: dim.maxScore > 0 ? Math.round(((rScores[i] ?? 0) / dim.maxScore) * 100) : 0,
                    classAvg: classAvgScores[i],
                  }))}
                  pagination={false}
                  size="small"
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <span style={{ fontWeight: 800, fontSize: 12 }}>合计</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>{rMax}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <span style={{ fontWeight: 900, fontSize: 14, color: rGradeColor }}>{rTotal}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <Tag style={{
                          background: `${rGradeColor}14`, color: rGradeColor,
                          border: 'none', fontWeight: 700, fontSize: 10,
                        }}>
                          {GRADE_LABEL(rPct)}
                        </Tag>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <Progress percent={rPct} size="small" strokeColor={rGradeColor} />
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  columns={[
                    {
                      title: '#', dataIndex: 'idx', width: 44,
                      render: (v: number) => numCircle(v, DIM_COLORS[(v - 1) % DIM_COLORS.length], 22),
                    },
                    {
                      title: '评分项目', dataIndex: 'label', ellipsis: true,
                      render: (v: string) => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span>,
                    },
                    {
                      title: '满分', dataIndex: 'maxScore', width: 50,
                      render: (v: number) => <span style={{ color: '#A3AED0', fontSize: 12 }}>{v}</span>,
                    },
                    {
                      title: '得分', dataIndex: 'score', width: 60,
                      render: (v: number, r) => (
                        <span style={{ fontWeight: 800, color: LEVEL_META[r.level].color, fontSize: 13 }}>{v}</span>
                      ),
                    },
                    {
                      title: '等级', dataIndex: 'level', width: 70,
                      render: (v: string) => levelTag(v),
                    },
                    {
                      title: '百分比', dataIndex: 'pct', width: 140,
                      render: (v: number, r) => (
                        <Tooltip title={`个人 ${v}% | 班级均值 ${r.maxScore > 0 ? Math.round((r.classAvg / r.maxScore) * 100) : 0}%`}>
                          <Progress
                            percent={v}
                            size="small"
                            strokeColor={LEVEL_META[r.level].color}
                            format={p => <span style={{ fontSize: 10 }}>{p}%</span>}
                          />
                        </Tooltip>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </motion.div>

        {/* ---- SECTION 5: AI 整体评价与建议 ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          {/* Overall comment */}
          {viewingResult.eval.overallComment && (
            <Card
              style={{ borderRadius: 14, marginBottom: 16 }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <RobotOutlined style={{ fontSize: 20, color: '#4361EE' }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#2B3674' }}>AI 整体评价</span>
                <Tag style={{
                  background: '#4361EE14', color: '#4361EE', border: 'none',
                  fontSize: 10, fontWeight: 600,
                }}>
                  <ExperimentOutlined style={{ marginRight: 4 }} />
                  AI 生成
                </Tag>
              </div>
              <div style={{ fontSize: 13, color: '#2B3674', lineHeight: 2, whiteSpace: 'pre-line' }}>
                {viewingResult.eval.overallComment}
              </div>
            </Card>
          )}

          {/* Teaching suggestions */}
          {viewingResult.eval.teachingSuggestions && (
            <Card
              style={{
                borderRadius: 14, marginBottom: 16,
                background: 'linear-gradient(135deg, #4361EE06, #7C3AED06)',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <BulbOutlined style={{ fontSize: 20, color: '#F59E0B' }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#2B3674' }}>
                  AI 循证教学建议
                </span>
                <Tag style={{
                  background: '#7C3AED14', color: '#7C3AED', border: 'none',
                  fontSize: 10, fontWeight: 600,
                }}>
                  <RobotOutlined style={{ marginRight: 4 }} />
                  AI 生成
                </Tag>
              </div>
              <div style={{ fontSize: 13, color: '#2B3674', lineHeight: 2, whiteSpace: 'pre-line' }}>
                {viewingResult.eval.teachingSuggestions}
              </div>
            </Card>
          )}

          {/* Key moments */}
          {viewingResult.eval.keyMoments.length > 0 && (
            <Card
              title={
                <span style={{ fontWeight: 700 }}>
                  <ClockCircleOutlined style={{ marginRight: 6, color: '#4361EE' }} />
                  关键操作节点
                </span>
              }
              style={{ borderRadius: 14, marginBottom: 16 }}
              styles={{ body: { padding: 20 } }}
            >
              <Timeline
                items={viewingResult.eval.keyMoments.map(m => ({
                  color: m.quality === 'good' ? '#05CD99' : m.quality === 'concern' ? '#EF4444' : '#4361EE',
                  children: (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <Tag
                        style={{ fontSize: 10, cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => seekVideo(m.time)}
                      >
                        <PlayCircleOutlined style={{ marginRight: 2 }} />
                        {fmtTime(m.time)}
                      </Tag>
                      <span style={{ fontSize: 12, color: '#2B3674', flex: 1 }}>{m.description}</span>
                      <Tag style={{
                        fontSize: 9, border: 'none', margin: 0, flexShrink: 0,
                        background: m.quality === 'good' ? '#05CD9914' : m.quality === 'concern' ? '#EF444414' : '#4361EE14',
                        color: m.quality === 'good' ? '#05CD99' : m.quality === 'concern' ? '#EF4444' : '#4361EE',
                        fontWeight: 600,
                      }}>
                        {m.quality === 'good' ? '优' : m.quality === 'concern' ? '待改进' : '中性'}
                      </Tag>
                    </div>
                  ),
                }))}
              />
            </Card>
          )}
        </motion.div>

        {/* ---- SECTION 6: 维度得分趋势 ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={14}>
              <Card
                title={
                  <span style={{ fontWeight: 700 }}>
                    <BarChartOutlined style={{ marginRight: 6, color: '#4361EE' }} />
                    维度得分趋势
                  </span>
                }
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: 12 } }}
              >
                <ReactECharts option={rTrendOption} style={{ height: 260 }} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card
                title={
                  <span style={{ fontWeight: 700 }}>
                    <BarChartOutlined style={{ marginRight: 6, color: '#7C3AED' }} />
                    维度得分对比
                  </span>
                }
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: 12 } }}
              >
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis' as const },
                    legend: { data: ['本次得分', '班级均值'], bottom: 0, textStyle: { fontSize: 10 } },
                    grid: { top: 16, right: 20, bottom: 40, left: 50 },
                    xAxis: {
                      type: 'value' as const,
                      max: 100,
                      axisLabel: { fontSize: 10, formatter: '{value}%' },
                      splitLine: { lineStyle: { color: '#F4F7FE' } },
                    },
                    yAxis: {
                      type: 'category' as const,
                      data: course.rubric.map(d => d.label),
                      axisLabel: { fontSize: 10 },
                    },
                    series: [
                      {
                        name: '本次得分',
                        type: 'bar' as const,
                        data: rScores.map((s, i) =>
                          course.rubric[i]?.maxScore > 0 ? Math.round((s / course.rubric[i].maxScore) * 100) : 0
                        ),
                        barWidth: 10,
                        itemStyle: {
                          borderRadius: [0, 4, 4, 0],
                          color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0,
                            colorStops: [
                              { offset: 0, color: '#7C3AED80' },
                              { offset: 1, color: '#7C3AED' },
                            ],
                          },
                        },
                      },
                      {
                        name: '班级均值',
                        type: 'bar' as const,
                        data: classAvgScores.map((s, i) =>
                          course.rubric[i]?.maxScore > 0 ? Math.round((s / course.rubric[i].maxScore) * 100) : 0
                        ),
                        barWidth: 10,
                        itemStyle: {
                          borderRadius: [0, 4, 4, 0],
                          color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0,
                            colorStops: [
                              { offset: 0, color: '#4361EE40' },
                              { offset: 1, color: '#4361EE' },
                            ],
                          },
                        },
                      },
                    ],
                  }}
                  style={{ height: 260 }}
                />
              </Card>
            </Col>
          </Row>
        </motion.div>

        {/* ---- SECTION 7: 分析总结 ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <Card
            style={{
              borderRadius: 14, marginBottom: 16,
              background: 'linear-gradient(135deg, #4361EE04, #7C3AED08, #05CD9904)',
              border: '1px solid #4361EE15',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg, #4361EE, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#2B3674' }}>AI 分析总结</span>
              <Tag style={{
                background: '#4361EE14', color: '#4361EE', border: 'none',
                fontSize: 10, fontWeight: 600,
              }}>
                {viewingResult.duration > 0 ? `${fmtTime(viewingResult.duration)} 视频` : ''} · {viewingResult.analysisTime.toFixed(1)}s 分析
              </Tag>
            </div>
            <Row gutter={[16, 12]}>
              <Col xs={8} sm={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: rGradeColor }}>{rTotal}</div>
                  <div style={{ fontSize: 10, color: '#A3AED0' }}>总分/{rMax}</div>
                </div>
              </Col>
              <Col xs={8} sm={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#4361EE' }}>{rPct}%</div>
                  <div style={{ fontSize: 10, color: '#A3AED0' }}>得分率</div>
                </div>
              </Col>
              <Col xs={8} sm={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#7C3AED' }}>{viewingResult.videoFrames.length}</div>
                  <div style={{ fontSize: 10, color: '#A3AED0' }}>分析帧数</div>
                </div>
              </Col>
              <Col xs={8} sm={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#05CD99' }}>
                    {viewingResult.eval.evidenceDetails.filter(e => e.level === 'excellent').length}
                  </div>
                  <div style={{ fontSize: 10, color: '#A3AED0' }}>优秀维度</div>
                </div>
              </Col>
              <Col xs={8} sm={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B' }}>
                    {viewingResult.eval.keyMoments.length}
                  </div>
                  <div style={{ fontSize: 10, color: '#A3AED0' }}>关键节点</div>
                </div>
              </Col>
              <Col xs={8} sm={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: transcript ? '#4361EE' : '#A3AED0' }}>
                    {transcript ? '✓' : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#A3AED0' }}>语音转录</div>
                </div>
              </Col>
            </Row>
          </Card>
        </motion.div>
      </motion.div>
    );
  };

  /* ================================================================== */
  /*  MOCK REPORT VIEW (fallback data)                                   */
  /* ================================================================== */

  const renderMockReport = () => {
    if (!ev) {
      return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Text type="secondary">该学员暂无此课程的评分数据</Text>
          <br /><br />
          <Button icon={<ArrowLeftOutlined />} onClick={() => setView('main')}>返回</Button>
        </div>
      );
    }

    const weakDims = course.rubric
      .map((dim, i) => ({
        ...dim, score: ev.scores[i], idx: i,
        level: course.getLevel(ev.scores[i], dim.maxScore),
      }))
      .filter(d => d.level !== 'excellent');

    const aiText = course.aiSuggestionGen(
      reportStudent.name,
      total,
      weakDims
        .filter(d => d.level === 'pass' || d.level === 'fail')
        .map(d => ({ key: d.key, label: d.label, score: d.score, maxScore: d.maxScore, level: d.level as 'pass' | 'fail', idx: d.idx })),
      ev,
    );

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: '16px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setView('main')} style={{ borderRadius: 10 }}>返回</Button>
              <Avatar size={44} style={{ background: GRADE_COLOR(total), fontWeight: 800, fontSize: 18 }}>
                {reportStudent.avatar}
              </Avatar>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2B3674' }}>{reportStudent.name}</div>
                <div style={{ fontSize: 12, color: '#707EAE' }}>{reportStudent.grade} · {reportStudent.group}</div>
              </div>
              <Tag style={{
                fontSize: 13, padding: '4px 12px', fontWeight: 700,
                background: '#4361EE10', color: '#4361EE', border: 'none',
              }}>
                {course.name}
              </Tag>
              <Tag style={{
                fontSize: 11, padding: '2px 8px', fontWeight: 600,
                background: '#F59E0B14', color: '#F59E0B', border: 'none',
              }}>
                数据报告
              </Tag>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 100, height: 100 }}>
                  <ReactECharts option={mockGaugeOption} style={{ height: 100, width: 100 }} />
                </div>
                <Tag style={{
                  fontSize: 14, padding: '6px 16px', fontWeight: 800,
                  background: `${GRADE_COLOR(total)}14`, color: GRADE_COLOR(total),
                  border: `1px solid ${GRADE_COLOR(total)}30`, borderRadius: 8,
                }}>
                  {GRADE_LABEL(total)}
                </Tag>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* SECTION 1: Video + Scoring Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={14}>
              <Card
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: 16 } }}
                title={<span style={{ fontWeight: 700 }}><PlayCircleOutlined style={{ marginRight: 6, color: '#4361EE' }} />操作视频</span>}
              >
                <div style={{
                  background: '#1a1a2e', borderRadius: 12, height: 300,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at center, #2B367420, transparent 70%)',
                  }} />
                  <PlayCircleOutlined style={{ fontSize: 64, color: '#ffffff80', cursor: 'pointer' }} />
                  <div style={{
                    position: 'absolute', bottom: 12, left: 16, right: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <Tag style={{ background: '#00000060', color: '#fff', border: 'none', fontSize: 10 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {fmtTime(ev.timestamps[ev.timestamps.length - 1] + 30)} 总时长
                    </Tag>
                    <Tag style={{ background: '#4361EE90', color: '#fff', border: 'none', fontSize: 10 }}>
                      {course.shortName}
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: 16 } }}
                title={<span style={{ fontWeight: 700 }}><BarChartOutlined style={{ marginRight: 6, color: '#7C3AED' }} />评分表</span>}
              >
                {course.rubric.map((dim, i) => {
                  const score = ev.scores[i];
                  const pct = Math.round((score / dim.maxScore) * 100);
                  const level = course.getLevel(score, dim.maxScore);
                  const color = LEVEL_META[level].color;
                  return (
                    <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      {numCircle(i + 1, DIM_COLORS[i % DIM_COLORS.length])}
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: '#2B3674' }}>{dim.label}</span>
                      <Progress percent={pct} size="small" style={{ width: 80 }} strokeColor={color} showInfo={false} />
                      <span style={{ fontWeight: 800, fontSize: 13, color, minWidth: 50, textAlign: 'right' }}>{score}/{dim.maxScore}</span>
                      {levelTag(level)}
                    </div>
                  );
                })}
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, flex: 1, color: '#2B3674' }}>总分</span>
                  <Progress percent={Math.round((total / maxTotal) * 100)} size="small" style={{ width: 80 }} strokeColor={GRADE_COLOR(total)} showInfo={false} />
                  <span style={{ fontWeight: 900, fontSize: 16, color: GRADE_COLOR(total), minWidth: 50, textAlign: 'right' }}>{total}/{maxTotal}</span>
                  <Tag style={{
                    background: `${GRADE_COLOR(total)}14`, color: GRADE_COLOR(total),
                    border: 'none', fontWeight: 700, fontSize: 11, margin: 0,
                  }}>
                    {GRADE_LABEL(total)}
                  </Tag>
                </div>
              </Card>
            </Col>
          </Row>
        </motion.div>

        {/* SECTION 2: Evidence Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card
            title={
              <span style={{ fontWeight: 700 }}>
                <CameraOutlined style={{ marginRight: 6, color: '#4361EE' }} />
                循证评分依据 — 视频截图与时间戳
              </span>
            }
            style={{ borderRadius: 14, marginBottom: 16 }}
            styles={{ body: { padding: 16 } }}
          >
            <Row gutter={[12, 12]}>
              {course.rubric.map((dim, i) => {
                const score = ev.scores[i];
                const level = course.getLevel(score, dim.maxScore);
                const color = LEVEL_META[level].color;
                const dimColor = DIM_COLORS[i % DIM_COLORS.length];
                const ts = ev.timestamps[i];
                const evidenceData = course.evidenceText[i];
                const text = evidenceData ? evidenceData[level] : '';
                const isActive = activeEvidence === i;
                const pct = Math.round((score / dim.maxScore) * 100);

                return (
                  <Col xs={24} md={12} key={dim.key}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <div
                        onClick={() => setActiveEvidence(i)}
                        style={{
                          borderRadius: 12, padding: 14, cursor: 'pointer',
                          background: `${color}0F`,
                          border: isActive ? `2px solid ${dimColor}` : '2px solid transparent',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          {numCircle(i + 1, dimColor, 28)}
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#2B3674', flex: 1 }}>{dim.label}</span>
                          <span style={{ fontWeight: 800, fontSize: 13, color }}>{score}/{dim.maxScore}</span>
                          {levelTag(level)}
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{
                            width: 160, minWidth: 160, height: 90, borderRadius: 8,
                            background: '#2B3674', position: 'relative',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, overflow: 'hidden',
                          }}>
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'linear-gradient(135deg, #2B367480, #1a1a2e)',
                            }} />
                            <CameraOutlined style={{ fontSize: 24, color: '#ffffff50', position: 'relative' }} />
                            <div style={{
                              position: 'absolute', bottom: 4, left: 6,
                              background: '#00000080', borderRadius: 4,
                              padding: '1px 6px', fontSize: 10, color: '#fff', fontWeight: 600,
                            }}>
                              ⏱ {fmtTime(ts)}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <a style={{ fontSize: 11, color: '#4361EE', fontWeight: 600 }}>
                              <PlayCircleOutlined style={{ marginRight: 4 }} />
                              跳转 {fmtTime(ts)}
                            </a>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#2B3674', margin: '4px 0 2px' }}>评分依据：</div>
                            <Tooltip title={text}>
                              <div style={{
                                fontSize: 11, color: '#707EAE', lineHeight: 1.6, marginBottom: 6,
                                display: '-webkit-box', WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              }}>
                                {text}
                              </div>
                            </Tooltip>
                            <Progress percent={pct} size="small" strokeColor={color} showInfo={false} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </motion.div>

        {/* SECTION 3: Radar + Comparison Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={10}>
              <Card
                title={<span style={{ fontWeight: 700 }}><ExperimentOutlined style={{ marginRight: 6, color: '#7C3AED' }} />能力雷达对比</span>}
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: '8px 12px' } }}
              >
                <ReactECharts option={mockReportRadarOption} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card
                title={<span style={{ fontWeight: 700 }}><BarChartOutlined style={{ marginRight: 6, color: '#4361EE' }} />详细评分对比</span>}
                style={{ borderRadius: 14, height: '100%' }}
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  dataSource={course.rubric.map((dim, i) => ({
                    key: i, idx: i + 1, label: dim.label, maxScore: dim.maxScore,
                    score: ev.scores[i], level: course.getLevel(ev.scores[i], dim.maxScore),
                    pct: Math.round((ev.scores[i] / dim.maxScore) * 100),
                    classAvg: classAvgScores[i],
                  }))}
                  pagination={false}
                  size="small"
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <span style={{ fontWeight: 800, fontSize: 12 }}>合计</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>{maxTotal}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <span style={{ fontWeight: 900, fontSize: 14, color: GRADE_COLOR(total) }}>{total}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <Tag style={{
                          background: `${GRADE_COLOR(total)}14`, color: GRADE_COLOR(total),
                          border: 'none', fontWeight: 700, fontSize: 10,
                        }}>
                          {GRADE_LABEL(total)}
                        </Tag>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <Progress percent={Math.round((total / maxTotal) * 100)} size="small" strokeColor={GRADE_COLOR(total)} />
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  columns={[
                    {
                      title: '#', dataIndex: 'idx', width: 44,
                      render: (v: number) => numCircle(v, DIM_COLORS[(v - 1) % DIM_COLORS.length], 22),
                    },
                    {
                      title: '评分项目', dataIndex: 'label', ellipsis: true,
                      render: (v: string) => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span>,
                    },
                    {
                      title: '满分', dataIndex: 'maxScore', width: 50,
                      render: (v: number) => <span style={{ color: '#A3AED0', fontSize: 12 }}>{v}</span>,
                    },
                    {
                      title: '得分', dataIndex: 'score', width: 60,
                      render: (v: number, r) => (
                        <span style={{ fontWeight: 800, color: LEVEL_META[r.level].color, fontSize: 13 }}>{v}</span>
                      ),
                    },
                    {
                      title: '等级', dataIndex: 'level', width: 70,
                      render: (v: string) => levelTag(v),
                    },
                    {
                      title: '百分比', dataIndex: 'pct', width: 140,
                      render: (v: number, r) => (
                        <Tooltip title={`个人 ${v}% | 班级均值 ${Math.round((r.classAvg / r.maxScore) * 100)}%`}>
                          <Progress
                            percent={v} size="small" strokeColor={LEVEL_META[r.level].color}
                            format={p => <span style={{ fontSize: 10 }}>{p}%</span>}
                          />
                        </Tooltip>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </motion.div>

        {/* SECTION 4: AI Suggestions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
          <Card
            style={{
              borderRadius: 14, marginBottom: 16,
              background: 'linear-gradient(135deg, #4361EE06, #7C3AED06)',
            }}
            styles={{ body: { padding: 20 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <BulbOutlined style={{ fontSize: 20, color: '#F59E0B' }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#2B3674' }}>AI 循证教学建议</span>
              <Tag style={{
                background: '#F59E0B14', color: '#F59E0B', border: 'none',
                fontSize: 10, fontWeight: 600,
              }}>
                AI 生成
              </Tag>
            </div>
            {weakDims.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#707EAE', fontWeight: 600 }}>薄弱维度：</span>
                {weakDims.map(d => (
                  <Tag
                    key={d.key}
                    style={{
                      background: `${LEVEL_META[d.level].color}14`, color: LEVEL_META[d.level].color,
                      border: 'none', fontWeight: 600, fontSize: 10,
                    }}
                  >
                    {d.label} ({d.score}/{d.maxScore})
                    {ev.timestamps[d.idx] != null && (
                      <span style={{ marginLeft: 4, opacity: 0.8 }}>⏱{fmtTime(ev.timestamps[d.idx])}</span>
                    )}
                  </Tag>
                ))}
              </div>
            )}
            <div style={{ fontSize: 13, color: '#2B3674', lineHeight: 2, whiteSpace: 'pre-line' }}>{aiText}</div>
          </Card>
        </motion.div>

        {/* SECTION 5: Trend Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>
          <Card
            title={<span style={{ fontWeight: 700 }}><BarChartOutlined style={{ marginRight: 6, color: '#4361EE' }} />维度得分趋势</span>}
            style={{ borderRadius: 14, marginBottom: 16 }}
            styles={{ body: { padding: 12 } }}
          >
            <ReactECharts option={mockTrendOption} style={{ height: 300 }} />
          </Card>
        </motion.div>
      </motion.div>
    );
  };

  /* ================================================================== */
  /*  REPORT DISPATCHER                                                  */
  /* ================================================================== */

  const renderReportView = () => {
    if (viewingResult) return renderRealReport();
    return renderMockReport();
  };

  /* ================================================================== */
  /*  MAIN RENDER                                                        */
  /* ================================================================== */

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {view === 'main' && renderMainView()}
      {view === 'progress' && renderProgressView()}
      {view === 'report' && renderReportView()}
    </div>
  );
};

export default VideoWorkbench;
