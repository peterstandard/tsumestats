<script lang="ts">
  import { platformStore } from '$lib/stores/platform.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import {
    Upload,
    Download,
    RotateCcw,
    Bookmark,
    Sparkles,
    CheckCircle,
    FileJson,
    Trash2,
    Layers
  } from 'lucide-svelte';
  import { APP_VERSION } from '$lib/version';

  interface Props {
    onOpenImport: () => void;
    onOpenBookmarklet: () => void;
  }

  let { onOpenImport, onOpenBookmarklet }: Props = $props();

  let showConfirmClear = $state(false);

  let isWeiqi = $derived(platformStore.activePlatform === '101weiqi');

  function handleClear() {
    if (isWeiqi) {
      recordsStore.clearData();
    } else {
      heroStore.clearData();
    }
    showConfirmClear = false;
  }

  function handleExport() {
    if (isWeiqi) {
      recordsStore.exportJson();
    } else {
      heroStore.exportJson();
    }
  }

  function handleLoadDemo() {
    if (isWeiqi) {
      recordsStore.loadDemo();
    } else {
      heroStore.loadDemo();
    }
  }

  let isDemoActive = $derived(isWeiqi ? recordsStore.isDemo : heroStore.isDemo);
  let totalRecords = $derived(isWeiqi ? recordsStore.allRecords.length : heroStore.allRecords.length);
</script>

<header class="border-b border-[#D6BA96] bg-[#FAF0DA]/80 backdrop-blur-sm sticky top-0 z-30 px-4 sm:px-8 py-3 transition-colors">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <!-- Brand / Title & Platform Switcher -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div class="flex items-center gap-3">
        <!-- Go stone / Kiwi Icon -->
        <div class="relative w-10 h-10 rounded-full bg-[#3D2A1F] border-2 {isWeiqi ? 'border-[#88C13F]' : 'border-[#8C52FF]'} flex items-center justify-center shadow-md shadow-[#8B5E3C]/20 transition-colors">
          <span class="w-4 h-4 rounded-full {isWeiqi ? 'bg-[#88C13F]' : 'bg-[#8C52FF]'} block transition-colors"></span>
          <span class="absolute text-[10px] font-bold text-[#FDF5E6]">詰</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-black tracking-tight text-[#3D2A1F]">tsumestats</h1>
            <span class="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border border-[#D6BA96] bg-[#FDF5E6] text-[#8B5E3C] shadow-2xs">
              v{APP_VERSION}
            </span>
          </div>
          <p class="text-xs text-[#5e4537]">
            {#if isWeiqi}
              101weiqi checkpoint tests & speed regression
            {:else}
              Tsumego Hero solve history, session pacing & book mastery
            {/if}
          </p>
        </div>
      </div>

      <!-- Segmented Platform Switcher -->
      <div class="inline-flex p-0.5 bg-[#FDF5E6] border border-[#D6BA96] rounded-xl shadow-2xs self-start sm:self-auto">
        <button
          onclick={() => platformStore.setPlatform('101weiqi')}
          class="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {isWeiqi ? 'bg-[#88C13F] text-white shadow-xs' : 'text-[#5e4537] hover:text-[#3D2A1F]'}"
          title="Switch to 101weiqi analytics"
        >
          <span class="w-2 h-2 rounded-full {isWeiqi ? 'bg-white' : 'bg-[#88C13F]'}"></span>
          <span>101weiqi</span>
        </button>
        <button
          onclick={() => platformStore.setPlatform('tsumegohero')}
          class="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {!isWeiqi ? 'bg-[#8C52FF] text-white shadow-xs' : 'text-[#5e4537] hover:text-[#3D2A1F]'}"
          title="Switch to Tsumego Hero analytics"
        >
          <span class="w-2 h-2 rounded-full {!isWeiqi ? 'bg-white' : 'bg-[#8C52FF]'}"></span>
          <span>Tsumego Hero</span>
        </button>
      </div>
    </div>

    <!-- Active State & Actions -->
    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <!-- Demo / Active indicator -->
      {#if isDemoActive}
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold {isWeiqi ? 'bg-[#eaf6dc] text-[#55821c] border border-[#88C13F]/50' : 'bg-[#f3e8ff] text-[#6b21a8] border border-[#8C52FF]/50'}">
          <Sparkles class="w-3.5 h-3.5" />
          Demo Dataset
        </span>
      {:else if totalRecords > 0}
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF0DA] text-[#3D2A1F] border border-[#D6BA96]">
          <CheckCircle class="w-3.5 h-3.5 {isWeiqi ? 'text-[#88C13F]' : 'text-[#8C52FF]'}" />
          {totalRecords} {isWeiqi ? 'tests' : 'solves'} loaded
        </span>
      {/if}

      <!-- Bookmarklet Helper -->
      <button
        onclick={onOpenBookmarklet}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#3D2A1F] transition-colors cursor-pointer shadow-xs"
        title="Get the scraper bookmarklet"
      >
        <Bookmark class="w-3.5 h-3.5 text-[#8B5E3C]" />
        Bookmarklet
      </button>

      <!-- Import JSON -->
      <button
        onclick={onOpenImport}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold {isWeiqi ? 'bg-[#88C13F] hover:bg-[#78ab37]' : 'bg-[#8C52FF] hover:bg-[#7c3aed]'} text-white transition-colors cursor-pointer shadow-sm"
      >
        <Upload class="w-3.5 h-3.5" />
        Import Data
      </button>

      <!-- Demo toggle (if not demo) -->
      {#if !isDemoActive}
        <button
          onclick={handleLoadDemo}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#8B5E3C] transition-colors cursor-pointer"
          title="Switch back to demo dataset"
        >
          <Sparkles class="w-3.5 h-3.5" />
          Demo
        </button>
      {/if}

      <!-- Export JSON -->
      {#if totalRecords > 0}
        <button
          onclick={handleExport}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#3D2A1F] transition-colors cursor-pointer"
          title="Export current records as JSON"
        >
          <Download class="w-3.5 h-3.5 text-[#8B5E3C]" />
          Export
        </button>
      {/if}

      <!-- Clear Data -->
      {#if totalRecords > 0}
        {#if !showConfirmClear}
          <button
            onclick={() => (showConfirmClear = true)}
            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5e4537] hover:text-[#c84b31] hover:bg-[#fbeee9] transition-colors cursor-pointer"
            title="Clear all records"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        {:else}
          <div class="inline-flex items-center gap-1.5 bg-[#fbeee9] border border-[#c84b31]/30 px-2 py-1 rounded-lg">
            <span class="text-[11px] text-[#c84b31] font-medium">Clear all?</span>
            <button
              onclick={handleClear}
              class="text-[11px] font-bold text-white bg-[#c84b31] hover:bg-[#a63a23] px-2 py-0.5 rounded cursor-pointer"
            >
              Yes
            </button>
            <button
              onclick={() => (showConfirmClear = false)}
              class="text-[11px] text-[#5e4537] hover:text-[#3D2A1F] px-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</header>
