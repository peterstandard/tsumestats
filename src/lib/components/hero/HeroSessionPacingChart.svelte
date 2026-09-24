<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import EChart from '$lib/components/EChart.svelte';
  import type { EChartsOption } from 'echarts';
  import { Timer, Zap, Flame, ShieldAlert } from 'lucide-svelte';

  let chartOption = $derived.by<EChartsOption>(() => {
    const sessions = heroStore.sessions;
    if (sessions.length === 0) {
      return {
        title: {
          text: 'No training sessions detected',
          left: 'center',
          top: 'center',
          textStyle: { color: '#5e4537', fontSize: 13 }
        }
      };
    }

    // Points: [startTimestamp, avgPaceSeconds, problemsCount, cleanRatePct, primarySet, durationMinutes, ratingChange]
    const blitzData: any[] = [];
    const steadyData: any[] = [];
    const deepData: any[] = [];

    for (const s of sessions) {
      const pt = [
        s.startTimestamp,
        s.avgPaceSeconds,
        s.problemsCount,
        s.cleanRatePct,
        s.primarySet,
        s.durationMinutes,
        s.ratingChange,
        s.formattedDate
      ];
      if (s.avgPaceSeconds < 20) {
        blitzData.push(pt);
      } else if (s.avgPaceSeconds <= 60) {
        steadyData.push(pt);
      } else {
        deepData.push(pt);
      }
    }

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#FAF0DA',
        borderColor: '#D6BA96',
        textStyle: { color: '#3D2A1F', fontSize: 12 },
        formatter: (params: any) => {
          const d = params.data;
          if (!d) return '';
          const [ts, pace, count, cleanPct, set, durationMin, ratingChange, formattedDate] = d;
          const deltaSign = ratingChange > 0 ? `+${ratingChange}` : `${ratingChange}`;
          const deltaColor = ratingChange > 0 ? '#88C13F' : ratingChange < 0 ? '#EF4444' : '#5e4537';

          return `
            <div class="font-bold border-b border-[#D6BA96] pb-1 mb-1">${formattedDate}</div>
            <div class="text-xs font-semibold text-[#8052cf] mb-1">${set}</div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>Problems: <strong class="text-[#3D2A1F]">${count}</strong></div>
              <div>Duration: <strong class="text-[#3D2A1F]">${durationMin} min</strong></div>
              <div>Pace: <strong class="text-[#D97706]">${pace}s / prob</strong></div>
              <div>Flawless: <strong class="text-[#88C13F]">${cleanPct}%</strong></div>
              <div class="col-span-2">Rating Change: <strong style="color: ${deltaColor}">${deltaSign} Elo</strong></div>
            </div>
          `;
        }
      },
      legend: {
        data: ['Speed Blitz (<20s)', 'Steady Pace (20–60s)', 'Deep Reading (>60s)'],
        right: 16,
        top: 0,
        textStyle: { color: '#5e4537', fontSize: 11 }
      },
      grid: {
        left: 45,
        right: 30,
        top: 35,
        bottom: 50,
        containLabel: true
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: { color: '#5e4537', fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: '#FAF0DA' } }
      },
      yAxis: {
        type: 'value',
        name: 'Pace (sec / problem)',
        scale: true,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: { color: '#5e4537', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F4E7CE' } }
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 0,
          height: 20,
          borderColor: '#D6BA96',
          fillerColor: 'rgba(217, 119, 6, 0.15)',
          handleStyle: { color: '#D97706' }
        }
      ],
      series: [
        {
          name: 'Speed Blitz (<20s)',
          type: 'scatter',
          data: blitzData,
          symbolSize: (data: any) => Math.min(36, Math.max(10, Math.sqrt(data[2]) * 3.5)),
          itemStyle: {
            color: '#88C13F',
            borderColor: '#55821c',
            borderWidth: 1.5,
            opacity: 0.85
          }
        },
        {
          name: 'Steady Pace (20–60s)',
          type: 'scatter',
          data: steadyData,
          symbolSize: (data: any) => Math.min(36, Math.max(10, Math.sqrt(data[2]) * 3.5)),
          itemStyle: {
            color: '#D97706',
            borderColor: '#92400e',
            borderWidth: 1.5,
            opacity: 0.85
          }
        },
        {
          name: 'Deep Reading (>60s)',
          type: 'scatter',
          data: deepData,
          symbolSize: (data: any) => Math.min(36, Math.max(10, Math.sqrt(data[2]) * 3.5)),
          itemStyle: {
            color: '#8052cf',
            borderColor: '#5c34a4',
            borderWidth: 1.5,
            opacity: 0.85
          },
          markLine: {
            silent: true,
            lineStyle: { type: 'dashed', color: '#D97706', width: 1 },
            data: [
              { yAxis: 20, label: { formatter: '20s Blitz', position: 'end', fontSize: 10, color: '#88C13F' } },
              { yAxis: 60, label: { formatter: '60s Deep Reading', position: 'end', fontSize: 10, color: '#8052cf' } }
            ]
          }
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-[#D97706]/15 text-[#D97706] flex items-center justify-center font-bold">
        <Timer class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-[#3D2A1F]">Session Pacing & Recognition Cadence</h3>
        <p class="text-[11px] text-[#5e4537]">
          Bubble size indicates problem volume; classifies speed blitzes vs deep calculation sessions
        </p>
      </div>
    </div>
  </div>

  <div class="h-72 sm:h-80 w-full">
    <EChart options={chartOption} />
  </div>
</div>
