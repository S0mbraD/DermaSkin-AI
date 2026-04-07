import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  BarChartOutlined,
  CloseOutlined,
  HistoryOutlined,
  LineChartOutlined,
  RadarChartOutlined,
  SearchOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { AnimatePresence, motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import { ALL_COURSES, EPA_LIST, STUDENTS, getRecordsByStudent } from '@/data';
import { GRADE_COLOR, GRADE_LABEL } from '@/types';
import type { Student } from '@/types';
import { computeClassAvg, computeCourseTotal, computeMaxTotal } from '@/utils/algorithms';

const { Text, Title } = Typography;

/** Same skill keys as EvalCenter — matches `students.ts` */
const SKILL_LABELS = [
  '无菌操作',
  '标本采集',
  '制片技术',
  '镜下判读',
  '临床沟通',
  '诊断思维',
  '操作规范',
  '安全意识',
] as const;

const LEVEL_TAG_STYLE: Record<number, { bg: string; text: string }> = {
  0: { bg: '#E2E8F0', text: '#64748B' },
  1: { bg: '#FEE2E2', text: '#B91C1C' },
  2: { bg: '#FEF3C7', text: '#B45309' },
  3: { bg: '#DBEAFE', text: '#1D4ED8' },
  4: { bg: '#D1FAE5', text: '#047857' },
};

const kpiContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
} as const;

const kpiItem = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 28 } },
} as const;

const panelMotion = {
  initial: { x: 48, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 32 } },
  exit: { x: 32, opacity: 0, transition: { duration: 0.2 } },
} as const;

function SparklineCell({ scores, accent }: { scores: number[]; accent: string }) {
  const option = useMemo(() => {
    const minV = Math.min(...scores);
    const maxV = Math.max(...scores);
    const pad = Math.max(3, (maxV - minV) * 0.15);
    return {
      animationDuration: 400,
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: {
        type: 'category' as const,
        show: false,
        boundaryGap: false,
        data: scores.map((_, i) => i),
      },
      yAxis: {
        type: 'value' as const,
        show: false,
        min: minV - pad,
        max: maxV + pad,
      },
      tooltip: { show: false },
      series: [
        {
          type: 'line' as const,
          data: scores,
          smooth: true,
          symbol: 'none' as const,
          lineStyle: { width: 2, color: accent },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${accent}55` },
                { offset: 1, color: `${accent}00` },
              ],
            },
          },
        },
      ],
    };
  }, [scores, accent]);

  return <ReactECharts option={option} style={{ height: 36, width: 96 }} opts={{ renderer: 'svg' }} />;
}

function SkillBars({ student }: { student: Student }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, maxWidth: 200 }}>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {SKILL_LABELS.slice(0, 4).map((sk) => {
          const v = student.skills[sk] ?? 0;
          const c = GRADE_COLOR(v);
          return (
            <div key={sk} style={{ flex: '1 1 44px', minWidth: 40 }} title={`${sk}: ${v}`}>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: 2,
                }}
              >
                {sk.slice(0, 2)}
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: 'var(--border-main)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, v)}%` }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${c}, ${c}99)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {SKILL_LABELS.slice(4, 8).map((sk) => {
          const v = student.skills[sk] ?? 0;
          const c = GRADE_COLOR(v);
          return (
            <div key={sk} style={{ flex: 1, minWidth: 0 }} title={`${sk}: ${v}`}>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--border-main)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: `${Math.min(100, v)}%`, height: '100%', background: c }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const StudentManagement: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [activeCourseId, setActiveCourseId] = useState<string>(ALL_COURSES[0].id);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const activeCourse = useMemo(
    () => ALL_COURSES.find((c) => c.id === activeCourseId) ?? ALL_COURSES[0],
    [activeCourseId],
  );

  const filteredStudents = useMemo(
    () =>
      STUDENTS.filter((s) => {
        if (searchText && !s.name.includes(searchText)) return false;
        if (groupFilter !== 'all' && s.group !== groupFilter) return false;
        return true;
      }),
    [searchText, groupFilter],
  );

  const groups = useMemo(() => [...new Set(STUDENTS.map((s) => s.group))], []);

  const kpis = useMemo(() => {
    const ids = filteredStudents.map((s) => s.id);
    if (ids.length === 0) {
      return { total: 0, avg: 0, excellent: 0, attention: 0 };
    }
    const scores = ids.map((id) => computeCourseTotal(id, activeCourse));
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / scores.length);
    const excellent = scores.filter((t) => t >= 90).length;
    const attention = scores.filter((t) => t < 70).length;
    return { total: filteredStudents.length, avg, excellent, attention };
  }, [filteredStudents, activeCourse]);

  const epaRadarOption = useMemo(() => {
    if (!selectedStudent) return null;
    const primary = '#4361EE';
    return {
      color: [primary],
      tooltip: { trigger: 'item' as const },
      radar: {
        shape: 'polygon' as const,
        splitNumber: 4,
        radius: '68%',
        axisName: { color: 'var(--text-secondary)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'var(--border-main)' } },
        splitArea: { show: true, areaStyle: { color: ['rgba(67,97,238,0.04)', 'rgba(67,97,238,0.08)'] } },
        indicator: EPA_LIST.map((e) => ({ name: e.code, max: 4 })),
      },
      series: [
        {
          type: 'radar' as const,
          data: [
            {
              value: EPA_LIST.map((e) => selectedStudent.epaProgress[e.id]?.level ?? 0),
              name: selectedStudent.name,
              symbolSize: 5,
              lineStyle: { color: primary, width: 2 },
              areaStyle: {
                color: {
                  type: 'radial' as const,
                  x: 0.5,
                  y: 0.5,
                  r: 0.85,
                  colorStops: [
                    { offset: 0, color: 'rgba(67, 97, 238, 0.42)' },
                    { offset: 0.55, color: 'rgba(67, 97, 238, 0.12)' },
                    { offset: 1, color: 'rgba(67, 97, 238, 0.02)' },
                  ],
                },
              },
            },
          ],
        },
      ],
    };
  }, [selectedStudent]);

  const courseCompareOption = useMemo(() => {
    if (!selectedStudent) return null;
    const primary = '#4361EE';
    const data = ALL_COURSES.map((c) => {
      const raw = computeCourseTotal(selectedStudent.id, c);
      const max = computeMaxTotal(c);
      const pct = max > 0 ? Math.round((raw / max) * 100) : 0;
      return { raw, pct, short: c.shortName, max };
    });
    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (params: unknown) => {
          const p = (params as { dataIndex: number }[])[0];
          if (!p) return '';
          const row = data[p.dataIndex];
          return `${row.short}<br/>得分率 ${row.pct}%<br/>得分 ${row.raw} / ${row.max}`;
        },
      },
      grid: { left: 44, right: 12, top: 28, bottom: 36 },
      xAxis: {
        type: 'category' as const,
        data: data.map((d) => d.short),
        axisLabel: { fontSize: 10, rotate: 22, color: 'var(--text-secondary)' },
        axisLine: { lineStyle: { color: 'var(--border-main)' } },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: 100,
        axisLabel: { fontSize: 10, formatter: '{value}%', color: 'var(--text-muted)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: [
        {
          type: 'bar' as const,
          barMaxWidth: 22,
          data: data.map((d) => ({
            value: d.pct,
            itemStyle: {
              color: {
                type: 'linear' as const,
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: GRADE_COLOR(d.pct) },
                  { offset: 1, color: `${GRADE_COLOR(d.pct)}66` },
                ],
              },
              borderRadius: [6, 6, 0, 0],
            },
          })),
        },
      ],
    };
  }, [selectedStudent]);

  const growthOption = useMemo(() => {
    if (!selectedStudent) return null;
    const primary = '#4361EE';
    const weeks = selectedStudent.recentScores.map((_, i) => `W${i + 1}`);
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { top: 24, bottom: 28, left: 40, right: 12 },
      xAxis: {
        type: 'category' as const,
        data: weeks,
        axisLabel: { fontSize: 10, color: 'var(--text-muted)' },
        axisLine: { lineStyle: { color: 'var(--border-main)' } },
      },
      yAxis: {
        type: 'value' as const,
        min: 50,
        max: 100,
        axisLabel: { fontSize: 10, color: 'var(--text-muted)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: [
        {
          type: 'line' as const,
          data: selectedStudent.recentScores,
          smooth: true,
          symbol: 'circle' as const,
          symbolSize: 6,
          lineStyle: { color: primary, width: 2.5 },
          itemStyle: { color: primary, borderColor: '#fff', borderWidth: 1 },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(67, 97, 238, 0.35)' },
                { offset: 1, color: 'rgba(67, 97, 238, 0)' },
              ],
            },
          },
        },
      ],
    };
  }, [selectedStudent]);

  const selectedStudentRecords = useMemo(
    () => selectedStudent ? getRecordsByStudent(selectedStudent.id) : [],
    [selectedStudent],
  );

  const columns: TableColumnsType<Student> = useMemo(
    () => [
      {
        title: '学员',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (_: string, r: Student) => {
          const total = computeCourseTotal(r.id, activeCourse);
          const gc = GRADE_COLOR(total);
          return (
            <Space align="start" size={10}>
              <Avatar
                size={40}
                style={{
                  background: `linear-gradient(145deg, ${gc}, ${gc}cc)`,
                  fontWeight: 800,
                  fontSize: 15,
                  color: '#fff',
                  boxShadow: `0 4px 12px ${gc}40`,
                }}
              >
                {r.avatar}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-heading)', lineHeight: 1.25 }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {r.grade} · {r.group}
                </div>
              </div>
            </Space>
          );
        },
      },
      {
        title: '技能进度',
        key: 'skills',
        width: 210,
        render: (_: unknown, r: Student) => <SkillBars student={r} />,
      },
      {
        title: '训练',
        key: 'sessions',
        width: 64,
        align: 'center',
        render: (_: unknown, r: Student) => (
          <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-heading)' }}>{r.sessionsCount}</span>
        ),
      },
      {
        title: '出勤',
        dataIndex: 'attendance',
        key: 'attendance',
        width: 108,
        render: (v: number) => (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {Math.round(v * 100)}%
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 4,
                background: 'var(--border-main)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(v * 100)}%`,
                  height: '100%',
                  borderRadius: 4,
                  background: v >= 0.9 ? 'var(--success)' : 'var(--warning)',
                }}
              />
            </div>
          </div>
        ),
      },
      {
        title: '成绩趋势',
        key: 'trend',
        width: 112,
        align: 'center',
        render: (_: unknown, r: Student) => {
          const total = computeCourseTotal(r.id, activeCourse);
          return <SparklineCell scores={r.recentScores} accent={GRADE_COLOR(total)} />;
        },
      },
      {
        title: '课程得分',
        key: 'score',
        width: 118,
        align: 'center',
        render: (_: unknown, r: Student) => {
          const total = computeCourseTotal(r.id, activeCourse);
          const gc = GRADE_COLOR(total);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 900, color: gc, fontSize: 18, lineHeight: 1 }}>{total}</span>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: `${gc}22`,
                  color: gc,
                  border: `1px solid ${gc}44`,
                }}
              >
                {GRADE_LABEL(total)}
              </span>
            </div>
          );
        },
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        align: 'center',
        render: (_: unknown, r: Student) => (
          <Button
            type="primary"
            size="small"
            style={{
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 12,
              height: 30,
              paddingInline: 12,
              background: 'var(--primary)',
              boxShadow: 'var(--shadow-primary)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStudent(r);
            }}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [activeCourse],
  );

  const classAvgFiltered = useMemo(
    () => computeClassAvg(activeCourse, filteredStudents.map((s) => s.id)),
    [activeCourse, filteredStudents],
  );

  return (
    <div
      style={{
        ['--primary' as string]: '#4361EE',
        minHeight: '100%',
      }}
    >
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 18,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0, color: 'var(--text-heading)', fontWeight: 800, fontSize: 20 }}>
              <TeamOutlined style={{ marginRight: 10, color: 'var(--primary)' }} />
              学员管理
            </Title>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              筛选与对比学员过程性表现 · 当前课程班级均分{' '}
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{classAvgFiltered}</span> 分
            </Text>
          </div>
        </div>

        <motion.div variants={kpiContainer} initial="hidden" animate="visible" style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            {[
              { label: '学员人数', value: kpis.total, unit: '人', icon: <TeamOutlined />, tone: 'var(--primary)' },
              { label: '平均得分', value: kpis.avg, unit: '分', icon: <BarChartOutlined />, tone: GRADE_COLOR(kpis.avg) },
              { label: '优秀 (≥90)', value: kpis.excellent, unit: '人', icon: <TrophyOutlined />, tone: 'var(--success)' },
              { label: '需关注 (<70)', value: kpis.attention, unit: '人', icon: <LineChartOutlined />, tone: 'var(--danger)' },
            ].map((k) => (
              <Col xs={12} sm={12} md={6} key={k.label}>
                <motion.div variants={kpiItem}>
                  <div
                    style={{
                      borderRadius: 14,
                      padding: '14px 16px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-main)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{k.label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-heading)' }}>{k.value}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.unit}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        display: 'grid',
                        placeItems: 'center',
                        background: `${k.tone}18`,
                        color: k.tone,
                        fontSize: 20,
                      }}
                    >
                      {k.icon}
                    </div>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Card
              variant="borderless"
              style={{
                borderRadius: 14,
                border: '1px solid var(--border-main)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
              }}
              styles={{ body: { padding: 0 } }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-light)',
                  background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-card) 100%)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Space size={8} wrap>
                  <UserOutlined style={{ color: 'var(--primary)', fontSize: 16 }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-heading)' }}>学员列表</span>
                  <Tag style={{ margin: 0, borderRadius: 8, border: 'none', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    {filteredStudents.length} 人
                  </Tag>
                </Space>
                <Space size={10} wrap>
                  <Input
                    allowClear
                    placeholder="搜索姓名"
                    prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
                    style={{ width: 200, borderRadius: 10, height: 34 }}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  <Select
                    value={groupFilter}
                    onChange={setGroupFilter}
                    style={{ width: 120, height: 34 }}
                    options={[{ value: 'all', label: '全部分组' }, ...groups.map((g) => ({ value: g, label: g }))]}
                  />
                  <Select
                    value={activeCourseId}
                    onChange={setActiveCourseId}
                    style={{ minWidth: 160, height: 34 }}
                    options={ALL_COURSES.map((c) => ({ value: c.id, label: c.shortName }))}
                  />
                </Space>
              </div>
              <div style={{ padding: '8px 12px 12px' }}>
                <Table<Student>
                  dataSource={filteredStudents}
                  columns={columns}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  scroll={{ x: 980 }}
                  onRow={(record) => ({
                    onClick: () => setSelectedStudent(record),
                    style: { cursor: 'pointer' },
                  })}
                  rowClassName={(record) => (selectedStudent?.id === record.id ? 'ant-table-row-selected' : '')}
                />
              </div>
            </Card>
          </div>

          <AnimatePresence mode="popLayout">
            {selectedStudent && (
              <motion.aside
                key={selectedStudent.id}
                {...panelMotion}
                style={{
                  width: 420,
                  flexShrink: 0,
                  maxWidth: '100%',
                  position: 'sticky',
                  top: 0,
                  alignSelf: 'flex-start',
                }}
              >
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 14,
                    border: '1px solid var(--border-main)',
                    boxShadow: 'var(--shadow-lg)',
                    maxHeight: 'calc(100vh - 120px)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  styles={{ body: { padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
                  title={
                    <Space>
                      <RadarChartOutlined style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 800 }}>学员详情</span>
                    </Space>
                  }
                  extra={
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => setSelectedStudent(null)}
                      style={{ color: 'var(--text-muted)' }}
                    />
                  }
                >
                  <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
                    {(() => {
                      const total = computeCourseTotal(selectedStudent.id, activeCourse);
                      const gc = GRADE_COLOR(total);
                      return (
                        <>
                          <div
                            style={{
                              borderRadius: 14,
                              padding: 16,
                              background: 'linear-gradient(135deg, var(--bg-secondary), #fff)',
                              border: '1px solid var(--border-light)',
                              marginBottom: 16,
                            }}
                          >
                            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                              <Avatar
                                size={72}
                                style={{
                                  background: `linear-gradient(145deg, ${gc}, ${gc}aa)`,
                                  fontWeight: 900,
                                  fontSize: 28,
                                  color: '#fff',
                                  boxShadow: `0 8px 24px ${gc}45`,
                                }}
                              >
                                {selectedStudent.avatar}
                              </Avatar>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-heading)' }}>
                                  {selectedStudent.name}
                                </div>
                                <Space wrap size={[6, 6]} style={{ marginTop: 8 }}>
                                  <Tag style={{ borderRadius: 8, margin: 0 }}>{selectedStudent.grade}</Tag>
                                  <Tag style={{ borderRadius: 8, margin: 0, color: 'var(--primary)', borderColor: 'var(--primary-light)', background: 'var(--primary-light)' }}>
                                    {selectedStudent.group}
                                  </Tag>
                                  <Tag
                                    style={{
                                      borderRadius: 999,
                                      margin: 0,
                                      fontWeight: 700,
                                      border: 'none',
                                      background: `${gc}22`,
                                      color: gc,
                                    }}
                                  >
                                    {GRADE_LABEL(total)} · {total} 分
                                  </Tag>
                                </Space>
                              </div>
                            </div>
                            <Row gutter={[10, 10]} style={{ marginTop: 14 }}>
                              {[
                                { k: '训练次数', v: `${selectedStudent.sessionsCount} 次` },
                                { k: '训练时长', v: `${selectedStudent.practiceHours} h` },
                                { k: '出勤率', v: `${Math.round(selectedStudent.attendance * 100)}%` },
                                { k: '专注度', v: `${Math.round(selectedStudent.avgAttention * 100)}%` },
                                { k: '参与度', v: `${Math.round(selectedStudent.avgEngagement * 100)}%` },
                                { k: '知识掌握', v: `${Math.round(selectedStudent.knowledgeMastery * 100)}%` },
                                { k: '干预次数', v: `${selectedStudent.interventions} 次` },
                                {
                                  k: '本课程得分',
                                  v: `${total}（${activeCourse.shortName}）`,
                                },
                              ].map((row) => (
                                <Col span={12} key={row.k}>
                                  <div
                                    style={{
                                      borderRadius: 10,
                                      padding: '8px 10px',
                                      background: 'var(--bg-card)',
                                      border: '1px solid var(--border-light)',
                                    }}
                                  >
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.k}</div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-heading)', marginTop: 2 }}>
                                      {row.v}
                                    </div>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          </div>

                          <div style={{ marginBottom: 8, fontWeight: 800, fontSize: 13, color: 'var(--text-heading)' }}>
                            <TrophyOutlined style={{ marginRight: 6, color: 'var(--primary)' }} />
                            EPA 能力雷达
                          </div>
                          {epaRadarOption && (
                            <ReactECharts option={epaRadarOption} style={{ height: 240 }} opts={{ renderer: 'svg' }} />
                          )}

                          <div style={{ margin: '12px 0 8px', fontWeight: 800, fontSize: 13, color: 'var(--text-heading)' }}>
                            <BarChartOutlined style={{ marginRight: 6, color: 'var(--primary)' }} />
                            多课程得分率对比
                          </div>
                          {courseCompareOption && (
                            <ReactECharts option={courseCompareOption} style={{ height: 260 }} opts={{ renderer: 'svg' }} />
                          )}

                          <div style={{ margin: '12px 0 8px', fontWeight: 800, fontSize: 13, color: 'var(--text-heading)' }}>
                            <LineChartOutlined style={{ marginRight: 6, color: 'var(--primary)' }} />
                            近期成绩走势
                          </div>
                          {growthOption && (
                            <ReactECharts option={growthOption} style={{ height: 200 }} opts={{ renderer: 'svg' }} />
                          )}

                          <div style={{ margin: '12px 0 10px', fontWeight: 800, fontSize: 13, color: 'var(--text-heading)' }}>
                            EPA 里程碑进展
                          </div>
                          <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            {EPA_LIST.map((epa) => {
                              const progress = selectedStudent.epaProgress[epa.id];
                              const level = progress?.level ?? 0;
                              const pct = level * 25;
                              const meta = LEVEL_TAG_STYLE[level] ?? LEVEL_TAG_STYLE[0];
                              const ms = epa.milestones.find((m) => m.level === level);
                              return (
                                <div
                                  key={epa.id}
                                  style={{
                                    borderRadius: 12,
                                    padding: '10px 12px',
                                    border: '1px solid var(--border-main)',
                                    background: 'var(--bg-secondary)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-heading)' }}>{epa.code}</span>
                                    <Tag
                                      style={{
                                        margin: 0,
                                        borderRadius: 8,
                                        border: 'none',
                                        fontWeight: 700,
                                        background: meta.bg,
                                        color: meta.text,
                                      }}
                                    >
                                      L{level}
                                    </Tag>
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.45 }}>
                                    {ms?.label ?? '—'} · {ms?.criteria?.slice(0, 48) ?? ''}
                                    {(ms?.criteria?.length ?? 0) > 48 ? '…' : ''}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--border-main)', overflow: 'hidden' }}>
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                        style={{ height: '100%', borderRadius: 999, background: meta.text }}
                                      />
                                    </div>
                                    <Text style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>
                                      {pct}%
                                    </Text>
                                  </div>
                                </div>
                              );
                            })}
                          </Space>
                          {selectedStudentRecords.length > 0 && (
                            <>
                              <div style={{ margin: '16px 0 8px', fontWeight: 800, fontSize: 13, color: 'var(--text-heading)' }}>
                                <LineChartOutlined style={{ marginRight: 6, color: '#7C3AED' }} />
                                历史成绩趋势
                              </div>
                              <ReactECharts
                                option={{
                                  tooltip: { trigger: 'axis' as const },
                                  grid: { top: 16, bottom: 24, left: 36, right: 12 },
                                  xAxis: {
                                    type: 'category' as const,
                                    data: selectedStudentRecords.map((_, i) => `#${i + 1}`),
                                    axisLabel: { fontSize: 9, color: 'var(--text-muted)' },
                                    axisLine: { lineStyle: { color: 'var(--border-main)' } },
                                  },
                                  yAxis: {
                                    type: 'value' as const, min: 75, max: 100,
                                    axisLabel: { fontSize: 9, color: 'var(--text-muted)' },
                                    splitLine: { lineStyle: { color: 'var(--border-light)' } },
                                  },
                                  series: [{
                                    type: 'line' as const,
                                    data: selectedStudentRecords.map(r => r.totalScore),
                                    smooth: true,
                                    symbol: 'circle' as const,
                                    symbolSize: 8,
                                    lineStyle: { color: '#7C3AED', width: 2.5 },
                                    itemStyle: { color: '#7C3AED', borderColor: '#fff', borderWidth: 1.5 },
                                    areaStyle: {
                                      color: {
                                        type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
                                        colorStops: [
                                          { offset: 0, color: 'rgba(124,58,237,0.3)' },
                                          { offset: 1, color: 'rgba(124,58,237,0)' },
                                        ],
                                      },
                                    },
                                  }],
                                  animationDuration: 600,
                                }}
                                style={{ height: 160 }}
                                opts={{ renderer: 'svg' }}
                              />

                              <div style={{ margin: '12px 0 10px', fontWeight: 800, fontSize: 13, color: 'var(--text-heading)' }}>
                                <HistoryOutlined style={{ marginRight: 6, color: '#7C3AED' }} />
                                训练档案
                                <Tag color="purple" style={{ marginLeft: 8, border: 'none', fontSize: 10, fontWeight: 600 }}>{selectedStudentRecords.length} 条</Tag>
                              </div>
                              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                {selectedStudentRecords.map((rec) => {
                                  const gc = GRADE_COLOR(rec.totalScore);
                                  return (
                                    <div
                                      key={rec.id}
                                      style={{
                                        borderRadius: 12,
                                        padding: '10px 12px',
                                        border: `1px solid ${gc}20`,
                                        background: `${gc}06`,
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <Space size={6}>
                                          <VideoCameraOutlined style={{ color: gc, fontSize: 13 }} />
                                          <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-heading)' }}>{rec.procedure}</span>
                                        </Space>
                                        <span style={{ fontWeight: 900, fontSize: 15, color: gc }}>{rec.totalScore}<span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>分</span></span>
                                      </div>
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{rec.analysisDate} · {rec.duration}</div>
                                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {rec.dimensionScores.slice(0, 3).map((d, di) => (
                                          <div key={di} style={{ flex: 1, minWidth: 60 }}>
                                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{d.label.slice(0, 4)}</div>
                                            <div style={{ height: 4, borderRadius: 2, background: 'var(--border-main)', overflow: 'hidden' }}>
                                              <div style={{ width: `${Math.round(d.score / d.maxScore * 100)}%`, height: '100%', background: gc, borderRadius: 2 }} />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </Space>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </Card>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentManagement;
