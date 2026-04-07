/**
 * Enhanced pseudo-3D chart builders using standard ECharts.
 * Replaces echarts-gl (incompatible with echarts v6) with visually rich 2D alternatives.
 */

export const CHART_3D_COLORS = [
  '#4361EE', '#7C3AED', '#05CD99', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#8B5CF6', '#10B981', '#F97316',
];

/**
 * Enhanced grouped bar chart with gradient fills simulating 3D depth.
 */
export function build3DBarOption(params: {
  xLabels: string[];
  yLabels: string[];
  data: number[][];
  title?: string;
}): Record<string, unknown> {
  const { xLabels, yLabels, data, title } = params;

  const series = yLabels.map((name, yi) => ({
    name,
    type: 'bar' as const,
    data: xLabels.map((_, xi) => data[yi]?.[xi] ?? 0),
    barWidth: Math.max(8, Math.floor(60 / yLabels.length)),
    itemStyle: {
      color: {
        type: 'linear' as const,
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: CHART_3D_COLORS[yi % CHART_3D_COLORS.length] },
          { offset: 1, color: CHART_3D_COLORS[yi % CHART_3D_COLORS.length] + '60' },
        ],
      },
      borderRadius: [4, 4, 0, 0],
      shadowColor: CHART_3D_COLORS[yi % CHART_3D_COLORS.length] + '40',
      shadowBlur: 6,
      shadowOffsetY: 2,
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 12,
        shadowColor: CHART_3D_COLORS[yi % CHART_3D_COLORS.length] + '80',
      },
    },
  }));

  return {
    title: title
      ? { text: title, textStyle: { fontSize: 13, fontWeight: 700, color: '#2B3674' }, left: 16, top: 8 }
      : undefined,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 10 },
      type: 'scroll' as const,
    },
    grid: { top: title ? 50 : 30, bottom: 50, left: 50, right: 20 },
    xAxis: {
      type: 'category' as const,
      data: xLabels,
      axisLabel: { fontSize: 10, interval: 0, rotate: xLabels.length > 5 ? 20 : 0 },
    },
    yAxis: {
      type: 'value' as const,
      max: 100,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { color: '#E9EDF720' } },
    },
    series,
    animationDuration: 1200,
    animationEasing: 'elasticOut' as const,
  };
}

/**
 * Enhanced scatter plot with visual depth (size + shadow).
 */
export function build3DScatterOption(params: {
  students: Array<{
    name: string;
    x: number;
    y: number;
    z: number;
    color: string;
    size: number;
  }>;
  xName: string;
  yName: string;
  zName: string;
}): Record<string, unknown> {
  const { students, xName, yName, zName } = params;

  return {
    tooltip: {
      formatter: (p: { data: { value: number[]; name: string } }) => {
        const d = p.data;
        return `<b>${d.name}</b><br/>${xName}: ${d.value[0]}%<br/>${yName}: ${d.value[1]}%<br/>${zName}: ${d.value[2]}`;
      },
    },
    grid: { top: 30, bottom: 40, left: 55, right: 30 },
    xAxis: {
      type: 'value' as const,
      name: xName,
      nameTextStyle: { fontSize: 11, color: '#707EAE' },
      axisLabel: { fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#E9EDF740' } },
    },
    yAxis: {
      type: 'value' as const,
      name: yName,
      nameTextStyle: { fontSize: 11, color: '#707EAE' },
      axisLabel: { fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#E9EDF740' } },
    },
    visualMap: {
      show: true,
      dimension: 2,
      min: Math.min(...students.map((s) => s.z)),
      max: Math.max(...students.map((s) => s.z)),
      text: [`${zName}高`, `${zName}低`],
      textStyle: { fontSize: 10 },
      inRange: { color: ['#EF4444', '#F59E0B', '#4361EE', '#05CD99'] },
      right: 10,
      top: 'center',
    },
    series: [
      {
        type: 'scatter' as const,
        symbolSize: (val: number[], p: { dataIndex: number }) =>
          Math.max(14, students[p.dataIndex].size),
        data: students.map((s) => ({
          value: [s.x, s.y, s.z],
          name: s.name,
          itemStyle: {
            color: s.color,
            shadowBlur: 10,
            shadowColor: s.color + '60',
            borderColor: '#fff',
            borderWidth: 1.5,
          },
        })),
        emphasis: {
          scale: 1.4,
          label: {
            show: true,
            formatter: (p: { data: { name: string } }) => p.data.name,
            fontSize: 11,
            fontWeight: 700,
            color: '#2B3674',
          },
        },
      },
    ],
    animationDuration: 1000,
    animationEasing: 'elasticOut' as const,
  };
}

/**
 * Enhanced heatmap simulating a surface view.
 */
export function build3DSurfaceOption(params: {
  xLabels: string[];
  yLabels: string[];
  data: number[][];
  title?: string;
}): Record<string, unknown> {
  const { xLabels, yLabels, data, title } = params;

  const heatmapData: [number, number, number][] = [];
  for (let yi = 0; yi < yLabels.length; yi++) {
    for (let xi = 0; xi < xLabels.length; xi++) {
      heatmapData.push([xi, yi, data[yi]?.[xi] ?? 0]);
    }
  }

  return {
    title: title
      ? { text: title, textStyle: { fontSize: 13, fontWeight: 700, color: '#2B3674' }, left: 16, top: 8 }
      : undefined,
    tooltip: {
      formatter: (p: { value: number[] }) => {
        const [xi, yi, val] = p.value;
        return `${yLabels[yi]} · ${xLabels[xi]}<br/>得分率: <b>${val}%</b>`;
      },
    },
    grid: { top: title ? 50 : 20, bottom: 40, left: 90, right: 60 },
    xAxis: {
      type: 'category' as const,
      data: xLabels,
      axisLabel: { fontSize: 10, interval: 0, rotate: xLabels.length > 5 ? 15 : 0 },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category' as const,
      data: yLabels,
      axisLabel: { fontSize: 10 },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'vertical' as const,
      right: 6,
      top: 'center',
      inRange: {
        color: ['#EF444430', '#F59E0B50', '#4361EE70', '#05CD9990'],
      },
      textStyle: { fontSize: 10 },
    },
    series: [
      {
        type: 'heatmap' as const,
        data: heatmapData,
        label: {
          show: true,
          fontSize: 10,
          fontWeight: 600,
          formatter: (p: { value: number[] }) => `${p.value[2]}`,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(67,97,238,0.4)',
            borderColor: '#4361EE',
            borderWidth: 2,
          },
        },
        itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
      },
    ],
    animationDuration: 800,
  };
}
