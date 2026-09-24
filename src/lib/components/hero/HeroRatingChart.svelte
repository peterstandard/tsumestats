<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import EChart from '$lib/components/EChart.svelte';
  import type { EChartsOption } from 'echarts';
  import { TrendingUp, Award, Layers } from 'lucide-svelte';

  let chartOption = $derived.by<EChartsOption>(() => {
    const records = heroStore.filteredRecords;
    if (records.length === 0) {
      return {
        title: {
          text: 'No solve records to display',
          left: 'center',
          top: 'center',
          textStyle: { color: '#5e4537', fontSize: 13 }
        }
      };
    }

    // Rating points: [timestamp, rating, record]
    const ratingPoints = records
      .filter((r) => r.rating > 0)
      .map((r) => [r.timestamp, r.rating, r.set, r.tsumego, r.misplays, r.formattedDate]);

    // Daily volume aggregation
    const dayCounts = new Map<string, { timestamp: number; count: number; clean: number }>();
    for (const r of records) {
      if (!dayCounts.has(r.dateStr)) {
        const midnight = new Date(r.dateStr).getTime();
        dayCounts.set(r.dateStr, { timestamp: midnight, count: 0, clean: 0 });
      }
      const entry = dayCounts.get(r.dateStr)!;
      entry.count++;
      if (r.isClean) entry.clean++;
    }

    const dailyVolume = Array.from(dayCounts.values()).map((d) => [d.timestamp, d.count]);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: '#FAF0DA',
        borderColor: '#D6BA96',
        textStyle: { color: '#3D2A1F', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let res = `<div class="font-bold border-b border-[#D6BA96] pb-1 mb-1">${params[0].axisValueLabel || ''}</div>`;
          for (const p of params) {
            if (p.seriesName === 'Elo Rating' && p.data) {
              const [ts, rating, set, prob, misplays] = p.data;
              res += `<div class="text-[#8C52FF] font-black">Elo: ${rating}</div>`;
              res += `<div class="text-xs text-[#5e4537] mt-0.5">${set} #${prob}</div>`;
              res += `<div class="text-xs text-[#5e4537]">${misplays === 0 ? '<span class="text-[#88C13F] font-bold">✓ Flawless (0 misplays)</span>' : `<span class="text-[#D97706]">${misplays} misplay${misplays>1?'s':''}</span>`}</div>`;
            } else if (p.seriesName === 'Daily Volume' && p.data) {
              res += `<div class="text-[#88C13F] font-bold mt-1">Daily Volume: ${p.data[1]} problems</div>`;
            }
          }
          return res;
        }
      },
      legend: {
        data: ['Elo Rating', 'Daily Volume'],
        right: 16,
        top: 0,
        textStyle: { color: '#5e4537', fontSize: 11 }
      },
      grid: {
        left: 45,
        right: 45,
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
      yAxis: [
        {
          type: 'value',
          name: 'Elo Rating',
          scale: true,
          position: 'left',
          axisLine: { lineStyle: { color: '#8C52FF' } },
          axisLabel: { color: '#8C52FF', fontSize: 10 },
          splitLine: { lineStyle: { color: '#F4E7CE' } }
        },
        {
          type: 'value',
          name: 'Solves / Day',
          position: 'right',
          axisLine: { lineStyle: { color: '#88C13F' } },
          axisLabel: { color: '#88C13F', fontSize: 10 },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 0,
          height: 20,
          borderColor: '#D6BA96',
          fillerColor: 'rgba(140, 82, 255, 0.15)',
          handleStyle: { color: '#8C52FF' }
        }
      ],
      series: [
        {
          name: 'Daily Volume',
          type: 'bar',
          yAxisIndex: 1,
          data: dailyVolume,
          itemStyle: {
            color: 'rgba(136, 193, 63, 0.28)',
            borderRadius: [3, 3, 0, 0]
          },
          barMaxWidth: 18
        },
        {
          name: 'Elo Rating',
          type: 'line',
          yAxisIndex: 0,
          data: ratingPoints,
          showSymbol: true,
          symbolSize: 4,
          smooth: true,
          lineStyle: {
            color: '#8C52FF',
            width: 2.5
          },
          itemStyle: {
            color: '#8C52FF'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(140, 82, 255, 0.25)' },
                { offset: 1, color: 'rgba(140, 82, 255, 0.0)' }
              ]
            }
          }
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-[#8C52FF]/15 text-[#8C52FF] flex items-center justify-center font-bold">
        <TrendingUp class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-[#3D2A1F]">Elo Rating Trajectory & Solve Volume</h3>
        <p class="text-[11px] text-[#5e4537]">
          Micro-movements in rating across solves, overlaid with daily volume intensity
        </p>
      </div>
    </div>
  </div>

  <div class="h-72 sm:h-80 w-full">
    <EChart options={chartOption} />
  </div>
</div>
