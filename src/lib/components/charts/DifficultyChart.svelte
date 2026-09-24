<script lang="ts">
  import EChart from '$lib/components/EChart.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { computeDifficultyStats } from '$lib/utils/stats';
  import type { EChartsOption } from 'echarts';

  const records = $derived(recordsStore.filteredRecords);
  const diffStats = $derived(computeDifficultyStats(records));

  const chartOptions = $derived.by<EChartsOption>(() => {
    if (diffStats.length === 0) {
      return {
        title: {
          text: 'No difficulty records available',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#5e4537', fontSize: 14 }
        }
      };
    }

    const categories = diffStats.map((d) => d.rankLabel);
    const counts = diffStats.map((d) => d.count);
    const accuracies = diffStats.map((d) => d.accuracyPct);
    const passRates = diffStats.map((d) => d.passRatePct);
    const speeds = diffStats.map((d) => d.avgSecondsPerProblem);

    const maxSpeed = Math.max(...speeds, 0);
    const speedMax = maxSpeed > 50 ? Math.ceil(maxSpeed / 10) * 10 : 50;
    const maxCount = Math.max(...counts, 1);

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
          const stat = diffStats[idx];
          if (!stat) return '';

          return `
            <div style="font-size: 11px; line-height: 1.5;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px; color: #88C13F;">
                Rank: ${stat.rankLabel}
              </div>
              <div>Tests Attempted: <strong>${stat.count}</strong></div>
              <div>Accuracy: <strong style="color: #88C13F;">${stat.accuracyPct}%</strong></div>
              <div>Pass Rate: <strong>${stat.passRatePct}%</strong></div>
              <div>Avg Speed: <strong>${stat.avgSecondsPerProblem}s</strong> / problem</div>
            </div>
          `;
        }
      },
      legend: {
        type: 'scroll',
        top: 4,
        left: 'center',
        padding: [0, 20],
        data: ['Tests Count', 'Accuracy (%)', 'Pass Rate (%)', 'Avg Speed (s/prob)'],
        textStyle: { color: '#3D2A1F', fontSize: 11 }
      },
      grid: {
        top: 55,
        left: 45,
        right: 55,
        bottom: 40
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: { color: '#3D2A1F', fontSize: 10, fontWeight: 'bold' }
      },
      yAxis: [
        // Left: Percentage (0% - 100%)
        {
          type: 'value',
          name: 'Percentage (%)',
          nameTextStyle: { color: '#88C13F', fontWeight: 'bold', fontSize: 11 },
          min: 0,
          max: 100,
          interval: 20,
          axisLine: { show: true, lineStyle: { color: '#88C13F' } },
          splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
          axisLabel: { color: '#5e4537', fontSize: 10, formatter: '{value}%' }
        },
        // Right: Speed (0s - 50s, aligned 10s intervals with 20% grid lines)
        {
          type: 'value',
          name: 'Speed (s/prob)',
          nameLocation: 'end',
          nameGap: 12,
          nameTextStyle: { color: '#c84b31', fontWeight: 'bold', fontSize: 11, align: 'right' },
          min: 0,
          max: speedMax,
          interval: 10,
          axisLine: { show: true, lineStyle: { color: '#c84b31' } },
          splitLine: { show: false },
          axisLabel: { color: '#c84b31', fontSize: 10, formatter: '{value}s' }
        },
        // Hidden: Tests Count volume scale so background bars stay in lower portion
        {
          type: 'value',
          name: 'Tests Count',
          show: false,
          min: 0,
          max: maxCount * 2.8
        }
      ],
      series: [
        {
          name: 'Tests Count',
          type: 'bar',
          yAxisIndex: 2,
          data: counts,
          barMaxWidth: 32,
          itemStyle: {
            color: '#ebdcc9',
            borderRadius: [4, 4, 0, 0]
          },
          z: 1
        },
        {
          name: 'Accuracy (%)',
          type: 'line',
          yAxisIndex: 0,
          data: accuracies,
          smooth: true,
          symbolSize: 7,
          lineStyle: { color: '#88C13F', width: 3 },
          itemStyle: { color: '#88C13F' },
          z: 3
        },
        {
          name: 'Pass Rate (%)',
          type: 'line',
          yAxisIndex: 0,
          data: passRates,
          smooth: true,
          symbolSize: 6,
          lineStyle: { color: '#8B5E3C', width: 2 },
          itemStyle: { color: '#8B5E3C' },
          z: 3
        },
        {
          name: 'Avg Speed (s/prob)',
          type: 'line',
          yAxisIndex: 1,
          data: speeds,
          smooth: true,
          symbolSize: 6,
          lineStyle: { color: '#c84b31', width: 2, type: 'dashed' },
          itemStyle: { color: '#c84b31' },
          z: 4
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs overflow-hidden">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
    <div>
      <h3 class="text-sm font-bold text-[#3D2A1F]">Performance by Rank (Kyu / Dan)</h3>
      <p class="text-[11px] text-[#5e4537]">
        Compare accuracy, pass rate, and time taken across Kyu and Dan ranks. See where higher ranks begin challenging your reading.
      </p>
    </div>
  </div>

  <EChart options={chartOptions} height="320px" />
</div>
