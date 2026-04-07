import React, { useMemo, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Space,
  Avatar,
  Select,
  Divider,
  Segmented,
  Typography,
  Progress,
  message,
} from 'antd';
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  TeamOutlined,
  UserOutlined,
  RadarChartOutlined,
  BarChartOutlined,
  TrophyOutlined,
  HistoryOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { STUDENTS, ALL_COURSES, getRecordsByStudent } from '@/data';
import { GRADE_COLOR, GRADE_LABEL, LEVEL_META } from '@/types';
import {
  computeCourseTotal,
  computeClassAvg,
  computeMaxTotal,
} from '@/utils/algorithms';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import AIInsightCard from '@/components/AIInsightCard';

const { Text, Title } = Typography;

const CARD_RADIUS = 14;

const DIM_COLORS = [
  '#4361EE',
  '#7C3AED',
  '#05CD99',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#8B5CF6',
  '#10B981',
  '#F97316',
] as const;

const COURSE_BAR_PALETTE = ['#4361EE', '#05CD99', '#7C3AED', '#F59E0B', '#EC4899'] as const;

const RANK_ROW_BG: Record<number, string> = {
  0: 'linear-gradient(90deg, rgba(245, 158, 11, 0.14) 0%, rgba(255, 255, 255, 0) 100%)',
  1: 'linear-gradient(90deg, rgba(148, 163, 184, 0.18) 0%, rgba(255, 255, 255, 0) 100%)',
  2: 'linear-gradient(90deg, rgba(217, 119, 6, 0.12) 0%, rgba(255, 255, 255, 0) 100%)',
};

type RankRow = {
  key: number;
  rank: number;
  name: string;
  avatar: string;
  total: number;
};

const motionCard = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

const ReportCenter: React.FC = () => {
  const [reportType, setReportType] = React.useState<'class' | 'student'>('class');
  const [selectedCourse, setSelectedCourse] = React.useState(ALL_COURSES[0].id);
  const [selectedStudentId, setSelectedStudentId] = React.useState<number>(1);
  const { getRealAnalysis } = useUnifiedData();

  const course = ALL_COURSES.find(c => c.id === selectedCourse) ?? ALL_COURSES[0];
  const student = STUDENTS.find(s => s.id === selectedStudentId) ?? STUDENTS[0];
  const classAvg = computeClassAvg(course, STUDENTS.map(s => s.id));
  const maxTotal = computeMaxTotal(course);

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

  const rankedRows: RankRow[] = useMemo(() => {
    const sorted = STUDENTS.map(s => ({
      key: s.id,
      rank: 0,
      name: s.name,
      avatar: s.avatar,
      total: computeCourseTotal(s.id, course),
    })).sort((a, b) => b.total - a.total);
    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [course]);

  const studentTotal = computeCourseTotal(student.id, course);
  const studentEv = course.evals[student.id];

  const weakDimsForAi = useMemo(() => {
    return course.rubric
      .map((dim, i) => {
        const score = course.evals[student.id]?.scores[i] ?? 0;
        const level = course.getLevel(score, dim.maxScore);
        return { key: dim.key, label: dim.label, score, maxScore: dim.maxScore, level, idx: i };
      })
      .filter((d): d is typeof d & { level: 'pass' | 'fail' } => d.level !== 'excellent')
      .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);
  }, [course, student.id]);

  const aiSuggestionText = useMemo(
    () =>
      course.aiSuggestionGen(
        student.name,
        studentTotal,
        weakDimsForAi as {
          key: string;
          label: string;
          score: number;
          maxScore: number;
          level: 'pass' | 'fail';
          idx: number;
        }[],
        course.evals[student.id],
      ),
    [course, student.name, studentTotal, weakDimsForAi],
  );

  const studentRecords = useMemo(
    () => getRecordsByStudent(selectedStudentId),
    [selectedStudentId],
  );

  const classScoreComboOption = useMemo(() => {
    const barData = STUDENTS.map(s => {
      const total = computeCourseTotal(s.id, course);
      const c = GRADE_COLOR(total);
      return {
        value: total,
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: c },
              { offset: 1, color: `${c}99` },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
      };
    });

    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'cross' as const } },
      legend: {
        data: ['学员得分', '班级均分'],
        top: 0,
        textStyle: { fontSize: 11, color: 'var(--text-secondary)' },
      },
      grid: { top: 40, bottom: 28, left: 48, right: 20 },
      xAxis: {
        type: 'category' as const,
        data: STUDENTS.map(s => s.name),
        axisLabel: { fontSize: 10, rotate: 18, color: '#707EAE' },
        axisLine: { lineStyle: { color: '#E9EDF7' } },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: maxTotal,
        axisLabel: { fontSize: 10, color: '#707EAE' },
        splitLine: { lineStyle: { type: 'dashed' as const, color: '#F1F4F9' } },
      },
      series: [
        {
          name: '学员得分',
          type: 'bar' as const,
          data: barData,
          barWidth: 26,
          emphasis: { focus: 'series' as const },
        },
        {
          name: '班级均分',
          type: 'line' as const,
          data: STUDENTS.map(() => classAvg),
          smooth: true,
          symbol: 'circle' as const,
          symbolSize: 7,
          lineStyle: { color: '#F59E0B', width: 2.5, type: 'dashed' as const },
          itemStyle: { color: '#F59E0B', borderColor: '#fff', borderWidth: 1 },
          z: 10,
        },
      ],
    };
  }, [course, classAvg, maxTotal]);

  const classRadarOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' as const },
      legend: {
        data: ['班级各维度均值'],
        bottom: 0,
        textStyle: { fontSize: 11, color: 'var(--text-secondary)' },
      },
      radar: {
        indicator: course.rubric.map(d => ({ name: d.label, max: d.maxScore })),
        shape: 'polygon' as const,
        splitNumber: 4,
        radius: '62%',
        axisName: { fontSize: 10, color: '#707EAE', lineHeight: 14 },
        splitArea: {
          areaStyle: {
            color: ['rgba(67, 97, 238, 0.04)', 'rgba(67, 97, 238, 0.08)'],
          },
        },
      },
      series: [
        {
          type: 'radar' as const,
          animationDuration: 900,
          animationEasing: 'cubicOut' as const,
          data: [
            {
              value: classAvgScores,
              name: '班级各维度均值',
              areaStyle: {
                color: {
                  type: 'radial' as const,
                  x: 0.5,
                  y: 0.5,
                  r: 0.65,
                  colorStops: [
                    { offset: 0, color: 'rgba(67, 97, 238, 0.35)' },
                    { offset: 1, color: 'rgba(5, 205, 153, 0.08)' },
                  ],
                },
              },
              lineStyle: { color: '#4361EE', width: 2 },
              itemStyle: { color: '#4361EE' },
            },
          ],
        },
      ],
    }),
    [course.rubric, classAvgScores],
  );

  const courseCompareOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      legend: {
        data: ALL_COURSES.map(c => c.shortName),
        top: 0,
        textStyle: { fontSize: 10, color: 'var(--text-secondary)' },
      },
      grid: { top: 40, bottom: 28, left: 44, right: 16 },
      xAxis: {
        type: 'category' as const,
        data: STUDENTS.map(s => s.name),
        axisLabel: { fontSize: 10, rotate: 18, color: '#707EAE' },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: 100,
        axisLabel: { fontSize: 10, color: '#707EAE' },
        splitLine: { lineStyle: { type: 'dashed' as const, color: '#F1F4F9' } },
      },
      animation: true,
      animationDuration: 900,
      animationEasing: 'cubicOut' as const,
      series: ALL_COURSES.map((c, ci) => ({
        name: c.shortName,
        type: 'bar' as const,
        data: STUDENTS.map(s => computeCourseTotal(s.id, c)),
        barWidth: 10,
        barGap: '18%',
        barCategoryGap: '28%',
        animationDelay: (idx: number) => idx * 40 + ci * 28,
        itemStyle: {
          color: COURSE_BAR_PALETTE[ci % COURSE_BAR_PALETTE.length],
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: { focus: 'series' as const },
      })),
    }),
    [],
  );

  /* ── Dimension Stacked Bar for class ── */
  const dimStackedOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { fontSize: 12, color: '#2B3674' },
    },
    legend: {
      data: course.rubric.map(d => d.label),
      top: 0,
      textStyle: { fontSize: 10, color: 'var(--text-secondary)' },
    },
    grid: { top: 40, bottom: 28, left: 48, right: 16 },
    xAxis: {
      type: 'category' as const,
      data: STUDENTS.map(s => s.name),
      axisLabel: { fontSize: 10, rotate: 15, color: '#707EAE' },
      axisLine: { lineStyle: { color: '#E9EDF7' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { fontSize: 10, color: '#707EAE' },
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#F1F4F9' } },
    },
    series: course.rubric.map((dim, di) => ({
      name: dim.label,
      type: 'bar' as const,
      stack: 'total',
      barWidth: 22,
      data: STUDENTS.map(s => course.evals[s.id]?.scores[di] ?? 0),
      itemStyle: {
        color: DIM_COLORS[di % DIM_COLORS.length],
        borderRadius: di === course.rubric.length - 1 ? [4, 4, 0, 0] : undefined,
      },
      emphasis: { focus: 'series' as const },
    })),
    animationDuration: 900,
    animationEasing: 'cubicOut' as const,
  }), [course]);

  /* ── Score Distribution Histogram ── */
  const scoreDistOption = useMemo(() => {
    const bins = [
      { label: '95-100', min: 95, max: 100, color: '#059669' },
      { label: '90-94', min: 90, max: 94, color: '#05CD99' },
      { label: '85-89', min: 85, max: 89, color: '#4361EE' },
      { label: '80-84', min: 80, max: 84, color: '#7C3AED' },
      { label: '75-79', min: 75, max: 79, color: '#F59E0B' },
      { label: '<75', min: 0, max: 74, color: '#EF4444' },
    ];
    const counts = bins.map(bin => {
      return STUDENTS.filter(s => {
        const t = computeCourseTotal(s.id, course);
        return t >= bin.min && t <= bin.max;
      }).length;
    });
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { top: 16, bottom: 28, left: 44, right: 16 },
      xAxis: {
        type: 'category' as const,
        data: bins.map(b => b.label),
        axisLabel: { fontSize: 10, color: '#707EAE' },
        axisLine: { lineStyle: { color: '#E9EDF7' } },
      },
      yAxis: {
        type: 'value' as const,
        minInterval: 1,
        axisLabel: { fontSize: 10, color: '#707EAE' },
        splitLine: { lineStyle: { type: 'dashed' as const, color: '#F1F4F9' } },
      },
      series: [{
        type: 'bar' as const,
        data: counts.map((v, i) => ({
          value: v,
          itemStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: bins[i].color },
                { offset: 1, color: bins[i].color + '70' },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barWidth: 30,
        label: {
          show: true, position: 'top' as const,
          fontSize: 11, fontWeight: 700 as const, color: '#475569',
          formatter: (p: any) => p.value > 0 ? `${p.value}人` : '',
        },
      }],
      animationDuration: 800,
    };
  }, [course]);

  /* ── Individual Student Score Gauge ── */
  const studentGaugeOption = useMemo(() => {
    const pct = maxTotal > 0 ? Math.round(studentTotal / maxTotal * 100) : 0;
    const gc = GRADE_COLOR(studentTotal);
    return {
      series: [{
        type: 'gauge' as const,
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: maxTotal,
        pointer: { show: true, length: '55%', width: 4, itemStyle: { color: gc } },
        progress: {
          show: true,
          roundCap: true,
          itemStyle: { color: gc },
        },
        axisLine: { lineStyle: { width: 14, color: [[1, '#f1f5f9']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { fontSize: 11, color: '#64748b', offsetCenter: [0, '75%'] },
        detail: {
          fontSize: 24, fontWeight: 800 as const,
          offsetCenter: [0, '20%'],
          valueAnimation: true,
          color: gc,
          formatter: `{value}/${maxTotal}`,
        },
        data: [{ value: studentTotal, name: `${GRADE_LABEL(studentTotal)} (${pct}%)` }],
      }],
    };
  }, [studentTotal, maxTotal]);

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const buildPrintableHtml = useCallback(
    (mode: 'class' | 'student') => {
      const title = mode === 'class' ? `班级报告 — ${course.name}` : `${student.name} — ${course.name} 个人报告`;
      const rows =
        mode === 'class'
          ? rankedRows
              .map(
                r =>
                  `<tr><td>${r.rank}</td><td>${escapeHtml(r.name)}</td><td>${r.total}</td><td>${GRADE_LABEL(r.total)}</td></tr>`,
              )
              .join('')
          : '';
      const dims =
        mode === 'student'
          ? course.rubric
              .map((dim, i) => {
                const score = studentEv?.scores[i] ?? 0;
                const level = course.getLevel(score, dim.maxScore);
                const evText = course.evidenceText[i]?.[level] ?? '';
                return `<tr><td>${escapeHtml(dim.label)}</td><td>${score}/${dim.maxScore}</td><td>${escapeHtml(evText)}</td></tr>`;
              })
              .join('')
          : '';
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
  body{font-family:Segoe UI,Microsoft YaHei,sans-serif;padding:24px;color:#2B3674;}
  h1{font-size:18px;margin-bottom:16px;}
  table{border-collapse:collapse;width:100%;font-size:12px;}
  th,td{border:1px solid #E9EDF7;padding:8px;text-align:left;}
  th{background:#F8FAFF;}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
${
  mode === 'class'
    ? `<p>班级均分：${classAvg}　课程满分：${maxTotal}</p>
<table><thead><tr><th>#</th><th>学员</th><th>得分</th><th>等级</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<p>年级：${escapeHtml(student.grade)}　分组：${escapeHtml(student.group)}　课程得分：${studentTotal}/${maxTotal}</p>
<table><thead><tr><th>维度</th><th>得分</th><th>证据说明</th></tr></thead><tbody>${dims}</tbody></table>
<p style="margin-top:16px;white-space:pre-wrap;"><strong>AI 教学建议</strong><br/>${escapeHtml(aiSuggestionText)}</p>`
}
</body></html>`;
    },
    [
      aiSuggestionText,
      classAvg,
      course,
      maxTotal,
      rankedRows,
      student,
      studentEv?.scores,
      studentTotal,
    ],
  );

  const handlePrint = useCallback(() => {
    const html = buildPrintableHtml(reportType);
    const w = window.open('', '_blank');
    if (!w) {
      message.error('无法打开打印窗口，请检查浏览器弹窗设置');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 250);
  }, [buildPrintableHtml, reportType]);

  const handlePdfExport = useCallback(() => {
    const html = buildPrintableHtml(reportType);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${course.id}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('已导出可打印的 HTML 报告，可用浏览器打开后选择「打印 → 另存为 PDF」');
  }, [buildPrintableHtml, course.id, reportType]);

  const handleExcelExport = useCallback(() => {
    const bom = '\uFEFF';
    if (reportType === 'class') {
      const header = '排名,姓名,得分,等级\n';
      const lines = rankedRows.map(r => `${r.rank},${r.name},${r.total},${GRADE_LABEL(r.total)}`).join('\n');
      const csv = bom + header + lines;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `class-report-${course.id}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const header = '维度,得分,满分,等级,证据说明\n';
      const lines = course.rubric
        .map((dim, i) => {
          const score = studentEv?.scores[i] ?? 0;
          const level = course.getLevel(score, dim.maxScore);
          const label = LEVEL_META[level].label;
          const ev = (course.evidenceText[i]?.[level] ?? '').replace(/"/g, '""');
          return `"${dim.label}",${score},${dim.maxScore},"${label}","${ev}"`;
        })
        .join('\n');
      const csv = bom + header + lines + '\n';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-report-${student.name}-${course.id}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    message.success('已导出 Excel 兼容 CSV 文件');
  }, [course, rankedRows, reportType, student.name, studentEv?.scores]);

  return (
    <div
      style={{
        ['--primary' as string]: '#4361EE',
        ['--text-heading' as string]: '#2B3674',
      }}
    >
      <motion.div {...motionCard}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 20,
            padding: '14px 18px',
            background: 'var(--bg-card)',
            borderRadius: CARD_RADIUS,
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Title level={4} style={{ margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileTextOutlined style={{ color: 'var(--primary)' }} />
              报告中心
            </Title>
            <Segmented<'class' | 'student'>
              value={reportType}
              onChange={v => setReportType(v)}
              options={[
                {
                  value: 'class',
                  label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <TeamOutlined />
                      班级报告
                    </span>
                  ),
                },
                {
                  value: 'student',
                  label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <UserOutlined />
                      个人报告
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <Space wrap size="middle" style={{ justifyContent: 'flex-end' }}>
            <Select
              value={selectedCourse}
              onChange={setSelectedCourse}
              style={{ minWidth: 200 }}
              options={ALL_COURSES.map(c => ({ value: c.id, label: c.name }))}
              placeholder="选择课程"
            />
            {reportType === 'student' && (
              <Select
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                style={{ minWidth: 140 }}
                options={STUDENTS.map(s => ({ value: s.id, label: s.name }))}
                placeholder="选择学员"
              />
            )}
            <Button icon={<FilePdfOutlined />} onClick={handlePdfExport}>
              导出 PDF
            </Button>
            <Button type="primary" icon={<FileExcelOutlined />} onClick={handleExcelExport}>
              导出 Excel
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              打印
            </Button>
          </Space>
        </div>
      </motion.div>

      {reportType === 'class' ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <TeamOutlined style={{ color: 'var(--primary)' }} />
                  班级综合报告 — {course.name}
                </span>
              }
              styles={{ body: { padding: '16px 20px' } }}
              style={{ marginBottom: 16, borderRadius: CARD_RADIUS }}
            >
              <Row gutter={[24, 8]}>
                <Col xs={24} sm={6}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    班级均分
                  </Text>
                  <div style={{ fontSize: 22, fontWeight: 800, color: GRADE_COLOR(classAvg) }}>{classAvg}</div>
                </Col>
                <Col xs={24} sm={6}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    学员人数
                  </Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{STUDENTS.length} 人</div>
                </Col>
                <Col xs={24} sm={6}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    课程满分
                  </Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{maxTotal} 分</div>
                </Col>
                <Col xs={24} sm={6}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    整体等级
                  </Text>
                  <div>
                    <Tag color={GRADE_COLOR(classAvg)} style={{ border: 'none', fontWeight: 700 }}>
                      {GRADE_LABEL(classAvg)}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          </motion.div>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <BarChartOutlined style={{ color: 'var(--primary)' }} />
                      学员得分与班级均分
                    </span>
                  }
                  styles={{ body: { padding: 12 } }}
                  style={{ borderRadius: CARD_RADIUS }}
                >
                  <ReactECharts option={classScoreComboOption} style={{ height: 300 }} notMerge lazyUpdate />
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} lg={10}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <RadarChartOutlined style={{ color: 'var(--purple)' }} />
                      班级维度均值雷达
                    </span>
                  }
                  styles={{ body: { padding: 12 } }}
                  style={{ borderRadius: CARD_RADIUS }}
                >
                  <ReactECharts option={classRadarOption} style={{ height: 300 }} notMerge lazyUpdate />
                </Card>
              </motion.div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <TrophyOutlined style={{ color: '#F59E0B' }} />
                      成绩排名
                    </span>
                  }
                  styles={{ body: { padding: '8px 12px' } }}
                  style={{ borderRadius: CARD_RADIUS }}
                >
                  <Table<RankRow>
                    dataSource={rankedRows}
                    pagination={false}
                    size="small"
                    rowKey="key"
                    onRow={(_, index) => ({
                      style:
                        index !== undefined && index < 3
                          ? {
                              background: RANK_ROW_BG[index],
                            }
                          : {},
                    })}
                    columns={[
                      {
                        title: '#',
                        width: 44,
                        render: (_: unknown, r: RankRow) => (
                          <span
                            style={{
                              fontWeight: 800,
                              color: r.rank <= 3 ? '#D97706' : 'var(--text-muted)',
                              fontSize: 12,
                            }}
                          >
                            {r.rank}
                          </span>
                        ),
                      },
                      {
                        title: '学员',
                        dataIndex: 'name',
                        render: (v: string, r: RankRow) => (
                          <Space>
                            <Avatar size={28} style={{ background: GRADE_COLOR(r.total), fontSize: 11, fontWeight: 700 }}>
                              {r.avatar}
                            </Avatar>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                          </Space>
                        ),
                      },
                      {
                        title: '得分',
                        dataIndex: 'total',
                        width: 80,
                        align: 'center' as const,
                        render: (v: number) => (
                          <span style={{ fontWeight: 800, color: GRADE_COLOR(v), fontSize: 14 }}>{v}</span>
                        ),
                      },
                      {
                        title: '等级',
                        dataIndex: 'total',
                        width: 72,
                        align: 'center' as const,
                        render: (v: number) => (
                          <Tag
                            style={{
                              background: GRADE_COLOR(v) + '18',
                              color: GRADE_COLOR(v),
                              border: 'none',
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            {GRADE_LABEL(v)}
                          </Tag>
                        ),
                      },
                    ]}
                  />
                </Card>
              </motion.div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={14}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card
                  title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><BarChartOutlined style={{ color: '#7C3AED' }} />维度得分堆叠</span>}
                  styles={{ body: { padding: 12 } }}
                  style={{ borderRadius: CARD_RADIUS }}
                >
                  <ReactECharts option={dimStackedOption} style={{ height: 280 }} notMerge lazyUpdate />
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} lg={10}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card
                  title="成绩分布直方图"
                  styles={{ body: { padding: 12 } }}
                  style={{ borderRadius: CARD_RADIUS }}
                >
                  <ReactECharts option={scoreDistOption} style={{ height: 280 }} notMerge lazyUpdate />
                </Card>
              </motion.div>
            </Col>
          </Row>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginTop: 16 }}
          >
            <Card
              title="跨课程对比（分组柱状）"
              styles={{ body: { padding: 12 } }}
              style={{ borderRadius: CARD_RADIUS }}
            >
              <ReactECharts option={courseCompareOption} style={{ height: 300 }} notMerge lazyUpdate />
            </Card>
          </motion.div>
        </>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card
              style={{ marginBottom: 16, borderRadius: CARD_RADIUS, overflow: 'hidden' }}
              styles={{ body: { padding: 0 } }}
            >
              <div
                style={{
                  padding: '20px 22px',
                  background: 'linear-gradient(135deg, rgba(67, 97, 238, 0.08) 0%, rgba(124, 58, 237, 0.06) 50%, rgba(5, 205, 153, 0.05) 100%)',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <Avatar
                  size={64}
                  style={{
                    background: `linear-gradient(145deg, ${GRADE_COLOR(studentTotal)}, ${GRADE_COLOR(studentTotal)}CC)`,
                    fontSize: 22,
                    fontWeight: 800,
                    boxShadow: 'var(--shadow-primary)',
                  }}
                >
                  {student.avatar}
                </Avatar>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Title level={4} style={{ margin: '0 0 6px', color: 'var(--text-heading)' }}>
                    {student.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {course.name} · 个人报告
                  </Text>
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <Tag color="blue" style={{ border: 'none' }}>
                      {student.grade}
                    </Tag>
                    <Tag color="purple" style={{ border: 'none' }}>
                      {student.group}
                    </Tag>
                    <Tag color="cyan" style={{ border: 'none' }}>
                      训练 {student.sessionsCount} 次
                    </Tag>
                    <Tag color="green" style={{ border: 'none' }}>
                      出勤 {Math.round(student.attendance * 100)}%
                    </Tag>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(100px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>课程得分</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: GRADE_COLOR(studentTotal) }}>
                      {studentTotal}
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>/{maxTotal}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>综合等级</div>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={GRADE_COLOR(studentTotal)} style={{ border: 'none', fontWeight: 700, fontSize: 13 }}>
                        {GRADE_LABEL(studentTotal)}
                      </Tag>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>平均专注</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>
                      {Math.round(student.avgAttention * 100)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>知识掌握</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>
                      {Math.round(student.knowledgeMastery * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={8}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card title="综合得分" styles={{ body: { padding: 12 } }} style={{ borderRadius: CARD_RADIUS }}>
                  <ReactECharts option={studentGaugeOption} style={{ height: 200 }} notMerge lazyUpdate />
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} lg={16}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.09, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card title="跨课程对比" styles={{ body: { padding: 12 } }} style={{ borderRadius: CARD_RADIUS }}>
                  <ReactECharts option={{
                    tooltip: { trigger: 'axis' as const },
                    grid: { top: 16, bottom: 28, left: 44, right: 16 },
                    xAxis: {
                      type: 'category' as const,
                      data: ALL_COURSES.map(c => c.shortName),
                      axisLabel: { fontSize: 10, color: '#707EAE' },
                      axisLine: { lineStyle: { color: '#E9EDF7' } },
                    },
                    yAxis: {
                      type: 'value' as const, min: 0, max: 100,
                      axisLabel: { fontSize: 10, color: '#707EAE' },
                      splitLine: { lineStyle: { type: 'dashed' as const, color: '#F1F4F9' } },
                    },
                    series: [{
                      type: 'bar' as const,
                      data: ALL_COURSES.map((c, ci) => {
                        const t = computeCourseTotal(student.id, c);
                        return {
                          value: t,
                          itemStyle: {
                            color: COURSE_BAR_PALETTE[ci % COURSE_BAR_PALETTE.length],
                            borderRadius: [6, 6, 0, 0],
                          },
                        };
                      }),
                      barWidth: 28,
                      label: { show: true, position: 'top' as const, fontSize: 10, fontWeight: 700 as const },
                    }],
                    animationDuration: 800,
                  }} style={{ height: 200 }} notMerge lazyUpdate />
                </Card>
              </motion.div>
            </Col>
          </Row>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card title="各维度得分与证据" styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: CARD_RADIUS }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {course.rubric.map((dim, i) => {
                  const ev = course.evals[student.id];
                  const score = ev?.scores[i] ?? 0;
                  const level = course.getLevel(score, dim.maxScore);
                  const meta = LEVEL_META[level];
                  const pct = dim.maxScore > 0 ? Math.round((score / dim.maxScore) * 100) : 0;
                  const barColor = DIM_COLORS[i % DIM_COLORS.length];
                  return (
                    <div
                      key={dim.key}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Space>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 8,
                              background: barColor,
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {i + 1}
                          </span>
                          <Text strong style={{ fontSize: 13 }}>
                            {dim.label}
                          </Text>
                          <Tag style={{ background: meta.color + '18', color: meta.color, border: 'none' }}>{meta.label}</Tag>
                        </Space>
                        <Text strong style={{ fontSize: 15, color: barColor }}>
                          {score}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {' '}
                            / {dim.maxScore}
                          </Text>
                        </Text>
                      </div>
                      <Progress
                        percent={pct}
                        strokeColor={{ from: barColor, to: `${barColor}88` }}
                        trailColor="rgba(0,0,0,0.06)"
                        strokeWidth={10}
                        showInfo={false}
                      />
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.75,
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: 'var(--bg-card)',
                          border: '1px dashed var(--border-main)',
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                          证据说明
                        </Text>
                        {course.evidenceText[i]?.[level] ?? '—'}
                      </div>
                    </div>
                  );
                })}
              </Space>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginTop: 16 }}
          >
            <div
              style={{
                padding: '18px 22px',
                borderRadius: CARD_RADIUS,
                border: '1px solid rgba(67, 97, 238, 0.2)',
                background: 'linear-gradient(135deg, rgba(67, 97, 238, 0.12) 0%, rgba(124, 58, 237, 0.1) 40%, rgba(5, 205, 153, 0.08) 100%)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  marginBottom: 10,
                  background: 'linear-gradient(90deg, #4361EE, #7C3AED)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                AI 教学建议
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                {aiSuggestionText}
              </div>
            </div>
          </motion.div>

          {(() => {
            const realAnalysis = getRealAnalysis(selectedStudentId, selectedCourse);
            return realAnalysis ? (
              <AIInsightCard
                title="AI 视频分析洞察"
                insights={[
                  `最近一次 AI 分析得分: ${realAnalysis.totalScore} 分`,
                  realAnalysis.overallComment,
                ].filter(Boolean)}
                type="success"
                style={{ marginTop: 16 }}
              />
            ) : null;
          })()}

          {/* Historical Training Records */}
          {studentRecords.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginTop: 16 }}
            >
              <Card
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <HistoryOutlined style={{ color: '#7C3AED' }} />
                    训练档案 — 历史AI分析记录
                    <Tag color="purple" style={{ border: 'none', fontSize: 10 }}>{studentRecords.length} 条</Tag>
                  </span>
                }
                styles={{ body: { padding: '16px 20px' } }}
                style={{ borderRadius: CARD_RADIUS }}
              >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  {studentRecords.map((rec, idx) => {
                    const gc = GRADE_COLOR(rec.totalScore);
                    return (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                        style={{
                          padding: '16px 18px',
                          borderRadius: 14,
                          background: `linear-gradient(135deg, ${gc}06, transparent)`,
                          border: `1px solid ${gc}18`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Space>
                            <div style={{
                              width: 34, height: 34, borderRadius: 10,
                              background: gc + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <VideoCameraOutlined style={{ color: gc, fontSize: 15 }} />
                            </div>
                            <div>
                              <Text strong style={{ fontSize: 13 }}>{rec.procedure}</Text>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rec.analysisDate} · {rec.duration} · {rec.videoFile}</div>
                            </div>
                          </Space>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 900, fontSize: 20, color: gc }}>{rec.totalScore}</span>
                            <Tag style={{ background: gc + '14', color: gc, border: 'none', fontWeight: 700, fontSize: 11 }}>{GRADE_LABEL(rec.totalScore)}</Tag>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                          {rec.dimensionScores.map((d, di) => (
                            <div key={di} style={{ flex: '1 1 100px', minWidth: 90 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                                <span style={{ fontWeight: 700, color: DIM_COLORS[di % DIM_COLORS.length] }}>{d.score}/{d.maxScore}</span>
                              </div>
                              <Progress percent={Math.round(d.score / d.maxScore * 100)} size={{ height: 5 }} strokeColor={DIM_COLORS[di % DIM_COLORS.length]} showInfo={false} />
                            </div>
                          ))}
                        </div>

                        <div style={{
                          fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.75,
                          padding: '10px 12px', borderRadius: 8, background: 'var(--bg-card)',
                          border: '1px dashed var(--border-main)',
                        }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>AI 分析摘要</Text>
                          {rec.summary}
                          <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
                            语音转录: "{rec.transcript}"
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {rec.strengths.map((s, si) => (
                            <Tag key={`s-${si}`} style={{ background: '#05CD9910', color: '#059669', border: '1px solid #05CD9920', fontSize: 10, borderRadius: 6, margin: 0 }}>{s}</Tag>
                          ))}
                          {rec.improvements.map((imp, ii) => (
                            <Tag key={`i-${ii}`} style={{ background: '#F59E0B10', color: '#B45309', border: '1px solid #F59E0B20', fontSize: 10, borderRadius: 6, margin: 0 }}>{imp}</Tag>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </Space>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportCenter;
