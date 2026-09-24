<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import EChart from '$lib/components/EChart.svelte';
  import type { EChartsOption } from 'echarts';
  import { Clock, Calendar } from 'lucide-svelte';

  let chartOption = $derived.by<EChartsOption>(() => {
    const habits = heroStore.hourlyHabits;
    const hours = habits.map((h) => h.label);
    const counts = habits.map((h) => h.count);
    const cleanPcts = habits.map((h) => (h.count > 0 ? h.cleanPct : null));

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
          const h = habits[idx];
          return `
            <div class="font-bold border-b border-[#D6BA96] pb-1 mb-1">${h.label}</div>
            <div class="text-xs">Solves: <strong class="text-[#3D2A1F]">${h.count}</strong></div>
            <div class="text-xs">Flawless: <strong class="text-[#88C13F]">${h.cleanCount} (${h.cleanPct}%)</strong></div>
          `;
        }
      },
      legend: {
        data: ['Solve Volume', 'Flawless Rate %'],
        right: 16,
        top: 0,
        textStyle: { color: '#5e4537', fontSize: 11 }
      },
      grid: {
        left: 45,
        right: 45,
        top: 35,
        bottom: 30,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: { color: '#5e4537', fontSize: 9, interval: 2 }
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
            borderRadius: [3, 3, 0, 0]
          },
          barMaxWidth: 16
        },
        {
          name: 'Flawless Rate %',
          type: 'line',
          yAxisIndex: 1,
          data: cleanPcts,
          showSymbol: true,
          symbolSize: 4,
          connectNulls: true,
          lineStyle: { color: '#88C13F', width: 2 },
          itemStyle: { color: '#88C13F' }
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-[#8052cf]/15 text-[#8052cf] flex items-center justify-center font-bold">
        <Clock class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-[#3D2A1F]">Practice Consistency & Active Hours</h3>
        <p class="text-[11px] text-[#5e4537]">
          Hourly distribution of problem solving activity across the 24-hour day
        </p>
      </div>
    </div>
  </div>

  <div class="h-64 sm:h-72 w-full">
    <EChart options={chartOption} />
  </div>
</div>
