<script lang="ts">
  import EChart from '$lib/components/EChart.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { computeRollingAverage } from '$lib/utils/stats';
  import {
    aggregateRecordsByTime,
    computeAggregatedRollingStats,
    computeAggregatedSpeedTrend,
    formatDuration
  } from '$lib/utils/timeAggregation';
  import { computeSpeedMilestones } from '$lib/utils/speedMilestones';
  import type { TimeGranularity, DrillStep, AggregatedBucket } from '$lib/types';
  import {
    Zap,
    TrendingDown,
    TrendingUp,
    Calendar,
    ArrowLeft,
    Clock,
    Layers,
    RotateCcw,
    ChevronRight,
    HelpCircle,
    CalendarDays,
    ListFilter
  } from 'lucide-svelte';
  import type { EChartsOption } from 'echarts';

  // View mode: 'aggregated' (normal calendar time) | 'individual' (raw test-by-test) | 'both'
  let viewMode = $state<'aggregated' | 'individual' | 'both'>('aggregated');

  // Aggregation level: 'month' | 'week' | 'day' | 'hour'
  let granularity = $state<TimeGranularity>('day');

  // Whether to include empty days/weeks/months with 0 tests for true calendar spacing
  let includeRestDays = $state<boolean>(true);

  // Drill-down stack
  let drillHistory = $state<DrillStep[]>([]);
  const currentDrill = $derived(drillHistory.length > 0 ? drillHistory[drillHistory.length - 1] : null);

  const rawRecords = $derived(recordsStore.filteredRecords);
  const speedMilestones = $derived(computeSpeedMilestones(recordsStore.allRecords));
  const pbGuanidMap = $derived(speedMilestones.pbGuanidMap);

  // Aggregated buckets based on filtered records, granularity, rest-days setting, and active drill step
  const aggregatedBuckets = $derived.by<AggregatedBucket[]>(() => {
    return aggregateRecordsByTime(rawRecords, granularity, includeRestDays, currentDrill);
  });

  // Rolling statistics for aggregated buckets (7 periods for day/hour, 4 for week, 3 for month)
  const aggregatedRollingStats = $derived.by(() => {
    const windowSize = granularity === 'month' ? 3 : granularity === 'week' ? 4 : 7;
    return computeAggregatedRollingStats(aggregatedBuckets, windowSize);
  });

  // Speed linear trend stats for aggregated buckets
  const aggregatedSpeedTrend = $derived.by(() => {
    return computeAggregatedSpeedTrend(aggregatedBuckets);
  });

  // Speed linear trend stats for individual test records
  const individualSpeedTrend = $derived.by(() => {
    if (rawRecords.length < 2) {
      return { slope: 0, speedChange: 0, startSpeed: 0, endSpeed: 0 };
    }
    const speeds = rawRecords.map((r) => r.secondsPerProblem);
    const n = speeds.length;
    let sumX = 0;
    let sumY = 0;
    speeds.forEach((y, x) => {
      sumX += x;
      sumY += y;
    });
    const meanX = sumX / n;
    const meanY = sumY / n;
    let ssXX = 0;
    let ssXY = 0;
    speeds.forEach((y, x) => {
      ssXX += (x - meanX) ** 2;
      ssXY += (x - meanX) * (y - meanY);
    });
    const slope = ssXX > 0 ? ssXY / ssXX : 0;
    const startSpeed = Number((meanY - slope * meanX).toFixed(1));
    const endSpeed = Number((startSpeed + slope * (n - 1)).toFixed(1));
    const speedChange = Number((endSpeed - startSpeed).toFixed(1));

    return { slope, speedChange, startSpeed, endSpeed };
  });

  function selectGranularity(g: TimeGranularity) {
    granularity = g;
    // If user manually switches to month or week while drilled down into a specific day, clear drill
    if ((g === 'month' || g === 'week') && currentDrill?.level === 'day') {
      drillHistory = [];
    }
  }

  function handleAggregatedChartClick(params: any) {
    if (!params || params.dataIndex === undefined) return;
    const idx = params.dataIndex;
    const bucket = aggregatedBuckets[idx];
    if (!bucket || bucket.testsCount === 0) return;

    if (granularity === 'month') {
      drillHistory = [
        ...drillHistory,
        { level: 'month', key: bucket.key, label: bucket.label }
      ];
      granularity = 'day';
    } else if (granularity === 'week') {
      drillHistory = [
        ...drillHistory,
        { level: 'week', key: bucket.key, label: bucket.label }
      ];
      granularity = 'day';
    } else if (granularity === 'day') {
      drillHistory = [
        ...drillHistory,
        { level: 'day', key: bucket.key, label: bucket.label }
      ];
      granularity = 'hour';
    } else if (granularity === 'hour') {
      viewMode = 'individual';
    }
  }

  function drillUp() {
    if (drillHistory.length > 0) {
      drillHistory = drillHistory.slice(0, -1);
      if (drillHistory.length === 0) {
        granularity = 'day';
      } else {
        const last = drillHistory[drillHistory.length - 1];
        if (last.level === 'month' || last.level === 'week') {
          granularity = 'day';
        }
      }
    }
  }

  function drillToRoot() {
    drillHistory = [];
    granularity = 'day';
  }

  function drillToStep(index: number) {
    if (index < 0) {
      drillToRoot();
      return;
    }
    drillHistory = drillHistory.slice(0, index + 1);
    const target = drillHistory[drillHistory.length - 1];
    if (target.level === 'month' || target.level === 'week') {
      granularity = 'day';
    } else if (target.level === 'day') {
      granularity = 'hour';
    }
  }

  // --- ECharts Options: Aggregated Time Series ---
  const aggregatedChartOptions = $derived.by<EChartsOption>(() => {
    if (aggregatedBuckets.length === 0) {
      return {
        title: {
          text: 'No test records in the selected period',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#5e4537', fontSize: 14 }
        }
      };
    }

    const labels = aggregatedBuckets.map((b) => b.shortLabel);
    const rawAccuracies = aggregatedBuckets.map((b) => b.accuracyPct);
    const rollingAccuracies = aggregatedRollingStats.rollingAccuracies;
    const speeds = aggregatedBuckets.map((b) => b.avgSecondsPerProblem);
    const speedTrendline = aggregatedSpeedTrend.trendline;
    const testVolumes = aggregatedBuckets.map((b) => b.testsCount);
    const maxTests = Math.max(...testVolumes, 1);

    const rollingLabel = granularity === 'month'
      ? '3-Mo Avg'
      : granularity === 'week'
      ? '4-Wk Avg'
      : '7-Day Avg';

    const drillHint = granularity === 'month'
      ? '💡 Click to drill down into days'
      : granularity === 'week'
      ? '💡 Click to drill down into days'
      : granularity === 'day'
      ? '💡 Click to drill down into hours'
      : '💡 Click to view individual tests';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#3D2A1F',
        borderColor: '#88C13F',
        borderWidth: 1,
        textStyle: { color: '#FDF5E6', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const idx = params[0].dataIndex;
          const b = aggregatedBuckets[idx];
          if (!b) return '';

          if (b.testsCount === 0) {
            return `
              <div style="font-size: 11px; line-height: 1.5;">
                <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px; color: #88C13F;">
                  ${b.label} ${b.subLabel ? `(${b.subLabel})` : ''}
                </div>
                <div style="color: #ebdcc9; font-style: italic;">No tests taken (Rest day)</div>
              </div>
            `;
          }

          const rollingAcc = rollingAccuracies[idx];
          const rollingSpd = aggregatedRollingStats.rollingSpeeds[idx];

          return `
            <div style="font-size: 11px; line-height: 1.5;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px; color: #88C13F;">
                ${b.label} ${b.subLabel ? `(${b.subLabel})` : ''}
              </div>
              <div>Tests Completed: <strong>${b.testsCount}</strong> (${b.problemsCount} problems)</div>
              <div>Pass Rate: <strong style="color: #88C13F;">${b.passCount}/${b.testsCount} (${b.passRatePct}%)</strong></div>
              <div>Avg Accuracy: <strong style="color: #88C13F;">${b.accuracyPct}%</strong> ${rollingAcc !== null ? `<span style="color: #ebdcc9;">(${rollingLabel}: ${rollingAcc}%)</span>` : ''}</div>
              <div>Avg Speed: <strong style="color: #8B5E3C;">${b.avgSecondsPerProblem}s / prob</strong> ${rollingSpd !== null ? `<span style="color: #ebdcc9;">(rolling: ${rollingSpd}s)</span>` : ''}</div>
              <div>Total Time: <strong>${formatDuration(b.totalTimeSeconds)}</strong></div>
              <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #5e4537; color: #d0e8b2; font-size: 10px;">
                ${drillHint}
              </div>
            </div>
          `;
        }
      },
      legend: {
        type: 'scroll',
        top: 4,
        left: 'center',
        padding: [0, 20],
        data: [
          'Average Accuracy',
          `Rolling Accuracy (${rollingLabel})`,
          'Average Speed',
          'Speed Trendline',
          'Tests Taken (Volume)'
        ],
        textStyle: { color: '#3D2A1F', fontSize: 11 }
      },
      grid: {
        top: 60,
        left: 50,
        right: 55,
        bottom: 65
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: {
          color: '#5e4537',
          fontSize: 10,
          interval: aggregatedBuckets.length > 50 ? 'auto' : 0
        },
        axisTick: { alignWithLabel: true }
      },
      yAxis: [
        // Left: Accuracy
        {
          type: 'value',
          name: 'Accuracy (%)',
          nameTextStyle: { color: '#88C13F', fontWeight: 'bold', fontSize: 11 },
          min: 0,
          max: 100,
          axisLine: { show: true, lineStyle: { color: '#88C13F' } },
          splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
          axisLabel: { color: '#5e4537', fontSize: 10, formatter: '{value}%' }
        },
        // Right: Speed
        {
          type: 'value',
          name: 'Speed (s/prob)',
          nameLocation: 'end',
          nameGap: 12,
          nameTextStyle: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 11, align: 'right' },
          min: 0,
          axisLine: { show: true, lineStyle: { color: '#8B5E3C' } },
          splitLine: { show: false },
          axisLabel: { color: '#8B5E3C', fontSize: 10, formatter: '{value}s' }
        },
        // Right Secondary (Hidden): Volume bars scaled to occupy lower ~28% of chart
        {
          type: 'value',
          name: 'Tests Taken',
          show: false,
          min: 0,
          max: maxTests * 3.5 || 10
        }
      ],
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 10,
          height: 22,
          borderColor: '#D6BA96',
          fillerColor: 'rgba(136, 193, 63, 0.2)',
          handleStyle: { color: '#88C13F', borderColor: '#3D2A1F' },
          textStyle: { color: '#5e4537', fontSize: 10 },
          start: aggregatedBuckets.length > 40 ? 40 : 0,
          end: 100
        },
        {
          type: 'inside',
          xAxisIndex: [0]
        }
      ],
      series: [
        // 1. Tests Volume Bars (background)
        {
          name: 'Tests Taken (Volume)',
          type: 'bar',
          yAxisIndex: 2,
          data: testVolumes,
          barMaxWidth: 26,
          itemStyle: {
            color: (params: any) => {
              const b = aggregatedBuckets[params.dataIndex];
              if (!b || b.testsCount === 0) return 'transparent';
              return (b.passRatePct ?? 0) >= 80 ? 'rgba(136, 193, 63, 0.25)' : 'rgba(214, 186, 150, 0.45)';
            },
            borderRadius: [4, 4, 0, 0]
          },
          z: 1
        },
        // 2. Average Accuracy Line
        {
          name: 'Average Accuracy',
          type: 'line',
          yAxisIndex: 0,
          data: rawAccuracies,
          smooth: true,
          connectNulls: true,
          showSymbol: true,
          symbolSize: (value: any, params: any) => {
            const b = aggregatedBuckets[params.dataIndex];
            return b && b.testsCount > 0 ? 6 : 0;
          },
          lineStyle: { color: '#88C13F', width: 3 },
          itemStyle: { color: '#88C13F' },
          z: 4
        },
        // 3. Rolling Accuracy
        {
          name: `Rolling Accuracy (${rollingLabel})`,
          type: 'line',
          yAxisIndex: 0,
          data: rollingAccuracies,
          smooth: true,
          connectNulls: true,
          showSymbol: false,
          lineStyle: { color: '#55821c', width: 2, type: 'dashed' },
          itemStyle: { color: '#55821c' },
          z: 3
        },
        // 4. Average Speed Line
        {
          name: 'Average Speed',
          type: 'line',
          yAxisIndex: 1,
          data: speeds,
          smooth: true,
          connectNulls: true,
          showSymbol: true,
          symbolSize: (value: any, params: any) => {
            const b = aggregatedBuckets[params.dataIndex];
            return b && b.testsCount > 0 ? 6 : 0;
          },
          lineStyle: { color: '#8B5E3C', width: 2.5 },
          itemStyle: { color: '#8B5E3C' },
          z: 4
        },
        // 5. Speed Trendline
        {
          name: 'Speed Trendline',
          type: 'line',
          yAxisIndex: 1,
          data: speedTrendline,
          smooth: false,
          connectNulls: true,
          showSymbol: false,
          lineStyle: { color: '#6e472a', width: 2, type: 'dotted' },
          itemStyle: { color: '#6e472a' },
          z: 2
        }
      ]
    };
  });

  // --- ECharts Options: Individual Tests Timeline (Original Granular View) ---
  const individualChartOptions = $derived.by<EChartsOption>(() => {
    if (rawRecords.length === 0) {
      return {
        title: {
          text: 'No records match the current filter',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#5e4537', fontSize: 14 }
        }
      };
    }

    const dates = rawRecords.map((r) => r.formattedDate);
    const rawAccuracies = rawRecords.map((r) => r.accuracyPct);
    const rollingAccuracies = computeRollingAverage(rawAccuracies, 7);
    const speeds = rawRecords.map((r) => r.secondsPerProblem);
    const rollingSpeeds = computeRollingAverage(speeds, 7);

    const n = speeds.length;
    const slope = individualSpeedTrend.slope;
    const startSpeed = individualSpeedTrend.startSpeed;
    const speedTrendline = speeds.map((_, x) => Number((startSpeed + slope * x).toFixed(1)));

    const pbPoints = rawRecords
      .map((r, idx) => {
        const pb = pbGuanidMap.get(r.guanid);
        return pb ? [idx, r.secondsPerProblem, pb] : null;
      })
      .filter((p): p is [number, number, any] => p !== null);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#3D2A1F',
        borderColor: '#88C13F',
        borderWidth: 1,
        textStyle: { color: '#FDF5E6', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const dataIndex = params[0].dataIndex;
          const rec = rawRecords[dataIndex];
          if (!rec) return '';

          const rollingAcc = rollingAccuracies[dataIndex];
          const rollingSpd = rollingSpeeds[dataIndex];

          const statusBadge = rec.passed
            ? `<span style="color: #88C13F; font-weight: bold;">PASS</span>`
            : `<span style="color: #c84b31; font-weight: bold;">FAIL</span>`;

          const pb = pbGuanidMap.get(rec.guanid);
          const pbHtml = pb
            ? `
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(255, 184, 0, 0.5); color: #FFB800; font-size: 11px;">
                <strong>⚡ NEW SPEED RECORD (PB #${pb.recordIndex})!</strong>
                <div style="font-size: 10px; color: #FAF0DA;">
                  ${pb.isInitialRecord
                    ? `Initial baseline pass at ${pb.rankLabel}`
                    : `Beat previous by -${pb.improvementSeconds}s (-${pb.improvementPct}%) after ${pb.testsToBeat} tests (${pb.daysToBeat}d)`}
                </div>
              </div>
            `
            : '';

          return `
            <div style="font-size: 11px; line-height: 1.5;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px;">
                ${rec.formattedDate} — ${rec.rankLabel} ${statusBadge}
              </div>
              <div>Accuracy: <strong style="color: #88C13F;">${rec.oknum}/10 (${rec.accuracyPct}%)</strong> <span style="color: #ebdcc9;">(7-test avg: ${rollingAcc}%)</span></div>
              <div>Speed: <strong style="color: #8B5E3C;">${rec.secondsPerProblem}s / prob</strong> <span style="color: #ebdcc9;">(7-test avg: ${rollingSpd}s)</span></div>
              <div>Test Total: <strong>${rec.totaltime}s</strong> (Guan ID: <code>${rec.guanid}</code>)</div>
              ${pbHtml}
            </div>
          `;
        }
      },
      legend: {
        type: 'scroll',
        top: 4,
        left: 'center',
        padding: [0, 20],
        data: [
          'Rolling Accuracy (7-Test)',
          'Raw Accuracy',
          'Rolling Speed (7-Test)',
          'Speed Trendline',
          'Raw Speed',
          'Speed Record (PB)'
        ],
        textStyle: { color: '#3D2A1F', fontSize: 11 }
      },
      grid: {
        top: 60,
        left: 50,
        right: 55,
        bottom: 65
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: {
          color: '#5e4537',
          fontSize: 10,
          formatter: (val: string) => {
            const parts = val.split(',');
            return parts[0] || val;
          }
        },
        axisTick: { alignWithLabel: true }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Accuracy (%)',
          nameTextStyle: { color: '#88C13F', fontWeight: 'bold', fontSize: 11 },
          min: 0,
          max: 100,
          axisLine: { show: true, lineStyle: { color: '#88C13F' } },
          splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
          axisLabel: { color: '#5e4537', fontSize: 10, formatter: '{value}%' }
        },
        {
          type: 'value',
          name: 'Speed (s/prob)',
          nameLocation: 'end',
          nameGap: 12,
          nameTextStyle: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 11, align: 'right' },
          min: 0,
          axisLine: { show: true, lineStyle: { color: '#8B5E3C' } },
          splitLine: { show: false },
          axisLabel: { color: '#8B5E3C', fontSize: 10, formatter: '{value}s' }
        }
      ],
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 10,
          height: 22,
          borderColor: '#D6BA96',
          fillerColor: 'rgba(136, 193, 63, 0.2)',
          handleStyle: { color: '#88C13F', borderColor: '#3D2A1F' },
          textStyle: { color: '#5e4537', fontSize: 10 },
          start: rawRecords.length > 50 ? 50 : 0,
          end: 100
        },
        {
          type: 'inside',
          xAxisIndex: [0]
        }
      ],
      series: [
        {
          name: 'Rolling Accuracy (7-Test)',
          type: 'line',
          data: rollingAccuracies,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#88C13F', width: 3 },
          itemStyle: { color: '#88C13F' },
          z: 4
        },
        {
          name: 'Raw Accuracy',
          type: 'scatter',
          data: rawAccuracies,
          symbolSize: 5,
          itemStyle: {
            color: (params: any) => {
              const rec = rawRecords[params.dataIndex];
              return rec?.passed ? '#88C13F' : '#c84b31';
            },
            opacity: 0.65
          },
          z: 3
        },
        {
          name: 'Rolling Speed (7-Test)',
          type: 'line',
          yAxisIndex: 1,
          data: rollingSpeeds,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#8B5E3C', width: 2.5 },
          itemStyle: { color: '#8B5E3C' },
          z: 4
        },
        {
          name: 'Speed Trendline',
          type: 'line',
          yAxisIndex: 1,
          data: speedTrendline,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: '#6e472a', width: 2, type: 'dashed' },
          itemStyle: { color: '#6e472a' },
          z: 2
        },
        {
          name: 'Raw Speed',
          type: 'line',
          yAxisIndex: 1,
          data: speeds,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: '#c49a7a', width: 1, type: 'dotted' },
          itemStyle: { color: '#c49a7a' },
          z: 1
        },
        {
          name: 'Speed Record (PB)',
          type: 'scatter',
          yAxisIndex: 1,
          data: pbPoints,
          symbol: 'diamond',
          symbolSize: 11,
          itemStyle: {
            color: '#FFB800',
            borderColor: '#FAF0DA',
            borderWidth: 2,
            shadowColor: 'rgba(255, 184, 0, 0.6)',
            shadowBlur: 6
          },
          z: 6
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs space-y-3">
  <!-- Card Header -->
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
    <div>
      <div class="flex items-center gap-2">
        <CalendarDays class="w-4 h-4 text-[#8B5E3C]" />
        <h3 class="text-sm font-bold text-[#3D2A1F]">
          Timeline & Progression
        </h3>
        {#if currentDrill}
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#88C13F]/20 text-[#55821c] text-[10px] font-bold">
            Drilled: {currentDrill.label}
          </span>
        {/if}
      </div>
      <p class="text-[11px] text-[#5e4537] mt-0.5">
        {#if viewMode === 'aggregated'}
          Tests aggregated by {granularity} on a normal calendar scale. Click any bar or data point to drill down!
        {:else if viewMode === 'individual'}
          Every individual checkpoint test plotted chronologically with 7-test rolling averages.
        {:else}
          Comparing calendar-aggregated progression (top) with raw individual test sequence (bottom).
        {/if}
      </p>
    </div>

    <!-- Right Side: Speed Trend Chip -->
    {#if rawRecords.length >= 4}
      {@const trend = viewMode === 'aggregated' ? aggregatedSpeedTrend : individualSpeedTrend}
      <div class="inline-flex items-center gap-2 bg-[#FDF5E6] border border-[#D6BA96] px-3 py-1.5 rounded-lg text-xs self-start lg:self-auto shadow-xs">
        <Zap class="w-3.5 h-3.5 text-[#8B5E3C]" />
        <span class="text-[#5e4537]">
          Speed Trend:
          <strong class="{trend.speedChange <= 0 ? 'text-[#88C13F]' : 'text-[#c84b31]'}">
            {trend.speedChange <= 0 ? `${trend.speedChange}s` : `+${trend.speedChange}s`} / prob
          </strong>
        </span>
        <span class="text-[10px] text-[#5e4537] font-medium">
          ({trend.startSpeed}s → {trend.endSpeed}s)
        </span>
      </div>
    {/if}
  </div>

  <!-- Interactive Controls Toolbar -->
  <div class="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-[#D6BA96]/60">
    <!-- View Mode Selector -->
    <div class="flex items-center gap-1">
      <span class="text-[11px] font-bold text-[#5e4537] mr-1 hidden sm:inline">View:</span>
      <div class="inline-flex rounded-lg border border-[#D6BA96] bg-[#FDF5E6] p-0.5 shadow-xs">
        <button
          onclick={() => (viewMode = 'aggregated')}
          class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 {viewMode === 'aggregated' ? 'bg-[#88C13F] text-white font-bold' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
          title="Aggregate tests into standard time intervals (Day, Week, Month, Hour) with true calendar scaling"
        >
          <Calendar class="w-3.5 h-3.5" />
          <span>Aggregated</span>
        </button>
        <button
          onclick={() => (viewMode = 'individual')}
          class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 {viewMode === 'individual' ? 'bg-[#88C13F] text-white font-bold' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
          title="Plot every individual test result sequentially"
        >
          <Layers class="w-3.5 h-3.5" />
          <span>Individual Tests</span>
        </button>
        <button
          onclick={() => (viewMode = 'both')}
          class="px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {viewMode === 'both' ? 'bg-[#88C13F] text-white font-bold' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
          title="Display both the aggregated calendar timeline and individual test sequence stacked"
        >
          <span>Both</span>
        </button>
      </div>
    </div>

    <!-- Granularity & Calendar Rest Days (Active in Aggregated or Both mode) -->
    {#if viewMode === 'aggregated' || viewMode === 'both'}
      <div class="flex flex-wrap items-center gap-2">
        <!-- Granularity Selector -->
        <div class="flex items-center gap-1">
          <span class="text-[11px] font-bold text-[#5e4537] mr-1 hidden sm:inline">Group By:</span>
          <div class="inline-flex rounded-lg border border-[#D6BA96] bg-[#FDF5E6] p-0.5 shadow-xs">
            <button
              onclick={() => selectGranularity('month')}
              class="px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {granularity === 'month' ? 'bg-[#8B5E3C] text-white font-bold' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
            >
              Month
            </button>
            <button
              onclick={() => selectGranularity('week')}
              class="px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {granularity === 'week' ? 'bg-[#8B5E3C] text-white font-bold' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
            >
              Week
            </button>
            <button
              onclick={() => selectGranularity('day')}
              class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {granularity === 'day' ? 'bg-[#8B5E3C] text-white font-bold' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
            >
              Day
            </button>
            <button
              onclick={() => selectGranularity('hour')}
              class="px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {granularity === 'hour' ? 'bg-[#8B5E3C] text-white font-bold' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
            >
              Hour
            </button>
          </div>
        </div>

        <!-- Rest Days Toggle (for Day / Hour views) -->
        <label class="inline-flex items-center gap-1.5 text-xs text-[#5e4537] bg-[#FDF5E6] border border-[#D6BA96] px-2.5 py-1 rounded-lg cursor-pointer select-none hover:bg-[#F4E7CE] transition-colors" title="Preserve calendar spacing by showing rest days with zero tests">
          <input
            type="checkbox"
            bind:checked={includeRestDays}
            class="rounded text-[#88C13F] focus:ring-[#88C13F] h-3.5 w-3.5 cursor-pointer accent-[#88C13F]"
          />
          <span class="text-[11px] font-medium">Calendar Spacing</span>
        </label>
      </div>
    {/if}
  </div>

  <!-- Breadcrumb Navigation Banner (when drilled down) -->
  {#if drillHistory.length > 0}
    <div class="flex items-center justify-between bg-[#FDF5E6] border border-[#88C13F]/50 rounded-lg px-3 py-2 text-xs shadow-2xs">
      <div class="flex items-center gap-2 overflow-x-auto py-0.5">
        <button
          onclick={drillUp}
          class="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#FAF0DA] hover:bg-[#F4E7CE] border border-[#D6BA96] text-[#3D2A1F] font-medium cursor-pointer transition-colors"
          title="Drill up to previous level"
        >
          <ArrowLeft class="w-3.5 h-3.5 text-[#8B5E3C]" />
          <span>Back</span>
        </button>

        <div class="flex items-center gap-1 text-[#5e4537]">
          <button
            onclick={drillToRoot}
            class="font-medium hover:text-[#88C13F] hover:underline cursor-pointer"
          >
            All Dates
          </button>

          {#each drillHistory as step, idx}
            <ChevronRight class="w-3.5 h-3.5 text-[#D6BA96]" />
            {#if idx === drillHistory.length - 1}
              <span class="font-bold text-[#3D2A1F] bg-[#FAF0DA] px-2 py-0.5 rounded border border-[#D6BA96]">
                {step.label}
              </span>
            {:else}
              <button
                onclick={() => drillToStep(idx)}
                class="font-medium hover:text-[#88C13F] hover:underline cursor-pointer"
              >
                {step.label}
              </button>
            {/if}
          {/each}
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 ml-2">
        <span class="text-[11px] text-[#5e4537] hidden sm:inline">
          {aggregatedBuckets.reduce((sum, b) => sum + b.testsCount, 0)} tests in scope
        </span>
        <button
          onclick={drillToRoot}
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B5E3C] hover:text-[#3D2A1F] hover:underline cursor-pointer"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Reset Zoom</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- Chart Display Area -->
  {#if viewMode === 'aggregated'}
    <div>
      <EChart
        options={aggregatedChartOptions}
        height="350px"
        onchartclick={handleAggregatedChartClick}
      />
      <div class="flex items-center justify-between text-[10px] text-[#5e4537] px-2 pt-1 border-t border-[#D6BA96]/40">
        <span class="flex items-center gap-1">
          <HelpCircle class="w-3 h-3 text-[#8B5E3C]" />
          <span>Click any bar or line point to drill down. Drag bottom slider to zoom.</span>
        </span>
        <span>
          Showing {aggregatedBuckets.length} {granularity} {aggregatedBuckets.length === 1 ? 'bucket' : 'buckets'}
        </span>
      </div>
    </div>
  {:else if viewMode === 'individual'}
    <div>
      <EChart options={individualChartOptions} height="350px" />
      <div class="flex items-center justify-between text-[10px] text-[#5e4537] px-2 pt-1 border-t border-[#D6BA96]/40">
        <span>Raw test sequence. Green dots = Passed, Red dots = Failed.</span>
        <span>{rawRecords.length} total tests</span>
      </div>
    </div>
  {:else}
    <!-- Both Views Stacked -->
    <div class="space-y-4">
      <div class="border-b border-[#D6BA96] pb-3">
        <div class="text-xs font-bold text-[#3D2A1F] mb-1 flex items-center gap-1.5">
          <Calendar class="w-3.5 h-3.5 text-[#88C13F]" />
          <span>Calendar-Aggregated Timeline (By {granularity})</span>
        </div>
        <EChart
          options={aggregatedChartOptions}
          height="320px"
          onchartclick={handleAggregatedChartClick}
        />
      </div>

      <div>
        <div class="text-xs font-bold text-[#3D2A1F] mb-1 flex items-center gap-1.5">
          <Layers class="w-3.5 h-3.5 text-[#8B5E3C]" />
          <span>Raw Test-by-Test Progression</span>
        </div>
        <EChart options={individualChartOptions} height="320px" />
      </div>
    </div>
  {/if}
</div>
