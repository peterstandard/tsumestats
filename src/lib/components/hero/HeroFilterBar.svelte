<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import { Search, X, Filter } from 'lucide-svelte';

  const datePresets = [
    { id: 'all', label: 'All Time' },
    { id: '60d', label: 'Last 60 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '7d', label: 'Last 7 Days' }
  ] as const;

  // Available unique sets from all records
  let availableSets = $derived.by(() => {
    const sets = Array.from(new Set(heroStore.allRecords.map((r) => r.set)));
    sets.sort();
    return sets;
  });

  function resetFilters() {
    heroStore.filter.datePreset = 'all';
    heroStore.filter.setFilter = 'all';
    heroStore.filter.misplayFilter = 'all';
    heroStore.filter.searchQuery = '';
  }

  let isFiltered = $derived(
    heroStore.filter.datePreset !== 'all' ||
    heroStore.filter.setFilter !== 'all' ||
    heroStore.filter.misplayFilter !== 'all' ||
    heroStore.filter.searchQuery.trim() !== ''
  );
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-3 sm:p-4 shadow-2xs space-y-3">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <!-- Date Presets -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-[11px] font-semibold text-[#5e4537] mr-1 hidden sm:inline">Range:</span>
      {#each datePresets as preset}
        <button
          onclick={() => (heroStore.filter.datePreset = preset.id)}
          class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer {heroStore.filter.datePreset === preset.id ? 'bg-[#8C52FF] text-white font-bold shadow-2xs' : 'bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#3D2A1F] border border-[#D6BA96]'}"
        >
          {preset.label}
        </button>
      {/each}
    </div>

    <!-- Active filter feedback / Reset -->
    <div class="flex items-center gap-2">
      {#if isFiltered}
        <span class="text-xs text-[#8C52FF] font-medium">
          Showing {heroStore.filteredRecords.length} of {heroStore.allRecords.length} solves
        </span>
        <button
          onclick={resetFilters}
          class="inline-flex items-center gap-1 text-xs text-[#5e4537] hover:text-[#c84b31] px-2 py-0.5 rounded bg-[#FDF5E6] border border-[#D6BA96] transition-colors cursor-pointer"
        >
          <X class="w-3 h-3" />
          Reset
        </button>
      {:else}
        <span class="text-xs text-[#5e4537]">
          Showing all {heroStore.allRecords.length} solves
        </span>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-[#D6BA96]/60">
    <!-- Collection / Set Dropdown -->
    <div class="flex items-center gap-2">
      <label for="set-select" class="text-xs font-medium text-[#5e4537] shrink-0">Collection:</label>
      <select
        id="set-select"
        bind:value={heroStore.filter.setFilter}
        class="w-full text-xs bg-[#FDF5E6] border border-[#D6BA96] rounded-lg px-2.5 py-1.5 text-[#3D2A1F] focus:outline-none focus:ring-1 focus:ring-[#8C52FF] truncate"
      >
        <option value="all">All Collections ({availableSets.length})</option>
        {#each availableSets as setName}
          <option value={setName}>{setName}</option>
        {/each}
      </select>
    </div>

    <!-- Misplay Filter -->
    <div class="flex items-center gap-2">
      <label for="misplay-select" class="text-xs font-medium text-[#5e4537] shrink-0">Result:</label>
      <select
        id="misplay-select"
        bind:value={heroStore.filter.misplayFilter}
        class="w-full text-xs bg-[#FDF5E6] border border-[#D6BA96] rounded-lg px-2.5 py-1.5 text-[#3D2A1F] focus:outline-none focus:ring-1 focus:ring-[#8C52FF]"
      >
        <option value="all">All Solves</option>
        <option value="clean">Flawless Only (0 Misplays)</option>
        <option value="misplay">Had Misplays (1+ Misplays)</option>
      </select>
    </div>

    <!-- Search Query -->
    <div class="relative">
      <Search class="w-3.5 h-3.5 text-[#5e4537] absolute left-2.5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        bind:value={heroStore.filter.searchQuery}
        placeholder="Search book, problem #..."
        class="w-full text-xs bg-[#FDF5E6] border border-[#D6BA96] rounded-lg pl-8 pr-7 py-1.5 text-[#3D2A1F] placeholder-[#5e4537]/60 focus:outline-none focus:ring-1 focus:ring-[#8C52FF]"
      />
      {#if heroStore.filter.searchQuery}
        <button
          onclick={() => (heroStore.filter.searchQuery = '')}
          class="absolute right-2 top-1/2 -translate-y-1/2 text-[#5e4537] hover:text-[#3D2A1F]"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      {/if}
    </div>
  </div>
</div>
