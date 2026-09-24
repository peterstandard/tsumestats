<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import type { ProcessedHeroRecord } from '$lib/types';
  import {
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    CheckCircle2,
    AlertCircle,
    ListFilter
  } from 'lucide-svelte';

  type SortKey = 'date' | 'misplays' | 'rating' | 'xp';

  let sortKey = $state<SortKey>('date');
  let sortAsc = $state<boolean>(false); // default: newest first
  let currentPage = $state<number>(1);
  let pageSize = $state<number>(20);

  const sortedRecords = $derived.by<ProcessedHeroRecord[]>(() => {
    const list = [...heroStore.filteredRecords];
    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'date') diff = a.timestamp - b.timestamp;
      else if (sortKey === 'misplays') diff = a.misplays - b.misplays;
      else if (sortKey === 'rating') diff = a.rating - b.rating;
      else if (sortKey === 'xp') diff = a.xp - b.xp;
      return sortAsc ? diff : -diff;
    });
    return list;
  });

  const totalPages = $derived(Math.max(1, Math.ceil(sortedRecords.length / pageSize)));

  const pagedRecords = $derived.by<ProcessedHeroRecord[]>(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = false;
    }
    currentPage = 1;
  }
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl shadow-2xs overflow-hidden">
  <!-- Table Header Bar -->
  <div class="p-4 border-b border-[#D6BA96] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FAF0DA]">
    <div>
      <h3 class="text-sm font-bold text-[#3D2A1F] flex items-center gap-1.5">
        <ListFilter class="w-4 h-4 text-[#8C52FF]" />
        <span>Solve History Log</span>
        <span class="text-xs font-normal text-[#5e4537]">({sortedRecords.length} records)</span>
      </h3>
      <p class="text-[11px] text-[#5e4537]">
        Every recorded Tsumego Hero problem solve with misplays, rating updates, and direct problem links.
      </p>
    </div>

    <!-- Page Size Selector -->
    <div class="flex items-center gap-2 text-xs text-[#5e4537]">
      <span>Rows per page:</span>
      <select
        bind:value={pageSize}
        onchange={() => (currentPage = 1)}
        class="bg-[#FDF5E6] border border-[#D6BA96] text-[#3D2A1F] rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#8C52FF]"
      >
        <option value={15}>15</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  </div>

  <!-- Table Component -->
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-[#F4E7CE] text-[#3D2A1F] border-b border-[#D6BA96] font-semibold select-none">
          <th class="py-2.5 px-3">
            <button
              onclick={() => toggleSort('date')}
              class="flex items-center gap-1 hover:text-[#8C52FF] transition-colors cursor-pointer"
            >
              <span>Date & Time</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>
          <th class="py-2.5 px-3">Collection / Set</th>
          <th class="py-2.5 px-3">Problem</th>
          <th class="py-2.5 px-3 text-center">
            <button
              onclick={() => toggleSort('misplays')}
              class="inline-flex items-center gap-1 hover:text-[#8C52FF] transition-colors cursor-pointer mx-auto"
            >
              <span>Misplays</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>
          <th class="py-2.5 px-3 text-right">
            <button
              onclick={() => toggleSort('rating')}
              class="inline-flex items-center gap-1 hover:text-[#8C52FF] transition-colors cursor-pointer ml-auto"
            >
              <span>Elo Rating</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>
          <th class="py-2.5 px-3 text-right">
            <button
              onclick={() => toggleSort('xp')}
              class="inline-flex items-center gap-1 hover:text-[#8C52FF] transition-colors cursor-pointer ml-auto"
            >
              <span>XP</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>
          <th class="py-2.5 px-3 text-center">Hero Link</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#D6BA96]/50">
        {#if pagedRecords.length === 0}
          <tr>
            <td colspan="7" class="py-8 text-center text-xs text-[#5e4537]">
              No solves match the current filters.
            </td>
          </tr>
        {:else}
          {#each pagedRecords as record (record.id)}
            <tr class="hover:bg-[#FDF5E6]/60 transition-colors">
              <!-- Date & Time -->
              <td class="py-2.5 px-3 font-mono text-[11px] text-[#5e4537] whitespace-nowrap">
                {record.formattedDate}
              </td>

              <!-- Collection -->
              <td class="py-2.5 px-3 font-medium text-[#3D2A1F]">
                {#if record.setUrl}
                  <a
                    href="https://tsumego-hero.com{record.setUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-[#8C52FF] hover:underline"
                  >
                    {record.set}
                  </a>
                {:else}
                  {record.set}
                {/if}
              </td>

              <!-- Problem Number -->
              <td class="py-2.5 px-3 font-mono font-semibold text-[#3D2A1F]">
                #{record.tsumego}
              </td>

              <!-- Misplays -->
              <td class="py-2.5 px-3 text-center whitespace-nowrap">
                {#if record.isClean}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf6dc] text-[#55821c] border border-[#88C13F]/40">
                    <CheckCircle2 class="w-3 h-3" />
                    Flawless (0)
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fbeee9] text-[#c84b31] border border-[#c84b31]/30">
                    <AlertCircle class="w-3 h-3" />
                    {record.misplays} {record.misplays === 1 ? 'misplay' : 'misplays'}
                  </span>
                {/if}
              </td>

              <!-- Rating -->
              <td class="py-2.5 px-3 text-right font-mono font-bold text-[#8C52FF]">
                {record.rating || '—'}
              </td>

              <!-- XP -->
              <td class="py-2.5 px-3 text-right font-mono text-[#5e4537]">
                +{record.xp}
              </td>

              <!-- Hero Link -->
              <td class="py-2.5 px-3 text-center">
                {#if record.probUrl}
                  <a
                    href="https://tsumego-hero.com{record.probUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-[11px] text-[#8C52FF] hover:text-[#5b21b6] font-medium hover:underline"
                    title="View problem on Tsumego Hero"
                  >
                    <span>View</span>
                    <ExternalLink class="w-3 h-3" />
                  </a>
                {:else}
                  <span class="text-[#5e4537] text-[10px]">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination Controls -->
  <div class="p-3 border-t border-[#D6BA96] bg-[#FAF0DA] flex items-center justify-between text-xs text-[#5e4537]">
    <div>
      Showing <span class="font-bold text-[#3D2A1F]">{sortedRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span>
      to <span class="font-bold text-[#3D2A1F]">{Math.min(currentPage * pageSize, sortedRecords.length)}</span>
      of <span class="font-bold text-[#3D2A1F]">{sortedRecords.length}</span> solves
    </div>

    <div class="flex items-center gap-1.5">
      <button
        onclick={() => (currentPage = Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        class="p-1 rounded border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#3D2A1F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Previous Page"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <span class="px-2 font-medium">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        class="p-1 rounded border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] text-[#3D2A1F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Next Page"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</div>
