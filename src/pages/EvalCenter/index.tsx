import React, { useState, useMemo } from 'react';
import { Alert, Card, Row, Col, Tag, Segmented, Space, Typography, Descriptions } from 'antd';
import {
  TeamOutlined, ExperimentOutlined, SafetyCertificateOutlined,
  TrophyOutlined, SolutionOutlined, FileTextOutlined, RiseOutlined,
  DotChartOutlined, HeatMapOutlined, HistoryOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { motion } from 'framer-motion';
import { build3DBarOption, build3DScatterOption } from '@/utils/echarts3d';
import { ALL_COURSES, STUDENTS, EPA_LIST, HISTORICAL_RECORDS, getRecordsByStudent } from '@/data';
import { GRADE_COLOR, GRADE_LABEL } from '@/types';
import type { CourseConfig, Student } from '@/types';
import {
  computeCourseTotal, computeMaxTotal, computeClassAvg,
  computeDimClassAvg, findClassStrongestDim, findClassWeakestDim, findWeakestDimIdx,
  SKILL_TO_EPA_MAP,
} from '@/utils/algorithms';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import DataLinkBadge from '@/components/DataLinkBadge';
import { CHART_COLORS, makeGradient, applyChartAnimation, glassCard, ECHARTS_STYLE_SM } from '@/utils/chartTheme';
import AIInsightCard from '@/components/AIInsightCard';
import StudentDetailModal from './StudentDetailModal';

const { Text } = Typography;

const KPICard: React.FC<{ icon: React.ReactNode; color: string; label: string; value: string | number; unit?: string }> = ({ icon, color, label, value, unit }) => (
  <div style={{
    ...glassCard, padding: '14px 16px', transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <div style={{
      width: 34, height: 34, borderRadius: 10,
      background: color + '18', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color, fontSize: 16,
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
    </div>
  </div>
);

const SKILL_LABELS = ['无菌操作', '标本采集', '制片技术', '镜下判读', '临床沟通', '诊断思维', '操作规范', '安全意识'];
const STUDENT_COLORS = ['#4361EE', '#05CD99', '#7C3AED', '#F59E0B'];
const COURSE_COLORS = ['#4361EE', '#05CD99', '#7C3AED', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

const EvalCenter: React.FC = () => {
  const [activeCourseId, setActiveCourseId] = useState(ALL_COURSES[0].id);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const students = STUDENTS;
  const { hasRealAnalysis, realAnalysisCount } = useUnifiedData();

  const activeCourse = useMemo(() =>
    ALL_COURSES.find(c => c.id === activeCourseId) ?? ALL_COURSES[0],
    [activeCourseId],
  );

  const classAvg = useMemo(() =>
    computeClassAvg(activeCourse, students.map(s => s.id)),
    [activeCourse, students],
  );

  const totalEvals = useMemo(() =>
    ALL_COURSES.reduce((sum, c) => sum + Object.keys(c.evals).length, 0),
    [],
  );

  const strongest = useMemo(() => findClassStrongestDim(activeCourse), [activeCourse]);
  const weakest = useMemo(() => findClassWeakestDim(activeCourse), [activeCourse]);

  const skillData = useMemo(() => {
    const maxArr = SKILL_LABELS.map(sk => Math.max(...students.map(s => (s.skills as Record<string, number>)[sk] ?? 0)));
    const avgArr = SKILL_LABELS.map(sk => Math.round(students.reduce((sum, s) => sum + ((s.skills as Record<string, number>)[sk] ?? 0), 0) / students.length));
    const minArr = SKILL_LABELS.map(sk => Math.min(...students.map(s => (s.skills as Record<string, number>)[sk] ?? 0)));
    return { maxArr, avgArr, minArr };
  }, [students]);

  const topStudents = useMemo(() =>
    [...students].sort((a, b) => computeCourseTotal(b.id, activeCourse) - computeCourseTotal(a.id, activeCourse)).slice(0, 4),
    [students, activeCourse],
  );

  const chartEvents = useMemo(() => ({
    rose:     { click: (p: any) => console.log('[nightingale]', p.data ?? p.name) },
    sunburst: { click: (p: any) => console.log('[sunburst]', p.data ?? p.name) },
    growth:   { click: (p: any) => console.log('[growth]', p.data ?? p.name) },
    tree:     { click: (p: any) => console.log('[tree]', p.data ?? p.name) },
    scatter:  { click: (p: any) => console.log('[scatter]', p.data ?? p.name) },
    heatmap:  { click: (p: any) => console.log('[heatmap]', p.data ?? p.name) },
  }), []);

  /* ───────── CHART 1 · Nightingale / Rose Polar Bar ───────── */
  const roseChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { fontSize: 12, color: '#2B3674' },
      formatter: (p: any) =>
        `<div style="font-weight:700;margin-bottom:4px;color:${p.color}">${p.name}</div>
         <div>${p.seriesName}: <b>${p.value}</b>分</div>`,
    },
    legend: {
      data: ['最高分', '班级均分', '最低分'], top: 2,
      textStyle: { fontSize: 11, color: '#64748b' },
      itemWidth: 14, itemHeight: 10,
    },
    polar: { radius: ['12%', '82%'] },
    angleAxis: {
      type: 'category' as const,
      data: SKILL_LABELS,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { fontSize: 10, color: '#64748b' },
    },
    radiusAxis: {
      min: 40, max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 9, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' as const } },
    },
    series: [
      {
        name: '最高分', type: 'bar' as const,
        coordinateSystem: 'polar' as const,
        data: skillData.maxArr,
        roundCap: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#05CD9950' },
            { offset: 1, color: '#05CD99' },
          ]),
          borderRadius: 4,
          shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)', shadowOffsetY: 4,
        },
        emphasis: {
          focus: 'series' as const,
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(5,205,153,0.4)' },
        },
      },
      {
        name: '班级均分', type: 'bar' as const,
        coordinateSystem: 'polar' as const,
        data: skillData.avgArr,
        roundCap: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#4361EE50' },
            { offset: 1, color: '#4361EE' },
          ]),
          borderRadius: 4,
          shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)', shadowOffsetY: 4,
        },
        emphasis: {
          focus: 'series' as const,
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(67,97,238,0.4)' },
        },
      },
      {
        name: '最低分', type: 'bar' as const,
        coordinateSystem: 'polar' as const,
        data: skillData.minArr,
        roundCap: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#EF444450' },
            { offset: 1, color: '#EF4444' },
          ]),
          borderRadius: 4,
          shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)', shadowOffsetY: 4,
        },
        emphasis: {
          focus: 'series' as const,
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(239,68,68,0.4)' },
        },
      },
    ],
    animationDuration: 1500,
    animationEasing: 'elasticOut' as const,
  }), [skillData]);

  /* ───────── CHART 2 · Sunburst (replaces funnel) ───────── */
  const sunburstChartData = useMemo(() =>
    ALL_COURSES.map((course, ci) => {
      const c = COURSE_COLORS[ci % COURSE_COLORS.length];
      return {
      name: course.shortName,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: c + '90' },
          { offset: 1, color: c },
        ]),
      },
      children: course.rubric.map((dim, di) => ({
        name: dim.label,
        value: Math.max(1, Math.round(computeDimClassAvg(di, course))),
      })),
    };
    }),
    [],
  );

  const sunburstOption = useMemo(() => ({
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { fontSize: 12, color: '#2B3674' },
      formatter: (p: any) => {
        const path = (p.treePathInfo ?? []).map((n: any) => n.name).filter(Boolean).join(' → ');
        return `<div style="font-weight:700;margin-bottom:4px">${path || p.name}</div>
                ${p.value ? `<div>班级均分: <b>${p.value}</b>%</div>` : ''}`;
      },
    },
    series: [{
      type: 'sunburst' as const,
      data: sunburstChartData,
      radius: ['15%', '90%'],
      sort: undefined,
      emphasis: { focus: 'ancestor' as const },
      levels: [
        {},
        {
          label: { fontSize: 11, fontWeight: 700 as const, rotate: 'tangential' as const, color: '#fff' },
          itemStyle: { borderWidth: 2, borderColor: '#fff', borderRadius: 6 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
        },
        {
          label: { fontSize: 9, rotate: 'tangential' as const, color: '#fff' },
          itemStyle: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 4 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' } },
        },
      ],
      label: { show: true },
      itemStyle: { borderRadius: 4 },
      animationType: 'expansion' as const,
      animationDuration: 1500,
      animationEasing: 'cubicInOut' as const,
    }],
  }), [sunburstChartData]);

  /* ───────── CHART 3 · Stacked Area (replaces line) ───────── */
  const areaChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'cross' as const, label: { backgroundColor: '#4361EE' } },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { fontSize: 12, color: '#2B3674' },
      formatter: (params: any[]) => {
        if (!Array.isArray(params)) return '';
        let html = `<div style="font-weight:700;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">${params[0]?.axisValue}</div>`;
        params.forEach((p: any) => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};box-shadow:0 0 4px ${p.color}60"></span>
            <span style="flex:1">${p.seriesName}</span><b>${p.value}</b>分
          </div>`;
        });
        return html;
      },
    },
    legend: {
      data: topStudents.map(s => s.name), top: 0,
      textStyle: { fontSize: 11, color: '#64748b' },
      itemWidth: 14, itemHeight: 10,
    },
    grid: { top: 36, bottom: 30, left: 44, right: 16 },
    xAxis: {
      type: 'category' as const,
      data: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      boundaryGap: false,
      axisLabel: { fontSize: 10, color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' as const } },
    },
    series: topStudents.map((s, i) => ({
      name: s.name,
      type: 'line' as const,
      stack: 'total' as const,
      smooth: true,
      symbol: 'circle' as const,
      symbolSize: 6,
      lineStyle: { width: 1.5, color: STUDENT_COLORS[i] },
      itemStyle: { color: STUDENT_COLORS[i] },
      areaStyle: {
        opacity: 0.85,
        color: makeGradient(STUDENT_COLORS[i]),
      },
      emphasis: { focus: 'series' as const },
      ...(i === 0 ? {
        markLine: {
          silent: true,
          symbol: 'none' as const,
          data: [{
            yAxis: 85,
            label: {
              formatter: '目标: 85分',
              fontSize: 10,
              color: '#EF4444',
              position: 'insideEndTop' as const,
            },
          }],
          lineStyle: { color: '#EF4444', type: 'dashed' as const, width: 1.5 },
        },
      } : {}),
    })),
    animationDuration: 2000,
    animationEasing: 'cubicOut' as const,
  }), [topStudents]);

  /* ───────── CHART 4 · Tree — Knowledge Flow ───────── */
  const treeChartData = useMemo(() => {
    const epaMap = new Map(EPA_LIST.map(e => [e.id, e]));
    return {
      name: '皮肤科技能评估',
      itemStyle: { color: '#1e293b', borderColor: '#1e293b' },
      children: ALL_COURSES.map((course, ci) => {
        const c = COURSE_COLORS[ci % COURSE_COLORS.length];
        return {
        name: course.shortName,
        itemStyle: { color: c, borderColor: c },
        label: { color: c },
        children: course.rubric.map(dim => {
          const epaId = SKILL_TO_EPA_MAP[dim.key];
          const epa = epaId ? epaMap.get(epaId) : undefined;
          return {
            name: dim.label,
            itemStyle: { color: '#6366F1', borderColor: '#6366F1' },
            children: epa ? [{
              name: epa.code,
              itemStyle: { color: '#EC4899', borderColor: '#EC4899' },
              label: { color: '#EC4899' },
            }] : [],
          };
        }),
      };
    }),
    };
  }, []);

  const treeOption = useMemo(() => ({
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { fontSize: 12, color: '#2B3674' },
      formatter: (p: any) => {
        const d = p.data ?? {};
        return `<b>${p.name}</b>${d.value ? '<br/>权重: ' + d.value : ''}`;
      },
    },
    series: [{
      type: 'tree' as const,
      data: [treeChartData],
      top: '4%', bottom: '4%', left: '8%', right: '28%',
      symbolSize: 8,
      orient: 'LR' as const,
      label: {
        position: 'right' as const,
        verticalAlign: 'middle' as const,
        align: 'left' as const,
        fontSize: 9,
        color: '#475569',
      },
      leaves: {
        label: {
          position: 'right' as const,
          verticalAlign: 'middle' as const,
          align: 'left' as const,
          fontSize: 8,
        },
      },
      emphasis: { focus: 'descendant' as const },
      expandAndCollapse: true,
      initialTreeDepth: 2,
      lineStyle: { width: 1.5, color: '#cbd5e1', curveness: 0.5 },
      animationDuration: 800,
      animationDurationUpdate: 750,
      animationEasing: 'backOut' as const,
    }],
  }), [treeChartData]);

  /* ───────── CHART 5 · Scatter (attention × score × hours) ───────── */
  const scatterData = useMemo(() =>
    students.map(s => {
      const total = computeCourseTotal(s.id, activeCourse);
      return [Math.round(s.avgAttention * 100), total, s.practiceHours, s.name];
    }),
    [students, activeCourse],
  );

  const scatterOption = useMemo(() => ({
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { fontSize: 12, color: '#2B3674' },
      formatter: (p: any) => {
        const d = p.data as (number | string)[];
        return `<div style="font-weight:700;margin-bottom:4px">${d[3]}</div>
          <div>专注度: <b>${d[0]}%</b></div>
          <div>总分: <b>${d[1]}</b>分</div>
          <div>训练时长: <b>${d[2]}</b>h</div>`;
      },
    },
    grid: { top: 16, bottom: 40, left: 50, right: 80 },
    xAxis: {
      name: '专注度 (%)', type: 'value' as const,
      min: 70, max: 95,
      nameTextStyle: { fontSize: 10, color: '#94a3b8' },
      axisLabel: { fontSize: 10, color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' as const } },
    },
    yAxis: {
      name: '总分', type: 'value' as const,
      min: 40, max: 100,
      nameTextStyle: { fontSize: 10, color: '#94a3b8' },
      axisLabel: { fontSize: 10, color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' as const } },
    },
    visualMap: {
      type: 'piecewise' as const,
      dimension: 1,
      pieces: [
        { min: 90, max: 100, color: '#05CD99', label: '优秀' },
        { min: 80, max: 89, color: '#4361EE', label: '良好' },
        { min: 70, max: 79, color: '#F59E0B', label: '合格' },
        { min: 0, max: 69, color: '#EF4444', label: '需加强' },
      ],
      orient: 'vertical' as const,
      right: 0, top: 'center',
      textStyle: { fontSize: 10 },
      itemWidth: 12, itemHeight: 12,
    },
    series: [{
      type: 'scatter' as const,
      symbolSize: (val: number[]) => Math.max(14, val[2] * 1.6),
      data: scatterData,
      itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.15)' },
      emphasis: {
        focus: 'series' as const,
        blurScope: 'coordinateSystem' as const,
        itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,0.3)', borderWidth: 2, borderColor: '#fff' },
      },
    }],
    brush: {
      toolbox: ['rect' as const, 'polygon' as const, 'clear' as const],
      xAxisIndex: 0,
    },
    toolbox: {
      feature: {
        brush: {
          title: { rect: '矩形选择', polygon: '多边形选择', clear: '清除选择' },
        },
      },
      right: 10, top: 0,
      iconStyle: { borderColor: '#94a3b8' },
    },
    animationDuration: 1200,
    animationEasing: 'elasticOut' as const,
  }), [scatterData]);

  /* ───────── CHART 6 · Heatmap (student × dimension) ───────── */
  const heatmapRaw = useMemo(() =>
    students.flatMap((s, yi) =>
      SKILL_LABELS.map((sk, xi) => [xi, yi, (s.skills as Record<string, number>)[sk] ?? 0]),
    ),
    [students],
  );

  const heatmapOption = useMemo(() => ({
    tooltip: {
      position: 'top' as const,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { fontSize: 12, color: '#2B3674' },
      formatter: (p: any) => {
        const d = p.data as number[];
        return `<div style="font-weight:700;margin-bottom:4px">${students[d[1]].name}</div>
          <div>${SKILL_LABELS[d[0]]}: <b style="color:${GRADE_COLOR(d[2])}">${d[2]}</b>分</div>`;
      },
    },
    grid: { top: 6, bottom: 46, left: 56, right: 8 },
    xAxis: {
      type: 'category' as const, data: SKILL_LABELS,
      splitArea: { show: true },
      axisLabel: { fontSize: 9, color: '#64748b', rotate: 30 },
    },
    yAxis: {
      type: 'category' as const,
      data: students.map(s => s.name),
      splitArea: { show: true },
      axisLabel: { fontSize: 10, color: '#64748b' },
    },
    visualMap: {
      min: 55, max: 100,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center', bottom: 0,
      textStyle: { fontSize: 9, color: '#94a3b8' },
      itemWidth: 12, itemHeight: 80,
      inRange: { color: ['#E8F5E9', '#A5D6A7', '#66BB6A', '#43A047', '#2E7D32', '#1B5E20'] },
    },
    series: [{
      type: 'heatmap' as const,
      data: heatmapRaw,
      label: {
        show: true, fontSize: 9, fontWeight: 600 as const, color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.25)', textShadowBlur: 2,
      },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.4)', borderColor: '#fff', borderWidth: 2 },
      },
    }],
    animationDuration: 1000,
    animationEasing: 'cubicOut' as const,
  }), [heatmapRaw, students]);

  /* ───────── CHART · Grade Distribution Donut ───────── */
  const gradeDistData = useMemo(() => {
    const colors: Record<string, string> = { '优秀': '#05CD99', '良好': '#4361EE', '合格': '#F59E0B', '需加强': '#EF4444' };
    const buckets: Record<string, number> = { '优秀': 0, '良好': 0, '合格': 0, '需加强': 0 };
    students.forEach(s => {
      const label = GRADE_LABEL(computeCourseTotal(s.id, activeCourse));
      if (label in buckets) buckets[label]++;
    });
    return Object.entries(buckets).filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, itemStyle: { color: colors[name] } }));
  }, [students, activeCourse]);

  const donutOption = useMemo(() => ({
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { fontSize: 12, color: '#2B3674' },
      formatter: (p: any) => `<b>${p.name}</b>: ${p.value}人 (${(p.percent ?? 0).toFixed(1)}%)`,
    },
    legend: {
      orient: 'vertical' as const, right: 10, top: 'center',
      textStyle: { fontSize: 11, color: '#64748b' },
    },
    series: [{
      type: 'pie' as const,
      radius: ['42%', '72%'],
      center: ['38%', '50%'],
      padAngle: 3,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, fontSize: 11, fontWeight: 600 as const, formatter: '{b}\n{d}%' },
      emphasis: {
        label: { fontSize: 14, fontWeight: 800 as const },
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.2)' },
      },
      data: gradeDistData,
      animationType: 'scale' as const,
      animationEasing: 'elasticOut' as const,
      animationDuration: 1500,
    }],
  }), [gradeDistData]);

  /* ───────── CHART · Historical Average Score per Student ───────── */
  const historicalBarOption = useMemo(() => {
    const studentAvgs = students.map(s => {
      const recs = getRecordsByStudent(s.id);
      if (recs.length === 0) return 0;
      return Math.round(recs.reduce((sum, r) => sum + r.totalScore, 0) / recs.length * 10) / 10;
    });
    return {
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        textStyle: { fontSize: 12, color: '#2B3674' },
      },
      grid: { top: 32, bottom: 28, left: 50, right: 16 },
      xAxis: {
        type: 'category' as const,
        data: students.map(s => s.name),
        axisLabel: { fontSize: 10, color: '#64748b', rotate: 15 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value' as const, min: 75, max: 100,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' as const } },
      },
      series: [{
        type: 'bar' as const,
        data: studentAvgs.map(v => ({
          value: v,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: GRADE_COLOR(v) },
              { offset: 1, color: GRADE_COLOR(v) + '60' },
            ]),
            borderRadius: [6, 6, 0, 0],
            shadowBlur: 8, shadowColor: GRADE_COLOR(v) + '30',
          },
        })),
        barWidth: 28,
        label: { show: true, position: 'top' as const, fontSize: 10, fontWeight: 700 as const, color: '#475569' },
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.2)' } },
      }, {
        type: 'line' as const,
        data: studentAvgs.map(() => {
          const avg = studentAvgs.reduce((a, b) => a + b, 0) / studentAvgs.length;
          return Math.round(avg * 10) / 10;
        }),
        smooth: true,
        symbol: 'none' as const,
        lineStyle: { width: 2, color: '#F59E0B', type: 'dashed' as const },
        z: 10,
      }],
      animationDuration: 1200,
      animationEasing: 'elasticOut' as const,
    };
  }, [students]);

  /* ───────── CHART · Course Pass Rate Gauge ───────── */
  const passRateGaugeOption = useMemo(() => {
    const maxT = computeMaxTotal(activeCourse);
    const passCount = students.filter(s => {
      const t = computeCourseTotal(s.id, activeCourse);
      return maxT > 0 && t / maxT >= 0.6;
    }).length;
    const rate = Math.round(passCount / students.length * 100);
    return {
      series: [{
        type: 'gauge' as const,
        startAngle: 200,
        endAngle: -20,
        min: 0, max: 100,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#4361EE' },
              { offset: 1, color: '#05CD99' },
            ]),
          },
        },
        axisLine: {
          lineStyle: { width: 18, color: [[1, '#f1f5f9']] },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { fontSize: 12, color: '#64748b', offsetCenter: [0, '65%'] },
        detail: {
          fontSize: 28, fontWeight: 800 as const,
          offsetCenter: [0, '10%'],
          valueAnimation: true,
          color: rate >= 80 ? '#05CD99' : rate >= 60 ? '#F59E0B' : '#EF4444',
          formatter: '{value}%',
        },
        data: [{ value: rate, name: '班级合格率' }],
      }],
    };
  }, [students, activeCourse]);

  /* ───────── CHART 7 · 3D Bar (student × course dimension scores) ───────── */
  const bar3DOption = useMemo(() => {
    const dimLabels = activeCourse.rubric.map(d => d.label);
    const studentNames = students.slice(0, 8).map(s => s.name);
    const data = studentNames.map((_n, si) => {
      const s = students[si];
      const ev = activeCourse.evals[s.id];
      return dimLabels.map((_, di) => {
        const score = ev?.scores[di] ?? 0;
        const max = activeCourse.rubric[di].maxScore;
        return Math.round((score / max) * 100);
      });
    });
    return build3DBarOption({ xLabels: dimLabels, yLabels: studentNames, data, title: '学员维度成绩 3D 分析' });
  }, [activeCourse, students]);

  /* ───────── CHART 8 · 3D Scatter (attention × engagement × score) ───────── */
  const scatter3DOption = useMemo(() => {
    const pts = students.map(s => {
      const total = computeCourseTotal(s.id, activeCourse);
      return {
        name: s.name,
        x: Math.round(s.avgAttention * 100),
        y: Math.round(s.avgEngagement * 100),
        z: total,
        color: GRADE_COLOR(total),
        size: Math.max(10, s.practiceHours * 1.5),
      };
    });
    return build3DScatterOption({ students: pts, xName: '专注度%', yName: '参与度%', zName: '总分' });
  }, [students, activeCourse]);

  /* ───────── Report Tab · Student Card ───────── */
  const renderStudentCard = (s: Student) => {
    const ev = activeCourse.evals[s.id];
    const total = ev ? ev.scores.reduce((a, b) => a + b, 0) : 0;
    const gradeColor = GRADE_COLOR(total);
    const gradeLabel = GRADE_LABEL(total);
    const weakIdx = findWeakestDimIdx(s.id, activeCourse);
    const weakLabel = activeCourse.rubric[weakIdx]?.label ?? '-';

    return (
      <Col xs={12} lg={6} key={s.id}>
        <motion.div
          whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
          transition={{ duration: 0.2 }}
          onClick={() => setDetailStudent(s)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: '10px 12px',
            border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: gradeColor + '18', color: gradeColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                }}>{s.avatar}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-heading)' }}>{s.name}</span>
                    <DataLinkBadge isReal={hasRealAnalysis(s.id, activeCourse.id)} style={{ marginRight: 0 }} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.group} · {s.sessionsCount}次训练</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: gradeColor }}>{total}</div>
                <Tag color={gradeColor} style={{ border: 'none', fontSize: 9, lineHeight: '14px', marginRight: 0 }}>{gradeLabel}</Tag>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {[
                { label: '专注度', value: `${Math.round(s.avgAttention * 100)}%`, bg: '#4361EE06', color: '#4361EE' },
                { label: '参与度', value: `${Math.round(s.avgEngagement * 100)}%`, bg: '#05CD9906', color: '#05CD99' },
                { label: '掌握率', value: `${Math.round(s.knowledgeMastery * 100)}%`, bg: '#F59E0B06', color: '#F59E0B' },
              ].map(m => (
                <div key={m.label} style={{ flex: 1, background: m.bg, borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                待提升: <span style={{ color: '#EF4444', fontWeight: 600 }}>{weakLabel}</span>
              </span>
              <span style={{ fontSize: 10, color: 'var(--primary)', cursor: 'pointer' }}>查看详情 →</span>
            </div>
          </div>
        </motion.div>
      </Col>
    );
  };

  /* ───────── Render ───────── */
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
          <SafetyCertificateOutlined style={{ marginRight: 8, color: 'var(--primary)' }} />
          操作技能评估中心
        </h2>
      </div>

      {/* KPI Row */}
      <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><motion.div whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }} transition={{ duration: 0.2 }}><KPICard icon={<TeamOutlined />} color="#4361EE" label="学员总数" value={students.length} unit="人" /></motion.div></Col>
        <Col xs={12} sm={6}><motion.div whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }} transition={{ duration: 0.2 }}><KPICard icon={<ExperimentOutlined />} color="#7C3AED" label="课程数量" value={ALL_COURSES.length} unit="门" /></motion.div></Col>
        <Col xs={12} sm={6}><motion.div whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }} transition={{ duration: 0.2 }}><KPICard icon={<SafetyCertificateOutlined />} color="#05CD99" label="评估总次数" value={totalEvals + HISTORICAL_RECORDS.length} unit="次" /></motion.div></Col>
        <Col xs={12} sm={6}><motion.div whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }} transition={{ duration: 0.2 }}><KPICard icon={<TrophyOutlined />} color={GRADE_COLOR(classAvg)} label="班级均分" value={classAvg} unit="分" /></motion.div></Col>
      </Row>

      {realAnalysisCount > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<ExperimentOutlined />}
          message={`已完成 ${realAnalysisCount} 次 AI 视频分析`}
          description="分析结果已自动整合到学员档案中"
          style={{ marginBottom: 16, borderRadius: 12 }}
        />
      )}

      {/* Summary Card */}
      <Card styles={{ body: { padding: '16px 20px' } }} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} lg={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <FileTextOutlined style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-heading)' }}>皮肤科操作技能综合分析报告</span>
            </div>
            <Descriptions size="small" column={2} styles={{ label: { fontSize: 11, color: 'var(--text-muted)' }, content: { fontSize: 12, fontWeight: 600 } }}>
              <Descriptions.Item label="训练周期">2026年春季学期</Descriptions.Item>
              <Descriptions.Item label="课程阶段">基础操作训练期</Descriptions.Item>
              <Descriptions.Item label="学员人数">{students.length}人</Descriptions.Item>
              <Descriptions.Item label="评估次数">{totalEvals + HISTORICAL_RECORDS.length}次（含{HISTORICAL_RECORDS.length}条历史记录）</Descriptions.Item>
              <Descriptions.Item label="班级均分">{classAvg}分</Descriptions.Item>
              <Descriptions.Item label="累计时长">{students.reduce((s, st) => s + st.practiceHours, 0).toFixed(1)}h</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag color="#05CD99" style={{ border: 'none' }}>优势: {strongest.label} ({strongest.avgPct}%)</Tag>
              <Tag color="#EF4444" style={{ border: 'none' }}>薄弱: {weakest.label} ({weakest.avgPct}%)</Tag>
            </div>
          </Col>
          <Col xs={24} lg={8}>
            {[
              { label: '整体评价', color: GRADE_COLOR(classAvg), text: `班级整体表现${GRADE_LABEL(classAvg)}，均分${classAvg}分，多数学员达到基本要求。` },
              { label: '教学建议', color: '#4361EE', text: `建议加强「${weakest.label}」维度的专项训练，安排补充练习。` },
              { label: '重点关注', color: '#F59E0B', text: `${students.filter(s => computeCourseTotal(s.id, activeCourse) < 70).map(s => s.name).join('、') || '暂无'}需要额外关注。` },
            ].map(item => (
              <div key={item.label} style={{
                padding: '8px 12px', marginBottom: 6,
                borderLeft: `3px solid ${item.color}`, borderRadius: '0 8px 8px 0',
                background: item.color + '06',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: item.color, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.text}</div>
              </div>
            ))}
          </Col>
        </Row>
      </Card>

      {/* Student Cards Section */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><SolutionOutlined style={{ marginRight: 6 }} />学员训练档案</span>
            <Space>
              <Text style={{ fontSize: 11, color: 'var(--text-muted)' }}>课程：</Text>
              <Segmented
                size="small"
                value={activeCourseId}
                onChange={v => setActiveCourseId(v as string)}
                options={ALL_COURSES.map(c => ({ value: c.id, label: c.shortName }))}
              />
            </Space>
          </div>
        }
        styles={{ body: { padding: '12px 16px' } }}
        style={{ marginBottom: 16 }}
      >
        <div style={{
          background: '#4361EE06', border: '1px solid #4361EE12',
          borderRadius: 12, padding: '12px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-heading)' }}>{activeCourse.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {activeCourse.rubric.map(d => d.label).join(' · ')} · 满分 {computeMaxTotal(activeCourse)} 分
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: GRADE_COLOR(classAvg) }}>{classAvg}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>班级均分</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Tag color="#05CD99" style={{ border: 'none', fontSize: 11 }}>{strongest.label} {strongest.avgPct}%</Tag>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>最强</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Tag color="#EF4444" style={{ border: 'none', fontSize: 11 }}>{weakest.label} {weakest.avgPct}%</Tag>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>待提升</div>
            </div>
          </div>
        </div>

        <Row gutter={[10, 10]}>
          {students.map(s => renderStudentCard(s))}
        </Row>
      </Card>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        {/* Row 1 — Rose + Sunburst */}
        <Col xs={24} lg={16}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
            <Card title={<span><RiseOutlined style={{ marginRight: 6 }} />各维度技能玫瑰图</span>} styles={{ body: { padding: 12 } }}>
              <ReactECharts option={roseChartOption} style={{ height: 240 }} onEvents={chartEvents.rose} />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}>
            <Card title="课程训练旭日图" styles={{ body: { padding: 12 } }}>
              <ReactECharts option={sunburstOption} style={{ height: 240 }} onEvents={chartEvents.sunburst} />
            </Card>
          </motion.div>
        </Col>

        {/* Row 2 — Stacked Area + Tree */}
        <Col xs={24} lg={14}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}>
            <Card title="重点学员成长面积图" styles={{ body: { padding: 12 } }}>
              <ReactECharts option={areaChartOption} style={{ height: 220 }} onEvents={chartEvents.growth} />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}>
            <Card title="知识技能流向树" styles={{ body: { padding: 12 } }}>
              <ReactECharts option={treeOption} style={{ height: 280 }} onEvents={chartEvents.tree} />
            </Card>
          </motion.div>
        </Col>

        {/* Row 3 — Scatter + Heatmap */}
        <Col xs={24} lg={12}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.25 }}>
            <Card title={<span><DotChartOutlined style={{ marginRight: 6 }} />学员能力散点图</span>} styles={{ body: { padding: 12 } }}>
              <ReactECharts option={scatterOption} style={{ height: 240 }} onEvents={chartEvents.scatter} />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={12}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}>
            <Card title={<span><HeatMapOutlined style={{ marginRight: 6 }} />学员维度热力图</span>} styles={{ body: { padding: 12 } }}>
              <ReactECharts option={heatmapOption} style={{ height: 240 }} onEvents={chartEvents.heatmap} />
            </Card>
          </motion.div>
        </Col>

        {/* Row 3.5 — Grade Distribution + Historical + Gauge */}
        <Col xs={24} lg={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.32 }}>
            <Card title="等级分布" styles={{ body: { padding: 12 } }}>
              <ReactECharts option={donutOption} style={{ height: 240 }} />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.34 }}>
            <Card title={<span><HistoryOutlined style={{ marginRight: 6 }} />历史训练平均分</span>} styles={{ body: { padding: 12 } }}>
              <ReactECharts option={historicalBarOption} style={{ height: 240 }} />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.36 }}>
            <Card title="合格率" styles={{ body: { padding: 12 } }}>
              <ReactECharts option={passRateGaugeOption} style={{ height: 240 }} />
            </Card>
          </motion.div>
        </Col>

        {/* Row 4 — 3D Charts */}
        <Col xs={24} lg={14}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.35 }}>
            <Card title={<span style={{ fontWeight: 700 }}>📊 3D 学员维度成绩分析</span>} styles={{ body: { padding: 8 } }}>
              <ReactECharts option={bar3DOption} style={{ height: 280 }} />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}>
            <Card title={<span style={{ fontWeight: 700 }}>🌐 3D 学员能力空间分布</span>} styles={{ body: { padding: 8 } }}>
              <ReactECharts option={scatter3DOption} style={{ height: 280 }} />
            </Card>
          </motion.div>
        </Col>
      </Row>

      <AIInsightCard
        title="AI 班级分析洞察"
        insights={(() => {
          const ins: string[] = [];
          ins.push(`班级在「${strongest.label}」维度表现最佳（均值${strongest.avgPct}%），「${weakest.label}」维度最薄弱（均值${weakest.avgPct}%）。`);
          const atRisk = STUDENTS.filter(s => {
            const t = computeCourseTotal(s.id, activeCourse);
            const m = computeMaxTotal(activeCourse);
            return m > 0 && t / m < 0.6;
          });
          if (atRisk.length > 0) {
            ins.push(`${atRisk.length} 名学员成绩低于及格线，需重点关注：${atRisk.map(s => s.name).join('、')}。`);
          } else {
            ins.push('全部学员成绩达到及格线，班级整体表现良好。');
          }
          if (realAnalysisCount > 0) {
            ins.push(`已完成 ${realAnalysisCount} 次 AI 视频分析，数据持续丰富中。`);
          }
          return ins;
        })()}
        type={(() => {
          const atRisk = STUDENTS.filter(s => {
            const m = computeMaxTotal(activeCourse);
            return m > 0 && computeCourseTotal(s.id, activeCourse) / m < 0.6;
          });
          return atRisk.length > 2 ? 'warning' : atRisk.length > 0 ? 'info' : 'success';
        })()}
        style={{ marginTop: 18 }}
      />

      <StudentDetailModal
        student={detailStudent}
        students={students}
        course={activeCourse}
        open={!!detailStudent}
        onClose={() => setDetailStudent(null)}
      />
    </div>
  );
};

export default EvalCenter;
