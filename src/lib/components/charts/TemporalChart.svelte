<script lang="ts">
  import EChart from '$lib/components/EChart.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { computeHourlyStats, computeDayOfWeekStats } from '$lib/utils/stats';
  import { Moon, Sun, Coffee, Calendar } from 'lucide-svelte';
  import type { EChartsOption } from 'echarts';

  const records = $derived(recordsStore.filteredRecords);
  const hourlyStats = $derived(computeHourlyStats(records));
  const dayStats = $derived(computeDayOfWeekStats(records));

  // Active view toggle: 'hourly' | 'dayOfWeek'
  let activeTab = $state<'hourly' | 'dayOfWeek'>('hourly');

  // Weekend vs Weekday summary
  const comparison = $derived.by(() => {
    let weekendTests = 0;
    let weekendCorrect = 0;
    let weekendTime = 0;

    let weekdayTests = 0;
    let weekdayCorrect = 0;
    let weekdayTime = 0;

    for (const r of records) {
      if (r.isWeekend) {
        weekendTests++;
        weekendCorrect += r.oknum;
        weekendTime += r.totaltime;
      } else {
        weekdayTests++;
        weekdayCorrect += r.oknum;
        weekdayTime += r.totaltime;
      }
    }

    const weekendAcc = weekendTests > 0 ? Number(((weekendCorrect / (weekendTests * 10)) * 100).toFixed(1)) : 0;
    const weekdayAcc = weekdayTests > 0 ? Number(((weekdayCorrect / (weekdayTests * 10)) * 100).toFixed(1)) : 0;
    const weekendSpeed = weekendTests > 0 ? Number((weekendTime / (weekendTests * 10)).toFixed(1)) : 0;
    const weekdaySpeed = weekdayTests > 0 ? Number((weekdayTime / (weekdayTests * 10)).toFixed(1)) : 0;

    return {
      weekendTests,
      weekendAcc,
      weekendSpeed,
      weekdayTests,
      weekdayAcc,
      weekdaySpeed,
      diffAcc: Number((weekendAcc - weekdayAcc).toFixed(1))
    };
  });

  const hourlyChartOptions = $derived.by<EChartsOption>(() => {
    const hours = hourlyStats.map((h) => h.label);
    const counts = hourlyStats.map((h) => h.count);
    const accuracies = hourlyStats.map((h) => h.count > 0 ? h.accuracyPct : null);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#3D2A1F',
        borderColor: '#88C13F',
        borderWidth: 1,
        textStyle: { color: '#FDF5E6', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const idx = params[0].dataIndex;
          const stat = hourlyStats[idx];
          return `
            <div style="font-size: 11px; line-height: 1.5;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px; color: #88C13F;">
                ${stat.label}
              </div>
              <div>Tests Taken: <strong>${stat.count}</strong></div>
              <div>Accuracy: <strong>${stat.count > 0 ? `${stat.accuracyPct}%` : 'N/A'}</strong></div>
              <div>Avg Speed: <strong>${stat.count > 0 ? `${stat.avgSecondsPerProblem}s` : 'N/A'}</strong></div>
            </div>
          `;
        }
      },
      legend: {
        top: 2,
        left: 'center',
        data: ['Tests Count', 'Accuracy (%)'],
        textStyle: { color: '#3D2A1F', fontSize: 11 }
      },
      grid: {
        top: 48,
        left: 45,
        right: 55,
        bottom: 35
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: {
          color: '#5e4537',
          fontSize: 9,
          interval: 1 // show every other hour for clean spacing
        }
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
          name: 'Tests Count',
          nameLocation: 'end',
          nameGap: 12,
          nameTextStyle: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 11, align: 'right' },
          min: 0,
          axisLine: { show: true, lineStyle: { color: '#8B5E3C' } },
          splitLine: { show: false },
          axisLabel: { color: '#8B5E3C', fontSize: 10 }
        }
      ],
      series: [
        {
          name: 'Tests Count',
          type: 'bar',
          yAxisIndex: 1,
          data: counts,
          barMaxWidth: 20,
          itemStyle: {
            color: '#ebdcc9',
            borderRadius: [3, 3, 0, 0]
          }
        },
        {
          name: 'Accuracy (%)',
          type: 'line',
          data: accuracies,
          smooth: true,
          connectNulls: true,
          symbolSize: 6,
          lineStyle: { color: '#88C13F', width: 2.5 },
          itemStyle: { color: '#88C13F' }
        }
      ]
    };
  });

  const dayOfWeekChartOptions = $derived.by<EChartsOption>(() => {
    const days = dayStats.map((d) => d.dayName);
    const counts = dayStats.map((d) => d.count);
    const accuracies = dayStats.map((d) => d.accuracyPct);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#3D2A1F',
        borderColor: '#88C13F',
        borderWidth: 1,
        textStyle: { color: '#FDF5E6', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const idx = params[0].dataIndex;
          const stat = dayStats[idx];
          return `
            <div style="font-size: 11px; line-height: 1.5;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px; color: ${stat.isWeekend ? '#88C13F' : '#8B5E3C'};">
                ${stat.dayName} (${stat.isWeekend ? 'Weekend' : 'Weekday'})
              </div>
              <div>Tests Taken: <strong>${stat.count}</strong></div>
              <div>Accuracy: <strong>${stat.accuracyPct}%</strong></div>
              <div>Avg Speed: <strong>${stat.avgSecondsPerProblem}s</strong> / problem</div>
            </div>
          `;
        }
      },
      legend: {
        top: 2,
        left: 'center',
        data: ['Tests Count', 'Accuracy (%)'],
        textStyle: { color: '#3D2A1F', fontSize: 11 }
      },
      grid: {
        top: 48,
        left: 45,
        right: 55,
        bottom: 35
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: {
          color: '#3D2A1F',
          fontSize: 11,
          fontWeight: 'bold'
        }
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
          name: 'Tests Count',
          nameLocation: 'end',
          nameGap: 12,
          nameTextStyle: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 11, align: 'right' },
          min: 0,
          axisLine: { show: true, lineStyle: { color: '#8B5E3C' } },
          splitLine: { show: false },
          axisLabel: { color: '#8B5E3C', fontSize: 10 }
        }
      ],
      series: [
        {
          name: 'Tests Count',
          type: 'bar',
          yAxisIndex: 1,
          data: counts,
          barMaxWidth: 36,
          itemStyle: {
            color: (params: any) => (params.dataIndex === 0 || params.dataIndex === 6 ? '#d0e8b2' : '#ebdcc9'),
            borderRadius: [4, 4, 0, 0]
          }
        },
        {
          name: 'Accuracy (%)',
          type: 'line',
          data: accuracies,
          smooth: true,
          symbolSize: 7,
          lineStyle: { color: '#88C13F', width: 3 },
          itemStyle: { color: '#88C13F' }
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs overflow-hidden">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
    <div>
      <h3 class="text-sm font-bold text-[#3D2A1F] flex items-center gap-1.5">
        <Calendar class="w-4 h-4 text-[#8B5E3C]" />
        <span>Temporal Habits & Rhythm</span>
      </h3>
      <p class="text-[11px] text-[#5e4537]">
        Explore whether your performance varies by time of day or during relaxed weekends.
      </p>
    </div>

    <!-- Toggle Buttons -->
    <div class="inline-flex rounded-lg border border-[#D6BA96] bg-[#FDF5E6] p-0.5 self-start sm:self-auto">
      <button
        onclick={() => (activeTab = 'hourly')}
        class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {activeTab === 'hourly' ? 'bg-[#88C13F] text-white' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
      >
        Time of Day (24h)
      </button>
      <button
        onclick={() => (activeTab = 'dayOfWeek')}
        class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {activeTab === 'dayOfWeek' ? 'bg-[#88C13F] text-white' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
      >
        Day of Week
      </button>
    </div>
  </div>

  <!-- Weekend vs Weekday Cards comparison -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
    <div class="bg-[#FDF5E6] border border-[#D6BA96] rounded-lg p-2.5">
      <div class="text-[10px] uppercase font-bold text-[#55821c] flex items-center gap-1">
        <Coffee class="w-3 h-3" />
        Weekend Accuracy
      </div>
      <div class="text-lg font-black text-[#3D2A1F] mt-0.5">
        {comparison.weekendAcc}%
      </div>
      <div class="text-[10px] text-[#5e4537]">{comparison.weekendTests} tests ({comparison.weekendSpeed}s/prob)</div>
    </div>

    <div class="bg-[#FDF5E6] border border-[#D6BA96] rounded-lg p-2.5">
      <div class="text-[10px] uppercase font-bold text-[#8B5E3C] flex items-center gap-1">
        <Sun class="w-3 h-3" />
        Weekday Accuracy
      </div>
      <div class="text-lg font-black text-[#3D2A1F] mt-0.5">
        {comparison.weekdayAcc}%
      </div>
      <div class="text-[10px] text-[#5e4537]">{comparison.weekdayTests} tests ({comparison.weekdaySpeed}s/prob)</div>
    </div>

    <div class="bg-[#FDF5E6] border border-[#D6BA96] rounded-lg p-2.5">
      <div class="text-[10px] uppercase font-bold text-[#3D2A1F]">
        Weekend Delta
      </div>
      <div class="text-lg font-black {comparison.diffAcc >= 0 ? 'text-[#88C13F]' : 'text-[#c84b31]'} mt-0.5">
        {comparison.diffAcc >= 0 ? `+${comparison.diffAcc}%` : `${comparison.diffAcc}%`}
      </div>
      <div class="text-[10px] text-[#5e4537]">
        {comparison.diffAcc > 0 ? 'Higher on weekends' : comparison.diffAcc < 0 ? 'Lower on weekends' : 'Equal'}
      </div>
    </div>

    <div class="bg-[#FDF5E6] border border-[#D6BA96] rounded-lg p-2.5">
      <div class="text-[10px] uppercase font-bold text-[#5e4537] flex items-center gap-1">
        <Moon class="w-3 h-3 text-[#3D2A1F]" />
        Peak Study Hour
      </div>
      <div class="text-base font-black text-[#3D2A1F] mt-0.5">
        {hourlyStats.slice().sort((a, b) => b.count - a.count)[0]?.label || '-'}
      </div>
      <div class="text-[10px] text-[#5e4537]">Most tests attempted</div>
    </div>
  </div>

  <!-- Chart View -->
  {#if activeTab === 'hourly'}
    <EChart options={hourlyChartOptions} height="280px" />
  {:else}
    <EChart options={dayOfWeekChartOptions} height="280px" />
  {/if}
</div>
