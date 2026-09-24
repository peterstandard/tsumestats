<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import type { HeroProblemStat, HeroProblemMasteryStatus } from '$lib/types';
  import {
    Target,
    CheckCheck,
    CheckCircle2,
    AlertCircle,
    Repeat,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    ArrowUpDown,
    Search,
    X,
    Clock,
    Sparkles,
    BookOpen
  } from 'lucide-svelte';

  type MasteryFilter = 'all' | 'struggling' | 'overcome' | 'flawless' | 'multi';
  type SortKey = 'problem' | 'attempts' | 'status' | 'misplays' | 'bestTime' | 'recentTime' | 'lastDate';

  let masteryFilter = $state<MasteryFilter>('all');
  let searchQuery = $state<string>('');
  let sortKey = $state<SortKey>('problem');
  let sortAsc = $state<boolean>(true); // default: lowest problem number first
  let currentPage = $state<number>(1);
  let pageSize = $state<number>(20);
  let expandedProblemKey = $state<string | null>(null);

  const activeSet = $derived(heroStore.filter.setFilter);
  const isSetFiltered = $derived(activeSet !== 'all');

  // Filter problems by active collection
  const scopedProblems = $derived.by<HeroProblemStat[]>(() => {
    let list = heroStore.allProblemStats;
    if (isSetFiltered) {
      list = list.filter((p) => p.setName === activeSet);
    }
    return list;
  });

  // Category counts within current scope
  const counts = $derived.by(() => {
    let struggling = 0;
    let overcome = 0;
    let flawless = 0;
    let multi = 0;

    for (const p of scopedProblems) {
      if (p.masteryStatus === 'struggling') struggling++;
      else if (p.masteryStatus === 'overcome') overcome++;
      else if (p.masteryStatus === 'flawless') flawless++;

      if (p.attemptsCount > 1) multi++;
    }

    return {
      total: scopedProblems.length,
      struggling,
      overcome,
      flawless,
      multi
    };
  });

  // Filtered and sorted problems list
  const filteredProblems = $derived.by<HeroProblemStat[]>(() => {
    let list = [...scopedProblems];

    // Status filter
    if (masteryFilter === 'struggling') {
      list = list.filter((p) => p.masteryStatus === 'struggling');
    } else if (masteryFilter === 'overcome') {
      list = list.filter((p) => p.masteryStatus === 'overcome');
    } else if (masteryFilter === 'flawless') {
      list = list.filter((p) => p.masteryStatus === 'flawless');
    } else if (masteryFilter === 'multi') {
      list = list.filter((p) => p.attemptsCount > 1);
    }

    // Search query (matches problem #, collection name, or date)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.problemNumber.toLowerCase().includes(q) ||
          p.setName.toLowerCase().includes(q) ||
          p.latestAttemptDate.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'problem') {
        if (!isSetFiltered && a.setName !== b.setName) {
          diff = a.setName.localeCompare(b.setName);
        } else {
          diff = a.problemNumberInt - b.problemNumberInt;
        }
      } else if (sortKey === 'attempts') {
        diff = a.attemptsCount - b.attemptsCount;
      } else if (sortKey === 'status') {
        const order: Record<HeroProblemMasteryStatus, number> = {
          struggling: 1,
          overcome: 2,
          flawless: 3
        };
        diff = order[a.masteryStatus] - order[b.masteryStatus];
      } else if (sortKey === 'misplays') {
        diff = a.latestMisplays - b.latestMisplays;
      } else if (sortKey === 'bestTime') {
        const aT = a.bestSolveTimeSec ?? 9999;
        const bT = b.bestSolveTimeSec ?? 9999;
        diff = aT - bT;
      } else if (sortKey === 'recentTime') {
        const aT = a.latestSolveTimeSec ?? 9999;
        const bT = b.latestSolveTimeSec ?? 9999;
        diff = aT - bT;
      } else if (sortKey === 'lastDate') {
        diff = a.latestAttemptDate.localeCompare(b.latestAttemptDate);
      }

      return sortAsc ? diff : -diff;
    });

    return list;
  });

  const totalPages = $derived(Math.max(1, Math.ceil(filteredProblems.length / pageSize)));

  const pagedProblems = $derived.by<HeroProblemStat[]>(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProblems.slice(start, start + pageSize);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      // Default numeric problem to ascending, metrics to descending
      sortAsc = key === 'problem';
    }
    currentPage = 1;
  }

  function toggleExpandProblem(key: string) {
    expandedProblemKey = expandedProblemKey === key ? null : key;
  }

  function formatSec(sec: number | null): string {
    if (sec === null) return '—';
    if (sec < 60) return `${Math.round(sec)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  }

  function getDotColor(misplays: number): string {
    if (misplays === 0) return '#88C13F'; // green
    if (misplays === 1) return '#F59E0B'; // amber
    return '#EF4444'; // red
  }
</script>

<div id="hero-problem-mastery-table" class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl shadow-2xs overflow-hidden scroll-mt-20">
  <!-- Card Header -->
  <div class="p-4 border-b border-[#D6BA96] flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-[#FAF0DA]">
    <div>
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-[#8052cf]/15 text-[#8052cf] flex items-center justify-center font-bold">
          <Target class="w-4 h-4" />
        </div>
        <div>
          {#if isSetFiltered}
            <span class="text-[10px] font-bold text-[#8052cf] uppercase tracking-wider block font-mono">
              Collection Breakdown
            </span>
          {/if}
          <h3 class="text-sm font-bold text-[#3D2A1F] flex items-center gap-2">
            <span>{isSetFiltered ? activeSet : 'Problem Mastery & Repeat Solves'}</span>
            <span class="text-[11px] font-normal text-[#5e4537]">({counts.total} unique problems)</span>
          </h3>
          <p class="text-[11px] text-[#5e4537]">
            Consolidated statistics by problem. Track multiple attempts, identify stumbling points, and celebrate overcome misplays.
          </p>
        </div>
      </div>
    </div>

    <!-- Collection Switcher Dropdown & Clear Filter -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1.5 text-xs">
        <BookOpen class="w-3.5 h-3.5 text-[#8B5E3C]" />
        <select
          bind:value={heroStore.filter.setFilter}
          class="bg-[#FDF5E6] border border-[#D6BA96] text-[#3D2A1F] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#8052cf]"
        >
          <option value="all">All Collections ({heroStore.allProblemStats.length} problems)</option>
          {#each heroStore.setStats as s (s.setName)}
            <option value={s.setName}>
              {s.setName} ({s.totalCount} solves)
            </option>
          {/each}
        </select>
      </div>

      {#if isSetFiltered}
        <button
          onclick={() => (heroStore.filter.setFilter = 'all')}
          class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[#5e4537] hover:text-[#3D2A1F] hover:bg-[#F4E7CE] border border-[#D6BA96] transition-colors cursor-pointer"
          title="Show all collections"
        >
          <X class="w-3 h-3" />
          <span>Clear filter</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Filter Pills Toolbar -->
  <div class="px-4 py-2.5 bg-[#FAF0DA]/60 border-b border-[#D6BA96] flex flex-wrap items-center justify-between gap-3">
    <!-- Filter Status Tabs -->
    <div class="flex flex-wrap items-center gap-1.5 text-xs">
      <button
        onclick={() => { masteryFilter = 'all'; currentPage = 1; }}
        class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer {masteryFilter === 'all' ? 'bg-[#8052cf] text-white shadow-2xs' : 'bg-[#FDF5E6] text-[#5e4537] hover:text-[#3D2A1F] border border-[#D6BA96]'}"
      >
        All ({counts.total})
      </button>

      <button
        onclick={() => { masteryFilter = 'struggling'; currentPage = 1; }}
        class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 {masteryFilter === 'struggling' ? 'bg-[#c84b31] text-white shadow-2xs' : 'bg-[#FDF5E6] text-[#c84b31] hover:bg-[#fbeee9] border border-[#c84b31]/30'}"
        title="Problems where your most recent attempt had misplays"
      >
        <AlertCircle class="w-3.5 h-3.5" />
        <span>Needs Practice ({counts.struggling})</span>
      </button>

      <button
        onclick={() => { masteryFilter = 'overcome'; currentPage = 1; }}
        class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 {masteryFilter === 'overcome' ? 'bg-[#55821c] text-white shadow-2xs' : 'bg-[#FDF5E6] text-[#55821c] hover:bg-[#eaf6dc] border border-[#88C13F]/40'}"
        title="Problems that had misplays previously, but were mastered cleanly on your latest attempt!"
      >
        <CheckCheck class="w-3.5 h-3.5" />
        <span>Overcome ({counts.overcome})</span>
      </button>

      <button
        onclick={() => { masteryFilter = 'flawless'; currentPage = 1; }}
        class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 {masteryFilter === 'flawless' ? 'bg-[#88C13F] text-white shadow-2xs' : 'bg-[#FDF5E6] text-[#3D2A1F] hover:bg-[#FAF0DA] border border-[#D6BA96]'}"
        title="Problems solved with 0 misplays on every single attempt"
      >
        <Sparkles class="w-3.5 h-3.5 text-[#55821c]" />
        <span>Flawless ({counts.flawless})</span>
      </button>

      <button
        onclick={() => { masteryFilter = 'multi'; currentPage = 1; }}
        class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 {masteryFilter === 'multi' ? 'bg-[#8052cf] text-white shadow-2xs' : 'bg-[#FDF5E6] text-[#8052cf] hover:bg-[#f3e8ff] border border-[#8052cf]/30'}"
        title="Only show problems you have drilled more than once"
      >
        <Repeat class="w-3.5 h-3.5" />
        <span>Drilled Multi-Times ({counts.multi})</span>
      </button>
    </div>

    <!-- Search & Rows-per-page -->
    <div class="flex items-center gap-2.5">
      <div class="relative">
        <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5e4537]" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Problem # or title..."
          class="pl-8 pr-2.5 py-1 text-xs bg-[#FDF5E6] border border-[#D6BA96] rounded-lg text-[#3D2A1F] placeholder-[#8B5E3C]/60 focus:outline-none focus:ring-1 focus:ring-[#8052cf] w-36 sm:w-44"
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

      <div class="flex items-center gap-1.5 text-xs text-[#5e4537]">
        <select
          bind:value={pageSize}
          onchange={() => (currentPage = 1)}
          class="bg-[#FDF5E6] border border-[#D6BA96] text-[#3D2A1F] rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#8052cf]"
        >
          <option value={15}>15 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Problems Table -->
  <div class="overflow-x-auto">
    <table class="w-full text-xs text-left border-collapse">
      <thead>
        <tr class="border-b border-[#D6BA96] bg-[#FAF0DA] text-[#5e4537] font-semibold select-none">
          <!-- Problem Number / Set -->
          <th
            onclick={() => toggleSort('problem')}
            class="p-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1.5">
              <span>Problem</span>
              <ArrowUpDown class="w-3 h-3 text-[#8B5E3C]" />
            </div>
          </th>

          <!-- Mastery Status -->
          <th
            onclick={() => toggleSort('status')}
            class="p-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1.5">
              <span>Current Status</span>
              <ArrowUpDown class="w-3 h-3 text-[#8B5E3C]" />
            </div>
          </th>

          <!-- Attempts & Progression Dots -->
          <th
            onclick={() => toggleSort('attempts')}
            class="p-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1.5">
              <span>Attempts & Progression</span>
              <ArrowUpDown class="w-3 h-3 text-[#8B5E3C]" />
            </div>
          </th>

          <!-- Misplays (Best / Recent) -->
          <th
            onclick={() => toggleSort('misplays')}
            class="p-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1.5">
              <span>Misplays (Best / Recent)</span>
              <ArrowUpDown class="w-3 h-3 text-[#8B5E3C]" />
            </div>
          </th>

          <!-- Solve Time (Best / Recent) -->
          <th
            onclick={() => toggleSort('bestTime')}
            class="p-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1.5">
              <span>Solve Time (Best / Recent)</span>
              <ArrowUpDown class="w-3 h-3 text-[#8B5E3C]" />
            </div>
          </th>

          <!-- Last Practiced -->
          <th
            onclick={() => toggleSort('lastDate')}
            class="p-3 cursor-pointer hover:bg-[#F4E7CE] transition-colors"
          >
            <div class="flex items-center gap-1.5">
              <span>Last Practiced</span>
              <ArrowUpDown class="w-3 h-3 text-[#8B5E3C]" />
            </div>
          </th>

          <!-- Expand / Action -->
          <th class="p-3 text-right">Details</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#D6BA96]/50 bg-[#FDF5E6]">
        {#if pagedProblems.length === 0}
          <tr>
            <td colspan="7" class="p-8 text-center text-[#5e4537]">
              No problems found matching the selected filter.
            </td>
          </tr>
        {:else}
          {#each pagedProblems as prob (prob.key)}
            {@const isExpanded = expandedProblemKey === prob.key}
            <tr
              class="hover:bg-[#FAF0DA]/80 transition-colors {isExpanded ? 'bg-[#FAF0DA]' : ''}"
            >
              <!-- Problem Column -->
              <td class="p-3 font-medium text-[#3D2A1F]">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-md bg-[#FAF0DA] border border-[#D6BA96] text-[#3D2A1F] text-xs font-mono">
                    #{prob.problemNumber}
                  </span>
                  {#if prob.probUrl}
                    <a
                      href="https://tsumego.com{prob.probUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-[#8052cf] hover:text-[#6f42b8] transition-colors p-0.5"
                      title="Open problem on Tsumego Hero"
                    >
                      <ExternalLink class="w-3 h-3" />
                    </a>
                  {/if}
                  {#if !isSetFiltered}
                    <span class="text-[11px] text-[#5e4537] truncate max-w-[140px] block" title={prob.setName}>
                      {prob.setName}
                    </span>
                  {/if}
                </div>
              </td>

              <!-- Mastery Status Column -->
              <td class="p-3">
                {#if prob.masteryStatus === 'overcome'}
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eaf6dc] text-[#55821c] border border-[#88C13F]/50 shadow-2xs">
                    <CheckCheck class="w-3.5 h-3.5" />
                    <span>Overcome</span>
                  </span>
                {:else if prob.masteryStatus === 'flawless'}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF0DA] text-[#5e4537] border border-[#D6BA96]">
                    <CheckCircle2 class="w-3 h-3 text-[#88C13F]" />
                    <span>Flawless</span>
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fbeee9] text-[#c84b31] border border-[#c84b31]/40 shadow-2xs">
                    <AlertCircle class="w-3.5 h-3.5" />
                    <span>Needs Practice</span>
                  </span>
                {/if}
              </td>

              <!-- Attempts & Progression Dots -->
              <td class="p-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-[#3D2A1F] font-mono min-w-[20px]">
                    {prob.attemptsCount}x
                  </span>

                  <!-- Recent Form Progression Dots -->
                  <div class="inline-flex items-center gap-1 bg-[#FAF0DA] px-2 py-1 rounded-lg border border-[#D6BA96]/60">
                    {#each prob.attempts as att, idx (idx)}
                      <span
                        class="w-2.5 h-2.5 rounded-full transition-transform hover:scale-125"
                        style="background-color: {getDotColor(att.misplays)};"
                        title="Attempt {idx + 1}: {att.misplays === 0 ? 'Flawless (0 misplays)' : `${att.misplays} misplays`} on {att.date}{att.solveTimeSeconds ? ` (${att.solveTimeSeconds}s)` : ''}"
                      ></span>
                      {#if idx < prob.attempts.length - 1}
                        <span class="text-[9px] text-[#D6BA96]">›</span>
                      {/if}
                    {/each}
                  </div>
                </div>
              </td>

              <!-- Misplays (Best / Recent) -->
              <td class="p-3 text-[#3D2A1F]">
                <div class="flex items-center gap-1.5 font-mono text-xs">
                  <span class="font-bold {prob.bestMisplays === 0 ? 'text-[#55821c]' : 'text-[#c84b31]'}">
                    {prob.bestMisplays}
                  </span>
                  <span class="text-[#8B5E3C]">/</span>
                  <span class="{prob.latestMisplays === 0 ? 'text-[#55821c]' : 'text-[#c84b31]'}">
                    {prob.latestMisplays}
                  </span>

                  {#if prob.masteryStatus === 'overcome'}
                    <span class="text-[10px] text-[#55821c] font-sans font-medium">
                      (conquered {prob.firstMisplays} misplay{prob.firstMisplays === 1 ? '' : 's'})
                    </span>
                  {:else if prob.attemptsCount > 1 && prob.latestMisplays < prob.firstMisplays}
                    <span class="text-[10px] text-[#55821c] font-sans">
                      (improved)
                    </span>
                  {/if}
                </div>
              </td>

              <!-- Solve Time (Best / Recent) -->
              <td class="p-3 text-[#3D2A1F]">
                <div class="font-mono text-xs flex items-center gap-1.5">
                  <span class="font-bold text-[#8052cf]" title="Best time">
                    {formatSec(prob.bestSolveTimeSec)}
                  </span>
                  <span class="text-[#8B5E3C]">/</span>
                  <span class="text-[#5e4537]" title="Most recent time">
                    {formatSec(prob.latestSolveTimeSec)}
                  </span>

                  {#if prob.firstSolveTimeSec && prob.bestSolveTimeSec && prob.firstSolveTimeSec > prob.bestSolveTimeSec}
                    <span class="text-[10px] text-[#55821c] font-sans">
                      ({prob.firstSolveTimeSec - prob.bestSolveTimeSec}s faster)
                    </span>
                  {/if}
                </div>
              </td>

              <!-- Last Practiced -->
              <td class="p-3 text-[#5e4537] text-[11px] whitespace-nowrap">
                {prob.latestAttemptDate.split(' ')[0]}
              </td>

              <!-- Expand / Action -->
              <td class="p-3 text-right">
                <button
                  onclick={() => toggleExpandProblem(prob.key)}
                  class="p-1 rounded-md text-[#5e4537] hover:bg-[#FAF0DA] hover:text-[#3D2A1F] transition-colors cursor-pointer"
                  title="View solve history breakdown"
                >
                  {#if isExpanded}
                    <ChevronUp class="w-4 h-4 text-[#8052cf]" />
                  {:else}
                    <ChevronDown class="w-4 h-4" />
                  {/if}
                </button>
              </td>
            </tr>

            <!-- Expanded Drawer: Attempt Journey Timeline -->
            {#if isExpanded}
              <tr class="bg-[#FAF0DA]/90 border-b border-[#D6BA96]">
                <td colspan="7" class="p-4 pl-6">
                  <div class="bg-[#FDF5E6] border border-[#D6BA96] rounded-xl p-4 space-y-3 shadow-inner">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-[#3D2A1F]">
                          Solve History for Problem #{prob.problemNumber} ({prob.setName})
                        </span>
                        <span class="text-[11px] text-[#5e4537]">
                          · {prob.attemptsCount} recorded solve{prob.attemptsCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      {#if prob.probUrl}
                        <a
                          href="https://tsumego.com{prob.probUrl}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 text-xs font-semibold text-[#8052cf] hover:underline"
                        >
                          Practice on Tsumego Hero <ExternalLink class="w-3 h-3" />
                        </a>
                      {/if}
                    </div>

                    <!-- Mini Attempt Timeline Table -->
                    <div class="overflow-x-auto">
                      <table class="w-full text-[11px] text-left">
                        <thead>
                          <tr class="text-[#8B5E3C] border-b border-[#D6BA96]/60 pb-1">
                            <th class="py-1 pr-3">Attempt</th>
                            <th class="py-1 px-3">Date & Time</th>
                            <th class="py-1 px-3">Misplays</th>
                            <th class="py-1 px-3">Solve Pace</th>
                            <th class="py-1 px-3">Rating</th>
                            <th class="py-1 px-3">XP</th>
                            <th class="py-1 pl-3">Outcome</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-[#D6BA96]/30 font-mono">
                          {#each prob.attempts as att, idx (idx)}
                            <tr>
                              <td class="py-1.5 pr-3 font-bold text-[#3D2A1F]">
                                #{idx + 1}
                              </td>
                              <td class="py-1.5 px-3 text-[#5e4537]">
                                {att.date}
                              </td>
                              <td class="py-1.5 px-3">
                                <span class="inline-flex items-center gap-1 font-bold {att.misplays === 0 ? 'text-[#55821c]' : 'text-[#c84b31]'}">
                                  <span class="w-2 h-2 rounded-full" style="background-color: {getDotColor(att.misplays)};"></span>
                                  {att.misplays} {att.misplays === 1 ? 'misplay' : 'misplays'}
                                </span>
                              </td>
                              <td class="py-1.5 px-3 text-[#8052cf]">
                                {formatSec(att.solveTimeSeconds)}
                              </td>
                              <td class="py-1.5 px-3 text-[#5e4537]">
                                {att.rating}
                              </td>
                              <td class="py-1.5 px-3 text-[#55821c]">
                                +{att.xp} XP
                              </td>
                              <td class="py-1.5 pl-3 font-sans font-medium">
                                {#if att.misplays === 0}
                                  <span class="text-[#55821c]">
                                    {idx === 0 ? 'Flawless 1st try' : 'Mastered with 0 misplays'}
                                  </span>
                                {:else if idx > 0 && att.misplays < prob.attempts[idx - 1].misplays}
                                  <span class="text-[#8052cf]">
                                    Reduced misplays from {prob.attempts[idx - 1].misplays}
                                  </span>
                                {:else}
                                  <span class="text-[#c84b31]">
                                    Struggled ({att.misplays} misplays)
                                  </span>
                                {/if}
                              </td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination Bar -->
  <div class="p-3 bg-[#FAF0DA] border-t border-[#D6BA96] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5e4537]">
    <div>
      Showing <strong>{filteredProblems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(currentPage * pageSize, filteredProblems.length)}</strong> of <strong>{filteredProblems.length}</strong> problems
    </div>

    {#if totalPages > 1}
      <div class="flex items-center gap-1.5">
        <button
          onclick={() => (currentPage = Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          class="p-1 rounded-md border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] disabled:opacity-40 disabled:hover:bg-[#FDF5E6] transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Previous Page"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <span class="px-2 font-medium">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
        </span>

        <button
          onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          class="p-1 rounded-md border border-[#D6BA96] bg-[#FDF5E6] hover:bg-[#F4E7CE] disabled:opacity-40 disabled:hover:bg-[#FDF5E6] transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Next Page"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    {/if}
  </div>
</div>
