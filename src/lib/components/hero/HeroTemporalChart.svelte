<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import EChart from '$lib/components/EChart.svelte';
  import type { EChartsOption } from 'echarts';
  import { Calendar, Clock } from 'lucide-svelte';

  let temporalMode = $state<'dayOfWeek' | 'hourly'>('dayOfWeek');

  let chartOption = $derived.by<EChartsOption>(() => {
    const isDay = temporalMode === 'dayOfWeek';
    const items = isDay ? heroStore.dayOfWeekHabits : heroStore.hourlyHabits;
    const categories = items.map((h) => h.label);
    const counts = items.map((h) => h.count);
    const cleanPcts = items.map((h) => (h.count > 0 ? h.cleanPct : null));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FAF0DA',
        borderColor: '#D6BA96',
        textStyle: { color: '#3D2A1F', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const h = items[idx];
          return `
            <div class="font-bold border-b border-[#D6BA96] pb-1 mb-1">${isDay ? h.label + 'day' : h.label}</div>
            <div class="text-xs">Solves: <strong class="text-[#3D2A1F]">${h.count}</strong></div>
            <div class="text-xs">Flawless: <strong class="text-[#88C13F]">${h.cleanCount} (${h.cleanPct}%)</strong></div>
          `;
        }
      },
      legend: {
        data: ['Solve Volume', 'Flawless Rate %'],
        left: 'center',
        top: 0,
        textStyle: { color: '#5e4537', fontSize: 11 }
      },
      grid: {
        left: 50,
        right: 50,
        top: 40,
        bottom: 35,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: {
          color: '#5e4537',
          fontSize: isDay ? 11 : 9,
          fontWeight: isDay ? 'bold' : 'normal',
          interval: isDay ? 0 : 2
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Solves',
          axisLine: { lineStyle: { color: '#8052cf' } },
          axisLabel: { color: '#8052cf', fontSize: 10 },
          splitLine: { lineStyle: { color: '#F4E7CE' } }
        },
        {
          type: 'value',
          name: 'Flawless %',
          min: 0,
          max: 100,
          axisLine: { lineStyle: { color: '#88C13F' } },
          axisLabel: { formatter: '{value}%', color: '#88C13F', fontSize: 10 },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Solve Volume',
          type: 'bar',
          yAxisIndex: 0,
          data: counts,
          itemStyle: {
            color: 'rgba(128, 82, 207, 0.7)',
            borderRadius: [4, 4, 0, 0]
          },
          barMaxWidth: isDay ? 36 : 16
        },
        {
          name: 'Flawless Rate %',
          type: 'line',
          yAxisIndex: 1,
          data: cleanPcts,
          showSymbol: true,
          symbolSize: 5,
          connectNulls: true,
          lineStyle: { color: '#88C13F', width: 2.5 },
          itemStyle: { color: '#88C13F' }
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3 overflow-hidden">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-[#8052cf]/15 text-[#8052cf] flex items-center justify-center font-bold">
        <Calendar class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-[#3D2A1F]">Practice Consistency & Routine</h3>
        <p class="text-[11px] text-[#5e4537]">
          {temporalMode === 'dayOfWeek' ? 'Weekly habit consistency across days of the week' : 'Active problem-solving hours throughout the 24-hour day'}
        </p>
      </div>
    </div>

    <!-- Mode Selector -->
    <div class="inline-flex p-0.5 bg-[#FDF5E6] border border-[#D6BA96] rounded-lg shadow-2xs self-start sm:self-auto">
      <button
        onclick={() => (temporalMode = 'dayOfWeek')}
        class="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer {temporalMode === 'dayOfWeek' ? 'bg-[#8052cf] text-white shadow-2xs' : 'text-[#5e4537] hover:text-[#3D2A1F]'}"
      >
        <Calendar class="w-3 h-3" />
        <span>Day of Week</span>
      </button>
      <button
        onclick={() => (temporalMode = 'hourly')}
        class="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer {temporalMode === 'hourly' ? 'bg-[#8052cf] text-white shadow-2xs' : 'text-[#5e4537] hover:text-[#3D2A1F]'}"
      >
        <Clock class="w-3 h-3" />
        <span>Time of Day</span>
      </button>
    </div>
  </div>

  <div class="h-64 sm:h-72 w-full">
    <EChart options={chartOption} />
  </div>
</div>
