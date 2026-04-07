import type React from 'react';

// ---------------------------------------------------------------------------
// 1. Color palette
// ---------------------------------------------------------------------------

export const CHART_COLORS = [
  '#4361EE', '#7C3AED', '#05CD99', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#8B5CF6', '#10B981', '#F97316',
  '#3B82F6', '#14B8A6',
] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function colorWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// 2. Gradient builder
// ---------------------------------------------------------------------------

export interface EChartsLinearGradient {
  type: 'linear';
  x: number;
  y: number;
  x2: number;
  y2: number;
  colorStops: Array<{ offset: number; color: string }>;
}

export function makeGradient(
  color: string,
  direction: 'vertical' | 'horizontal' = 'vertical',
): EChartsLinearGradient {
  const isVertical = direction === 'vertical';
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: isVertical ? 0 : 1,
    y2: isVertical ? 1 : 0,
    colorStops: [
      { offset: 0, color: colorWithAlpha(color, 0.35) },
      { offset: 1, color: colorWithAlpha(color, 0.02) },
    ],
  };
}

// ---------------------------------------------------------------------------
// 3. Global ECharts theme (registerTheme-compatible)
// ---------------------------------------------------------------------------

export const GLOBAL_CHART_THEME: Record<string, unknown> = {
  color: [...CHART_COLORS],

  animationDuration: 1200,
  animationEasing: 'elasticOut',
  animationDelay: (idx: number) => idx * 60,

  grid: {
    top: 32,
    right: 16,
    bottom: 36,
    left: 48,
    containLabel: false,
  },

  categoryAxis: {
    axisLine: { show: true, lineStyle: { color: '#E9EDF7' } },
    axisTick: { show: false },
    axisLabel: { color: '#8C8C8C', fontSize: 11 },
    splitLine: { show: false },
  },

  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#8C8C8C', fontSize: 11 },
    splitLine: { lineStyle: { color: '#E9EDF7', type: 'dashed' as const } },
  },

  tooltip: {
    trigger: 'axis' as const,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: { color: '#2B3674', fontSize: 12 },
    extraCssText:
      'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
      'border-radius:10px;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.08),0 2px 6px rgba(0,0,0,0.04);',
  },

  legend: {
    type: 'scroll' as const,
    bottom: 0,
    textStyle: { fontSize: 11, color: '#8C8C8C' },
    icon: 'roundRect',
    itemWidth: 12,
    itemHeight: 8,
    itemGap: 16,
  },

  bar: {
    itemStyle: { borderRadius: [4, 4, 0, 0] },
  },

  line: {
    smooth: true,
    symbolSize: 6,
    lineStyle: { width: 2.5 },
  },
};

// ---------------------------------------------------------------------------
// 4. Staggered animation per series
// ---------------------------------------------------------------------------

export function applyChartAnimation(seriesIdx: number) {
  return {
    animationDuration: 1200,
    animationEasing: 'elasticOut' as const,
    animationDelay: (idx: number) => idx * 60 + seriesIdx * 300,
  };
}

// ---------------------------------------------------------------------------
// 5. Tooltip formatter
// ---------------------------------------------------------------------------

interface TooltipParam {
  marker: string;
  seriesName: string;
  value: number | string;
  axisValueLabel?: string;
}

export function makeTooltipFormatter(unit = '') {
  return (params: TooltipParam | TooltipParam[]) => {
    const list = Array.isArray(params) ? params : [params];
    if (list.length === 0) return '';

    const header = list[0].axisValueLabel ?? '';
    const rows = list.map(
      (p) =>
        `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">${p.marker}<span style="flex:1;font-size:12px;color:#707EAE">${p.seriesName}</span><b style="font-size:13px;color:#2B3674">${p.value}${unit}</b></div>`,
    );

    return `<div style="min-width:140px"><div style="font-size:12px;font-weight:600;color:#2B3674;margin-bottom:6px">${header}</div>${rows.join('')}</div>`;
  };
}

// ---------------------------------------------------------------------------
// 6. Area style helper
// ---------------------------------------------------------------------------

export function makeAreaStyle(colorIdx: number) {
  const color = CHART_COLORS[colorIdx % CHART_COLORS.length];
  return {
    areaStyle: makeGradient(color),
  };
}

// ---------------------------------------------------------------------------
// 7. Common inline styles for ReactECharts
// ---------------------------------------------------------------------------

export const ECHARTS_STYLE = { height: 320 } as const;
export const ECHARTS_STYLE_SM = { height: 240 } as const;
export const ECHARTS_STYLE_LG = { height: 400 } as const;

// ---------------------------------------------------------------------------
// 8. Glass-morphism card
// ---------------------------------------------------------------------------

export const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
};

// ---------------------------------------------------------------------------
// 9. CSS keyframe strings
// ---------------------------------------------------------------------------

export const pulseKeyframes = `
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.7; transform: scale(1.04); }
}` as const;

export const shimmerKeyframes = `
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}` as const;

// ---------------------------------------------------------------------------
// 10. Animated bar series builder
// ---------------------------------------------------------------------------

export interface BarSeriesData {
  name: string;
  value: number;
}

export function buildAnimatedBarSeries(
  data: (number | BarSeriesData)[],
  colorIdx: number,
) {
  const baseColor = CHART_COLORS[colorIdx % CHART_COLORS.length];

  return {
    type: 'bar' as const,
    data,
    barMaxWidth: 32,
    itemStyle: {
      color: {
        type: 'linear' as const,
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: baseColor },
          { offset: 1, color: colorWithAlpha(baseColor, 0.45) },
        ],
      },
      borderRadius: [6, 6, 0, 0],
      shadowColor: colorWithAlpha(baseColor, 0.25),
      shadowBlur: 8,
      shadowOffsetY: 3,
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 16,
        shadowColor: colorWithAlpha(baseColor, 0.5),
        borderColor: baseColor,
        borderWidth: 1,
      },
    },
    ...applyChartAnimation(colorIdx),
  };
}
