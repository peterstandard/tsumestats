<script lang="ts">
  import EChart from '$lib/components/EChart.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { computeSpeedMilestones } from '$lib/utils/speedMilestones';
  import { rankNumberToLabel } from '$lib/utils/rank';
  import type { SpeedRecordMilestone, RankSpeedMilestoneGroup } from '$lib/types';
  import type { EChartsOption } from 'echarts';
  import {
    Zap,
    Flame,
    Trophy,
    Clock,
    TrendingDown,
    Layers,
    Calendar,
    Hash,
    ChevronDown,
    ChevronUp,
    ExternalLink
  } from 'lucide-svelte';

  // Selected rank filter: 'all' or rankNumber
  let selectedRank = $state<number | 'all'>('all');

  // Secondary bar metric: 'tests' (attempts to beat) | 'days' (calendar time to beat)
  let barMetric = $state<'tests' | 'days'>('tests');

  // Table collapse toggle
  let showHistoryLog = $state(false);

  // Compute speed milestones from all records
  const speedStats = $derived(computeSpeedMilestones(recordsStore.allRecords));
  const ranksWithPBs = $derived(speedStats.ranksWithPBs);
  const byRank = $derived(speedStats.byRank);
  const allPBs = $derived(speedStats.allMilestonesChronological);

  // Auto-select rank with the most PBs if available, or fall back to 'all'
  $effect(() => {
    if (selectedRank !== 'all' && !byRank.has(selectedRank)) {
      selectedRank = 'all';
    }
  });

  // Current active group (if single rank selected)
  const activeRankGroup = $derived(
    selectedRank !== 'all' ? byRank.get(selectedRank) || null : null
  );

  // Filtered milestones for display
  const displayMilestones = $derived(
    selectedRank === 'all'
      ? allPBs
      : activeRankGroup
        ? activeRankGroup.records
        : []
  );

  // Distinct palette for multiple ranks
  const RANK_COLORS = [
    '#88C13F', // green
    '#E28743', // amber terracotta
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#10B981', // emerald
    '#F59E0B', // gold
    '#EC4899', // pink
    '#14B8A6', // teal
    '#6366F1', // indigo
    '#8B5E3C'  // brown
  ];

  const chartOptions = $derived.by<EChartsOption>(() => {
    if (displayMilestones.length === 0) {
      return {
        title: {
          text: 'No speed records recorded yet',
          subtext: 'Speed records appear when you pass tests at a faster pace than your previous best.',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#5e4537', fontSize: 14 },
          subtextStyle: { color: '#8B5E3C', fontSize: 12 }
        }
      };
    }

    // Single Rank Mode: Clean staircase progression curve + secondary attempts/days bar series
    if (selectedRank !== 'all' && activeRankGroup) {
      const records = activeRankGroup.records;
      const speeds = records.map((m) => m.secondsPerProblem);
      const minSpeed = Math.floor(Math.min(...speeds, 0));
      const maxSpeed = Math.ceil(Math.max(...speeds, 10));

      const barValues = records.map((m) => (barMetric === 'tests' ? m.testsToBeat : m.daysToBeat));
      const maxBarValue = Math.max(...barValues, 1);
      const barYMax = Math.ceil(maxBarValue * 1.25);

      const barData: any = records.map((m) => [
        m.timestamp,
        barMetric === 'tests' ? m.testsToBeat : m.daysToBeat,
        m
      ]);
      const lineData: any = records.map((m) => [m.timestamp, m.secondsPerProblem, m]);

      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            crossStyle: { color: '#8B5E3C' }
          },
          backgroundColor: '#3D2A1F',
          borderColor: '#88C13F',
          borderWidth: 1,
          textStyle: { color: '#FDF5E6', fontSize: 12 },
          formatter: (params: any) => {
            if (!params || !params.length) return '';
            const m: SpeedRecordMilestone = params[0].data?.[2] || records[params[0].dataIndex];
            if (!m) return '';

            const improvementText = m.isInitialRecord
              ? '<span style="color: #88C13F; font-weight: bold;">Initial Baseline Record</span>'
              : `<span style="color: #88C13F; font-weight: bold;">-${m.improvementSeconds}s (-${m.improvementPct}%)</span> faster than previous (${m.previousRecordSpeed}s/prob)`;

            const effortText = m.isInitialRecord
              ? `Passed on test attempt #${m.testsToBeat}`
              : `<strong>${m.testsToBeat} tests</strong> attempted over <strong>${m.daysToBeat} days</strong> to break record`;

            return `
              <div style="font-size: 11px; line-height: 1.6; min-width: 230px;">
                <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px; color: #88C13F; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                  <span>⚡ ${m.rankLabel} Personal Best #${m.recordIndex}</span>
                  <span style="font-size: 10px; color: #D6BA96; font-weight: normal;">#${m.guanid}</span>
                </div>
                <div>Date Achieved: <strong>${m.formattedDate}</strong></div>
                <div>Record Speed: <strong style="color: #FFB800; font-size: 12px;">${m.secondsPerProblem}s / prob</strong> (${m.totaltime}s total)</div>
                <div>Improvement: ${improvementText}</div>
                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(214, 186, 150, 0.3);">
                  <div>Effort to Beat: ${effortText}</div>
                  <div>Passing Accuracy: <strong>${m.record.oknum}/10 (${m.record.accuracyPct}%)</strong></div>
                </div>
                <div style="margin-top: 4px; font-size: 9px; color: #D6BA96; text-align: right;">
                  Click to open test review ↗
                </div>
              </div>
            `;
          }
        },
        legend: {
          top: 0,
          right: 10,
          data: ['Record Speed (s/prob)', barMetric === 'tests' ? 'Tests to Beat' : 'Days to Beat'],
          textStyle: { color: '#3D2A1F', fontSize: 11 }
        },
        grid: {
          top: 45,
          left: 55,
          right: 55,
          bottom: 65
        },
        xAxis: {
          type: 'time',
          axisLine: { lineStyle: { color: '#D6BA96' } },
          splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
          axisLabel: {
            color: '#5e4537',
            fontSize: 10,
            formatter: (val: number) => {
              const d = new Date(val);
              const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
              return `${m} ${d.getDate()}`;
            }
          }
        },
        yAxis: [
          // Left: Speed (s / problem) - lower is faster!
          {
            type: 'value',
            name: 'Speed (s/prob)',
            nameTextStyle: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 11 },
            min: Math.max(0, minSpeed - 2),
            max: maxSpeed + 2,
            axisLine: { show: true, lineStyle: { color: '#8B5E3C' } },
            splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
            axisLabel: {
              color: '#8B5E3C',
              fontSize: 10,
              formatter: '{value}s'
            }
          },
          // Right: Tests or Days to beat
          {
            type: 'value',
            name: barMetric === 'tests' ? 'Tests to Beat' : 'Days to Beat',
            nameLocation: 'end',
            nameGap: 12,
            nameTextStyle: { color: '#E28743', fontWeight: 'bold', fontSize: 11, align: 'right' },
            min: 0,
            max: barYMax,
            minInterval: 1,
            axisLine: { show: true, lineStyle: { color: '#E28743' } },
            splitLine: { show: false },
            axisLabel: {
              color: '#E28743',
              fontSize: 10,
              formatter: barMetric === 'tests' ? '{value}' : '{value}d'
            }
          }
        ],
        dataZoom: [
          {
            type: 'slider',
            show: true,
            xAxisIndex: 0,
            bottom: 12,
            height: 18,
            borderColor: '#D6BA96',
            fillerColor: 'rgba(226, 135, 67, 0.15)',
            handleStyle: { color: '#E28743', borderColor: '#5e4537' },
            textStyle: { color: '#5e4537', fontSize: 9 }
          },
          {
            type: 'inside',
            xAxisIndex: 0
          }
        ],
        series: [
          // Bar Series: Effort / Duration to beat prior PB
          {
            name: barMetric === 'tests' ? 'Tests to Beat' : 'Days to Beat',
            type: 'bar',
            yAxisIndex: 1,
            data: barData,
            barMaxWidth: 30,
            barMinWidth: 12,
            itemStyle: {
              color: 'rgba(226, 135, 67, 0.45)',
              borderColor: '#E28743',
              borderWidth: 1.5,
              borderRadius: [4, 4, 0, 0]
            },
            label: {
              show: true,
              position: 'top',
              formatter: (p: any) => {
                const val = p.data[1];
                if (barMetric === 'tests') {
                  return val === 1 ? '1st try' : `+${val} tests`;
                }
                return val === 0 ? 'same day' : `${val}d`;
              },
              fontSize: 10,
              fontWeight: 'bold',
              color: '#8B5E3C'
            },
            z: 2
          },
          // Line Series: Staircase progression of record speed
          {
            name: 'Record Speed (s/prob)',
            type: 'line',
            yAxisIndex: 0,
            step: 'end',
            data: lineData,
            symbol: 'diamond',
            symbolSize: 14,
            itemStyle: {
              color: '#FFB800',
              borderColor: '#FAF0DA',
              borderWidth: 2,
              shadowColor: 'rgba(61, 42, 31, 0.3)',
              shadowBlur: 4
            },
            lineStyle: {
              color: '#88C13F',
              width: 3,
              shadowColor: 'rgba(136, 193, 63, 0.25)',
              shadowBlur: 6
            },
            label: {
              show: true,
              position: 'top',
              distance: 6,
              formatter: (p: any) => {
                const m: SpeedRecordMilestone = p.data[2];
                return `${m.secondsPerProblem}s`;
              },
              fontWeight: 'bold',
              fontSize: 11,
              color: '#3D2A1F',
              backgroundColor: 'rgba(253, 245, 230, 0.95)',
              padding: [2, 5],
              borderRadius: 4,
              borderColor: '#D6BA96',
              borderWidth: 1
            },
            z: 4
          }
        ]
      };
    }

    // All Ranks Mode: Multi-series step lines (one per difficulty rank)
    const seriesList: any[] = [];
    const legendData: string[] = [];

    ranksWithPBs.forEach((group, idx) => {
      const color = RANK_COLORS[idx % RANK_COLORS.length];
      const name = `${group.rankLabel} (Best: ${group.currentBestSpeed}s)`;
      legendData.push(name);

      seriesList.push({
        name,
        type: 'line',
        step: 'end',
        data: group.records.map((m) => [m.timestamp, m.secondsPerProblem, m]) as any,
        symbol: 'circle',
        symbolSize: 10,
        itemStyle: {
          color,
          borderColor: '#FAF0DA',
          borderWidth: 2
        },
        lineStyle: {
          color,
          width: 2.5
        },
        z: 3
      });
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#3D2A1F',
        borderColor: '#88C13F',
        borderWidth: 1,
        textStyle: { color: '#FDF5E6', fontSize: 12 },
        formatter: (param: any) => {
          const m: SpeedRecordMilestone = param.data?.[2];
          if (!m) return '';

          const improvementText = m.isInitialRecord
            ? 'Initial Baseline Record'
            : `-${m.improvementSeconds}s (-${m.improvementPct}%) faster than previous (${m.previousRecordSpeed}s/prob)`;

          return `
            <div style="font-size: 11px; line-height: 1.6; min-width: 210px;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px; color: #88C13F; font-size: 13px;">
                ⚡ ${m.rankLabel} Speed Record #${m.recordIndex}
              </div>
              <div>Date: <strong>${m.formattedDate}</strong></div>
              <div>Speed: <strong style="color: #FFB800;">${m.secondsPerProblem}s / prob</strong> (${m.totaltime}s total)</div>
              <div>Improvement: <strong>${improvementText}</strong></div>
              <div>Effort: <strong>${m.testsToBeat} tests</strong> over <strong>${m.daysToBeat} days</strong></div>
              <div style="margin-top: 4px; font-size: 9px; color: #D6BA96; text-align: right;">
                Click to open test review ↗
              </div>
            </div>
          `;
        }
      },
      legend: {
        type: 'scroll',
        top: 0,
        left: 'center',
        padding: [0, 20],
        data: legendData,
        textStyle: { color: '#3D2A1F', fontSize: 11 }
      },
      grid: {
        top: 55,
        left: 50,
        right: 40,
        bottom: 65
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#D6BA96' } },
        splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
        axisLabel: {
          color: '#5e4537',
          fontSize: 10,
          formatter: (val: number) => {
            const d = new Date(val);
            const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
            return `${m} ${d.getDate()}`;
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Record Speed (s/prob)',
        nameTextStyle: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 11 },
        min: 0,
        axisLine: { show: true, lineStyle: { color: '#8B5E3C' } },
        splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
        axisLabel: {
          color: '#8B5E3C',
          fontSize: 10,
          formatter: '{value}s'
        }
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: 0,
          bottom: 12,
          height: 18,
          borderColor: '#D6BA96',
          fillerColor: 'rgba(136, 193, 63, 0.15)',
          handleStyle: { color: '#88C13F', borderColor: '#5e4537' },
          textStyle: { color: '#5e4537', fontSize: 9 }
        },
        {
          type: 'inside',
          xAxisIndex: 0
        }
      ],
      series: seriesList
    };
  });

  function handleChartClick(params: any) {
    if (!params) return;
    const m: SpeedRecordMilestone = params.data?.[2];
    if (m?.record?.reviewUrl) {
      window.open(m.record.reviewUrl, '_blank', 'noopener,noreferrer');
    }
  }
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-2xl p-5 shadow-xs space-y-4">
  <!-- Card Header & Rank Selector -->
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[#D6BA96]/60 pb-3">
    <div>
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-lg bg-[#FFB800] text-[#3D2A1F] flex items-center justify-center font-bold text-xs shadow-2xs">
          ⚡
        </div>
        <h3 class="text-sm font-black text-[#3D2A1F]">Speed Milestones & Personal Bests by Rank</h3>
        <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#FAF0DA] text-[#8B5E3C] border border-[#D6BA96]">
          {speedStats.totalPBsCount} Speed Records
        </span>
      </div>
      <p class="text-[11px] text-[#5e4537] mt-1">
        Tracks every new personal speed record achieved at each difficulty rank, the seconds shaved off, and how many tests and days were spent breaking each record.
      </p>
    </div>

    <!-- Rank Filter Tabs & Secondary Metric Selector -->
    <div class="flex flex-wrap items-center gap-2 self-start lg:self-auto">
      {#if selectedRank !== 'all'}
        <!-- Metric Toggle: Tests to Beat vs Days to Beat -->
        <div class="flex items-center gap-1 bg-[#FDF5E6] border border-[#D6BA96] p-1 rounded-xl text-xs shadow-2xs">
          <button
            onclick={() => (barMetric = 'tests')}
            class="px-2 py-0.5 rounded-lg font-medium cursor-pointer transition-colors {barMetric === 'tests' ? 'bg-[#E28743] text-white font-bold shadow-xs' : 'text-[#5e4537] hover:text-[#3D2A1F]'}"
            title="Bars show tests attempted since prior record"
          >
            <span class="flex items-center gap-1">
              <Hash class="w-3 h-3" />
              Tests to Beat
            </span>
          </button>
          <button
            onclick={() => (barMetric = 'days')}
            class="px-2 py-0.5 rounded-lg font-medium cursor-pointer transition-colors {barMetric === 'days' ? 'bg-[#E28743] text-white font-bold shadow-xs' : 'text-[#5e4537] hover:text-[#3D2A1F]'}"
            title="Bars show calendar days elapsed since prior record"
          >
            <span class="flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              Days to Beat
            </span>
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Rank Selector Pills (Independent Difficulty Tracking) -->
  <div class="flex flex-wrap items-center gap-1.5 pt-1">
    <span class="text-[11px] font-bold text-[#5e4537] mr-1 flex items-center gap-1">
      <Layers class="w-3 h-3 text-[#8B5E3C]" />
      Select Difficulty:
    </span>
    <button
      onclick={() => (selectedRank = 'all')}
      class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer border {selectedRank === 'all' ? 'bg-[#3D2A1F] text-[#FDF5E6] border-[#3D2A1F] shadow-xs' : 'bg-[#FDF5E6] text-[#5e4537] border-[#D6BA96] hover:bg-[#F4E7CE]'}"
    >
      All Ranks ({speedStats.totalPBsCount} PBs)
    </button>
    {#each ranksWithPBs as group}
      <button
        onclick={() => (selectedRank = group.rankNumber)}
        class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer border flex items-center gap-1.5 {selectedRank === group.rankNumber ? 'bg-[#88C13F] text-white border-[#88C13F] shadow-xs' : 'bg-[#FDF5E6] text-[#3D2A1F] border-[#D6BA96] hover:bg-[#F4E7CE]'}"
      >
        <span>{group.rankLabel}</span>
        <span class="text-[10px] px-1 py-0.2 rounded-full font-bold {selectedRank === group.rankNumber ? 'bg-white/20 text-white' : 'bg-[#FAF0DA] text-[#8B5E3C]'}">
          {group.totalPBs} {group.totalPBs === 1 ? 'record' : 'records'}
        </span>
      </button>
    {/each}
  </div>

  <!-- Metric Summary Chips -->
  {#if activeRankGroup}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <!-- Active Rank Current Best -->
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#FFB800]/15 text-[#8B5E3C] shrink-0">
          <Zap class="w-4 h-4 text-[#E28743]" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">{activeRankGroup.rankLabel} All-Time Best</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {activeRankGroup.currentBestSpeed}s / prob
            <span class="text-[10px] text-[#8B5E3C] font-normal">
              ({activeRankGroup.currentBestTotalTime}s total)
            </span>
          </div>
        </div>
      </div>

      <!-- Total Speed Improvement -->
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#88C13F]/15 text-[#55821c] shrink-0">
          <TrendingDown class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Total Shaved Off</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {#if activeRankGroup.totalImprovementSec > 0}
              -{activeRankGroup.totalImprovementSec}s
              <span class="text-[10px] text-[#55821c] font-normal">
                (-{activeRankGroup.totalImprovementPct}% faster)
              </span>
            {:else}
              Baseline set
            {/if}
          </div>
        </div>
      </div>

      <!-- Average Tests to Beat -->
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#8B5E3C]/15 text-[#8B5E3C] shrink-0">
          <Clock class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Avg Tests to Beat</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {activeRankGroup.avgTestsToBeat} tests
          </div>
        </div>
      </div>

      <!-- Toughest PB Grind -->
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#E28743]/15 text-[#c84b31] shrink-0">
          <Flame class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Longest Grind to PB</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {activeRankGroup.maxTestsToBeat} tests
            {#if activeRankGroup.longestGrindMilestone && activeRankGroup.longestGrindMilestone.daysToBeat > 0}
              <span class="text-[10px] text-[#8B5E3C] font-normal">
                ({activeRankGroup.longestGrindMilestone.daysToBeat}d)
              </span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- All Ranks High-Level Highlights -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#FFB800]/15 text-[#E28743] shrink-0">
          <Zap class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Speed Records Set</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {speedStats.totalPBsCount} PBs across {ranksWithPBs.length} ranks
          </div>
        </div>
      </div>

      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#88C13F]/15 text-[#55821c] shrink-0">
          <Trophy class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Fastest Overall Speed</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {#if speedStats.fastestOverallSpeed}
              {speedStats.fastestOverallSpeed.secondsPerProblem}s / prob
              <span class="text-[10px] text-[#55821c] font-normal">
                ({speedStats.fastestOverallSpeed.rankLabel})
              </span>
            {:else}
              —
            {/if}
          </div>
        </div>
      </div>

      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#88C13F]/15 text-[#55821c] shrink-0">
          <TrendingDown class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Biggest Single Cut</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {#if speedStats.biggestImprovement}
              -{speedStats.biggestImprovement.improvementSeconds}s
              <span class="text-[10px] text-[#55821c] font-normal">
                ({speedStats.biggestImprovement.rankLabel}, -{speedStats.biggestImprovement.improvementPct}%)
              </span>
            {:else}
              —
            {/if}
          </div>
        </div>
      </div>

      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#E28743]/15 text-[#c84b31] shrink-0">
          <Flame class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Hardest PB to Crack</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {#if speedStats.hardestToBeat}
              {speedStats.hardestToBeat.testsToBeat} tests
              <span class="text-[10px] text-[#c84b31] font-normal">
                ({speedStats.hardestToBeat.rankLabel})
              </span>
            {:else}
              —
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Main Chart Canvas -->
  <div class="h-80 sm:h-96">
    <EChart options={chartOptions} height="100%" onchartclick={handleChartClick} />
  </div>

  <!-- Legend & Guide Note -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#5e4537] pt-1 border-t border-[#D6BA96]/40 gap-2">
    <div class="flex flex-wrap items-center gap-3">
      {#if selectedRank !== 'all'}
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-0.5 bg-[#88C13F]"></span>
          <span class="w-2.5 h-2.5 rotate-45 bg-[#FFB800] border border-[#FAF0DA] inline-block"></span>
          <span>Line: Record Speed Staircase (drops when broken)</span>
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-xs bg-[#E28743]/50 border border-[#E28743] inline-block"></span>
          <span>Bars: {barMetric === 'tests' ? 'Tests taken to beat prior record' : 'Calendar days elapsed to beat prior record'}</span>
        </span>
      {:else}
        <span>Each difficulty rank has an independent speed baseline. Select any rank tab above to isolate its progression staircase.</span>
      {/if}
    </div>

    <!-- Toggle History Log Button -->
    <button
      onclick={() => (showHistoryLog = !showHistoryLog)}
      class="text-[11px] font-bold text-[#8B5E3C] hover:text-[#3D2A1F] flex items-center gap-1 cursor-pointer self-start sm:self-auto"
    >
      <span>{showHistoryLog ? 'Hide' : 'Show'} Speed Record Log ({displayMilestones.length})</span>
      {#if showHistoryLog}
        <ChevronUp class="w-3.5 h-3.5" />
      {:else}
        <ChevronDown class="w-3.5 h-3.5" />
      {/if}
    </button>
  </div>

  <!-- Expandable History Log Table -->
  {#if showHistoryLog && displayMilestones.length > 0}
    <div class="mt-2 bg-[#FDF5E6] border border-[#D6BA96] rounded-xl overflow-hidden shadow-2xs">
      <div class="px-4 py-2 bg-[#FAF0DA] border-b border-[#D6BA96] flex items-center justify-between">
        <span class="text-xs font-bold text-[#3D2A1F]">
          Speed Breakthrough Log {selectedRank === 'all' ? '(All Ranks)' : `(${activeRankGroup?.rankLabel})`}
        </span>
        <span class="text-[10px] text-[#5e4537]">
          Showing {displayMilestones.length} personal best breakthroughs (newest first)
        </span>
      </div>
      <div class="max-h-64 overflow-y-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-[#FAF0DA]/50 text-[10px] text-[#5e4537] font-bold border-b border-[#D6BA96]/60 sticky top-0">
            <tr>
              <th class="p-2 pl-3">Date</th>
              <th class="p-2">Rank</th>
              <th class="p-2">New Record</th>
              <th class="p-2">Improvement</th>
              <th class="p-2">Tests to Beat</th>
              <th class="p-2">Days Elapsed</th>
              <th class="p-2 pr-3 text-right">Review</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D6BA96]/40 text-[#3D2A1F]">
            {#each [...displayMilestones].reverse() as m}
              <tr class="hover:bg-[#FAF0DA]/60 transition-colors">
                <td class="p-2 pl-3 font-mono text-[11px] text-[#5e4537] whitespace-nowrap">
                  {m.formattedDate}
                </td>
                <td class="p-2 font-bold whitespace-nowrap">
                  <span class="px-1.5 py-0.5 rounded bg-[#FAF0DA] border border-[#D6BA96] text-[10px]">
                    {m.rankLabel}
                  </span>
                </td>
                <td class="p-2 font-black text-[#3D2A1F] whitespace-nowrap">
                  <span class="text-[#FFB800] font-black mr-1">⚡</span>
                  {m.secondsPerProblem}s / prob
                  <span class="text-[10px] text-[#8B5E3C] font-normal">({m.totaltime}s)</span>
                </td>
                <td class="p-2 whitespace-nowrap">
                  {#if m.isInitialRecord}
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-[#eaf6dc] text-[#55821c] font-bold">
                      Baseline Pass
                    </span>
                  {:else}
                    <span class="font-bold text-[#55821c]">
                      -{m.improvementSeconds}s
                    </span>
                    <span class="text-[10px] text-[#5e4537]">
                      (-{m.improvementPct}%)
                    </span>
                  {/if}
                </td>
                <td class="p-2 whitespace-nowrap">
                  <span class="font-semibold text-[#8B5E3C]">
                    {m.testsToBeat} {m.testsToBeat === 1 ? 'test' : 'tests'}
                  </span>
                </td>
                <td class="p-2 whitespace-nowrap text-[#5e4537]">
                  {m.isInitialRecord ? '—' : `${m.daysToBeat} days`}
                </td>
                <td class="p-2 pr-3 text-right whitespace-nowrap">
                  <a
                    href={m.record.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-[10px] font-bold text-[#8B5E3C] hover:text-[#3D2A1F] hover:underline"
                  >
                    <span>#{m.guanid}</span>
                    <ExternalLink class="w-3 h-3" />
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
