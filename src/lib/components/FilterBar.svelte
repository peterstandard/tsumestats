<script lang="ts">
  import { recordsStore } from '$lib/stores/records.svelte';
  import { rankNumberToLabel } from '$lib/utils/rank';
  import { Filter, Calendar, Search, X } from 'lucide-svelte';

  // Extract unique ranks present in all records
  const availableRanks = $derived.by(() => {
    const set = new Set<number>();
    for (const r of recordsStore.allRecords) {
      set.add(r.number);
    }
    return Array.from(set).sort((a, b) => a - b);
  });

  const isFiltered = $derived(
    recordsStore.filter.datePreset !== 'all' ||
    recordsStore.filter.rankFilter !== 'all' ||
    recordsStore.filter.statusFilter !== 'all' ||
    recordsStore.filter.searchQuery.trim() !== ''
  );

  function resetFilters() {
    recordsStore.filter.datePreset = 'all';
    recordsStore.filter.rankFilter = 'all';
    recordsStore.filter.statusFilter = 'all';
    recordsStore.filter.searchQuery = '';
  }
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
  <!-- Left: Presets & Selectors -->
  <div class="flex flex-wrap items-center gap-2 sm:gap-3">
    <div class="flex items-center gap-1.5 text-xs font-semibold text-[#8B5E3C] mr-1">
      <Filter class="w-3.5 h-3.5" />
      <span>Filters:</span>
    </div>

    <!-- Date Range Presets -->
    <div class="inline-flex rounded-lg border border-[#D6BA96] bg-[#FDF5E6] p-0.5">
      <button
        onclick={() => (recordsStore.filter.datePreset = 'all')}
        class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {recordsStore.filter.datePreset === 'all' ? 'bg-[#88C13F] text-white shadow-xs' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
      >
        All Time
      </button>
      <button
        onclick={() => (recordsStore.filter.datePreset = '60d')}
        class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {recordsStore.filter.datePreset === '60d' ? 'bg-[#88C13F] text-white shadow-xs' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
      >
        Past 60d
      </button>
      <button
        onclick={() => (recordsStore.filter.datePreset = '30d')}
        class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {recordsStore.filter.datePreset === '30d' ? 'bg-[#88C13F] text-white shadow-xs' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
      >
        Past 30d
      </button>
      <button
        onclick={() => (recordsStore.filter.datePreset = '7d')}
        class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer {recordsStore.filter.datePreset === '7d' ? 'bg-[#88C13F] text-white shadow-xs' : 'text-[#3D2A1F] hover:bg-[#F4E7CE]'}"
      >
        Past 7d
      </button>
    </div>

    <!-- Rank Select -->
    <select
      bind:value={recordsStore.filter.rankFilter}
      class="text-xs bg-[#FDF5E6] border border-[#D6BA96] text-[#3D2A1F] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#88C13F] cursor-pointer"
    >
      <option value="all">All Ranks</option>
      {#each availableRanks as rankNum}
        <option value={rankNum}>{rankNumberToLabel(rankNum)}</option>
      {/each}
    </select>

    <!-- Status Select -->
    <select
      bind:value={recordsStore.filter.statusFilter}
      class="text-xs bg-[#FDF5E6] border border-[#D6BA96] text-[#3D2A1F] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#88C13F] cursor-pointer"
    >
      <option value="all">All Outcomes</option>
      <option value="pass">Passed Only</option>
      <option value="fail">Failed Only</option>
    </select>

    <!-- Clear Filter Button -->
    {#if isFiltered}
      <button
        onclick={resetFilters}
        class="inline-flex items-center gap-1 text-xs text-[#8B5E3C] hover:text-[#3D2A1F] px-2 py-1 rounded-md hover:bg-[#F4E7CE] transition-colors cursor-pointer"
        title="Reset all filters"
      >
        <X class="w-3.5 h-3.5" />
        Reset
      </button>
    {/if}
  </div>

  <!-- Right: Search Input -->
  <div class="relative w-full sm:w-64">
    <Search class="w-3.5 h-3.5 text-[#8B5E3C] absolute left-2.5 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      bind:value={recordsStore.filter.searchQuery}
      placeholder="Search ID, rank, or date..."
      class="w-full text-xs pl-8 pr-3 py-1.5 bg-[#FDF5E6] border border-[#D6BA96] rounded-lg text-[#3D2A1F] placeholder-[#5e4537]/60 focus:outline-none focus:ring-1 focus:ring-[#88C13F]"
    />
  </div>
</div>
