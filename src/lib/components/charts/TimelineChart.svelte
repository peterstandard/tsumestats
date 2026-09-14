<script lang="ts">
  import EChart from '$lib/components/EChart.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { computeRollingAverage } from '$lib/utils/stats';
  import { Zap, TrendingDown, TrendingUp } from 'lucide-svelte';
  import type { EChartsOption } from 'echarts';

  const records = $derived(recordsStore.filteredRecords);

  const speedTrendStats = $derived.by(() => {
    if (records.length < 2) {
      return { slope: 0, speedChange: 0, startSpeed: 0, endSpeed: 0 };
    }
    const speeds = records.map((r) => r.secondsPerProblem);
    const n = speeds.length;
    let sumX = 0;
    let sumY = 0;
    speeds.forEach((y, x) => {
      sumX += x;
      sumY += y;
    });
    const meanX = sumX / n;
    const meanY = sumY / n;
    let ssXX = 0;
    let ssXY = 0;
    speeds.forEach((y, x) => {
      ssXX += (x - meanX) ** 2;
      ssXY += (x - meanX) * (y - meanY);
    });
    const slope = ssXX > 0 ? ssXY / ssXX : 0;
    const startSpeed = Number((meanY - slope * meanX).toFixed(1));
    const endSpeed = Number((startSpeed + slope * (n - 1)).toFixed(1));
    const speedChange = Number((endSpeed - startSpeed).toFixed(1));

    return { slope, speedChange, startSpeed, endSpeed };
  });

  const chartOptions = $derived.by<EChartsOption>(() => {
    if (records.length === 0) {
      return {
        title: {
          text: 'No records match the current filter',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#5e4537', fontSize: 14 }
        }
      };
    }

    const dates = records.map((r) => r.formattedDate);
    const rawAccuracies = records.map((r) => r.accuracyPct);
    const rollingAccuracies = computeRollingAverage(rawAccuracies, 7);
    const speeds = records.map((r) => r.secondsPerProblem);
    const rollingSpeeds = computeRollingAverage(speeds, 7);

    // Compute linear speed trend points across the dataset
    const n = speeds.length;
    const slope = speedTrendStats.slope;
    const startSpeed = speedTrendStats.startSpeed;
    const speedTrendline = speeds.map((_, x) => Number((startSpeed + slope * x).toFixed(1)));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#3D2A1F',
        borderColor: '#88C13F',
        borderWidth: 1,
        textStyle: { color: '#FDF5E6', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const dataIndex = params[0].dataIndex;
          const rec = records[dataIndex];
          if (!rec) return '';

          const rollingAcc = rollingAccuracies[dataIndex];
          const rollingSpd = rollingSpeeds[dataIndex];

          const statusBadge = rec.passed
            ? `<span style="color: #88C13F; font-weight: bold;">PASS</span>`
            : `<span style="color: #c84b31; font-weight: bold;">FAIL</span>`;

          return `
            <div style="font-size: 11px; line-height: 1.5;">
              <div style="font-weight: bold; border-bottom: 1px solid #5e4537; padding-bottom: 4px; margin-bottom: 4px;">
                ${rec.formattedDate} — ${rec.rankLabel} ${statusBadge}
              </div>
              <div>Accuracy: <strong style="color: #88C13F;">${rec.oknum}/10 (${rec.accuracyPct}%)</strong> <span style="color: #ebdcc9;">(7-test avg: ${rollingAcc}%)</span></div>
              <div>Speed: <strong style="color: #8B5E3C;">${rec.secondsPerProblem}s / prob</strong> <span style="color: #ebdcc9;">(7-test avg: ${rollingSpd}s)</span></div>
              <div>Test Total: <strong>${rec.totaltime}s</strong> (Guan ID: <code>${rec.guanid}</code>)</div>
            </div>
          `;
        }
      },
      legend: {
        data: [
          'Rolling Accuracy (7-Test)',
          'Raw Accuracy',
          'Rolling Speed (7-Test)',
          'Speed Trendline',
          'Raw Speed'
        ],
        textStyle: { color: '#3D2A1F', fontSize: 11 },
        top: 0,
        right: 10
      },
      grid: {
        top: 45,
        left: 45,
        right: 45,
        bottom: 65
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#D6BA96' } },
        axisLabel: {
          color: '#5e4537',
          fontSize: 10,
          formatter: (val: string) => {
            const parts = val.split(',');
            return parts[0] || val;
          }
        },
        axisTick: { alignWithLabel: true }
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
          name: 'Speed (s/prob)',
          nameTextStyle: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 11 },
          min: 0,
          axisLine: { show: true, lineStyle: { color: '#8B5E3C' } },
          splitLine: { show: false },
          axisLabel: { color: '#8B5E3C', fontSize: 10, formatter: '{value}s' }
        }
      ],
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 10,
          height: 22,
          borderColor: '#D6BA96',
          fillerColor: 'rgba(136, 193, 63, 0.2)',
          handleStyle: { color: '#88C13F', borderColor: '#3D2A1F' },
          textStyle: { color: '#5e4537', fontSize: 10 },
          start: records.length > 50 ? 50 : 0,
          end: 100
        },
        {
          type: 'inside',
          xAxisIndex: [0]
        }
      ],
      series: [
        // 1. Rolling Accuracy
        {
          name: 'Rolling Accuracy (7-Test)',
          type: 'line',
          data: rollingAccuracies,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#88C13F', width: 3 },
          itemStyle: { color: '#88C13F' },
          z: 4
        },
        // 2. Raw Accuracy Scatter
        {
          name: 'Raw Accuracy',
          type: 'scatter',
          data: rawAccuracies,
          symbolSize: 5,
          itemStyle: {
            color: (params: any) => {
              const rec = records[params.dataIndex];
              return rec?.passed ? '#88C13F' : '#c84b31';
            },
            opacity: 0.65
          },
          z: 3
        },
        // 3. Rolling Smoothed Speed
        {
          name: 'Rolling Speed (7-Test)',
          type: 'line',
          yAxisIndex: 1,
          data: rollingSpeeds,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#8B5E3C', width: 2.5 },
          itemStyle: { color: '#8B5E3C' },
          z: 4
        },
        // 4. Speed Linear Trendline
        {
          name: 'Speed Trendline',
          type: 'line',
          yAxisIndex: 1,
          data: speedTrendline,
          smooth: false,
          showSymbol: false,
          lineStyle: {
            color: '#6e472a',
            width: 2,
            type: 'dashed'
          },
          itemStyle: { color: '#6e472a' },
          z: 2
        },
        // 5. Raw Speed (Subtle)
        {
          name: 'Raw Speed',
          type: 'line',
          yAxisIndex: 1,
          data: speeds,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: '#c49a7a', width: 1, type: 'dotted' },
          itemStyle: { color: '#c49a7a' },
          z: 1
        }
      ]
    };
  });
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
    <div>
      <h3 class="text-sm font-bold text-[#3D2A1F] flex items-center gap-2">
        <span>Timeline & Progression</span>
        <span class="text-[11px] font-normal text-[#5e4537]">(Past 2 Months)</span>
      </h3>
      <p class="text-[11px] text-[#5e4537]">
        Rolling accuracy (green) vs smoothed solving speed & trendline (brown). Drag the slider to zoom into any period.
      </p>
    </div>

    <!-- Speed Trend Summary Chip -->
    {#if records.length >= 5}
      <div class="inline-flex items-center gap-2 bg-[#FDF5E6] border border-[#D6BA96] px-3 py-1.5 rounded-lg text-xs self-start sm:self-auto shadow-xs">
        <Zap class="w-3.5 h-3.5 text-[#8B5E3C]" />
        <span class="text-[#5e4537]">
          Speed Trend:
          <strong class="{speedTrendStats.speedChange <= 0 ? 'text-[#88C13F]' : 'text-[#c84b31]'}">
            {speedTrendStats.speedChange <= 0 ? `${speedTrendStats.speedChange}s` : `+${speedTrendStats.speedChange}s`} / prob
          </strong>
        </span>
        <span class="text-[10px] text-[#5e4537] font-medium">
          ({speedTrendStats.startSpeed}s → {speedTrendStats.endSpeed}s)
        </span>
      </div>
    {/if}
  </div>

  <EChart options={chartOptions} height="350px" />
</div>
