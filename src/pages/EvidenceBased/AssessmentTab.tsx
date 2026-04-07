import React, { useMemo } from 'react';
import { Card, Row, Col, Tag, Progress, Typography, Descriptions } from 'antd';
import {
  FundOutlined,
  FileSearchOutlined,
  AimOutlined,
  BulbOutlined,
  LineChartOutlined,
  TableOutlined,
  SafetyCertificateOutlined,
  PieChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { build3DSurfaceOption } from '@/utils/echarts3d';
import { ALL_COURSES, STUDENTS, EPA_LIST } from '@/data';
import { GRADE_COLOR, GRADE_LABEL, LEVEL_META } from '@/types';
import { computeCourseTotal, computeClassAvg, computeMaxTotal } from '@/utils/algorithms';
import { CHART_COLORS, glassCard } from '@/utils/chartTheme';
import AIInsightCard from '@/components/AIInsightCard';

const { Title, Text, Paragraph } = Typography;

const PALETTE = {
  primary: '#4361EE',
  success: '#05CD99',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#7C3AED',
  sky: '#0EA5E9',
} as const;

const CARD_STYLE: React.CSSProperties = { borderRadius: 14 };

const CARD_ENTER = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: 'easeOut' as const },
  }),
};

const KIRKPATRICK_DATA = [
  {
    level: 'L1 反应',
    subs: [
      { name: '满意度', value: 82, color: PALETTE.primary },
      { name: '参与度', value: 76, color: '#5B7BF0' },
      { name: '资源质量', value: 80, color: '#7B95F4' },
    ],
  },
  {
    level: 'L2 学习',
    subs: [
      { name: '知识增长', value: 85, color: PALETTE.success },
      { name: '技能提升', value: 78, color: '#2DD8AD' },
      { name: '态度转变', value: 72, color: '#55E3C1' },
    ],
  },
  {
    level: 'L3 行为',
    subs: [
      { name: '行为迁移', value: 74, color: PALETTE.warning },
      { name: '情境应用', value: 68, color: '#F7B13C' },
    ],
  },
  {
    level: 'L4 结果',
    subs: [
      { name: '患者安全', value: 70, color: PALETTE.purple },
      { name: '效率提升', value: 62, color: '#9361F0' },
    ],
  },
] as const;

const BLOOM_TREEMAP_DATA = [
  {
    name: '记忆',
    value: 15,
    itemStyle: { color: '#EF4444', borderColor: '#fff', borderWidth: 2 },
    children: [
      { name: '术语辨识', value: 6, itemStyle: { color: '#F87171' } },
      { name: '流程复述', value: 5, itemStyle: { color: '#FCA5A5' } },
      { name: '要点回忆', value: 4, itemStyle: { color: '#FECACA' } },
    ],
  },
  {
    name: '理解',
    value: 20,
    itemStyle: { color: '#F59E0B', borderColor: '#fff', borderWidth: 2 },
    children: [
      { name: '原理解释', value: 8, itemStyle: { color: '#FBBF24' } },
      { name: '步骤归纳', value: 7, itemStyle: { color: '#FCD34D' } },
      { name: '概念对比', value: 5, itemStyle: { color: '#FDE68A' } },
    ],
  },
  {
    name: '应用',
    value: 25,
    itemStyle: { color: '#05CD99', borderColor: '#fff', borderWidth: 2 },
    children: [
      { name: '标准操作', value: 10, itemStyle: { color: '#34D399' } },
      { name: '情境迁移', value: 9, itemStyle: { color: '#6EE7B7' } },
      { name: '工具使用', value: 6, itemStyle: { color: '#A7F3D0' } },
    ],
  },
  {
    name: '分析',
    value: 20,
    itemStyle: { color: '#4361EE', borderColor: '#fff', borderWidth: 2 },
    children: [
      { name: '鉴别诊断', value: 8, itemStyle: { color: '#6B87F1' } },
      { name: '数据解读', value: 7, itemStyle: { color: '#93ADF4' } },
      { name: '误差分析', value: 5, itemStyle: { color: '#BDD3F7' } },
    ],
  },
  {
    name: '评价',
    value: 12,
    itemStyle: { color: '#7C3AED', borderColor: '#fff', borderWidth: 2 },
    children: [
      { name: '质量判断', value: 5, itemStyle: { color: '#9B6CF0' } },
      { name: '方案评估', value: 4, itemStyle: { color: '#BA9EF3' } },
      { name: '同伴互评', value: 3, itemStyle: { color: '#D9D0F6' } },
    ],
  },
  {
    name: '创造',
    value: 8,
    itemStyle: { color: '#0EA5E9', borderColor: '#fff', borderWidth: 2 },
    children: [
      { name: '方案设计', value: 4, itemStyle: { color: '#38BDF8' } },
      { name: '流程优化', value: 3, itemStyle: { color: '#7DD3FC' } },
      { name: '创新实践', value: 1, itemStyle: { color: '#BAE6FD' } },
    ],
  },
] as const;

const KPI_ITEMS = [
  { label: '证据质量综合分', value: 82, color: PALETTE.primary, icon: <FundOutlined /> },
  { label: '可追溯证据条目', value: 42, color: PALETTE.success, icon: <FileSearchOutlined /> },
  { label: 'EPA 能力覆盖度', value: 75, color: PALETTE.warning, icon: <AimOutlined /> },
  { label: 'Bloom 高阶认知占比', value: 45, color: PALETTE.purple, icon: <BulbOutlined /> },
] as const;

const AssessmentTab: React.FC = () => {
  const epaKeys = useMemo(() => {
    const first = STUDENTS[0];
    return Object.keys(first.epaProgress).sort(
      (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')),
    );
  }, []);

  const epaShortLabels = useMemo(
    () => epaKeys.map(k => `EPA-${k.replace(/\D/g, '')}`),
    [epaKeys],
  );

  const heatmapMatrix = useMemo(() => {
    const data: [number, number, number][] = [];
    STUDENTS.forEach((s, yi) => {
      epaKeys.forEach((ek, xi) => {
        const level = s.epaProgress[ek as keyof typeof s.epaProgress]?.level ?? 1;
        const coverage = level * 25;
        data.push([xi, yi, coverage]);
      });
    });
    return data;
  }, [epaKeys]);

  const gaugeOptions = useMemo(
    () =>
      KPI_ITEMS.map(kpi => ({
        backgroundColor: 'transparent',
        series: [
          {
            type: 'gauge' as const,
            startAngle: 220,
            endAngle: -40,
            min: 0,
            max: 100,
            radius: '90%',
            progress: {
              show: true,
              width: 12,
              roundCap: true,
              itemStyle: {
                color: {
                  type: 'linear' as const,
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: `${kpi.color}99` },
                    { offset: 1, color: kpi.color },
                  ],
                },
              },
            },
            axisLine: {
              lineStyle: { width: 12, color: [[1, '#e2e8f0']] },
              roundCap: true,
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            pointer: { show: false },
            anchor: { show: false },
            title: { show: false },
            detail: {
              valueAnimation: true,
              fontSize: 22,
              fontWeight: 800 as const,
              color: kpi.color,
              offsetCenter: [0, '10%'],
              formatter: '{value}',
            },
            data: [{ value: kpi.value }],
            animationDuration: 1500,
            animationEasing: 'bounceOut' as const,
          },
        ],
      })),
    [],
  );

  const polarOption = useMemo(() => {
    const maxSubs = Math.max(...KIRKPATRICK_DATA.map(d => d.subs.length));
    const angleData = KIRKPATRICK_DATA.map(d => d.level);

    const seriesList = Array.from({ length: maxSubs }, (_, si) => ({
      type: 'bar' as const,
      coordinateSystem: 'polar' as const,
      name: si === 0 ? '子维度 1' : si === 1 ? '子维度 2' : '子维度 3',
      stack: 'kirk' as const,
      data: KIRKPATRICK_DATA.map(d => {
        const sub = d.subs[si];
        return sub
          ? {
              value: sub.value,
              itemStyle: {
                color: {
                  type: 'linear' as const,
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: sub.color },
                    { offset: 1, color: `${sub.color}88` },
                  ],
                },
              },
            }
          : { value: 0 };
      }),
      barWidth: '50%',
      emphasis: { focus: 'series' as const },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: { seriesIndex?: number; dataIndex?: number; value?: number }) => {
          const di = p.dataIndex ?? 0;
          const si = p.seriesIndex ?? 0;
          const level = KIRKPATRICK_DATA[di];
          const sub = level?.subs[si];
          if (!sub) return '';
          return `<b>${level.level}</b><br/>${sub.name}：${sub.value} 分`;
        },
      },
      polar: { radius: ['18%', '80%'] },
      radiusAxis: {
        type: 'value' as const,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' as const } },
      },
      angleAxis: {
        type: 'category' as const,
        data: angleData,
        startAngle: 90,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { fontSize: 11, color: '#334155', fontWeight: 600 as const },
      },
      series: seriesList,
      animationDuration: 1200,
      animationEasing: 'cubicOut' as const,
    };
  }, []);

  const treemapOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: { name?: string; value?: number; treePathInfo?: { name: string }[] }) => {
          const path = p.treePathInfo?.map(n => n.name).filter(Boolean).join(' → ') ?? p.name;
          return `<b>${path}</b><br/>占比：${p.value}%`;
        },
      },
      series: [
        {
          type: 'treemap' as const,
          roam: false,
          nodeClick: 'zoomToNode' as const,
          emphasis: {
            itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.2)' },
          },
          breadcrumb: {
            show: true,
            top: 4,
            itemStyle: { color: '#f1f5f9', borderColor: '#cbd5e1', textStyle: { color: '#334155', fontSize: 11 } },
          },
          label: {
            show: true,
            formatter: '{b}\n{c}%',
            fontSize: 12,
            fontWeight: 600 as const,
            color: '#fff',
          },
          upperLabel: {
            show: true,
            height: 24,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700 as const,
            backgroundColor: 'transparent',
          },
          itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
          levels: [
            {
              itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 3 },
              upperLabel: { show: true },
            },
            {
              itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
              colorSaturation: [0.4, 0.8],
            },
          ],
          data: BLOOM_TREEMAP_DATA as unknown as Record<string, unknown>[],
          animationDuration: 1000,
          animationEasing: 'cubicOut' as const,
        },
      ],
    }),
    [],
  );

  const evidenceHeatmapOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top' as const,
        formatter: (p: { data: [number, number, number] }) => {
          const [xi, yi, v] = p.data;
          const sn = STUDENTS[yi]?.name ?? '';
          const ep = epaShortLabels[xi] ?? '';
          const epaItem = EPA_LIST.find(e => e.code === ep);
          return `<b>${sn}</b> · <b>${ep}</b>${epaItem ? ` ${epaItem.name}` : ''}<br/>证据覆盖度：<b>${v}%</b><br/>里程碑等级：Level ${v / 25}`;
        },
      },
      grid: { left: 72, right: 64, top: 52, bottom: 56, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: epaShortLabels,
        splitArea: { show: true, areaStyle: { color: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.1)'] } },
        axisLabel: { fontSize: 10, rotate: 0, color: '#475569', fontWeight: 600 as const },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'category' as const,
        data: STUDENTS.map(s => s.name),
        splitArea: { show: true, areaStyle: { color: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.1)'] } },
        axisLabel: { fontSize: 11, color: '#334155', fontWeight: 500 as const },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'vertical' as const,
        right: 4,
        top: 'middle' as const,
        text: ['充分', '不足'],
        textStyle: { fontSize: 10, color: '#64748b' },
        inRange: {
          color: ['#fef2f2', '#fde68a', '#86efac', '#4ade80', '#22c55e', '#059669'],
        },
        dimension: 2 as const,
      },
      series: [
        {
          name: '证据充分性',
          type: 'heatmap' as const,
          data: heatmapMatrix,
          label: {
            show: true,
            fontSize: 10,
            fontWeight: 700 as const,
            color: '#1e293b',
            formatter: (p: { data: [number, number, number] }) => `${p.data[2]}`,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(67, 97, 238, 0.4)',
              borderColor: PALETTE.primary,
              borderWidth: 2,
            },
          },
          itemStyle: { borderColor: '#fff', borderWidth: 1, borderRadius: 3 },
        },
      ],
      animationDuration: 800,
    }),
    [epaShortLabels, heatmapMatrix],
  );

  const bloomLowPct = BLOOM_TREEMAP_DATA.slice(0, 3).reduce((a, b) => a + b.value, 0);
  const bloomHighPct = BLOOM_TREEMAP_DATA.slice(3).reduce((a, b) => a + b.value, 0);

  const surface3DOption = useMemo(() => {
    const course = ALL_COURSES[0];
    const dimLabels = course.rubric.map(d => d.label);
    const stuNames = STUDENTS.slice(0, 8).map(s => s.name);
    const data = stuNames.map((_n, si) => {
      const ev = course.evals[STUDENTS[si].id];
      return dimLabels.map((_, di) => {
        const score = ev?.scores[di] ?? 0;
        return Math.round((score / course.rubric[di].maxScore) * 100);
      });
    });
    return build3DSurfaceOption({ xLabels: dimLabels, yLabels: stuNames, data, title: '3D 学员能力曲面' });
  }, []);

  const epaGapData = useMemo(
    () =>
      EPA_LIST.map(epa => {
        const levels = STUDENTS.map(s => {
          const prog = s.epaProgress[epa.id];
          return prog ? prog.level : 1;
        });
        const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
        return {
          code: epa.code,
          name: epa.name,
          avgLevel: Math.round(avgLevel * 100) / 100,
          target: 4,
          gap: Math.round((4 - avgLevel) * 100) / 100,
        };
      }),
    [],
  );

  const epaGapChartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
      },
      legend: {
        data: ['当前平均等级', '目标等级'],
        top: 4,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: 50, right: 30, top: 40, bottom: 30 },
      xAxis: {
        type: 'category' as const,
        data: epaGapData.map(d => d.code),
        axisLabel: { fontSize: 11, color: '#334155', fontWeight: 600 as const },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value' as const,
        max: 5,
        interval: 1,
        axisLabel: { fontSize: 11, color: '#64748b', formatter: 'L{value}' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: '当前平均等级',
          type: 'bar' as const,
          data: epaGapData.map(d => ({
            value: d.avgLevel,
            itemStyle: {
              color: d.avgLevel >= 3 ? PALETTE.success : d.avgLevel >= 2 ? PALETTE.warning : PALETTE.danger,
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barGap: '20%',
          barWidth: '28%',
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 10,
            color: '#475569',
            formatter: (p: { value: number }) => p.value.toFixed(1),
          },
        },
        {
          name: '目标等级',
          type: 'bar' as const,
          data: epaGapData.map(() => ({
            value: 4,
            itemStyle: { color: '#e2e8f0', borderRadius: [4, 4, 0, 0] },
          })),
          barWidth: '28%',
        },
      ],
      animationDuration: 1000,
      animationEasing: 'cubicOut' as const,
    }),
    [epaGapData],
  );

  const evidenceTypeData = useMemo(
    () => [
      { name: '视频证据', value: 35, color: PALETTE.primary },
      { name: '操作记录', value: 25, color: PALETTE.success },
      { name: '同伴评价', value: 15, color: PALETTE.warning },
      { name: '自我反思', value: 12, color: PALETTE.purple },
      { name: '导师评价', value: 13, color: PALETTE.sky },
    ],
    [],
  );

  const evidencePieOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: { name?: string; value?: number; percent?: number }) =>
          `<b>${p.name}</b><br/>占比：${p.percent?.toFixed(1)}%<br/>条目：${p.value}`,
      },
      legend: {
        orient: 'vertical' as const,
        right: 20,
        top: 'middle' as const,
        textStyle: { fontSize: 12, color: '#475569' },
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['40%', '72%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#334155' },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 700 as const },
            itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.15)' },
          },
          data: evidenceTypeData.map(d => ({
            value: d.value,
            name: d.name,
            itemStyle: { color: d.color },
          })),
        },
      ],
      animationDuration: 1000,
      animationEasing: 'cubicOut' as const,
    }),
    [evidenceTypeData],
  );

  const evidenceCompleteness = useMemo(
    () =>
      STUDENTS.map(s => {
        const eKeys = Object.keys(s.epaProgress);
        const totalLvl = eKeys.reduce((sum, k) => sum + (s.epaProgress[k]?.level ?? 0), 0);
        const maxLvl = eKeys.length * 4;
        return { name: s.name, completeness: Math.round((totalLvl / maxLvl) * 100) };
      }),
    [],
  );

  const trajectoryOption = useMemo(() => {
    const weeks = ['当前', '第1周', '第2周', '第3周', '第4周'];
    const colors = [
      PALETTE.primary, PALETTE.success, PALETTE.warning, PALETTE.danger,
      PALETTE.purple, PALETTE.sky, '#F97316', '#EC4899',
    ];
    const rates = [0.18, 0.15, 0.20, 0.12, 0.16, 0.14, 0.22, 0.17];

    const seriesList = EPA_LIST.map((epa, i) => {
      const avgLevel =
        STUDENTS.reduce((s, st) => {
          const prog = st.epaProgress[epa.id];
          return s + (prog ? prog.level : 1);
        }, 0) / STUDENTS.length;
      const data = weeks.map((_, wi) =>
        Math.min(4, Math.round((avgLevel + rates[i] * wi) * 100) / 100),
      );
      return {
        name: epa.code,
        type: 'line' as const,
        smooth: true,
        data,
        symbol: 'circle' as const,
        symbolSize: 6,
        lineStyle: { width: 2.5, color: colors[i % colors.length] },
        itemStyle: { color: colors[i % colors.length] },
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' as const },
      legend: {
        data: EPA_LIST.map(e => e.code),
        top: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: 50, right: 30, top: 40, bottom: 30 },
      xAxis: {
        type: 'category' as const,
        data: weeks,
        axisLabel: { fontSize: 11, color: '#334155' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: 4.5,
        interval: 1,
        axisLabel: { fontSize: 11, color: '#64748b', formatter: 'L{value}' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: seriesList,
      animationDuration: 1500,
      animationEasing: 'cubicOut' as const,
    };
  }, []);

  const trajectoryAnalysis = useMemo(() => {
    const rates = [0.18, 0.15, 0.20, 0.12, 0.16, 0.14, 0.22, 0.17];
    return EPA_LIST.map((epa, i) => {
      const avgLevel =
        STUDENTS.reduce((s, st) => {
          const prog = st.epaProgress[epa.id];
          return s + (prog ? prog.level : 1);
        }, 0) / STUDENTS.length;
      const weeksToTarget = avgLevel >= 4 ? 0 : Math.ceil((4 - avgLevel) / rates[i]);
      return { code: epa.code, name: epa.name, avgLevel: Math.round(avgLevel * 100) / 100, weeksToTarget };
    });
  }, []);

  return (
    <div style={{ ['--primary' as string]: '#4361EE', ['--text-heading' as string]: '#2B3674' }}>
      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={0}>
        <div
          style={{
            marginBottom: 16,
            padding: '16px 20px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #4361EE08 0%, #05CD9908 100%)',
            border: '1px solid var(--border-light, #e2e8f0)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <div>
              <Tag color="processing" style={{ marginBottom: 6 }}>数据来源</Tag>
              <Title level={5} style={{ margin: 0, color: 'var(--text-heading, #2B3674)' }}>
                循证评估数据集
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                聚合 {ALL_COURSES.length} 门课程 · {STUDENTS.length} 名学员 · EPA 矩阵与过程性证据
              </Text>
            </div>
            <Text style={{ fontSize: 12, color: 'var(--text-muted, #94A3B8)' }}>
              最近更新：教学周第 8 周
            </Text>
          </div>
          <Row gutter={[12, 12]}>
            {KPI_ITEMS.map((kpi, idx) => (
              <Col xs={24} sm={12} lg={6} key={kpi.label}>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={CARD_ENTER}
                  custom={idx * 0.5}
                >
                  <div
                    style={{
                      background: 'var(--bg-card, #fff)',
                      borderRadius: 14,
                      padding: '10px 12px',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: '0 0 80px', height: 80 }}>
                      <ReactECharts
                        option={gaugeOptions[idx]}
                        style={{ height: 80, width: 80 }}
                        opts={{ renderer: 'svg' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted, #94A3B8)', marginBottom: 2 }}>
                        {kpi.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: kpi.color,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{kpi.icon}</span>
                        <span>
                          {kpi.value >= 80 ? '优秀' : kpi.value >= 60 ? '良好' : '待提升'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </motion.div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={1}>
            <Card
              title={
                <span>
                  <LineChartOutlined style={{ marginRight: 8, color: PALETTE.primary }} />
                  Kirkpatrick 四层次极坐标评估
                </span>
              }
              style={CARD_STYLE}
              styles={{ body: { padding: 16 } }}
            >
              <ReactECharts
                option={polarOption}
                style={{ height: 380 }}
                opts={{ renderer: 'canvas' }}
                notMerge
                lazyUpdate
              />
              <Descriptions
                column={{ xs: 1, sm: 2 }}
                size="small"
                style={{ marginTop: 8 }}
                labelStyle={{ fontSize: 12, color: '#64748b' }}
              >
                {KIRKPATRICK_DATA.map(level => (
                  <Descriptions.Item
                    key={level.level}
                    label={<Text strong style={{ fontSize: 12 }}>{level.level}</Text>}
                  >
                    {level.subs.map(sub => (
                      <Tag key={sub.name} color={sub.color} style={{ fontSize: 10, marginBottom: 2 }}>
                        {sub.name} {sub.value}
                      </Tag>
                    ))}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} xl={12}>
          <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={2}>
            <Card
              title={
                <span>
                  <BulbOutlined style={{ marginRight: 8, color: PALETTE.purple }} />
                  Bloom 认知分类矩阵图
                </span>
              }
              style={CARD_STYLE}
              styles={{ body: { padding: 16 } }}
            >
              <ReactECharts
                option={treemapOption}
                style={{ height: 340 }}
                opts={{ renderer: 'canvas' }}
                notMerge
                lazyUpdate
              />
              <div
                style={{
                  marginTop: 8,
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
              >
                <Text strong style={{ fontSize: 12, color: '#334155' }}>
                  高阶 vs 低阶认知
                </Text>
                <Row gutter={12} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 11 }}>低阶（记忆/理解/应用）</Text>
                    <Progress
                      percent={bloomLowPct}
                      strokeColor={PALETTE.primary}
                      size="small"
                      format={p => `${p}%`}
                    />
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 11 }}>高阶（分析/评价/创造）</Text>
                    <Progress
                      percent={bloomHighPct}
                      strokeColor={PALETTE.purple}
                      size="small"
                      format={p => `${p}%`}
                    />
                  </Col>
                </Row>
                <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: '#475569' }}>
                  点击矩阵块可下钻查看子分类。当前高阶认知合计 {bloomHighPct}%，建议增加基于真实病例的评判与方案设计类活动。
                </Paragraph>
              </div>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24}>
          <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={3}>
            <Card
              title={
                <span>
                  <TableOutlined style={{ marginRight: 8, color: PALETTE.warning }} />
                  证据充分性热力图（学员 × EPA）
                </span>
              }
              style={CARD_STYLE}
              styles={{ body: { padding: 16 } }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                单元格数值为基于里程碑达成度映射的证据覆盖度（%）；颜色越深表示该 EPA 上可验证证据越充分
              </Text>
              <ReactECharts
                option={evidenceHeatmapOption}
                style={{ height: 400 }}
                opts={{ renderer: 'canvas' }}
                notMerge
                lazyUpdate
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* 3D Surface Chart */}
      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={5}>
        <Card
          title={
            <span>
              <BulbOutlined style={{ marginRight: 8, color: PALETTE.purple }} />
              3D 学员能力曲面分析
            </span>
          }
          style={{ ...CARD_STYLE, marginTop: 16 }}
          styles={{ body: { padding: 16 } }}
        >
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            X轴为评分维度，Y轴为学员，Z轴为成绩百分比。可拖拽旋转查看不同角度
          </Text>
          <ReactECharts option={surface3DOption} style={{ height: 450 }} />
        </Card>
      </motion.div>

      {/* EPA Coverage Gap Analysis */}
      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={6} style={{ marginTop: 16 }}>
        <Card
          title={
            <span>
              <SafetyCertificateOutlined style={{ marginRight: 8, color: PALETTE.success }} />
              EPA 覆盖差距分析
            </span>
          }
          style={CARD_STYLE}
          styles={{ body: { padding: 16 } }}
        >
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            对比各 EPA 当前班级平均等级与目标等级（Level 4），识别能力缺口与优先改进方向
          </Text>
          <ReactECharts
            option={epaGapChartOption}
            style={{ height: 340 }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
          <div style={{ marginTop: 16 }}>
            <Title level={5} style={{ color: '#2B3674', marginBottom: 12 }}>各 EPA 差距详析</Title>
            {epaGapData.map((d, idx) => (
              <div
                key={d.code}
                style={{
                  padding: '10px 14px',
                  marginBottom: 8,
                  background: idx % 2 === 0 ? '#f8fafc' : '#fff',
                  borderRadius: 10,
                  border: '1px solid #f1f5f9',
                }}
              >
                <Row align="middle" gutter={8}>
                  <Col flex="auto">
                    <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                      {d.code} · {d.name}
                    </Text>
                  </Col>
                  <Col>
                    <Tag color={d.avgLevel >= 3 ? 'green' : d.avgLevel >= 2 ? 'orange' : 'red'}>
                      当前 L{d.avgLevel.toFixed(1)} / 目标 L4
                    </Tag>
                  </Col>
                </Row>
                <Row style={{ marginTop: 6 }}>
                  <Col span={24}>
                    <Progress
                      percent={Math.round((d.avgLevel / 4) * 100)}
                      strokeColor={d.avgLevel >= 3 ? PALETTE.success : d.avgLevel >= 2 ? PALETTE.warning : PALETTE.danger}
                      size="small"
                    />
                  </Col>
                </Row>
                <Paragraph style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                  差距：<Text strong>{d.gap.toFixed(1)}</Text> 级。
                  {d.gap <= 1
                    ? '接近目标水平，建议安排综合模拟考核，强化独立操作能力向指导级过渡。'
                    : d.gap <= 2
                    ? '存在中等差距，需增加带教实操频次，重点突破从协助级到独立级的瓶颈。'
                    : '差距较大，建议优先安排基础技能强化训练，确保观察级到协助级的扎实过渡。'}
                </Paragraph>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Evidence Quality Deep Dive */}
      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={7} style={{ marginTop: 16 }}>
        <Card
          title={
            <span>
              <PieChartOutlined style={{ marginRight: 8, color: PALETTE.primary }} />
              证据质量深度分析
            </span>
          }
          style={CARD_STYLE}
          styles={{ body: { padding: 16 } }}
        >
          <Paragraph style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, marginBottom: 16 }}>
            当前证据库共收集 <Text strong>42</Text> 条可追溯证据，覆盖 {EPA_LIST.length} 个 EPA 条目。
            整体证据质量评分为{' '}
            <Tag color={PALETTE.primary} style={{ margin: '0 4px' }}>82分 · 良好</Tag>，
            但各类型证据分布不够均衡，需加强多元化证据采集。
          </Paragraph>
          <ReactECharts
            option={evidencePieOption}
            style={{ height: 320 }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
          <div style={{ marginTop: 16 }}>
            <Title level={5} style={{ color: '#2B3674', marginBottom: 12 }}>学员证据完整度</Title>
            <Row gutter={[12, 12]}>
              {evidenceCompleteness.map(ec => (
                <Col xs={24} sm={12} key={ec.name}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #f1f5f9',
                      background: '#fff',
                    }}
                  >
                    <Row align="middle" gutter={8}>
                      <Col flex="auto">
                        <Text strong style={{ fontSize: 13 }}>{ec.name}</Text>
                      </Col>
                      <Col>
                        <Tag color={ec.completeness >= 70 ? 'green' : ec.completeness >= 50 ? 'orange' : 'red'}>
                          {ec.completeness}%
                        </Tag>
                      </Col>
                    </Row>
                    <Progress
                      percent={ec.completeness}
                      strokeColor={
                        ec.completeness >= 70
                          ? PALETTE.success
                          : ec.completeness >= 50
                          ? PALETTE.warning
                          : PALETTE.danger
                      }
                      size="small"
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </Col>
              ))}
            </Row>
            <div
              style={{
                marginTop: 14,
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <Paragraph style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 6 }}>
                <Text strong>常见证据缺口：</Text>
                同伴评价（15%）与自我反思（12%）占比偏低，建议在每次实操后增设结构化互评环节和反思日志填写要求。
              </Paragraph>
              <Paragraph style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 0 }}>
                <Text strong>改进建议：</Text>
                ① 引入标准化视频录制流程，确保每次操作均有视频存档；
                ② 在 LMS 中嵌入同伴互评模板，降低评价门槛；
                ③ 设置反思日志提醒机制，提升学员自主反思频率。
              </Paragraph>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Competency Development Trajectory */}
      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={8} style={{ marginTop: 16 }}>
        <Card
          title={
            <span>
              <RiseOutlined style={{ marginRight: 8, color: PALETTE.warning }} />
              能力发展轨迹预测
            </span>
          }
          style={CARD_STYLE}
          styles={{ body: { padding: 16 } }}
        >
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            基于当前等级与历史增长速率，预测各 EPA 在未来 4 周的发展轨迹（目标：全部达到 Level 4）
          </Text>
          <ReactECharts
            option={trajectoryOption}
            style={{ height: 380 }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
          <div
            style={{
              marginTop: 16,
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <Title level={5} style={{ color: '#2B3674', marginBottom: 8 }}>AI 预测分析</Title>
            <Paragraph style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 8 }}>
              <Text strong>达标时间预估：</Text>
              {trajectoryAnalysis.filter(t => t.weeksToTarget <= 4 && t.weeksToTarget > 0).length > 0
                ? `${trajectoryAnalysis
                    .filter(t => t.weeksToTarget <= 4 && t.weeksToTarget > 0)
                    .map(t => `${t.code}（约${t.weeksToTarget}周）`)
                    .join('、')} 有望在 4 周内达标。`
                : '按当前速率，多数 EPA 需要超过 4 周才能达到 Level 4 目标。'}
              {trajectoryAnalysis.filter(t => t.weeksToTarget > 8).length > 0 &&
                ` 其中 ${trajectoryAnalysis
                  .filter(t => t.weeksToTarget > 8)
                  .map(t => t.code)
                  .join('、')} 预计需要较长时间，建议加大干预力度。`}
            </Paragraph>
            <Paragraph style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 8 }}>
              <Text strong>可能掉队的学员：</Text>
              {STUDENTS.filter(s => {
                const vals = Object.values(s.epaProgress);
                const avgL = vals.reduce((sum, p) => sum + p.level, 0) / vals.length;
                return avgL < 1.8;
              }).map(s => s.name).join('、') || '暂无'}
              {STUDENTS.filter(s => {
                const vals = Object.values(s.epaProgress);
                const avgL = vals.reduce((sum, p) => sum + p.level, 0) / vals.length;
                return avgL < 1.8;
              }).length > 0
                ? '，以上学员 EPA 平均等级低于 1.8，存在掉队风险，建议优先安排个性化辅导。'
                : ''}
            </Paragraph>
            <Paragraph style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 0 }}>
              <Text strong>干预建议：</Text>
              ① 对增长缓慢的 EPA 条目（如皮肤活检操作、皮肤镜图像分析），增设模拟训练周；
              ② 为掉队学员配备一对一导师，每周进行进度回顾；
              ③ 在第 2 周末安排中期评估，根据实际进度动态调整教学计划。
            </Paragraph>
          </div>
        </Card>
      </motion.div>

      <AIInsightCard
        title="AI 评估模型洞察"
        insights={[
          '基于 Kirkpatrick 四层模型评估显示，Level 3（行为层）和 Level 4（结果层）的达成需要更长周期的跟踪观察。',
          'Bloom 认知层次分析表明，当前教学主要集中在"应用"和"分析"层面，建议增加"评价"和"创造"层面的训练任务。',
          'EPA 覆盖度分析显示 EPA-5（皮肤镜检查）和 EPA-6（斑贴试验）的训练覆盖率偏低，建议增加相关课程安排。',
        ]}
        type="info"
        style={{ marginTop: 18 }}
      />
    </div>
  );
};

export default AssessmentTab;
