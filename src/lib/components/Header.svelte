<script lang="ts">
  import { recordsStore } from '$lib/stores/records.svelte';
  import {
    Upload,
    Download,
    RotateCcw,
    Bookmark,
    Sparkles,
    CheckCircle,
    FileJson,
    Trash2
  } from 'lucide-svelte';

  interface Props {
    onOpenImport: () => void;
    onOpenBookmarklet: () => void;
  }

  let { onOpenImport, onOpenBookmarklet }: Props = $props();

  let showConfirmClear = $state(false);

  function handleClear() {
    recordsStore.clearData();
    showConfirmClear = false;
  }
</script>

<header class="border-b border-[#D6BA96] bg-[#FAF0DA]/80 backdrop-blur-sm sticky top-0 z-30 px-4 sm:px-8 py-3 transition-colors">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <!-- Brand / Title -->
    <div class="flex items-center gap-3">
      <!-- Go stone / Kiwi Icon -->
      <div class="relative w-10 h-10 rounded-full bg-[#3D2A1F] border-2 border-[#88C13F] flex items-center justify-center shadow-md shadow-[#8B5E3C]/20">
        <span class="w-4 h-4 rounded-full bg-[#88C13F] block"></span>
        <span class="absolute text-[10px] font-bold text-[#FDF5E6]">詰</span>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-black tracking-tight text-[#3D2A1F]">tsumestats</h1>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium border border-[#D6BA96] bg-[#FDF5E6] text-[#8B5E3C]">
            101weiqi analytics
          </span>
        </div>
        <p class="text-xs text-[#5e4537]">
          Tsumego accuracy, speed trends, and difficulty regression
        </p>
      </div>
    </div>

    <!-- Active State & Actions -->
    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <!-- Demo / Active indicator -->
      {#if recordsStore.isDemo}
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eaf6dc] text-[#55821c] border border-[#88C13F]/50">
          <Sparkles class="w-3.5 h-3.5" />
          Demo Dataset (Peter 2mo)
        </span>
      {:else if recordsStore.allRecords.length > 0}
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF0DA] text-[#3D2A1F] border border-[#D6BA96]">
          <CheckCircle class="w-3.5 h-3.5 text-[#88C13F]" />
          {recordsStore.allRecords.length} records loaded
        </span>
      {/if}

      <!-- Bookmarklet Helper -->
      <button
        onclick={onOpenBookmarklet}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#3D2A1F] transition-colors cursor-pointer shadow-xs"
        title="Get the 101weiqi bookmarklet"
      >
        <Bookmark class="w-3.5 h-3.5 text-[#8B5E3C]" />
        Bookmarklet
      </button>

      <!-- Import JSON -->
      <button
        onclick={onOpenImport}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#88C13F] hover:bg-[#78ab37] text-white transition-colors cursor-pointer shadow-sm"
      >
        <Upload class="w-3.5 h-3.5" />
        Import JSON
      </button>

      <!-- Demo toggle (if not demo) -->
      {#if !recordsStore.isDemo}
        <button
          onclick={() => recordsStore.loadDemo()}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#8B5E3C] transition-colors cursor-pointer"
          title="Switch back to demo dataset"
        >
          <Sparkles class="w-3.5 h-3.5" />
          Demo
        </button>
      {/if}

      <!-- Export JSON -->
      {#if recordsStore.allRecords.length > 0}
        <button
          onclick={() => recordsStore.exportJson()}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#3D2A1F] transition-colors cursor-pointer"
          title="Export current records as JSON"
        >
          <Download class="w-3.5 h-3.5 text-[#8B5E3C]" />
          Export
        </button>
      {/if}

      <!-- Clear Data -->
      {#if recordsStore.allRecords.length > 0}
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
