<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import type { HeroSetStat } from '$lib/types';
  import {
    BookOpen,
    ExternalLink,
    ArrowUpDown,
    Check,
    X,
    Search,
    Clock,
    Flame,
    TrendingUp,
    ChevronDown,
    ChevronUp
  } from 'lucide-svelte';

  type SortKey = 'name' | 'solves' | 'cleanPct' | 'avgMisplays' | 'avgPace' | 'lastDate';

  let sortKey = $state<SortKey>('solves');
  let sortAsc = $state<boolean>(false); // default: highest solve count first
  let searchQuery = $state<string>('');
  let showAll = $state<boolean>(false);

  const activeSet = $derived(heroStore.filter.setFilter);

  const filteredSets = $derived.by<HeroSetStat[]>(() => {
    let list = [...heroStore.setStats];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => s.setName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name') {
        diff = a.setName.localeCompare(b.setName);
      } else if (sortKey === 'solves') {
        diff = a.totalCount - b.totalCount;
      } else if (sortKey === 'cleanPct') {
        diff = a.cleanPct - b.cleanPct;
      } else if (sortKey === 'avgMisplays') {
        diff = a.avgMisplays - b.avgMisplays;
      } else if (sortKey === 'avgPace') {
        const aPace = a.avgSolveTimeSec ?? 9999;
        const bPace = b.avgSolveTimeSec ?? 9999;
        diff = aPace - bPace;
      } else if (sortKey === 'lastDate') {
        diff = a.lastPracticedDate.localeCompare(b.lastPracticedDate);
      }
      return sortAsc ? diff : -diff;
    });

    return list;
  });

  // Limit display to 8 collections unless expanded or filtered
  const displayedSets = $derived.by(() => {
    if (showAll || searchQuery.trim() || filteredSets.length <= 8) {
      return filteredSets;
    }
    return filteredSets.slice(0, 8);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      // Default name to ascending, metrics to descending
      sortAsc = key === 'name';
    }
  }

  function handleSelectCollection(setName: string) {
    if (heroStore.filter.setFilter === setName) {
      heroStore.filter.setFilter = 'all';
    } else {
      heroStore.filter.setFilter = setName;
      // Smoothly scroll down to problem table
      const el = document.getElementById('hero-history-table');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function formatPace(sec: number | null): string {
    if (sec === null) return '—';
    if (sec < 60) return `${Math.round(sec)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  }

  function getBarColor(pct: number): string {
    if (pct >= 95) return '#88C13F';
    if (pct >= 85) return '#60A5FA';
    if (pct >= 75) return '#F59E0B';
    return '#EF4444';
  }
</script>

<div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl shadow-2xs overflow-hidden">
  <!-- Card Header -->
  <div class="p-4 border-b border-[#D6BA96] flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-[#FAF0DA]">
    <div>
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-[#8052cf]/15 text-[#8052cf] flex items-center justify-center font-bold">
          <BookOpen class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-[#3D2A1F] flex items-center gap-2">
            <span>Collection Mastery & Summary</span>
            <span class="text-[11px] font-normal text-[#5e4537]">({heroStore.setStats.length} collections)</span>
          </h3>
          <p class="text-[11px] text-[#5e4537]">
            Full overview of your practice across Go books. Click any collection row to filter the problem log below.
          </p>
        </div>
      </div>
    </div>

    <!-- Toolbar: Search & Active Filter indicator -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search Collection Name -->
      <div class="relative">
        <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5e4537]" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Filter collections..."
          class="pl-8 pr-2.5 py-1 text-xs bg-[#FDF5E6] border border-[#D6BA96] rounded-lg text-[#3D2A1F] placeholder-[#8B5E3C]/60 focus:outline-none focus:ring-1 focus:ring-[#8052cf] w-40 sm:w-48"
        />
        {#if searchQuery}
          <button
            onclick={() => (searchQuery = '')}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[#5e4537] hover:text-[#3D2A1F]"
          >
            <X class="w-3 h-3" />
          </button>
        {/if}
      </div>

      <!-- Active selection clear pill -->
      {#if activeSet !== 'all'}
        <button
          onclick={() => (heroStore.filter.setFilter = 'all')}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#8052cf] text-white shadow-2xs hover:bg-[#6f42b8] transition-colors cursor-pointer"
          title="Clear collection filter"
        >
          <span>Filtered: {activeSet.length > 18 ? activeSet.slice(0, 16) + '...' : activeSet}</span>
          <X class="w-3 h-3" />
        </button>
      {/if}
    </div>
  </div>

  <!-- Collections Table -->
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-[#F4E7CE] text-[#3D2A1F] border-b border-[#D6BA96] font-semibold select-none">
          <!-- Collection Name -->
          <th class="py-2.5 px-3 min-w-[200px]">
            <button
              onclick={() => toggleSort('name')}
              class="flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer"
            >
              <span>Collection / Book</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Solves Count -->
          <th class="py-2.5 px-3 text-center">
            <button
              onclick={() => toggleSort('solves')}
              class="inline-flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer mx-auto"
            >
              <span>Solves</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Flawless Mastery & Sparkbar -->
          <th class="py-2.5 px-3 min-w-[170px]">
            <button
              onclick={() => toggleSort('cleanPct')}
              class="flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer"
              title="Click to sort by clean rate (lowest first to find hardest books)"
            >
              <span>Flawless Rate (0 Misplays)</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Recent Form (Spark-dots) -->
          <th class="py-2.5 px-3 text-center hidden md:table-cell">
            <span>Recent Form</span>
          </th>

          <!-- Avg Misplays -->
          <th class="py-2.5 px-3 text-center hidden sm:table-cell">
            <button
              onclick={() => toggleSort('avgMisplays')}
              class="inline-flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer mx-auto"
            >
              <span>Avg Errors</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Avg Solve Pace -->
          <th class="py-2.5 px-3 text-center hidden sm:table-cell">
            <button
              onclick={() => toggleSort('avgPace')}
              class="inline-flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer mx-auto"
            >
              <span>Avg Pace</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Last Practiced -->
          <th class="py-2.5 px-3 text-right hidden lg:table-cell">
            <button
              onclick={() => toggleSort('lastDate')}
              class="inline-flex items-center gap-1 hover:text-[#8052cf] transition-colors cursor-pointer ml-auto"
            >
              <span>Last Active</span>
              <ArrowUpDown class="w-3 h-3 text-[#5e4537]" />
            </button>
          </th>

          <!-- Filter Action -->
          <th class="py-2.5 px-3 text-center">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#D6BA96]/50">
        {#if displayedSets.length === 0}
          <tr>
            <td colspan="8" class="py-8 text-center text-xs text-[#5e4537]">
              No collections found matching "{searchQuery}".
            </td>
          </tr>
        {:else}
          {#each displayedSets as set (set.setName)}
            {@const isSelected = activeSet === set.setName}
            {@const barColor = getBarColor(set.cleanPct)}
            <tr
              onclick={() => handleSelectCollection(set.setName)}
              class="cursor-pointer transition-colors {isSelected ? 'bg-[#8052cf]/10 border-l-4 border-l-[#8052cf]' : 'hover:bg-[#FDF5E6]/70'}"
            >
              <!-- Name & Link -->
              <td class="py-2.5 px-3 font-semibold text-[#3D2A1F]">
                <div class="flex items-center gap-1.5 flex-wrap">
                  {#if isSelected}
                    <span class="w-2 h-2 rounded-full bg-[#8052cf] shrink-0" title="Active collection filter"></span>
                  {/if}
                  <span class="{isSelected ? 'text-[#8052cf] font-bold' : ''}">{set.setName}</span>
                  {#if set.setUrl}
                    <a
                      href="https://tsumego.com{set.setUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      onclick={(e) => e.stopPropagation()}
                      class="text-[#8B5E3C] hover:text-[#8052cf] p-0.5 rounded transition-colors inline-flex items-center"
                      title="Open collection on Tsumego Hero"
                    >
                      <ExternalLink class="w-3 h-3" />
                    </a>
                  {/if}
                </div>
              </td>

              <!-- Solves Count -->
              <td class="py-2.5 px-3 text-center font-mono font-bold text-[#3D2A1F]">
                {set.totalCount}
              </td>

              <!-- Flawless Mastery & Sparkbar -->
              <td class="py-2.5 px-3">
                <div class="flex items-center gap-2">
                  <!-- Mini Progress Sparkbar -->
                  <div class="w-20 sm:w-24 bg-[#ebdcc9] h-2 rounded-full overflow-hidden shrink-0">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      style="width: {set.cleanPct}%; background-color: {barColor};"
                    ></div>
                  </div>
                  <!-- Percentage & Ratio -->
                  <div class="font-mono text-xs">
                    <strong style="color: {barColor};">{set.cleanPct}%</strong>
                    <span class="text-[10px] text-[#5e4537] ml-1">({set.cleanCount}/{set.totalCount})</span>
                  </div>
                </div>
              </td>

              <!-- Recent Form (Spark-dots) -->
              <td class="py-2.5 px-3 text-center hidden md:table-cell">
                <div class="inline-flex items-center gap-1" title="Last {set.recentResults.length} solves in this book">
                  {#each set.recentResults as isClean, idx (idx)}
                    <span
                      class="w-2 h-2 rounded-full {isClean ? 'bg-[#88C13F]' : 'bg-[#EF4444]'}"
                      title={isClean ? 'Flawless solve' : 'Had misplay(s)'}
                    ></span>
                  {/each}
                </div>
              </td>

              <!-- Avg Misplays -->
              <td class="py-2.5 px-3 text-center font-mono text-[11px] text-[#5e4537] hidden sm:table-cell">
                {set.avgMisplays}
              </td>

              <!-- Avg Solve Pace -->
              <td class="py-2.5 px-3 text-center font-mono text-[11px] text-[#3D2A1F] hidden sm:table-cell">
                {formatPace(set.avgSolveTimeSec)}
              </td>

              <!-- Last Active Date -->
              <td class="py-2.5 px-3 text-right font-mono text-[11px] text-[#5e4537] hidden lg:table-cell whitespace-nowrap">
                {set.lastPracticedDate}
              </td>

              <!-- Action / Filter button -->
              <td class="py-2.5 px-3 text-center">
                {#if isSelected}
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#8052cf] text-white shadow-2xs">
                    <Check class="w-3 h-3" />
                    <span>Selected</span>
                  </span>
                {:else}
                  <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FDF5E6] hover:bg-[#8052cf] hover:text-white text-[#5e4537] border border-[#D6BA96] transition-colors">
                    Filter
                  </span>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Expand / Collapse Toggle if more than 8 collections -->
  {#if filteredSets.length > 8 && !searchQuery}
    <div class="p-2.5 border-t border-[#D6BA96] bg-[#FAF0DA] text-center">
      <button
        onclick={() => (showAll = !showAll)}
        class="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-[#8052cf] hover:bg-[#8052cf]/10 transition-colors cursor-pointer"
      >
        {#if showAll}
          <ChevronUp class="w-3.5 h-3.5" />
          <span>Show top 8 collections</span>
        {:else}
          <ChevronDown class="w-3.5 h-3.5" />
          <span>Show all {filteredSets.length} collections</span>
        {/if}
      </button>
    </div>
  {/if}
</div>
