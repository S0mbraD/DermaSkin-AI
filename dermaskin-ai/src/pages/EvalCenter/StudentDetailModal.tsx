import React, { useState, useRef, useMemo } from 'react';
import {
  Modal, Card, Row, Col, Tag, Progress, Table, Typography, Space, Avatar, Tooltip, Divider,
} from 'antd';
import {
  BulbOutlined, CameraOutlined, PlayCircleOutlined,
  HistoryOutlined, FileSearchOutlined, VideoCameraOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import type { Student, CourseConfig } from '@/types';
import { GRADE_COLOR, GRADE_LABEL, LEVEL_META } from '@/types';
import { computeMaxTotal, computeCourseTotal, computeClassAvg } from '@/utils/algorithms';
import { ALL_COURSES, STUDENTS, EPA_LIST, getRecordsByStudent } from '@/data';
import type { HistoricalRecord } from '@/data';
import { fmtTime } from '@/utils/format';

const { Text } = Typography;

const DIM_COLORS = [
  '#4361EE', '#7C3AED', '#F59E0B', '#05CD99', '#EF4444',
  '#EC4899', '#06B6D4', '#8B5CF6', '#10B981', '#F97316',
];

interface Props {
  student: Student | null;
  students: Student[];
  course: CourseConfig;
  open: boolean;
  onClose: () => void;
}

const StudentDetailModal: React.FC<Props> = ({ student, students, course, open, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeEvidence, setActiveEvidence] = useState(-1);

  const courseRanking = useMemo(() => {
    if (!student) return 0;
    const scored = students.map(s => ({
      id: s.id,
      total: course.evals[s.id]?.scores.reduce((a: number, b: number) => a + b, 0) ?? 0,
    }));
    scored.sort((a, b) => b.total - a.total);
    return scored.findIndex(s => s.id === student.id) + 1;
  }, [students, student, course]);

  const classAvgScores = useMemo(() => {
    const evals = Object.values(course.evals);
    if (evals.length === 0) return course.rubric.map(() => 0);
    return course.rubric.map((_, i) =>
      Math.round(evals.reduce((s, e) => s + e.scores[i], 0) / evals.length)
    );
  }, [course]);

  const evalData = student ? course.evals[student.id] : undefined;
  const totalScore = evalData?.scores.reduce((a, b) => a + b, 0) ?? 0;
  const maxTotal = computeMaxTotal(course);
  const gradeColor = GRADE_COLOR(totalScore);
  const gradeLabel = GRADE_LABEL(totalScore);
  const passRate = maxTotal > 0 ? Math.round(totalScore / maxTotal * 100) : 0;
  const totalDuration = evalData?.timestamps.reduce((mx, t) => Math.max(mx, t), 0) ?? 0;

  const weakDims = course.rubric
    .map((dim, i) => ({
      key: dim.key,
      label: dim.label,
      score: evalData?.scores[i] ?? 0,
      maxScore: dim.maxScore,
      level: course.getLevel(evalData?.scores[i] ?? 0, dim.maxScore),
      idx: i,
    }))
    .filter(d => d.level !== 'excellent')
    .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore) as {
      key: string; label: string; score: number; maxScore: number;
      level: 'pass' | 'fail'; idx: number;
    }[];

  /* ── Score Trend Mock ── */
  const trendOption = useMemo(() => {
    const sessions = ['第1次', '第2次', '第3次', '第4次', '第5次'];
    const seriesData = course.rubric.map((dim, i) => {
      const baseScore = evalData?.scores[i] ?? Math.round(dim.maxScore * 0.6);
      const progression = [
        Math.max(0, Math.round(baseScore * 0.65)),
        Math.max(0, Math.round(baseScore * 0.75)),
        Math.max(0, Math.round(baseScore * 0.85)),
        Math.max(0, Math.round(baseScore * 0.93)),
        baseScore,
      ];
      return {
        name: dim.label,
        type: 'line' as const,
        smooth: true,
        data: progression,
        lineStyle: { width: 2.5, color: DIM_COLORS[i % DIM_COLORS.length] },
        itemStyle: { color: DIM_COLORS[i % DIM_COLORS.length] },
        symbol: 'circle',
        symbolSize: 6,
      };
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: {
        data: course.rubric.map(d => d.label),
        bottom: 0,
        textStyle: { fontSize: 10 },
        type: 'scroll' as const,
      },
      grid: { top: 30, right: 20, bottom: 40, left: 45 },
      xAxis: {
        type: 'category' as const,
        data: sessions,
        axisLine: { lineStyle: { color: '#E9EDF7' } },
        axisLabel: { fontSize: 11, color: '#8C8C8C' },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#F0F0F0', type: 'dashed' as const } },
        axisLabel: { fontSize: 10, color: '#8C8C8C' },
      },
      series: seriesData,
    };
  }, [course, evalData]);

  /* ── Funnel: Learning Engagement ── */
  const funnelOption = useMemo(() => {
    if (!student) return {};
    const scale = student.avgAttention > 0 ? student.avgAttention / 0.75 : 1;
    const stages = [
      { value: Math.round(Math.min(100, Math.max(10, 85 * scale))), name: '课前预习完成', color: '#4361EE' },
      { value: Math.round(Math.min(100, Math.max(10, 78 * scale))), name: '课堂参与互动', color: '#7C3AED' },
      { value: Math.round(Math.min(100, Math.max(10, 72 * scale))), name: '操作练习达标', color: '#F59E0B' },
      { value: Math.round(Math.min(100, Math.max(10, 65 * scale))), name: '自我反思提交', color: '#05CD99' },
      { value: Math.round(Math.min(100, Math.max(10, 58 * scale))), name: '同伴互评完成', color: '#EC4899' },
    ];
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c}%' },
      series: [{
        type: 'funnel' as const,
        left: '10%', top: 20, bottom: 20, width: '80%',
        min: 0, max: 100,
        sort: 'descending' as const,
        gap: 3,
        label: { show: true, position: 'inside' as const, fontSize: 11, color: '#fff', fontWeight: 600 as const },
        itemStyle: { borderWidth: 0 },
        emphasis: { label: { fontSize: 13 } },
        data: stages.map(s => ({ value: s.value, name: s.name, itemStyle: { color: s.color } })),
      }],
    };
  }, [student]);

  /* ── Behavior Dimensions Bar ── */
  const behaviorBarOption = useMemo(() => {
    if (!student) return {};
    const dims = ['专注度', '互动频次', '操作准确率', '反思深度', '时间管理'];
    const studentVals = [
      Math.round(student.avgAttention * 100),
      Math.round(student.avgEngagement * 100),
      passRate,
      Math.round(student.knowledgeMastery * 100),
      Math.round(student.attendance * 100),
    ];
    const classAvg = [72, 68, 74, 65, 70];
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: [student.name, '班级均值'], bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 20, right: 20, bottom: 40, left: 50 },
      xAxis: {
        type: 'category' as const,
        data: dims,
        axisLabel: { fontSize: 10, color: '#8C8C8C', interval: 0, rotate: 15 },
        axisLine: { lineStyle: { color: '#E9EDF7' } },
      },
      yAxis: {
        type: 'value' as const,
        max: 100,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#F0F0F0', type: 'dashed' as const } },
        axisLabel: { fontSize: 10, color: '#8C8C8C' },
      },
      series: [
        {
          name: student.name,
          type: 'bar' as const,
          barWidth: 18,
          itemStyle: { color: '#7C3AED', borderRadius: [4, 4, 0, 0] },
          data: studentVals,
        },
        {
          name: '班级均值',
          type: 'bar' as const,
          barWidth: 18,
          itemStyle: { color: '#E9EDF7' },
          data: classAvg,
        },
      ],
    };
  }, [student, passRate]);

  /* ── Multi-Course Comparison ── */
  const coursesWithEval = useMemo(
    () => student ? ALL_COURSES.filter(c => c.evals[student.id]) : [],
    [student],
  );
  const multiCourseOption = useMemo(() => {
    if (!student) return {};
    const labels = coursesWithEval.map(c => c.shortName);
    const stuScores = coursesWithEval.map(c => computeCourseTotal(student.id, c));
    const avgScores = coursesWithEval.map(c => computeClassAvg(c, STUDENTS.map(s => s.id)));
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: [student.name, '班级均值'], bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 20, right: 20, bottom: 45, left: 50 },
      xAxis: {
        type: 'category' as const,
        data: labels,
        axisLabel: { fontSize: 10, color: '#8C8C8C', interval: 0, rotate: 20 },
        axisLine: { lineStyle: { color: '#E9EDF7' } },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#F0F0F0', type: 'dashed' as const } },
        axisLabel: { fontSize: 10, color: '#8C8C8C' },
      },
      series: [
        {
          name: student.name,
          type: 'bar' as const,
          barWidth: 26,
          itemStyle: { color: '#7C3AED', borderRadius: [4, 4, 0, 0] },
          data: stuScores,
        },
        {
          name: '班级均值',
          type: 'bar' as const,
          barWidth: 26,
          itemStyle: { color: '#4361EE', borderRadius: [4, 4, 0, 0], opacity: 0.4 },
          data: avgScores,
        },
      ],
    };
  }, [student, coursesWithEval]);

  /* ── AI Analysis Text ── */
  const aiAnalysis = useMemo(() => {
    if (!student) return { summary: '', strengths: [] as string[], weaknesses: [] as string[], steps: [] as string[], benchmark: '' };
    const dimPerf = course.rubric.map((dim, i) => ({
      label: dim.label,
      pct: Math.round((evalData?.scores[i] ?? 0) / dim.maxScore * 100),
      classAvgPct: Math.round(classAvgScores[i] / dim.maxScore * 100),
    })).sort((a, b) => b.pct - a.pct);
    const top2 = dimPerf.slice(0, 2);
    const bottom2 = dimPerf.slice(-2).reverse();
    const avgClassTotal = classAvgScores.reduce((a, b) => a + b, 0);
    const diff = totalScore - avgClassTotal;
    return {
      summary: `${student.name}同学在「${course.name}」中总得分 ${totalScore}/${maxTotal}（${passRate}%），等级「${gradeLabel}」。班级排名第 ${courseRanking}/${students.length} 名，${diff >= 0 ? '高于' : '低于'}班级均值 ${Math.abs(diff)} 分。整体表现${passRate >= 85 ? '优秀，展现出扎实的操作基本功和规范意识' : passRate >= 60 ? '达到合格标准，部分维度仍有较大提升空间' : '未达合格线，建议系统性加强训练与辅导'}。`,
      strengths: top2.map(d => `「${d.label}」得分率 ${d.pct}%（班级均值 ${d.classAvgPct}%），${d.pct > d.classAvgPct ? '超越班级平均水平' : '与班级水平持平'}，展现出较好的掌握程度。`),
      weaknesses: bottom2.map(d => `「${d.label}」得分率 ${d.pct}%（班级均值 ${d.classAvgPct}%），${d.pct < d.classAvgPct ? '低于班级平均水平' : '虽达均值但仍有提升空间'}，需要针对性加强。`),
      steps: [
        `针对${bottom2.map(d => `「${d.label}」`).join('和')}进行专项模拟练习，每周增加 2 次训练。`,
        `观看${top2[0]?.label ?? '优势维度'}标准操作示范视频，将优势经验迁移至薄弱环节。`,
        `与操作规范的同伴组队互评，通过同伴学习查漏补缺。`,
        `每次训练后记录反思日志，持续追踪${bottom2[0]?.label ?? '薄弱维度'}的改进曲线。`,
      ],
      benchmark: diff >= 0
        ? `总分高于班级均值 ${diff} 分，属于班级${courseRanking <= Math.ceil(students.length * 0.2) ? '领先' : '中上'}水平。建议以更高标准要求自己，争取在所有维度都达到优秀。`
        : `总分低于班级均值 ${Math.abs(diff)} 分，建议教师给予更多关注和个别辅导，同时鼓励学生增加课外练习时间。`,
    };
  }, [student, course, evalData, classAvgScores, totalScore, maxTotal, passRate, gradeLabel, courseRanking, students]);

  const studentRecords = useMemo(() => 
    student ? getRecordsByStudent(student.id) : [],
    [student]
  );

  if (!student) return null;

  const seekTo = (sec: number, idx: number) => {
    setActiveEvidence(idx);
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.pause();
    }
  };

  /* ── Gauge ── */
  const gaugeOption = {
    series: [{
      type: 'gauge' as const,
      startAngle: 220,
      endAngle: -40,
      min: 0,
      max: maxTotal,
      progress: { show: true, width: 16, roundCap: true, itemStyle: { color: gradeColor } },
      pointer: { show: false },
      axisLine: { lineStyle: { width: 16, color: [[1, '#E9EDF7']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        fontSize: 30,
        fontWeight: 800 as const,
        color: gradeColor,
        formatter: '{value}',
        offsetCenter: [0, '10%'],
      },
      title: {
        fontSize: 11,
        color: 'var(--text-muted)',
        offsetCenter: [0, '58%'],
      },
      data: [{ value: totalScore, name: gradeLabel }],
    }],
  };

  /* ── Radar ── */
  const radarOption = {
    tooltip: {},
    legend: {
      data: [student.name, '班级均值'],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    radar: {
      indicator: course.rubric.map(d => ({ name: d.label, max: d.maxScore })),
      shape: 'polygon' as const,
      splitNumber: 4,
      radius: '68%',
      splitArea: {
        areaStyle: {
          color: ['rgba(67,97,238,0.02)', 'rgba(67,97,238,0.04)', 'rgba(67,97,238,0.06)', 'rgba(67,97,238,0.08)'],
        },
      },
      axisLine: { lineStyle: { color: '#E9EDF7' } },
      splitLine: { lineStyle: { color: '#E9EDF7' } },
    },
    series: [{
      type: 'radar' as const,
      data: [
        {
          value: evalData?.scores ?? [],
          name: student.name,
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(124,58,237,0.35)' },
                { offset: 1, color: 'rgba(124,58,237,0.05)' },
              ],
            },
          },
          lineStyle: { color: '#7C3AED', width: 2.5 },
          itemStyle: { color: '#7C3AED' },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          value: classAvgScores,
          name: '班级均值',
          lineStyle: { color: '#4361EE', width: 1.5, type: 'dashed' as const },
          itemStyle: { color: '#4361EE' },
          symbol: 'diamond',
          symbolSize: 5,
        },
      ],
    }],
  };

  /* ── Table data ── */
  const tableData = course.rubric.map((dim, i) => {
    const score = evalData?.scores[i] ?? 0;
    const level = course.getLevel(score, dim.maxScore);
    const meta = LEVEL_META[level];
    const dimColor = DIM_COLORS[i % DIM_COLORS.length];
    return {
      key: i, idx: i + 1, label: dim.label, maxScore: dim.maxScore,
      score, level, meta, pct: Math.round(score / dim.maxScore * 100), dimColor,
    };
  });

  const tableColumns = [
    {
      title: '#', dataIndex: 'idx', width: 48, align: 'center' as const,
      render: (v: number, r: typeof tableData[0]) => (
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: r.dimColor,
          color: '#fff', fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{v}</div>
      ),
    },
    { title: '评分项目', dataIndex: 'label', width: 130 },
    { title: '满分', dataIndex: 'maxScore', width: 50, align: 'center' as const },
    {
      title: '得分', dataIndex: 'score', width: 60, align: 'center' as const,
      render: (v: number, r: typeof tableData[0]) => (
        <span style={{ fontWeight: 800, color: r.meta.color, fontSize: 14 }}>{v}</span>
      ),
    },
    {
      title: '等级', dataIndex: 'level', width: 72, align: 'center' as const,
      render: (_: string, r: typeof tableData[0]) => (
        <Tag style={{
          background: r.meta.color + '14', color: r.meta.color,
          border: 'none', fontWeight: 600, fontSize: 10,
        }}>{r.meta.label}</Tag>
      ),
    },
    {
      title: '百分比', dataIndex: 'pct', width: 140,
      render: (v: number, r: typeof tableData[0]) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={v} size="small" strokeColor={r.meta.color} showInfo={false} style={{ flex: 1 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: r.meta.color, minWidth: 32, textAlign: 'right' }}>{v}%</span>
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1200}
      centered
      styles={{
        body: {
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 0,
          scrollbarWidth: 'thin',
        },
      }}
    >
      {/* ═══ Header ═══ */}
      <div style={{
        background: `linear-gradient(135deg, ${gradeColor}18, ${gradeColor}06)`,
        padding: '20px 28px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar size={60} style={{
            background: gradeColor,
            fontWeight: 700,
            fontSize: 24,
            boxShadow: `0 0 0 4px ${gradeColor}30, 0 4px 14px ${gradeColor}20`,
          }}>{student.avatar}</Avatar>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-heading)' }}>{student.name}</span>
              <Tag color="blue" style={{ fontSize: 11 }}>{student.grade}</Tag>
              <Tag color="cyan" style={{ fontSize: 11 }}>{student.group}</Tag>
              <Tag style={{
                background: gradeColor + '18', color: gradeColor,
                border: 'none', fontWeight: 700, fontSize: 11,
              }}>#{courseRanking}/{students.length}</Tag>
              <Tag color="#7C3AED" style={{ border: 'none', fontSize: 11 }}>{course.shortName}</Tag>
              <Tag style={{
                background: passRate >= 60 ? '#05CD9918' : '#EF444418',
                color: passRate >= 60 ? '#05CD99' : '#EF4444',
                border: 'none', fontWeight: 700, fontSize: 11,
              }}>通过率 {passRate}%</Tag>
            </div>
            <Space size={20} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 15 }}>{student.sessionsCount}</span>
                <span style={{ marginLeft: 3 }}>次训练</span>
              </span>
              <span>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 15 }}>{student.practiceHours}</span>
                <span style={{ marginLeft: 3 }}>h 练习</span>
              </span>
              <span>
                出勤率{' '}
                <span style={{ fontWeight: 700, color: student.attendance >= 0.9 ? '#05CD99' : '#F59E0B', fontSize: 15 }}>
                  {Math.round(student.attendance * 100)}%
                </span>
              </span>
            </Space>
          </div>
        </div>
        <div style={{ width: 120, height: 105 }}>
          <ReactECharts option={gaugeOption} style={{ width: 120, height: 105 }} opts={{ renderer: 'svg' }} />
        </div>
      </div>

      <div style={{ padding: '18px 28px 24px' }}>

        {/* ═══ Section 1: Video + Scoring ═══ */}
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={14}>
            <Card title="操作视频回放" size="small" styles={{ body: { padding: 10 } }}>
              <div style={{
                width: '100%', borderRadius: 10, background: '#0A0A14',
                height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at center, rgba(67,97,238,0.08) 0%, transparent 70%)',
                }} />
                <div style={{ textAlign: 'center', zIndex: 1 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px', cursor: 'pointer',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}>
                    <PlayCircleOutlined style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }} />
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>操作视频预览区域</div>
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 50,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                  padding: '0 12px 10px',
                }}>
                  <Tag style={{
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', fontSize: 10, fontWeight: 600,
                  }}>⏱ {fmtTime(totalDuration + 45)}</Tag>
                  <Tag color="#7C3AED" style={{ border: 'none', fontSize: 10 }}>{course.shortName}</Tag>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title={course.name + ' 评分表'} size="small" styles={{ body: { padding: '10px 14px' } }}>
              {course.rubric.map((dim, i) => {
                const score = evalData?.scores[i] ?? 0;
                const level = course.getLevel(score, dim.maxScore);
                const meta = LEVEL_META[level];
                const pct = Math.round(score / dim.maxScore * 100);
                const dimColor = DIM_COLORS[i % DIM_COLORS.length];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: dimColor,
                      color: '#fff', fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ width: 90, fontSize: 12, color: 'var(--text-heading)', fontWeight: 500, flexShrink: 0 }}>
                      {dim.label}
                    </div>
                    <Progress percent={pct} size={{ height: 8 }} strokeColor={meta.color} showInfo={false} style={{ flex: 1 }} />
                    <div style={{ width: 48, textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, color: meta.color, fontSize: 13 }}>{score}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/{dim.maxScore}</span>
                    </div>
                    <Tag style={{
                      background: meta.color + '14', color: meta.color,
                      border: 'none', fontSize: 9, margin: 0, fontWeight: 600,
                    }}>{meta.label}</Tag>
                  </div>
                );
              })}
              <Divider style={{ margin: '10px 0 8px', borderColor: '#CBD5E1', borderWidth: 2 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-heading)' }}>总分</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: gradeColor }}>{totalScore}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>/ {maxTotal}</span>
                  <Tag style={{
                    background: gradeColor + '14', color: gradeColor,
                    border: 'none', fontWeight: 700, fontSize: 11,
                  }}>{gradeLabel}</Tag>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                评级标准：≥85% 优秀 · 60-84% 合格 · &lt;60% 不合格
              </div>
            </Card>
          </Col>
        </Row>

        {/* ═══ Section 2: Evidence Cards ═══ */}
        <Card
          title="循证评分依据 — 视频截图与时间戳"
          size="small"
          style={{ marginTop: 18 }}
          styles={{ body: { padding: '14px' } }}
        >
          <Row gutter={[14, 14]}>
            {course.rubric.map((dim, i) => {
              const score = evalData?.scores[i] ?? 0;
              const ts = evalData?.timestamps[i] ?? 0;
              const level = course.getLevel(score, dim.maxScore);
              const meta = LEVEL_META[level];
              const dimColor = DIM_COLORS[i % DIM_COLORS.length];
              const evidenceObj = course.evidenceText[i];
              const evidenceStr = evidenceObj ? evidenceObj[level] : '';
              const isActive = activeEvidence === i;
              return (
                <Col xs={24} lg={12} key={i}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    onClick={() => setActiveEvidence(i)}
                    style={{
                      background: meta.color + '0F',
                      borderRadius: 14,
                      border: isActive ? `2px solid ${meta.color}` : `1px solid ${meta.color}20`,
                      boxShadow: isActive
                        ? `0 4px 20px ${meta.color}25, 0 1px 3px rgba(0,0,0,0.06)`
                        : '0 1px 3px rgba(0,0,0,0.04)',
                      padding: '14px 16px',
                      transition: 'border 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: dimColor,
                          color: '#fff', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{i + 1}</div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-heading)' }}>{dim.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, color: meta.color, fontSize: 14 }}>{score}/{dim.maxScore}</span>
                        <Tag style={{
                          background: meta.color + '14', color: meta.color,
                          border: 'none', fontSize: 10, margin: 0, fontWeight: 600,
                        }}>{meta.label}</Tag>
                      </div>
                    </div>
                    {/* Card body */}
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{
                        width: 160, height: 90, borderRadius: 10,
                        background: '#111118', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', overflow: 'hidden', cursor: 'pointer',
                      }} onClick={(e) => { e.stopPropagation(); seekTo(ts, i); }}>
                        <CameraOutlined style={{ fontSize: 26, color: 'rgba(255,255,255,0.35)' }} />
                        <div style={{
                          position: 'absolute', bottom: 5, left: 6,
                          background: 'rgba(0,0,0,0.7)', color: '#fff',
                          fontSize: 9, padding: '2px 7px', borderRadius: 4,
                          fontWeight: 600,
                        }}>⏱ {fmtTime(ts)}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <a
                          onClick={(e) => { e.stopPropagation(); seekTo(ts, i); }}
                          style={{ fontSize: 12, color: '#4361EE', cursor: 'pointer', fontWeight: 500 }}
                        >
                          <PlayCircleOutlined style={{ marginRight: 4 }} />
                          跳转 {fmtTime(ts)}
                        </a>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.7 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>评分依据：</span>
                          <Tooltip title={evidenceStr} placement="topLeft">
                            <span style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>{evidenceStr}</span>
                          </Tooltip>
                        </div>
                        <Progress
                          percent={Math.round(score / dim.maxScore * 100)}
                          size={{ height: 6 }}
                          strokeColor={meta.color}
                          style={{ marginTop: 8 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </Col>
              );
            })}
          </Row>
        </Card>

        {/* ═══ Section 3: Radar + Comparison Table ═══ */}
        <Row gutter={[18, 18]} style={{ marginTop: 18 }}>
          <Col xs={24} lg={10}>
            <Card title="能力雷达图" size="small" styles={{ body: { padding: 10 } }}>
              <ReactECharts option={radarOption} style={{ height: 300 }} />
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title="维度对照表" size="small" styles={{ body: { padding: 10 } }}>
              <Table
                dataSource={tableData}
                columns={tableColumns}
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>总计</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="center">
                      <span style={{ fontWeight: 600 }}>{maxTotal}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="center">
                      <span style={{ fontWeight: 800, color: gradeColor, fontSize: 15 }}>{totalScore}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center">
                      <Tag style={{
                        background: gradeColor + '14', color: gradeColor,
                        border: 'none', fontWeight: 700, fontSize: 10,
                      }}>{gradeLabel}</Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Progress percent={passRate} size="small" strokeColor={gradeColor} showInfo={false} style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: gradeColor, minWidth: 32 }}>{passRate}%</span>
                      </div>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* ═══ Section 4: AI Suggestions ═══ */}
        <div style={{
          marginTop: 18,
          padding: '18px 22px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #4361EE08, #7C3AED08, #05CD9905)',
          border: '1px solid #4361EE15',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BulbOutlined style={{ color: '#4361EE', fontSize: 16 }} />
            <span style={{ fontWeight: 800, color: '#4361EE', fontSize: 14 }}>AI 循证教学建议</span>
            <Tag style={{
              background: 'linear-gradient(135deg, #4361EE20, #7C3AED20)',
              color: '#7C3AED', border: 'none', fontSize: 10, fontWeight: 600,
              marginLeft: 4,
            }}>AI 生成</Tag>
          </div>
          {weakDims.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>
                需重点关注维度：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {weakDims.slice(0, 4).map(w => {
                  const wMeta = LEVEL_META[w.level];
                  const ts = evalData?.timestamps[w.idx] ?? 0;
                  return (
                    <Tag key={w.key} style={{
                      background: wMeta.color + '14', color: wMeta.color,
                      border: `1px solid ${wMeta.color}30`,
                      fontWeight: 600, fontSize: 11, padding: '3px 10px',
                      borderRadius: 8,
                    }}>
                      {w.label} {w.score}/{w.maxScore} · ⏱ {fmtTime(ts)}
                    </Tag>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 2,
            whiteSpace: 'pre-wrap',
          }}>
            {course.aiSuggestionGen(student.name, totalScore, weakDims, evalData)}
          </div>
        </div>

        {/* ═══ Section 5: Score Trend ═══ */}
        <Card
          title="维度得分趋势分析"
          size="small"
          style={{ marginTop: 18 }}
          styles={{ body: { padding: 10 } }}
        >
          <ReactECharts option={trendOption} style={{ height: 300 }} />
        </Card>

        {/* ═══ Section 5.5: Historical Training Records ═══ */}
        {studentRecords.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.45 }}>
            <Card
              title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HistoryOutlined style={{ color: '#7C3AED' }} /> 训练档案 — 历史训练记录 <Tag color="purple" style={{ border: 'none', fontSize: 10 }}>{studentRecords.length} 条</Tag></span>}
              size="small"
              style={{ marginTop: 18 }}
              styles={{ body: { padding: '14px 18px' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {studentRecords.map((rec, idx) => {
                  const gc = GRADE_COLOR(rec.totalScore);
                  const gl = GRADE_LABEL(rec.totalScore);
                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.35 }}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${gc}08, ${gc}03)`,
                        border: `1px solid ${gc}20`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: gc + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <VideoCameraOutlined style={{ color: gc, fontSize: 16 }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-heading)' }}>
                              {rec.procedure}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {rec.analysisDate} · {rec.duration} · {rec.videoFile}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 900, fontSize: 22, color: gc }}>{rec.totalScore}</span>
                          <Tag style={{ background: gc + '14', color: gc, border: 'none', fontWeight: 700, fontSize: 11 }}>{gl}</Tag>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        {rec.dimensionScores.map((d, di) => (
                          <div key={di} style={{ flex: '1 1 120px', minWidth: 100 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{d.label}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: DIM_COLORS[di % DIM_COLORS.length] }}>{d.score}/{d.maxScore}</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: '#E9EDF7', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.round(d.score / d.maxScore * 100)}%`, height: '100%', borderRadius: 3, background: DIM_COLORS[di % DIM_COLORS.length] }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {rec.strengths.map((s, si) => (
                          <Tag key={`s-${si}`} style={{ background: '#05CD9912', color: '#05CD99', border: '1px solid #05CD9925', fontSize: 10, borderRadius: 6, margin: 0 }}>{s}</Tag>
                        ))}
                        {rec.improvements.map((imp, ii) => (
                          <Tag key={`i-${ii}`} style={{ background: '#F59E0B12', color: '#D97706', border: '1px solid #F59E0B25', fontSize: 10, borderRadius: 6, margin: 0 }}>{imp}</Tag>
                        ))}
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 12px', background: 'rgba(255,255,255,0.5)', borderRadius: 8, borderLeft: `3px solid ${gc}40`, lineHeight: 1.7 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4 }}>{rec.summary}</div>
                        <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 10 }}>"{rec.transcript}"</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ═══ Section 6: Learning Behavior Analytics ═══ */}
        <Row gutter={[18, 18]} style={{ marginTop: 18 }}>
          <Col xs={24} lg={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <Card title="学习参与漏斗" size="small" styles={{ body: { padding: 10 } }}>
                <ReactECharts option={funnelOption} style={{ height: 300 }} />
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} lg={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45 }}>
              <Card title="学习行为维度" size="small" styles={{ body: { padding: 10 } }}>
                <ReactECharts option={behaviorBarOption} style={{ height: 300 }} />
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* ═══ Section 7: EPA Milestone Progress ═══ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.45 }}>
          <Card
            title="EPA 能力里程碑进度"
            size="small"
            style={{ marginTop: 18 }}
            styles={{ body: { padding: '14px 18px' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {EPA_LIST.map((epa, epaIdx) => {
                const progress = student.epaProgress[epa.id];
                const currentLevel = progress?.level ?? 0;
                const levelColors = ['#E9EDF7', '#F59E0B', '#4361EE', '#7C3AED', '#05CD99'];
                const activeBg = currentLevel >= 3 ? '#05CD9908' : currentLevel >= 1 ? '#4361EE08' : '#FAFAFA';
                const activeBorder = currentLevel >= 3 ? '#05CD9925' : currentLevel >= 1 ? '#4361EE20' : '#E9EDF7';
                return (
                  <motion.div
                    key={epa.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: epaIdx * 0.05, duration: 0.35 }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: activeBg,
                      border: `1px solid ${activeBorder}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag
                          color={currentLevel >= 3 ? 'green' : currentLevel >= 2 ? 'blue' : 'default'}
                          style={{ fontWeight: 700, fontSize: 11, margin: 0 }}
                        >
                          {epa.code}
                        </Tag>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-heading)' }}>{epa.name}</span>
                        <Tag style={{ fontSize: 10, margin: 0, color: '#8C8C8C', background: '#F5F5F5', border: '1px solid #E9EDF7' }}>
                          {epa.category}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>当前</span>
                        <Tag style={{
                          background: levelColors[currentLevel] + '18',
                          color: levelColors[currentLevel],
                          border: 'none', fontWeight: 800, fontSize: 12, margin: 0,
                        }}>
                          Level {currentLevel}
                        </Tag>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {epa.milestones.map((ms) => {
                        const reached = currentLevel >= ms.level;
                        const isCurrent = currentLevel === ms.level;
                        return (
                          <div key={ms.id} style={{ flex: 1 }}>
                            <div style={{
                              height: 6, borderRadius: 3, marginBottom: 8,
                              background: reached
                                ? isCurrent
                                  ? `linear-gradient(90deg, ${levelColors[ms.level]}, ${levelColors[ms.level]}CC)`
                                  : levelColors[ms.level] + '70'
                                : '#E9EDF7',
                              boxShadow: isCurrent ? `0 0 8px ${levelColors[ms.level]}40` : 'none',
                              transition: 'all 0.3s',
                            }} />
                            <div style={{
                              fontSize: 11,
                              fontWeight: reached ? 700 : 400,
                              color: reached ? levelColors[ms.level] : '#BFBFBF',
                            }}>
                              L{ms.level} · {ms.label}
                            </div>
                            <div style={{
                              fontSize: 9, color: reached ? 'var(--text-secondary)' : 'var(--text-muted)',
                              marginTop: 3, lineHeight: 1.5,
                            }}>
                              {ms.criteria}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* ═══ Section 8: Comprehensive AI Analysis ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            marginTop: 18,
            padding: '22px 26px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #7C3AED06, #4361EE08, #05CD9906)',
            border: '1px solid #7C3AED15',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <BulbOutlined style={{ color: '#7C3AED', fontSize: 18 }} />
            <span style={{ fontWeight: 800, color: '#7C3AED', fontSize: 15 }}>综合 AI 分析报告</span>
            <Tag style={{
              background: 'linear-gradient(135deg, #7C3AED20, #4361EE20)',
              color: '#7C3AED', border: 'none', fontSize: 10, fontWeight: 600, marginLeft: 4,
            }}>AI 生成</Tag>
          </div>

          <div style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2,
            padding: '12px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: 10,
            marginBottom: 16, border: '1px solid #E9EDF740',
          }}>
            {aiAnalysis.summary}
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div style={{
                padding: '14px 16px', borderRadius: 12,
                background: '#05CD9908', border: '1px solid #05CD9920',
              }}>
                <div style={{
                  fontWeight: 700, fontSize: 13, color: '#05CD99', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#05CD9918',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>✓</span>
                  优势分析
                </div>
                {aiAnalysis.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 4 }}>
                    {i + 1}. {s}
                  </div>
                ))}
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div style={{
                padding: '14px 16px', borderRadius: 12,
                background: '#EF444408', border: '1px solid #EF444420',
              }}>
                <div style={{
                  fontWeight: 700, fontSize: 13, color: '#EF4444', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#EF444418',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>!</span>
                  薄弱分析
                </div>
                {aiAnalysis.weaknesses.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 4 }}>
                    {i + 1}. {w}
                  </div>
                ))}
              </div>
            </Col>
          </Row>

          <div style={{
            marginTop: 16, padding: '14px 16px', borderRadius: 12,
            background: '#4361EE08', border: '1px solid #4361EE18',
          }}>
            <div style={{
              fontWeight: 700, fontSize: 13, color: '#4361EE', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', background: '#4361EE18',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>→</span>
              提升路径建议
            </div>
            {aiAnalysis.steps.map((step, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.9, marginBottom: 2 }}>
                {i + 1}. {step}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 14, padding: '10px 16px', borderRadius: 10,
            background: 'rgba(255,255,255,0.5)', border: '1px solid #E9EDF7',
            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8,
          }}>
            <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>班级对标：</span>
            {aiAnalysis.benchmark}
          </div>
        </motion.div>

        {/* ═══ Section 9: Multi-Course Comparison ═══ */}
        {coursesWithEval.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.45 }}>
            <Card
              title="跨课程对比"
              size="small"
              style={{ marginTop: 18 }}
              styles={{ body: { padding: '10px 14px' } }}
            >
              <ReactECharts option={multiCourseOption} style={{ height: 300 }} />
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 10,
                background: '#F5F7FA', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8,
              }}>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>跨课程总结：</span>
                {student.name}同学已完成 {coursesWithEval.length}/{ALL_COURSES.length} 门课程评估。
                {(() => {
                  const scores = coursesWithEval.map(c => ({
                    name: c.shortName,
                    score: computeCourseTotal(student.id, c),
                    max: computeMaxTotal(c),
                  }));
                  const best = scores.reduce((a, b) => (a.score / a.max > b.score / b.max ? a : b));
                  const worst = scores.reduce((a, b) => (a.score / a.max < b.score / b.max ? a : b));
                  return `表现最佳课程为「${best.name}」（${best.score}/${best.max}），最需加强课程为「${worst.name}」（${worst.score}/${worst.max}）。`;
                })()}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </Modal>
  );
};

export default StudentDetailModal;
