<script lang="ts">
  import EChart from '$lib/components/EChart.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { computeDifficultyMilestones } from '$lib/utils/milestones';
  import { rankNumberToLabel } from '$lib/utils/rank';
  import type { DifficultyMilestone } from '$lib/types';
  import type { EChartsOption } from 'echarts';
  import {
    Trophy,
    Target,
    Flame,
    Clock,
    Hourglass,
    Calendar,
    ArrowUpRight,
    HelpCircle,
    RotateCcw
  } from 'lucide-svelte';

  // Mode: 'timeline' (continuous calendar time) | 'sequential' (equal-width rank steps)
  let viewMode = $state<'timeline' | 'sequential'>('timeline');

  // Milestone data calculated from all lifetime records
  const stats = $derived(computeDifficultyMilestones(recordsStore.allRecords));
  const milestones = $derived(stats.milestones);
  const unpassed = $derived(stats.unpassed);

  const chartOptions = $derived.by<EChartsOption>(() => {
    if (milestones.length === 0) {
      return {
        title: {
          text: 'No passed tests recorded yet',
          subtext: 'Milestones will appear once you pass your first checkpoint test at any rank.',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#5e4537', fontSize: 14 },
          subtextStyle: { color: '#8B5E3C', fontSize: 12 }
        }
      };
    }

    const minRank = Math.min(...milestones.map((m) => m.rankNumber));
    const maxRank = Math.max(...milestones.map((m) => m.rankNumber));
    const maxAttempts = Math.max(...milestones.map((m) => m.attemptsToPass), 1);
    const attemptsYMax = Math.max(4, Math.ceil(maxAttempts * 1.25));

    // X Axis configuration based on viewMode
    let xAxisConfig: any;
    let lineSeriesData: any[];
    let barSeriesData: any[];

    if (viewMode === 'timeline') {
      xAxisConfig = {
        type: 'time',
        axisLine: { lineStyle: { color: '#D6BA96' } },
        splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
        axisTick: { alignWithLabel: true },
        axisLabel: {
          color: '#5e4537',
          fontSize: 10,
          formatter: (val: number) => {
            const d = new Date(val);
            const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
            return `${m} ${d.getDate()}`;
          }
        }
      };

      lineSeriesData = milestones.map((m) => [m.firstPassTimestamp, m.rankNumber, m]);
      barSeriesData = milestones.map((m) => [m.firstPassTimestamp, m.attemptsToPass, m]);
    } else {
      xAxisConfig = {
        type: 'category',
        data: milestones.map((m) => `${m.rankLabel}\n${m.dateStr.slice(5)}`),
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisTick: { alignWithLabel: true },
        splitLine: { show: false },
        axisLabel: {
          color: '#5e4537',
          fontSize: 10,
          fontWeight: 'bold'
        }
      };

      lineSeriesData = milestones.map((m) => m.rankNumber);
      barSeriesData = milestones.map((m) => m.attemptsToPass);
    }

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
          const firstParam = params[0];
          let milestone: DifficultyMilestone | undefined;

          if (viewMode === 'sequential') {
            milestone = milestones[firstParam.dataIndex];
          } else {
            milestone = firstParam.data?.[2] || milestones[firstParam.dataIndex];
          }

          if (!milestone) return '';

          const rec = milestone.firstPassRecord;
          const attemptsText =
            milestone.attemptsToPass === 1
              ? '<span style="color:#88C13F; font-weight:bold;">Passed on 1st Attempt! 🎯</span>'
              : `<strong>${milestone.attemptsToPass} attempts</strong> (${milestone.failedAttemptsBeforePass} failed before first pass)`;

          return `
            <div style="font-size: 11px; line-height: 1.6; min-width: 210px;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px; color: #88C13F; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                <span>🏆 ${milestone.rankLabel} Breakthrough</span>
                <span style="font-size: 10px; color: #D6BA96; font-weight: normal;">#${rec.guanid}</span>
              </div>
              <div>First Cleared: <strong>${milestone.formattedDate}</strong></div>
              <div>Attempts: ${attemptsText}</div>
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(214, 186, 150, 0.3);">
                <div>Score: <strong style="color: #88C13F;">${rec.oknum}/10 (${rec.accuracyPct}%)</strong></div>
                <div>Duration: <strong>${rec.totaltime}s</strong> (${rec.secondsPerProblem}s / problem)</div>
                <div>All-time at ${milestone.rankLabel}: <strong>${milestone.totalPassesAtRank}</strong> / ${milestone.totalAttemptsAtRank} passed (${milestone.lifetimePassRatePct}%)</div>
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
        data: ['First Passed Rank', 'Attempts to First Pass'],
        textStyle: { color: '#3D2A1F', fontSize: 11 }
      },
      grid: {
        top: 45,
        left: 55,
        right: 55,
        bottom: viewMode === 'timeline' ? 65 : 45
      },
      xAxis: xAxisConfig,
      yAxis: [
        // Left: Rank difficulty (ascending upwards)
        {
          type: 'value',
          name: 'First Passed Rank',
          nameTextStyle: { color: '#55821c', fontWeight: 'bold', fontSize: 11 },
          min: Math.max(1, minRank - 1),
          max: maxRank + 1,
          interval: 1,
          axisLine: { show: true, lineStyle: { color: '#88C13F' } },
          splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
          axisLabel: {
            color: '#3D2A1F',
            fontSize: 10,
            fontWeight: 'bold',
            formatter: (val: number) => rankNumberToLabel(val)
          }
        },
        // Right: Attempts count
        {
          type: 'value',
          name: 'Attempts to Pass',
          nameLocation: 'end',
          nameGap: 12,
          nameTextStyle: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 11, align: 'right' },
          min: 0,
          max: attemptsYMax,
          minInterval: 1,
          axisLine: { show: true, lineStyle: { color: '#8B5E3C' } },
          splitLine: { show: false },
          axisLabel: {
            color: '#8B5E3C',
            fontSize: 10,
            formatter: '{value}'
          }
        }
      ],
      dataZoom:
        viewMode === 'timeline'
          ? [
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
            ]
          : undefined,
      series: [
        // Secondary series: Attempts before first pass (Bar)
        {
          name: 'Attempts to First Pass',
          type: 'bar',
          yAxisIndex: 1,
          data: barSeriesData,
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
              const val = viewMode === 'timeline' ? p.data[1] : p.value;
              return val === 1 ? '1 try' : `${val} tries`;
            },
            fontSize: 10,
            fontWeight: 'bold',
            color: '#8B5E3C'
          },
          z: 2
        },
        // Primary series: Difficulty level achieved (Line)
        {
          name: 'First Passed Rank',
          type: 'line',
          yAxisIndex: 0,
          data: lineSeriesData,
          symbol: 'circle',
          symbolSize: 14,
          itemStyle: {
            color: '#88C13F',
            borderColor: '#FAF0DA',
            borderWidth: 2.5,
            shadowColor: 'rgba(61, 42, 31, 0.25)',
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
            distance: 8,
            formatter: (p: any) => {
              if (viewMode === 'timeline') {
                const m: DifficultyMilestone = p.data[2];
                return m ? m.rankLabel : '';
              }
              return milestones[p.dataIndex]?.rankLabel || '';
            },
            fontWeight: 'bold',
            fontSize: 11,
            color: '#3D2A1F',
            backgroundColor: 'rgba(253, 245, 230, 0.95)',
            padding: [2, 6],
            borderRadius: 4,
            borderColor: '#D6BA96',
            borderWidth: 1
          },
          z: 4
        }
      ]
    };
  });

  function handleChartClick(params: any) {
    if (!params) return;
    let milestone: DifficultyMilestone | undefined;
    if (viewMode === 'sequential') {
      milestone = milestones[params.dataIndex];
    } else {
      milestone = params.data?.[2] || milestones[params.dataIndex];
    }
    if (milestone?.firstPassRecord?.reviewUrl) {
      window.open(milestone.firstPassRecord.reviewUrl, '_blank', 'noopener,noreferrer');
    }
  }
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-2xl p-5 shadow-xs space-y-4">
  <!-- Header & Toolbar -->
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[#D6BA96]/60 pb-3">
    <div>
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-lg bg-[#88C13F] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          🏆
        </div>
        <h3 class="text-sm font-black text-[#3D2A1F]">First Pass Milestones by Difficulty</h3>
        <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#eaf6dc] text-[#55821c] border border-[#88C13F]/40">
          Rank Progression
        </span>
      </div>
      <p class="text-[11px] text-[#5e4537] mt-1">
        Tracks the exact date you first cleared each rank difficulty (green line) and how many attempts it took to break through (amber bars).
      </p>
    </div>

    <!-- Mode Toggle (Calendar Timeline vs Sequential Steps) -->
    <div class="flex items-center gap-1.5 self-start md:self-auto bg-[#FDF5E6] border border-[#D6BA96] p-1 rounded-xl shadow-2xs">
      <button
        onclick={() => (viewMode = 'timeline')}
        class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer {viewMode === 'timeline' ? 'bg-[#88C13F] text-white shadow-xs' : 'text-[#5e4537] hover:text-[#3D2A1F]'}"
        title="Show milestones along a continuous calendar timeline"
      >
        <span class="flex items-center gap-1">
          <Calendar class="w-3 h-3" />
          Calendar Timeline
        </span>
      </button>
      <button
        onclick={() => (viewMode = 'sequential')}
        class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer {viewMode === 'sequential' ? 'bg-[#88C13F] text-white shadow-xs' : 'text-[#5e4537] hover:text-[#3D2A1F]'}"
        title="Show milestones evenly spaced in sequential rank order"
      >
        <span class="flex items-center gap-1">
          <Target class="w-3 h-3" />
          Sequential Steps
        </span>
      </button>
    </div>
  </div>

  <!-- Milestone Metric Chips -->
  {#if milestones.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <!-- Ranks Conquered -->
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#88C13F]/15 text-[#55821c] shrink-0">
          <Trophy class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Ranks Conquered</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {stats.totalPassedCount} ranks
            {#if stats.lowestRankPassed && stats.highestRankPassed}
              <span class="text-[10px] text-[#8B5E3C] font-normal">
                ({stats.lowestRankPassed.rankLabel} → {stats.highestRankPassed.rankLabel})
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- 1st-Try Clearances -->
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#88C13F]/15 text-[#55821c] shrink-0">
          <Target class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">1st-Try Passes</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {stats.firstTryPassesCount} / {stats.totalPassedCount}
            <span class="text-[10px] text-[#55821c] font-normal">
              ({stats.firstTryRatePct}%)
            </span>
          </div>
        </div>
      </div>

      <!-- Average Attempts -->
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#8B5E3C]/15 text-[#8B5E3C] shrink-0">
          <Clock class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Avg Tries to Pass</div>
          <div class="text-xs font-black text-[#3D2A1F]">
            {stats.avgAttemptsToPass} attempts
          </div>
        </div>
      </div>

      <!-- Hardest Milestone or In Progress -->
      <div class="bg-[#FDF5E6] border border-[#D6BA96]/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
        <div class="p-2 rounded-lg bg-[#E28743]/15 text-[#c84b31] shrink-0">
          <Flame class="w-4 h-4" />
        </div>
        <div class="overflow-hidden">
          <div class="text-[10px] text-[#5e4537] font-semibold uppercase">Hardest Breakthrough</div>
          <div class="text-xs font-black text-[#3D2A1F] truncate">
            {#if stats.hardestMilestone}
              {stats.hardestMilestone.rankLabel}
              <span class="text-[10px] text-[#c84b31] font-normal">
                ({stats.hardestMilestone.attemptsToPass} tries)
              </span>
            {:else}
              —
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Currently Attempting / Unpassed Ranks Note -->
  {#if unpassed.length > 0}
    <div class="bg-[#FAF0DA] border border-[#D6BA96]/70 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div class="flex items-center gap-1.5 text-[#8B5E3C]">
        <Hourglass class="w-3.5 h-3.5 text-[#E28743]" />
        <span class="font-bold">Next Target Ranks in Progress:</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        {#each unpassed as u}
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FDF5E6] border border-[#D6BA96] text-[11px] text-[#3D2A1F]">
            <span class="font-bold text-[#8B5E3C]">{u.rankLabel}</span>:
            <span class="text-[#5e4537]">{u.attempts} attempts (best {u.bestOkNum}/10)</span>
          </span>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Main Chart Canvas -->
  <div class="h-80 sm:h-96">
    <EChart options={chartOptions} height="100%" onchartclick={handleChartClick} />
  </div>

  <!-- Legend & Guide Note -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#5e4537] pt-1 border-t border-[#D6BA96]/40 gap-2">
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1">
        <span class="w-3 h-0.5 bg-[#88C13F]"></span>
        <span class="w-2 h-2 rounded-full bg-[#88C13F] inline-block"></span>
        <span>Line: First Passed Rank (higher = harder)</span>
      </span>
      <span class="inline-flex items-center gap-1">
        <span class="w-2.5 h-2.5 rounded-xs bg-[#E28743]/50 border border-[#E28743] inline-block"></span>
        <span>Bars: Attempts before pass (lower = faster breakthrough)</span>
      </span>
    </div>
    <div class="text-[10px] text-[#8B5E3C]">
      Tip: Click any milestone on the chart to inspect that test review on 101weiqi.
    </div>
  </div>
</div>
