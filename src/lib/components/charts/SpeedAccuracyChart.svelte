<script lang="ts">
  import EChart from '$lib/components/EChart.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { computeLinearRegression } from '$lib/utils/stats';
  import { TrendingUp, Info } from 'lucide-svelte';
  import type { EChartsOption } from 'echarts';

  const records = $derived(recordsStore.filteredRecords);

  // Calculate points: X = totaltime (seconds), Y = accuracyPct
  const scatterData = $derived(
    records.map((r) => [r.totaltime, r.accuracyPct, r.passed ? 1 : 0, r.rankLabel, r.guanid, r.formattedDate])
  );

  const regression = $derived.by(() => {
    const rawPoints: [number, number][] = records.map((r) => [r.totaltime, r.accuracyPct]);
    return computeLinearRegression(rawPoints);
  });

  const r2Strength = $derived.by(() => {
    const r2 = regression.r2;
    if (r2 < 0.10) return 'Negligible';
    if (r2 < 0.25) return 'Weak';
    if (r2 < 0.50) return 'Moderate';
    return 'Strong';
  });

  const insightText = $derived.by(() => {
    if (records.length < 5) return 'Need at least 5 records to estimate regression trend.';
    const slope = regression.slope;
    const r2 = regression.r2;
    const pctExplained = (r2 * 100).toFixed(1);

    if (r2 < 0.10) {
      return `Negligible correlation (R²: ${r2}). Time taken accounts for only ${pctExplained}% of score variance—accuracy is governed almost entirely by problem difficulty and pattern familiarity, not how fast or slow you solve.`;
    } else if (r2 < 0.25) {
      if (slope < -0.02) {
        return `Weak negative correlation (R²: ${r2}, slope: ${slope}%/s). Slight tendency for scores to drop when tests drag out, though ~${(100 - Number(pctExplained)).toFixed(0)}% of variance is driven by other factors.`;
      } else if (slope > 0.02) {
        return `Weak positive correlation (R²: ${r2}, slope: +${slope}%/s). Slight benefit from taking more time, though ~${(100 - Number(pctExplained)).toFixed(0)}% of variance is driven by other factors.`;
      } else {
        return `Weak correlation (R²: ${r2}). Accuracy stays largely flat across different test durations.`;
      }
    } else {
      if (slope < -0.02) {
        return `Moderate negative correlation (R²: ${r2}, slope: ${slope}%/s). Noticeable drop in accuracy on tests where you spent longer—hesitation and prolonged reading are strong indicators of struggle on unfamiliar shapes.`;
      } else if (slope > 0.02) {
        return `Moderate positive correlation (R²: ${r2}, slope: +${slope}%/s). Taking more time to read out candidate moves is noticeably associated with higher accuracy.`;
      } else {
        return `Moderate correlation (R²: ${r2}). Test duration has a steady relationship with your score.`;
      }
    }
  });

  const chartOptions = $derived.by<EChartsOption>(() => {
    if (records.length === 0) {
      return {
        title: {
          text: 'No data available for regression',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#5e4537', fontSize: 14 }
        }
      };
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#3D2A1F',
        borderColor: '#88C13F',
        borderWidth: 1,
        textStyle: { color: '#FDF5E6', fontSize: 12 },
        formatter: (params: any) => {
          if (params.seriesName === 'Regression Trend') {
            return `
              <div style="font-size: 11px;">
                <strong>Linear Regression</strong><br/>
                Slope: ${regression.slope}% per sec<br/>
                R²: ${regression.r2}
              </div>
            `;
          }
          const val = params.value;
          if (!val) return '';
          const [duration, accuracy, pass, rankLabel, guanid, date] = val;
          const status = pass === 1
            ? `<span style="color: #88C13F; font-weight: bold;">PASS</span>`
            : `<span style="color: #c84b31; font-weight: bold;">FAIL</span>`;

          return `
            <div style="font-size: 11px; line-height: 1.5;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px;">
                ${date} — ${rankLabel} ${status}
              </div>
              <div>Duration: <strong>${duration}s</strong> (${(duration / 10).toFixed(1)}s / prob)</div>
              <div>Accuracy: <strong style="color: #88C13F;">${accuracy}%</strong></div>
              <div>Guan ID: <code>${guanid}</code></div>
            </div>
          `;
        }
      },
      legend: {
        data: ['Passed Test', 'Failed Test', 'Regression Trend'],
        textStyle: { color: '#3D2A1F', fontSize: 11 },
        top: 4,
        left: 'center'
      },
      grid: {
        top: 48,
        left: 45,
        right: 35,
        bottom: 45
      },
      xAxis: {
        type: 'value',
        name: 'Test Duration (s)',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { color: '#8B5E3C', fontSize: 11, fontWeight: 'bold' },
        axisLine: { show: true, lineStyle: { color: '#D6BA96' } },
        splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
        axisLabel: { color: '#5e4537', fontSize: 10, formatter: '{value}s' }
      },
      yAxis: {
        type: 'value',
        name: 'Accuracy (%)',
        nameTextStyle: { color: '#88C13F', fontSize: 11, fontWeight: 'bold' },
        min: 0,
        max: 100,
        axisLine: { show: true, lineStyle: { color: '#88C13F' } },
        splitLine: { lineStyle: { color: '#ebdcc9', type: 'dashed' } },
        axisLabel: { color: '#5e4537', fontSize: 10, formatter: '{value}%' }
      },
      series: [
        {
          name: 'Passed Test',
          type: 'scatter',
          data: scatterData.filter((d) => d[2] === 1),
          symbolSize: 8,
          itemStyle: {
            color: '#88C13F',
            borderColor: '#3D2A1F',
            borderWidth: 0.5,
            opacity: 0.8
          }
        },
        {
          name: 'Failed Test',
          type: 'scatter',
          data: scatterData.filter((d) => d[2] === 0),
          symbolSize: 8,
          itemStyle: {
            color: '#c84b31',
            borderColor: '#3D2A1F',
            borderWidth: 0.5,
            opacity: 0.8
          }
        },
        {
          name: 'Regression Trend',
          type: 'line',
          data: regression.trendPoints,
          smooth: false,
          showSymbol: false,
          lineStyle: {
            color: '#3D2A1F',
            width: 2.5,
            type: 'dashed'
          },
          z: 5
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs overflow-hidden">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
    <div>
      <h3 class="text-sm font-bold text-[#3D2A1F] flex items-center gap-1.5">
        <TrendingUp class="w-4 h-4 text-[#88C13F]" />
        <span>Speed vs. Accuracy & Regression</span>
      </h3>
      <p class="text-[11px] text-[#5e4537]">
        Scatter plot of duration vs accuracy with ordinary least squares (OLS) linear regression.
      </p>
    </div>

    <!-- Stats pill -->
    <div class="inline-flex items-center gap-2 bg-[#FDF5E6] border border-[#D6BA96] px-2.5 py-1 rounded-lg text-xs self-start sm:self-auto">
      <span class="text-[#5e4537]">Slope: <strong class="text-[#3D2A1F]">{regression.slope}%/s</strong></span>
      <span class="text-[#D6BA96]">|</span>
      <span class="text-[#5e4537]">
        R²: <strong class="text-[#3D2A1F]">{regression.r2}</strong>
        <span class="text-[10px] font-medium {regression.r2 < 0.10 ? 'text-[#5e4537]' : regression.r2 < 0.25 ? 'text-[#8B5E3C]' : 'text-[#88C13F]'}">
          ({r2Strength})
        </span>
      </span>
    </div>
  </div>

  <EChart options={chartOptions} height="320px" />

  <!-- Insight banner -->
  <div class="mt-3 bg-[#FDF5E6] border border-[#D6BA96]/70 rounded-lg p-2.5 text-xs text-[#3D2A1F] flex items-start gap-2">
    <Info class="w-4 h-4 text-[#8B5E3C] shrink-0 mt-0.5" />
    <span class="text-[11px] text-[#5e4537] leading-relaxed">
      <strong class="text-[#3D2A1F]">Pattern Insight:</strong> {insightText}
    </span>
  </div>
</div>
