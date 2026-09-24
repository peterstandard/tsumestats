<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import EChart from '$lib/components/EChart.svelte';
  import type { EChartsOption } from 'echarts';
  import { BookOpen, Layers } from 'lucide-svelte';

  let chartOption = $derived.by<EChartsOption>(() => {
    const setStats = [...heroStore.setStats];
    if (setStats.length === 0) {
      return {
        title: {
          text: 'No collection data available',
          left: 'center',
          top: 'center',
          textStyle: { color: '#5e4537', fontSize: 13 }
        }
      };
    }

    // Sort by clean rate ascending so highest clean rate is at top in horizontal bar
    const sorted = [...setStats].reverse();

    const categories = sorted.map((s) => s.setName);
    const cleanPcts = sorted.map((s) => s.cleanPct);

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
          const stat = sorted[idx];
          if (!stat) return '';

          return `
            <div class="font-bold border-b border-[#D6BA96] pb-1 mb-1">${stat.setName}</div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>Total Solved: <strong class="text-[#3D2A1F]">${stat.totalCount}</strong></div>
              <div>Flawless Rate: <strong class="text-[#88C13F]">${stat.cleanPct}%</strong></div>
              <div>Clean Solves: <strong class="text-[#88C13F]">${stat.cleanCount}</strong></div>
              <div>Avg Misplays: <strong class="text-[#D97706]">${stat.avgMisplays}</strong></div>
              <div class="col-span-2 text-[11px] text-[#5e4537]">Rating span: ${stat.minRating || '—'} to ${stat.maxRating || '—'}</div>
            </div>
          `;
        }
      },
      grid: {
        left: 170,
        right: 45,
        top: 20,
        bottom: 25,
        containLabel: false
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: { formatter: '{value}%', color: '#5e4537', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F4E7CE' } }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: {
          color: '#3D2A1F',
          fontSize: 11,
          fontWeight: 600,
          formatter: (value: string) => {
            if (value.length > 22) return value.slice(0, 20) + '...';
            return value;
          }
        },
        splitLine: { show: false }
      },
      series: [
        {
          name: 'Flawless Rate',
          type: 'bar',
          data: cleanPcts,
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => `${p.value}% (${sorted[p.dataIndex].totalCount})`,
            fontSize: 10,
            fontWeight: 'bold',
            color: '#5e4537'
          },
          itemStyle: {
            color: (params: any) => {
              const val = params.value as number;
              if (val >= 95) return '#88C13F';
              if (val >= 85) return '#60A5FA';
              if (val >= 75) return '#F59E0B';
              return '#EF4444';
            },
            borderRadius: [0, 4, 4, 0]
          },
          barMaxWidth: 20
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-[#88C13F]/15 text-[#88C13F] flex items-center justify-center font-bold">
        <BookOpen class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-[#3D2A1F]">Collection Mastery & Clean-Rate Ladder</h3>
        <p class="text-[11px] text-[#5e4537]">
          First-try flawless rate (0 misplays) across books, revealing relative collection difficulty
        </p>
      </div>
    </div>
  </div>

  <div class="h-72 sm:h-80 w-full">
    <EChart options={chartOption} />
  </div>
</div>
