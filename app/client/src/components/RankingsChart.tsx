// Rankings Chart Component
// Displays score trends over time using ECharts

import ReactECharts from 'echarts-for-react';
import type { ModelTrend } from '../lib/api';

interface RankingsChartProps {
  trends: ModelTrend[];
}

// Color palette for chart lines
const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export function RankingsChart({ trends }: RankingsChartProps) {
  // Build series data for each model
  const series = trends.map((trend, index) => ({
    name: trend.modelName,
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: {
      width: 2,
    },
    data: trend.scores.map((score) => [score.date, score.score]),
    itemStyle: {
      color: CHART_COLORS[index % CHART_COLORS.length],
    },
  }));

  // Get all unique dates sorted
  const allDates = Array.from(
    new Set(trends.flatMap((t) => t.scores.map((s) => s.date)))
  ).sort();

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: {
        color: '#f3f4f6',
      },
      formatter: (params: Array<{ seriesName: string; value: [string, number]; color: string }>) => {
        if (!params.length) return '';
        const date = new Date(params[0].value[0]).toLocaleDateString();
        let html = `<div class="font-semibold mb-1">${date}</div>`;
        params.forEach((p) => {
          html += `<div class="flex items-center gap-2">
            <span style="background:${p.color}" class="w-2 h-2 rounded-full inline-block"></span>
            <span>${p.seriesName}:</span>
            <span class="font-mono">${p.value[1].toFixed(1)}</span>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      data: trends.map((t) => t.modelName),
      bottom: 0,
      textStyle: {
        color: '#9ca3af',
      },
      pageTextStyle: {
        color: '#9ca3af',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      axisLine: {
        lineStyle: {
          color: '#4b5563',
        },
      },
      axisLabel: {
        color: '#9ca3af',
        formatter: (value: number) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: {
        lineStyle: {
          color: '#4b5563',
        },
      },
      axisLabel: {
        color: '#9ca3af',
      },
      splitLine: {
        lineStyle: {
          color: '#374151',
        },
      },
    },
    series,
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '300px', width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
