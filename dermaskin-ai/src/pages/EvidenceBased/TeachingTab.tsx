import React, { useMemo, useState } from 'react';
import { Card, Row, Col, Tag, Select, Typography, Progress } from 'antd';
import {
  NodeIndexOutlined,
  DeploymentUnitOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  DotChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { ALL_COURSES, STUDENTS, EPA_LIST } from '@/data';
import {
  computeCourseTotal,
  computeClassAvg,
  computeMaxTotal,
  findClassStrongestDim,
  findClassWeakestDim,
} from '@/utils/algorithms';
import { GRADE_COLOR, GRADE_LABEL } from '@/types';
import { CHART_COLORS, makeGradient, glassCard } from '@/utils/chartTheme';
import AIInsightCard from '@/components/AIInsightCard';

const { Title, Text, Paragraph } = Typography;

const CARD_STYLE: React.CSSProperties = { borderRadius: 14 };

const CARD_ENTER = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: 'easeOut' as const },
  }),
};

const MODULE_NODES = [
  { name: '真菌检查教学', color: '#4361EE' },
  { name: '皮肤活检教学', color: '#3A86FF' },
  { name: '斑贴试验教学', color: '#05CD99' },
  { name: 'Tzanck教学', color: '#F59E0B' },
  { name: '皮肤镜教学', color: '#7C3AED' },
] as const;

const KNOWLEDGE_DOMAINS = [
  { name: '标本处理', color: '#0EA5E9' },
  { name: '操作规范', color: '#10B981' },
  { name: '结果判读', color: '#F97316' },
  { name: '临床应用', color: '#EC4899' },
] as const;

const SKILL_DIMS = [
  { name: '无菌操作', color: '#6366F1' },
  { name: '标本采集', color: '#14B8A6' },
  { name: '制片方法', color: '#F59E0B' },
  { name: '镜下观察', color: '#EF4444' },
  { name: '临床意义', color: '#8B5CF6' },
] as const;

const EPA_NODES = [
  { name: 'EPA-1', color: '#4361EE' },
  { name: 'EPA-2', color: '#05CD99' },
  { name: 'EPA-3', color: '#F59E0B' },
  { name: 'EPA-4', color: '#7C3AED' },
  { name: 'EPA-5', color: '#EF4444' },
] as const;

const MODULE_TO_DOMAIN: [string, string, number][] = [
  ['真菌检查教学', '标本处理', 18],
  ['真菌检查教学', '结果判读', 22],
  ['皮肤活检教学', '标本处理', 20],
  ['皮肤活检教学', '操作规范', 24],
  ['斑贴试验教学', '操作规范', 16],
  ['斑贴试验教学', '结果判读', 14],
  ['斑贴试验教学', '临床应用', 12],
  ['Tzanck教学', '标本处理', 15],
  ['Tzanck教学', '结果判读', 18],
  ['皮肤镜教学', '结果判读', 20],
  ['皮肤镜教学', '临床应用', 22],
];

const DOMAIN_TO_SKILL: [string, string, number][] = [
  ['标本处理', '标本采集', 28],
  ['标本处理', '制片方法', 25],
  ['操作规范', '无菌操作', 22],
  ['操作规范', '标本采集', 18],
  ['结果判读', '镜下观察', 30],
  ['结果判读', '临床意义', 24],
  ['临床应用', '临床意义', 20],
  ['临床应用', '镜下观察', 14],
];

const SKILL_TO_EPA: [string, string, number][] = [
  ['无菌操作', 'EPA-1', 22],
  ['标本采集', 'EPA-2', 28],
  ['制片方法', 'EPA-3', 25],
  ['镜下观察', 'EPA-4', 24],
  ['镜下观察', 'EPA-3', 10],
  ['临床意义', 'EPA-5', 26],
  ['临床意义', 'EPA-4', 8],
];

const SUNBURST_DATA = [
  {
    name: '讲授',
    value: 25,
    itemStyle: { color: '#4361EE' },
    children: [
      { name: '知识讲解', value: 12, itemStyle: { color: '#5B7BF0' } },
      { name: '案例分析', value: 8, itemStyle: { color: '#7B95F4' } },
      { name: '要点归纳', value: 5, itemStyle: { color: '#9BB0F8' } },
    ],
  },
  {
    name: '演示',
    value: 20,
    itemStyle: { color: '#7C3AED' },
    children: [
      { name: '操作示范', value: 10, itemStyle: { color: '#9361F0' } },
      { name: '视频演示', value: 6, itemStyle: { color: '#AA88F4' } },
      { name: '标本展示', value: 4, itemStyle: { color: '#C1AFF8' } },
    ],
  },
  {
    name: '实操',
    value: 25,
    itemStyle: { color: '#05CD99' },
    children: [
      { name: '独立操作', value: 12, itemStyle: { color: '#2DD8AD' } },
      { name: '模拟练习', value: 8, itemStyle: { color: '#55E3C1' } },
      { name: '协作操作', value: 5, itemStyle: { color: '#7DEED5' } },
    ],
  },
  {
    name: '讨论',
    value: 18,
    itemStyle: { color: '#F59E0B' },
    children: [
      { name: '小组讨论', value: 8, itemStyle: { color: '#F7B13C' } },
      { name: '答疑互动', value: 6, itemStyle: { color: '#F9C46D' } },
      { name: '同伴反馈', value: 4, itemStyle: { color: '#FBD79E' } },
    ],
  },
  {
    name: '反馈',
    value: 12,
    itemStyle: { color: '#EF4444' },
    children: [
      { name: '即时反馈', value: 5, itemStyle: { color: '#F26B6B' } },
      { name: '总结评价', value: 4, itemStyle: { color: '#F59292' } },
      { name: '改进建议', value: 3, itemStyle: { color: '#F8B9B9' } },
    ],
  },
] as const;

const COURSE_SHORT_NAMES = ['真菌镜检', '皮肤活检', '斑贴试验', 'Tzanck涂片', '皮肤镜'] as const;
const SKILL_NAMES = ['无菌操作', '标本采集', '制片技术', '镜下判读', '临床沟通', '诊断思维', '操作规范', '安全意识'] as const;

type ModuleFilter = 'all' | string;

const TeachingTab: React.FC = () => {
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');

  const selectOptions = useMemo(
    () => [
      { value: 'all', label: '全部模块' },
      ...ALL_COURSES.map(c => ({ value: c.id, label: c.shortName })),
    ],
    [],
  );

  const sankeyOption = useMemo(() => {
    const nodeColorMap = new Map<string, string>();
    MODULE_NODES.forEach(n => nodeColorMap.set(n.name, n.color));
    KNOWLEDGE_DOMAINS.forEach(n => nodeColorMap.set(n.name, n.color));
    SKILL_DIMS.forEach(n => nodeColorMap.set(n.name, n.color));
    EPA_NODES.forEach(n => nodeColorMap.set(n.name, n.color));

    const allLinks = [
      ...MODULE_TO_DOMAIN.map(([s, t, v]) => ({ source: s, target: t, value: v })),
      ...DOMAIN_TO_SKILL.map(([s, t, v]) => ({ source: s, target: t, value: v })),
      ...SKILL_TO_EPA.map(([s, t, v]) => ({ source: s, target: t, value: v })),
    ];

    const filteredLinks =
      moduleFilter === 'all'
        ? allLinks
        : (() => {
            const idx = ALL_COURSES.findIndex(c => c.id === moduleFilter);
            const modName = idx >= 0 ? MODULE_NODES[idx]?.name : undefined;
            if (!modName) return allLinks;
            const reachable = new Set<string>([modName]);
            const firstHop = allLinks.filter(l => l.source === modName);
            firstHop.forEach(l => reachable.add(l.target));
            const secondHop = allLinks.filter(l => reachable.has(l.source) && !reachable.has(l.target));
            secondHop.forEach(l => reachable.add(l.target));
            const thirdHop = allLinks.filter(l => reachable.has(l.source));
            return [...new Set([...firstHop, ...secondHop, ...thirdHop])];
          })();

    const nodeNames = new Set<string>();
    filteredLinks.forEach(l => {
      nodeNames.add(l.source);
      nodeNames.add(l.target);
    });

    const sankeyData = Array.from(nodeNames).map(name => ({
      name,
      itemStyle: { color: nodeColorMap.get(name) ?? '#94A3B8', borderWidth: 0 },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        triggerOn: 'mousemove' as const,
        formatter: (p: { dataType?: string; name?: string; data?: { source?: string; target?: string; value?: number; name?: string } }) => {
          if (p.dataType === 'edge') {
            return `<b>${p.data?.source}</b> → <b>${p.data?.target}</b><br/>流量：${p.data?.value}`;
          }
          return `<b>${p.data?.name ?? p.name}</b>`;
        },
      },
      animationDuration: 1200,
      animationEasing: 'cubicInOut' as const,
      series: [
        {
          type: 'sankey' as const,
          emphasis: { focus: 'adjacency' as const },
          left: '3%',
          right: '3%',
          top: '8%',
          bottom: '8%',
          nodeAlign: 'justify' as const,
          nodeWidth: 16,
          nodeGap: 12,
          draggable: true,
          layoutIterations: 32,
          data: sankeyData,
          links: filteredLinks,
          lineStyle: {
            color: 'gradient' as const,
            curveness: 0.5,
            opacity: 0.4,
          },
          label: {
            color: '#334155',
            fontSize: 11,
            fontWeight: 600 as const,
          },
          itemStyle: { borderWidth: 0 },
          levels: [
            { depth: 0, itemStyle: { color: '#4361EE' }, lineStyle: { color: 'source' as const, opacity: 0.35 } },
            { depth: 1, itemStyle: { color: '#0EA5E9' }, lineStyle: { color: 'source' as const, opacity: 0.35 } },
            { depth: 2, itemStyle: { color: '#F59E0B' }, lineStyle: { color: 'source' as const, opacity: 0.35 } },
            { depth: 3, itemStyle: { color: '#7C3AED' }, lineStyle: { color: 'source' as const, opacity: 0.35 } },
          ],
        },
      ],
    };
  }, [moduleFilter]);

  const sunburstOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: { name?: string; value?: number; percent?: number }) =>
          `<b>${p.name}</b><br/>占比：${p.value}%`,
      },
      series: [
        {
          type: 'sunburst' as const,
          data: SUNBURST_DATA as unknown as Record<string, unknown>[],
          radius: ['15%', '90%'],
          sort: undefined,
          label: { rotate: 'radial' as const, fontSize: 11, fontWeight: 500 as const },
          emphasis: {
            focus: 'ancestor' as const,
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' },
          },
          nodeClick: 'rootToNode' as const,
          levels: [
            {},
            {
              r0: '15%',
              r: '52%',
              itemStyle: { borderRadius: 4, borderWidth: 2, borderColor: '#fff' },
              label: { fontSize: 13, fontWeight: 700 as const, color: '#fff' },
            },
            {
              r0: '52%',
              r: '90%',
              itemStyle: { borderRadius: 4, borderWidth: 1, borderColor: '#fff' },
              label: {
                fontSize: 10,
                color: '#334155',
                position: 'outside' as const,
                padding: 3,
                silent: false,
              },
            },
          ],
          animationDuration: 1000,
          animationEasing: 'cubicOut' as const,
        },
      ],
    }),
    [],
  );

  const forceGraphOption = useMemo(() => {
    const centerNode = {
      id: 'center',
      name: '皮肤科操作技能',
      symbolSize: 65,
      category: 0,
      x: 400,
      y: 300,
      itemStyle: {
        color: '#EF4444',
        borderColor: '#fff',
        borderWidth: 3,
        shadowBlur: 16,
        shadowColor: 'rgba(239,68,68,0.4)',
      },
      label: { show: true, fontSize: 13, fontWeight: 700 as const, color: '#1e293b' },
    };

    const courseColors = ['#4361EE', '#3A86FF', '#05CD99', '#F59E0B', '#7C3AED'];
    const courseNodes = COURSE_SHORT_NAMES.map((name, i) => ({
      id: `course-${i}`,
      name,
      symbolSize: 42,
      category: 1,
      itemStyle: {
        color: courseColors[i],
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.1)',
      },
      label: { show: true, fontSize: 11, fontWeight: 600 as const, color: '#1e293b' },
    }));

    const skillColors = ['#6366F1', '#14B8A6', '#F97316', '#EC4899', '#0EA5E9', '#8B5CF6', '#10B981', '#F43F5E'];
    const skillNodes = SKILL_NAMES.map((name, i) => ({
      id: `skill-${i}`,
      name,
      symbolSize: 28,
      category: 2,
      itemStyle: {
        color: skillColors[i % skillColors.length],
        borderColor: '#fff',
        borderWidth: 1,
        shadowBlur: 4,
        shadowColor: 'rgba(0,0,0,0.06)',
      },
      label: { show: true, fontSize: 10, color: '#475569' },
    }));

    const nodes = [centerNode, ...courseNodes, ...skillNodes];

    const centerLinks = courseNodes.map(cn => ({
      source: 'center',
      target: cn.id,
      lineStyle: { width: 2.5, curveness: 0.1 },
    }));

    const courseSkillMap: Record<number, number[]> = {
      0: [0, 1, 2, 3],
      1: [0, 1, 6],
      2: [0, 1, 4, 5],
      3: [1, 2, 3],
      4: [3, 4, 5, 7],
    };

    const skillLinks = Object.entries(courseSkillMap).flatMap(([ci, skills]) =>
      skills.map(si => ({
        source: `course-${ci}`,
        target: `skill-${si}`,
        lineStyle: { width: 1.2, curveness: 0.2 },
      })),
    );

    const crossLinks = [
      { source: 'skill-0', target: 'skill-6', lineStyle: { width: 0.8, curveness: 0.3, type: 'dashed' as const } },
      { source: 'skill-1', target: 'skill-2', lineStyle: { width: 0.8, curveness: 0.3, type: 'dashed' as const } },
      { source: 'skill-3', target: 'skill-5', lineStyle: { width: 0.8, curveness: 0.3, type: 'dashed' as const } },
      { source: 'skill-4', target: 'skill-5', lineStyle: { width: 0.8, curveness: 0.3, type: 'dashed' as const } },
    ];

    const links = [...centerLinks, ...skillLinks, ...crossLinks];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: { dataType?: string; data?: { name?: string; source?: string; target?: string } }) => {
          if (p.dataType === 'edge') {
            return `${p.data?.source ?? ''} ↔ ${p.data?.target ?? ''}`;
          }
          return `<b>${p.data?.name ?? ''}</b>`;
        },
      },
      legend: { show: false },
      animationDuration: 1500,
      animationEasing: 'elasticOut' as const,
      series: [
        {
          type: 'graph' as const,
          layout: 'force' as const,
          roam: true,
          draggable: true,
          categories: [
            { name: '核心', itemStyle: { color: '#EF4444' } },
            { name: '课程模块', itemStyle: { color: '#4361EE' } },
            { name: '技能维度', itemStyle: { color: '#F59E0B' } },
          ],
          data: nodes,
          links,
          label: { show: true, position: 'inside' as const, color: '#1f2937' },
          lineStyle: {
            color: 'source' as const,
            curveness: 0.15,
            opacity: 0.7,
          },
          emphasis: {
            focus: 'adjacency' as const,
            lineStyle: { width: 4, opacity: 1 },
            itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.2)' },
          },
          force: {
            repulsion: 500,
            gravity: 0.1,
            edgeLength: [80, 180],
            layoutAnimation: true,
            friction: 0.6,
          },
        },
      ],
    };
  }, []);

  const studentIds = useMemo(() => STUDENTS.map(s => s.id), []);

  const courseAnalysisData = useMemo(
    () =>
      ALL_COURSES.map(course => {
        const avg = computeClassAvg(course, studentIds);
        const max = computeMaxTotal(course);
        const pct = max > 0 ? Math.round((avg / max) * 100) : 0;
        const strongest = findClassStrongestDim(course);
        const weakest = findClassWeakestDim(course);
        return { name: course.shortName, fullName: course.name, avg, max, pct, strongest, weakest };
      }),
    [studentIds],
  );

  const courseAvgChartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      grid: { left: 100, right: 70, top: 16, bottom: 24 },
      xAxis: {
        type: 'value' as const,
        max: 100,
        axisLabel: { fontSize: 11, color: '#64748b', formatter: '{value}分' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category' as const,
        data: courseAnalysisData.map(d => d.name),
        axisLabel: { fontSize: 12, color: '#334155', fontWeight: 600 as const },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      series: [
        {
          type: 'bar' as const,
          data: courseAnalysisData.map(d => ({
            value: d.pct,
            itemStyle: {
              color: {
                type: 'linear' as const,
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: `${GRADE_COLOR(d.pct)}66` },
                  { offset: 1, color: GRADE_COLOR(d.pct) },
                ],
              },
              borderRadius: [0, 6, 6, 0],
            },
          })),
          barWidth: '55%',
          label: {
            show: true,
            position: 'right' as const,
            formatter: (p: { dataIndex: number }) => {
              const d = courseAnalysisData[p.dataIndex];
              return `${d.pct}分 · ${GRADE_LABEL(d.pct)}`;
            },
            fontSize: 11,
            color: '#475569',
            fontWeight: 600 as const,
          },
        },
      ],
      animationDuration: 1000,
      animationEasing: 'cubicOut' as const,
    }),
    [courseAnalysisData],
  );

  const overallAvgPct = useMemo(
    () => Math.round(courseAnalysisData.reduce((s, d) => s + d.pct, 0) / (courseAnalysisData.length || 1)),
    [courseAnalysisData],
  );

  const engagementData = useMemo(
    () =>
      STUDENTS.map(s => {
        const avgPct =
          ALL_COURSES.reduce((sum, c) => {
            const t = computeCourseTotal(s.id, c);
            const m = computeMaxTotal(c);
            return sum + (m > 0 ? (t / m) * 100 : 0);
          }, 0) / ALL_COURSES.length;
        return {
          name: s.name,
          attendance: Math.round(s.attendance * 100),
          score: Math.round(avgPct),
          practiceHours: s.practiceHours,
        };
      }),
    [],
  );

  const engagementAnalysis = useMemo(() => {
    const high = engagementData.filter(d => d.attendance >= 95 && d.score >= 85);
    const atRisk = engagementData.filter(d => d.attendance < 88 || d.score < 70);
    const n = engagementData.length;
    const meanA = engagementData.reduce((s, d) => s + d.attendance, 0) / n;
    const meanS = engagementData.reduce((s, d) => s + d.score, 0) / n;
    const cov = engagementData.reduce((s, d) => s + (d.attendance - meanA) * (d.score - meanS), 0) / n;
    const sdA = Math.sqrt(engagementData.reduce((s, d) => s + (d.attendance - meanA) ** 2, 0) / n);
    const sdS = Math.sqrt(engagementData.reduce((s, d) => s + (d.score - meanS) ** 2, 0) / n);
    const r = sdA > 0 && sdS > 0 ? cov / (sdA * sdS) : 0;
    return { high, atRisk, r };
  }, [engagementData]);

  const engagementChartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (p: { data: [number, number, number, string] }) => {
          const d = p.data;
          return `<b>${d[3]}</b><br/>出勤率：${d[0]}%<br/>均分：${d[1]}分<br/>练习：${d[2]}h`;
        },
      },
      grid: { left: 60, right: 30, top: 20, bottom: 50 },
      xAxis: {
        name: '出勤率 (%)',
        nameLocation: 'middle' as const,
        nameGap: 30,
        nameTextStyle: { fontSize: 12, color: '#475569' },
        type: 'value' as const,
        min: 82,
        max: 100,
        axisLabel: { fontSize: 11, color: '#64748b', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        name: '综合均分',
        nameLocation: 'middle' as const,
        nameGap: 40,
        nameTextStyle: { fontSize: 12, color: '#475569' },
        type: 'value' as const,
        min: 40,
        max: 100,
        axisLabel: { fontSize: 11, color: '#64748b' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          type: 'scatter' as const,
          symbolSize: (d: number[]) => Math.max(14, d[2] * 1.8),
          data: engagementData.map(d => [d.attendance, d.score, d.practiceHours, d.name]),
          label: {
            show: true,
            formatter: (p: { data: [number, number, number, string] }) => p.data[3],
            position: 'top' as const,
            fontSize: 11,
            color: '#334155',
            fontWeight: 500 as const,
          },
          itemStyle: {
            color: (p: { data: [number, number, number, string] }) =>
              p.data[1] >= 85 ? '#05CD99' : p.data[1] >= 70 ? '#4361EE' : '#EF4444',
            shadowBlur: 8,
            shadowColor: 'rgba(67,97,238,0.25)',
            borderColor: '#fff',
            borderWidth: 1,
          },
          emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(67,97,238,0.5)' } },
        },
      ],
      animationDuration: 1200,
      animationEasing: 'cubicOut' as const,
    }),
    [engagementData],
  );

  return (
    <div style={{ ['--primary' as string]: '#4361EE', ['--text-heading' as string]: '#2B3674' }}>
      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={0}>
        <Card style={CARD_STYLE} styles={{ body: { paddingBottom: 12 } }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={14}>
              <Title level={4} style={{ margin: 0, color: 'var(--text-heading, #2B3674)' }}>
                <NodeIndexOutlined style={{ marginRight: 8, color: '#4361EE' }} />
                教学分析 · 知识流与行为映射
              </Title>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                基于知识图谱与课堂行为数据，呈现教学模块、知识域、技能维度与 EPA 能力之间的映射关系
              </Text>
            </Col>
            <Col xs={24} md={10} style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ marginRight: 8 }}>模块筛选</Text>
              <Select<ModuleFilter>
                style={{ minWidth: 200 }}
                value={moduleFilter}
                onChange={setModuleFilter}
                options={selectOptions}
                placeholder="选择教学模块"
              />
            </Col>
          </Row>
          <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
            <Col xs={12} sm={6}>
              <Tag color="blue" style={{ fontSize: 12, padding: '2px 10px' }}>在训学员 {STUDENTS.length} 人</Tag>
            </Col>
            <Col xs={12} sm={6}>
              <Tag color="purple" style={{ fontSize: 12, padding: '2px 10px' }}>教学模块 {ALL_COURSES.length} 门</Tag>
            </Col>
            <Col xs={12} sm={6}>
              <Tag color="green" style={{ fontSize: 12, padding: '2px 10px' }}>EPA条目 {EPA_LIST.length} 项</Tag>
            </Col>
            <Col xs={12} sm={6}>
              <Tag color="orange" style={{ fontSize: 12, padding: '2px 10px' }}>
                平均出勤 {(STUDENTS.reduce((s, st) => s + st.attendance, 0) / STUDENTS.length * 100).toFixed(1)}%
              </Tag>
            </Col>
          </Row>
        </Card>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={1} style={{ marginTop: 16 }}>
        <Card
          title={
            <span>
              <DeploymentUnitOutlined style={{ marginRight: 8, color: '#4361EE' }} />
              知识流向桑基图 · 教学模块 → 知识域 → 技能维度 → EPA
            </span>
          }
          style={CARD_STYLE}
          extra={
            <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Tag color="#4361EE">教学模块</Tag>
              <Tag color="#0EA5E9">知识域</Tag>
              <Tag color="#F59E0B">技能维度</Tag>
              <Tag color="#7C3AED">EPA</Tag>
            </span>
          }
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            {moduleFilter === 'all'
              ? '展示全部模块与能力流向；筛选模块后仅显示所选模块相关链路。'
              : `当前筛选：${ALL_COURSES.find(c => c.id === moduleFilter)?.name ?? ''}`}
          </Text>
          <ReactECharts
            option={sankeyOption}
            style={{ height: 460 }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
        </Card>
      </motion.div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={2} style={{ height: '100%' }}>
            <Card
              title={
                <span>
                  <ApartmentOutlined style={{ marginRight: 8, color: '#7C3AED' }} />
                  教学行为旭日图
                </span>
              }
              style={{ ...CARD_STYLE, height: '100%' }}
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                内环为五大教学方法，外环为子类别；点击可下钻聚焦
              </Text>
              <ReactECharts
                option={sunburstOption}
                style={{ height: 420 }}
                opts={{ renderer: 'canvas' }}
                notMerge
                lazyUpdate
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={12}>
          <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={3} style={{ height: '100%' }}>
            <Card
              title={
                <span>
                  <NodeIndexOutlined style={{ marginRight: 8, color: '#05CD99' }} />
                  概念关联力导向图
                </span>
              }
              style={{ ...CARD_STYLE, height: '100%' }}
              extra={
                <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Tag color="red">核心</Tag>
                  <Tag color="blue">课程</Tag>
                  <Tag color="orange">技能</Tag>
                </span>
              }
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                中心节点为皮肤科操作技能，可拖拽节点探索关联
              </Text>
              <ReactECharts
                option={forceGraphOption}
                style={{ height: 420 }}
                opts={{ renderer: 'canvas' }}
                notMerge
                lazyUpdate
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Teaching Effectiveness Analysis */}
      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={4} style={{ marginTop: 16 }}>
        <Card
          title={
            <span>
              <BarChartOutlined style={{ marginRight: 8, color: '#4361EE' }} />
              教学效果分析 · 课程均分对比
            </span>
          }
          style={CARD_STYLE}
          styles={{ body: { padding: '16px 20px' } }}
        >
          <Paragraph style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, marginBottom: 16 }}>
            本教学周期共开设 <Text strong>{ALL_COURSES.length}</Text> 门皮肤科操作课程，
            在训学员 <Text strong>{STUDENTS.length}</Text> 名。
            综合各课程班级均分来看，整体教学质量处于
            <Tag color={GRADE_COLOR(overallAvgPct)} style={{ margin: '0 4px' }}>
              {GRADE_LABEL(overallAvgPct)}
            </Tag>
            水平（综合均分 {overallAvgPct} 分）。各课程间存在一定分化，
            需针对薄弱课程与维度实施差异化教学改进策略。
          </Paragraph>
          <ReactECharts
            option={courseAvgChartOption}
            style={{ height: 280 }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
          <div style={{ marginTop: 20 }}>
            <Title level={5} style={{ color: '#2B3674', marginBottom: 12 }}>各课程详细分析</Title>
            {courseAnalysisData.map((d, idx) => (
              <div
                key={d.name}
                style={{
                  padding: '12px 16px',
                  marginBottom: 10,
                  background: idx % 2 === 0 ? '#f8fafc' : '#fff',
                  borderRadius: 10,
                  border: '1px solid #f1f5f9',
                }}
              >
                <Row align="middle" gutter={12}>
                  <Col flex="auto">
                    <Text strong style={{ fontSize: 14, color: '#1e293b' }}>{d.fullName}</Text>
                    <Tag color={GRADE_COLOR(d.pct)} style={{ marginLeft: 8, fontSize: 11 }}>
                      {d.pct}分 · {GRADE_LABEL(d.pct)}
                    </Tag>
                  </Col>
                  <Col flex="200px">
                    <Progress percent={d.pct} strokeColor={GRADE_COLOR(d.pct)} size="small" />
                  </Col>
                </Row>
                <Paragraph style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                  最强维度：<Text strong style={{ color: '#05CD99' }}>{d.strongest.label}</Text>（均分 {d.strongest.avgPct}%）；
                  最弱维度：<Text strong style={{ color: '#EF4444' }}>{d.weakest.label}</Text>（均分 {d.weakest.avgPct}%）。
                  {d.pct >= 85
                    ? `整体表现优秀，建议进一步拓展高阶临床应用场景，鼓励学员在「${d.weakest.label}」维度寻求突破。`
                    : d.pct >= 70
                    ? `教学效果良好，建议针对「${d.weakest.label}」维度加强专项训练，增加实操演练比重。`
                    : `该课程需重点关注，建议围绕「${d.weakest.label}」维度设计补充教学活动，增加一对一辅导频次。`}
                </Paragraph>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Student Engagement Analytics */}
      <motion.div initial="hidden" animate="visible" variants={CARD_ENTER} custom={5} style={{ marginTop: 16 }}>
        <Card
          title={
            <span>
              <DotChartOutlined style={{ marginRight: 8, color: '#7C3AED' }} />
              学员参与度分析 · 出勤-成绩-练习矩阵
            </span>
          }
          style={CARD_STYLE}
          styles={{ body: { padding: '16px 20px' } }}
          extra={
            <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Tag color="#05CD99">优秀 ≥85</Tag>
              <Tag color="#4361EE">合格 ≥70</Tag>
              <Tag color="#EF4444">{'需关注 <70'}</Tag>
            </span>
          }
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            X轴 = 出勤率，Y轴 = 综合均分，气泡大小 = 练习时长；颜色按成绩分段标注
          </Text>
          <ReactECharts
            option={engagementChartOption}
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
            <Title level={5} style={{ color: '#2B3674', marginBottom: 8 }}>参与度洞察</Title>
            <Paragraph style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 8 }}>
              <Text strong style={{ color: '#05CD99' }}>高参与度学员</Text>
              {engagementAnalysis.high.length > 0
                ? `（${engagementAnalysis.high.map(h => h.name).join('、')}）：出勤率 ≥95% 且均分 ≥85 分，学习投入度突出，建议安排进阶任务或同伴带教角色。`
                : '：当前暂无同时满足出勤率 ≥95% 且均分 ≥85 分的学员，建议通过激励机制提升整体投入度。'}
            </Paragraph>
            <Paragraph style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 8 }}>
              <Text strong style={{ color: '#EF4444' }}>需关注学员</Text>
              {engagementAnalysis.atRisk.length > 0
                ? `（${engagementAnalysis.atRisk.map(h => h.name).join('、')}）：出勤率 <88% 或均分 <70 分，建议尽早进行一对一谈话，了解学习障碍并制定个性化改进方案。`
                : '：目前所有学员参与度指标均在安全范围内。'}
            </Paragraph>
            <Paragraph style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 0 }}>
              <Text strong>相关性分析</Text>：出勤率与综合成绩的 Pearson 相关系数为{' '}
              <Text code>{engagementAnalysis.r.toFixed(2)}</Text>，
              {engagementAnalysis.r >= 0.7
                ? '呈强正相关，表明出勤保障是成绩提升的关键因素，应严格执行考勤管理制度。'
                : engagementAnalysis.r >= 0.4
                ? '呈中等正相关，出勤率对成绩有一定影响，但学员自主学习效率差异也是重要因素。'
                : '相关性较弱，说明仅依靠出勤不足以保障学习效果，需同步提升课堂教学质量与课后练习指导。'}
            </Paragraph>
          </div>
        </Card>
      </motion.div>

      <AIInsightCard
        title="AI 教学分析洞察"
        insights={[
          '桑基图显示知识从基础模块向高阶EPA的流动路径，建议加强中间环节的教学衔接。',
          '教学方法多元化有助于提升技能迁移效果，建议增加实操演示与反馈环节。',
          '关注知识流中的薄弱连接点，针对性优化教学设计。',
        ]}
        type="info"
        style={{ marginTop: 18 }}
      />
    </div>
  );
};

export default TeachingTab;
