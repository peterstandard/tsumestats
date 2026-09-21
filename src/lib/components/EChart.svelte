<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';

  interface Props {
    options: echarts.EChartsOption;
    height?: string;
    class?: string;
    onchartclick?: (params: any) => void;
  }

  let { options, height = '360px', class: className = '', onchartclick }: Props = $props();

  let chartDom: HTMLDivElement | null = $state(null);
  let chartInstance: echarts.ECharts | null = null;
  let resizeObserver: ResizeObserver | null = null;

  onMount(() => {
    if (!chartDom) return;

    chartInstance = echarts.init(chartDom, undefined, {
      renderer: 'canvas'
    });

    if (options) {
      chartInstance.setOption(options, true);
    }

    chartInstance.on('click', (params) => {
      onchartclick?.(params);
    });

    resizeObserver = new ResizeObserver(() => {
      chartInstance?.resize();
    });
    resizeObserver.observe(chartDom);
  });

  $effect(() => {
    if (chartInstance && options) {
      chartInstance.setOption(options, true);
    }
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    chartInstance?.dispose();
    chartInstance = null;
  });
</script>

<div
  bind:this={chartDom}
  style="height: {height}; width: 100%; min-width: 0;"
  class={className}
></div>
