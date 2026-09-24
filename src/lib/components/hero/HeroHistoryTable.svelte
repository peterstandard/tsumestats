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
    ListFilter,
    Clock,
    X
  } from 'lucide-svelte';

  type SortKey = 'date' | 'misplays' | 'solveTime' | 'problem';

  let sortKey = $state<SortKey>('date');
  let sortAsc = $state<boolean>(false); // default: newest first
  let currentPage = $state<number>(1);
  let pageSize = $state<number>(20);

  const sortedRecords = $derived.by<ProcessedHeroRecord[]>(() => {
    const list = [...heroStore.filteredRecords];
    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'date') {
        diff = a.timestamp - b.timestamp;
      } else if (sortKey === 'misplays') {
        diff = a.misplays - b.misplays;
      } else if (sortKey === 'solveTime') {
        const aTime = a.timeSincePrevSeconds !== null && a.timeSincePrevSeconds <= 900 ? a.timeSincePrevSeconds : -1;
        const bTime = b.timeSincePrevSeconds !== null && b.timeSincePrevSeconds <= 900 ? b.timeSincePrevSeconds : -1;
        diff = aTime - bTime;
      } else if (sortKey === 'problem') {
        const aNum = parseInt(a.tsumego, 10) || 0;
        const bNum = parseInt(b.tsumego, 10) || 0;
        diff = aNum - bNum;
      }
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
      // Default to descending for misplays & solveTime so challenging/longest problems appear first!
      sortAsc = key === 'problem';
    }
    currentPage = 1;
  }

  function formatSolveTime(seconds: number | null): { text: string; tier: 'blitz' | 'steady' | 'deep' | 'break' } {
    if (seconds === null || seconds > 900) {
      return { text: '—', tier: 'break' };
    }
    if (seconds < 20) {
      return { text: `${Math.round(seconds)}s`, tier: 'blitz' };
    }
    if (seconds <= 60) {
      return { text: `${Math.round(seconds)}s`, tier: 'steady' };
    }
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return { text: `${m}m ${s > 0 ? `${s}s` : ''}`, tier: 'deep' };
  }

  // Active collection summary stats if filtered
  const isCollectionActive = $derived(heroStore.filter.setFilter !== 'all');
  const collectionStats = $derived.by(() => {
    if (!isCollectionActive) return null;
    const setName = heroStore.filter.setFilter;
    const stat = heroStore.setStats.find((s) => s.setName === setName);
    // Solves with recorded time
    const solvesWithTime = sortedRecords
      .map((r) => r.timeSincePrevSeconds)
      .filter((t): t is number => t !== null && t <= 900);
    const avgSec = solvesWithTime.length > 0 ? Math.round(solvesWithTime.reduce((a, b) => a + b, 0) / solvesWithTime.length) : null;
    return {
      stat,
      avgSec
    };
  });
</script>

<div id="hero-history-table" class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl shadow-2xs overflow-hidden scroll-mt-20">
  <!-- Table Header Bar -->
  <div class="p-4 border-b border-[#D6BA96] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FAF0DA]">
    <div>
      <h3 class="text-sm font-bold text-[#3D2A1F] flex items-center gap-1.5">
        <ListFilter class="w-4 h-4 text-[#8052cf]" />
        <span>Solve History Log</span>
        <span class="text-xs font-normal text-[#5e4537]">({sortedRecords.length} records)</span>
      </h3>
      <p class="text-[11px] text-[#5e4537]">
        Every recorded solve with misplays, solve times, and direct problem links. Click column headers to sort by duration or difficulty.
      </p>
    </div>

    <!-- Page Size Selector -->
    <div class="flex items-center gap-2 text-xs text-[#5e4537]">
      <span>Rows per page:</span>
      <select
        bind:value={pageSize}
        onchange={() => (currentPage = 1)}
        class="bg-[#FDF5E6] border border-[#D6BA96] text-[#3D2A1F] rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#8052cf]"
      >
        <option value={15}>15</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  </div>

  <!-- Collection Filter Banner (shown when filtered to a collection) -->
  {#if isCollectionActive}
    <div class="px-4 py-2.5 bg-[#8052cf]/10 border-b border-[#8052cf]/20 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-bold text-[#8052cf]">Collection:</span>
        <span class="text-xs font-black text-[#3D2A1F] bg-[#FAF0DA] px-2.5 py-0.5 rounded-md border border-[#D6BA96]">
          {heroStore.filter.setFilter}
        </span>
        {#if collectionStats?.stat}
          <span class="text-[11px] text-[#5e4537]">
            • <strong class="text-[#3D2A1F]">{collectionStats.stat.cleanPct}%</strong> flawless ({collectionStats.stat.cleanCount}/{collectionStats.stat.totalCount})
            {#if collectionStats.avgSec}
              • avg pace <strong class="text-[#8052cf]">{collectionStats.avgSec}s</strong> / prob
            {/if}
          </span>
        {/if}
      </div>

      <div class="flex flex-wrap items-center gap-1.5 text-xs">
        <span class="text-[11px] text-[#5e4537] mr-1">Filter:</span>
        <button
          onclick={() => (heroStore.filter.misplayFilter = 'all')}
          class="text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors {heroStore.filter.misplayFilter === 'all' ? 'bg-[#8052cf] text-white font-bold' : 'bg-[#FAF0DA] text-[#5e4537] hover:text-[#3D2A1F] border border-[#D6BA96]'}"
        >
          All
        </button>
        <button
          onclick={() => (heroStore.filter.misplayFilter = 'misplay')}
          class="text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors flex items-center gap-1 {heroStore.filter.misplayFilter === 'misplay' ? 'bg-[#c84b31] text-white font-bold' : 'bg-[#FAF0DA] text-[#c84b31] hover:bg-[#fbeee9] border border-[#c84b31]/30'}"
          title="Only show problems with misplays"
        >
          <AlertCircle class="w-3 h-3" />
          Challenging (Misplays)
        </button>
        <button
          onclick={() => (heroStore.filter.misplayFilter = 'clean')}
          class="text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors {heroStore.filter.misplayFilter === 'clean' ? 'bg-[#88C13F] text-white font-bold' : 'bg-[#FAF0DA] text-[#55821c] hover:bg-[#eaf6dc] border border-[#88C13F]/30'}"
          title="Only show flawless solves"
        >
          Flawless Only
        </button>
        <button
          onclick={() => { heroStore.filter.setFilter = 'all'; heroStore.filter.misplayFilter = 'all'; }}
          class="text-[11px] text-[#5e4537] hover:text-[#c84b31] px-2 py-0.5 rounded bg-[#FAF0DA] border border-[#D6BA96] hover:bg-[#fbeee9] cursor-pointer ml-1 inline-flex items-center gap-1"
          title="Clear collection filter"
        >
          <X class="w-3 h-3" />
          Clear filter
        </button>
      </div>
    </div>
  {/if}

  <!-- Table Component -->
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-[#F4E7CE] text-[#3D2A1F] border-b border-[#D6BA96] font-semibold select-none">
          <!-- Date & Time -->
          <th class="py-2.5 px-3">
            <button
              onclick={() => toggleSort('date')}
              class="flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer"
            >
              <span>Date & Time</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Collection -->
          <th class="py-2.5 px-3">Collection / Set</th>

          <!-- Problem -->
          <th class="py-2.5 px-3">
            <button
              onclick={() => toggleSort('problem')}
              class="flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer"
            >
              <span>Problem</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Misplays -->
          <th class="py-2.5 px-3 text-center">
            <button
              onclick={() => toggleSort('misplays')}
              class="inline-flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer mx-auto"
            >
              <span>Result / Misplays</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Time to Solve (replacing Elo & XP as requested) -->
          <th class="py-2.5 px-3 text-center">
            <button
              onclick={() => toggleSort('solveTime')}
              class="inline-flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer mx-auto"
              title="Click to sort by solve time (longest first to find challenging problems)"
            >
              <Clock class="w-3 h-3 text-[#8052cf]" />
              <span>Time to Solve</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Hero Link -->
          <th class="py-2.5 px-3 text-center">Hero Link</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#D6BA96]/50">
        {#if pagedRecords.length === 0}
          <tr>
            <td colspan="6" class="py-8 text-center text-xs text-[#5e4537]">
              No solves match the current filters.
            </td>
          </tr>
        {:else}
          {#each pagedRecords as record (record.id)}
            {@const t = formatSolveTime(record.timeSincePrevSeconds)}
            <tr class="hover:bg-[#FDF5E6]/60 transition-colors">
              <!-- Date & Time -->
              <td class="py-2.5 px-3 font-mono text-[11px] text-[#5e4537] whitespace-nowrap">
                {record.formattedDate}
              </td>

              <!-- Collection -->
              <td class="py-2.5 px-3 font-medium text-[#3D2A1F]">
                {#if record.setUrl}
                  <a
                    href="https://tsumego.com{record.setUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-[#8052cf] hover:underline"
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

              <!-- Misplays / Result -->
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

              <!-- Time to Solve -->
              <td class="py-2.5 px-3 text-center whitespace-nowrap">
                {#if t.tier === 'blitz'}
                  <span class="inline-flex items-center font-mono font-bold text-[#55821c] bg-[#eaf6dc] px-2 py-0.5 rounded text-[11px] border border-[#88C13F]/30" title="Blitz solve (<20s)">
                    ⚡ {t.text}
                  </span>
                {:else if t.tier === 'steady'}
                  <span class="inline-flex items-center font-mono font-bold text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded text-[11px] border border-[#f59e0b]/30" title="Steady pace (20s–60s)">
                    {t.text}
                  </span>
                {:else if t.tier === 'deep'}
                  <span class="inline-flex items-center font-mono font-bold text-[#6b21a8] bg-[#f3e8ff] px-2 py-0.5 rounded text-[11px] border border-[#8052cf]/30" title="Deep reading (>60s)">
                    ⏳ {t.text}
                  </span>
                {:else}
                  <span class="font-mono text-[#5e4537] text-[11px]" title="Session start or after break">—</span>
                {/if}
              </td>

              <!-- Hero Link -->
              <td class="py-2.5 px-3 text-center">
                {#if record.probUrl}
                  <a
                    href="https://tsumego.com{record.probUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-[11px] text-[#8052cf] hover:text-[#5c34a4] font-medium hover:underline"
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
