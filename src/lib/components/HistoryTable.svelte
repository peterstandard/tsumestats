<script lang="ts">
  import { recordsStore } from '$lib/stores/records.svelte';
  import type { ProcessedRecord } from '$lib/types';
  import {
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    ListFilter
  } from 'lucide-svelte';

  type SortKey = 'date' | 'number' | 'oknum' | 'totaltime';

  let sortKey = $state<SortKey>('date');
  let sortAsc = $state<boolean>(false); // default: newest first
  let currentPage = $state<number>(1);
  let pageSize = $state<number>(15);

  const sortedRecords = $derived.by<ProcessedRecord[]>(() => {
    const list = [...recordsStore.filteredRecords];
    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'date') diff = a.t - b.t;
      else if (sortKey === 'number') diff = a.number - b.number;
      else if (sortKey === 'oknum') diff = a.oknum - b.oknum;
      else if (sortKey === 'totaltime') diff = a.totaltime - b.totaltime;
      return sortAsc ? diff : -diff;
    });
    return list;
  });

  const totalPages = $derived(Math.max(1, Math.ceil(sortedRecords.length / pageSize)));

  const pagedRecords = $derived.by<ProcessedRecord[]>(() => {
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

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl shadow-xs overflow-hidden">
  <!-- Table Header Bar -->
  <div class="p-4 border-b border-[#D6BA96] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FAF0DA]">
    <div>
      <h3 class="text-sm font-bold text-[#3D2A1F] flex items-center gap-1.5">
        <ListFilter class="w-4 h-4 text-[#88C13F]" />
        <span>Test History Log</span>
        <span class="text-xs font-normal text-[#5e4537]">({sortedRecords.length} records)</span>
      </h3>
      <p class="text-[11px] text-[#5e4537]">
        Every checkpoint challenge with score, pace, and direct review link to 101weiqi.
      </p>
    </div>

    <!-- Page Size Selector -->
    <div class="flex items-center gap-2 text-xs text-[#5e4537]">
      <span>Rows per page:</span>
      <select
        bind:value={pageSize}
        onchange={() => (currentPage = 1)}
        class="bg-[#FDF5E6] border border-[#D6BA96] text-[#3D2A1F] rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#88C13F]"
      >
        <option value={15}>15</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
      </select>
    </div>
  </div>

  <!-- Table View -->
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs text-[#3D2A1F]">
      <thead class="bg-[#FDF5E6] border-b border-[#D6BA96] text-[#8B5E3C] uppercase text-[10px] tracking-wider font-semibold">
        <tr>
          <th
            onclick={() => toggleSort('date')}
            class="px-4 py-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1">
              <span>Date & Time</span>
              <ArrowUpDown class="w-3 h-3 text-[#D6BA96]" />
            </div>
          </th>
          <th class="px-3 py-3">Checkpoint ID</th>
          <th
            onclick={() => toggleSort('number')}
            class="px-3 py-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1">
              <span>Rank</span>
              <ArrowUpDown class="w-3 h-3 text-[#D6BA96]" />
            </div>
          </th>
          <th
            onclick={() => toggleSort('oknum')}
            class="px-3 py-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1">
              <span>Score / Accuracy</span>
              <ArrowUpDown class="w-3 h-3 text-[#D6BA96]" />
            </div>
          </th>
          <th
            onclick={() => toggleSort('totaltime')}
            class="px-3 py-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1">
              <span>Duration</span>
              <ArrowUpDown class="w-3 h-3 text-[#D6BA96]" />
            </div>
          </th>
          <th class="px-3 py-3 text-center">Status</th>
          <th class="px-4 py-3 text-right">Review on 101weiqi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#ebdcc9]">
        {#if pagedRecords.length === 0}
          <tr>
            <td colspan="7" class="px-4 py-8 text-center text-xs text-[#5e4537]">
              No records match the current filters.
            </td>
          </tr>
        {:else}
          {#each pagedRecords as rec (rec.id)}
            <tr class="hover:bg-[#FDF5E6]/70 transition-colors">
              <!-- Date -->
              <td class="px-4 py-2.5 font-medium whitespace-nowrap">
                {rec.formattedDate}
                <span class="text-[10px] text-[#5e4537] ml-1 font-normal">({rec.dayName})</span>
              </td>

              <!-- Guan ID -->
              <td class="px-3 py-2.5 font-mono text-[11px] text-[#5e4537]">
                {rec.guanid}
              </td>

              <!-- Rank -->
              <td class="px-3 py-2.5 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded font-bold text-xs bg-[#FDF5E6] border border-[#D6BA96] text-[#3D2A1F]">
                  {rec.rankLabel}
                </span>
              </td>

              <!-- Score -->
              <td class="px-3 py-2.5 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-xs {rec.passed ? 'text-[#55821c]' : 'text-[#c84b31]'}">
                    {rec.oknum}/10
                  </span>
                  <span class="text-[10px] text-[#5e4537]">({rec.accuracyPct}%)</span>
                </div>
              </td>

              <!-- Duration -->
              <td class="px-3 py-2.5 whitespace-nowrap text-[#5e4537]">
                <span class="font-medium text-[#3D2A1F]">{rec.totaltime}s</span>
                <span class="text-[10px] text-[#5e4537]">({rec.secondsPerProblem}s/q)</span>
              </td>

              <!-- Status -->
              <td class="px-3 py-2.5 text-center whitespace-nowrap">
                {#if rec.passed}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf6dc] text-[#55821c] border border-[#88C13F]/40">
                    <CheckCircle2 class="w-3 h-3" />
                    PASS
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fbeee9] text-[#c84b31] border border-[#c84b31]/30">
                    <XCircle class="w-3 h-3" />
                    FAIL
                  </span>
                {/if}
              </td>

              <!-- Action Link -->
              <td class="px-4 py-2.5 text-right whitespace-nowrap">
                <a
                  href={rec.reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-[#8B5E3C] hover:text-[#3D2A1F] hover:underline"
                  title="Open test details on 101weiqi"
                >
                  <span>Review</span>
                  <ExternalLink class="w-3 h-3" />
                </a>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination Controls -->
  {#if totalPages > 1}
    <div class="p-3 border-t border-[#D6BA96] bg-[#FDF5E6] flex items-center justify-between text-xs text-[#5e4537]">
      <div>
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length}
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={() => (currentPage = Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          class="p-1 rounded border border-[#D6BA96] bg-[#FAF0DA] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F4E7CE] cursor-pointer"
        >
          <ChevronLeft class="w-4 h-4 text-[#3D2A1F]" />
        </button>
        <span class="font-medium text-[#3D2A1F]">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          class="p-1 rounded border border-[#D6BA96] bg-[#FAF0DA] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F4E7CE] cursor-pointer"
        >
          <ChevronRight class="w-4 h-4 text-[#3D2A1F]" />
        </button>
      </div>
    </div>
  {/if}
</div>
