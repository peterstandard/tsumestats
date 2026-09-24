<script lang="ts">
  import { onMount } from 'svelte';
  import { platformStore } from '$lib/stores/platform.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import Header from '$lib/components/Header.svelte';
  import ImportModal from '$lib/components/ImportModal.svelte';

  // 101weiqi components
  import KpiCards from '$lib/components/KpiCards.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import TimelineChart from '$lib/components/charts/TimelineChart.svelte';
  import MilestoneChart from '$lib/components/charts/MilestoneChart.svelte';
  import SpeedMilestoneChart from '$lib/components/charts/SpeedMilestoneChart.svelte';
  import DifficultyChart from '$lib/components/charts/DifficultyChart.svelte';
  import SpeedAccuracyChart from '$lib/components/charts/SpeedAccuracyChart.svelte';
  import TemporalChart from '$lib/components/charts/TemporalChart.svelte';
  import HistoryTable from '$lib/components/HistoryTable.svelte';

  // Tsumego Hero components
  import HeroKpiCards from '$lib/components/hero/HeroKpiCards.svelte';
  import HeroFilterBar from '$lib/components/hero/HeroFilterBar.svelte';
  import HeroRatingChart from '$lib/components/hero/HeroRatingChart.svelte';
  import HeroSessionPacingChart from '$lib/components/hero/HeroSessionPacingChart.svelte';
  import HeroCollectionLadderChart from '$lib/components/hero/HeroCollectionLadderChart.svelte';
  import HeroTemporalChart from '$lib/components/hero/HeroTemporalChart.svelte';
  import HeroHistoryTable from '$lib/components/hero/HeroHistoryTable.svelte';

  import { Sparkles, Upload, Bookmark, ShieldCheck } from 'lucide-svelte';
  import { APP_VERSION } from '$lib/version';

  let isImportOpen = $state(false);
  let importInitialTab = $state<'import' | 'bookmarklet'>('import');

  let isWeiqi = $derived(platformStore.activePlatform === '101weiqi');

  onMount(() => {
    platformStore.init();
    recordsStore.init();
    heroStore.init();
  });

  function openImport() {
    importInitialTab = 'import';
    isImportOpen = true;
  }

  function openBookmarklet() {
    importInitialTab = 'bookmarklet';
    isImportOpen = true;
  }
</script>

<svelte:head>
  <title>tsumestats — {isWeiqi ? '101weiqi' : 'Tsumego Hero'} Analytics</title>
  <meta name="description" content="Visual analytics, speed trends, regression, and habit patterns for Go problem solvers." />
</svelte:head>

<div class="min-h-screen bg-[#FDF5E6] text-[#3D2A1F] flex flex-col">
  <!-- Navbar -->
  <Header onOpenImport={openImport} onOpenBookmarklet={openBookmarklet} />

  <!-- Main Dashboard -->
  <main class="max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 grow space-y-6">
    {#if isWeiqi}
      <!-- ================= 101weiqi Dashboard ================= -->
      {#if recordsStore.allRecords.length === 0}
        <!-- 101weiqi Empty State -->
        <div class="bg-[#FAF0DA] border-2 border-dashed border-[#D6BA96] rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-xs">
          <div class="w-16 h-16 rounded-full bg-[#88C13F]/20 text-[#88C13F] flex items-center justify-center mx-auto mb-4 border-2 border-[#88C13F]">
            <span class="text-2xl font-black">詰</span>
          </div>
          <h2 class="text-xl font-black text-[#3D2A1F]">Welcome to tsumestats (101weiqi)</h2>
          <p class="text-xs text-[#5e4537] mt-2 leading-relaxed">
            Analyze your speed, accuracy, and progression over time from 101weiqi checkpoint tests. You can import your records or start with our pre-loaded 2-month sample dataset.
          </p>

          <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onclick={() => recordsStore.loadDemo()}
              class="w-full sm:w-auto px-5 py-2.5 bg-[#88C13F] hover:bg-[#78ab37] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles class="w-4 h-4" />
              Load Sample Dataset
            </button>
            <button
              onclick={openImport}
              class="w-full sm:w-auto px-5 py-2.5 bg-[#8B5E3C] hover:bg-[#6e472a] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload class="w-4 h-4" />
              Import My Records
            </button>
          </div>

          <button
            onclick={openBookmarklet}
            class="mt-4 text-xs font-medium text-[#8B5E3C] hover:text-[#3D2A1F] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
          >
            <Bookmark class="w-3.5 h-3.5" />
            How do I get my 101weiqi history?
          </button>
        </div>
      {:else}
        <!-- KPI Stats -->
        <KpiCards />

        <!-- Filter Controls -->
        <FilterBar />

        <!-- Chart Grid: Timeline -->
        <TimelineChart />

        <!-- Milestone Progression: First Pass at Each Difficulty -->
        <MilestoneChart />

        <!-- Speed Milestones & Personal Bests by Rank -->
        <SpeedMilestoneChart />

        <!-- Chart Grid: Difficulty & Speed/Accuracy Regression -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DifficultyChart />
          <SpeedAccuracyChart />
        </div>

        <!-- Temporal Habits (Time of Day & Weekend vs Weekday) -->
        <TemporalChart />

        <!-- Test History Table -->
        <HistoryTable />
      {/if}
    {:else}
      <!-- ================= Tsumego Hero Dashboard ================= -->
      {#if heroStore.allRecords.length === 0}
        <!-- Tsumego Hero Empty State -->
        <div class="bg-[#FAF0DA] border-2 border-dashed border-[#D6BA96] rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-xs">
          <div class="w-16 h-16 rounded-full bg-[#8C52FF]/20 text-[#8C52FF] flex items-center justify-center mx-auto mb-4 border-2 border-[#8C52FF]">
            <span class="text-2xl font-black">英</span>
          </div>
          <h2 class="text-xl font-black text-[#3D2A1F]">Tsumego Hero Analytics</h2>
          <p class="text-xs text-[#5e4537] mt-2 leading-relaxed">
            Track your solving pacing, training session bursts, and collection difficulty ladders from Tsumego Hero. Load our sample dataset or scrape your own history in 1 click.
          </p>

          <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onclick={() => heroStore.loadDemo()}
              class="w-full sm:w-auto px-5 py-2.5 bg-[#8C52FF] hover:bg-[#7c3aed] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles class="w-4 h-4" />
              Load Sample Dataset
            </button>
            <button
              onclick={openImport}
              class="w-full sm:w-auto px-5 py-2.5 bg-[#8B5E3C] hover:bg-[#6e472a] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload class="w-4 h-4" />
              Import My Solves
            </button>
          </div>

          <button
            onclick={openBookmarklet}
            class="mt-4 text-xs font-medium text-[#8C52FF] hover:text-[#5b21b6] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
          >
            <Bookmark class="w-3.5 h-3.5" />
            How do I get my Tsumego Hero history?
          </button>
        </div>
      {:else}
        <!-- KPI Stats -->
        <HeroKpiCards />

        <!-- Filter Controls -->
        <HeroFilterBar />

        <!-- Chart Grid: Rating Trajectory & Daily Volume -->
        <HeroRatingChart />

        <!-- Session Pacing & Cadence -->
        <HeroSessionPacingChart />

        <!-- Chart Grid: Collection Ladder & Habit Consistency -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HeroCollectionLadderChart />
          <HeroTemporalChart />
        </div>

        <!-- History Table -->
        <HeroHistoryTable />
      {/if}
    {/if}
  </main>

  <!-- Footer -->
  <footer class="border-t border-[#D6BA96] bg-[#FAF0DA]/60 py-6 px-4 sm:px-8 mt-12 text-center text-xs text-[#5e4537]">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="font-bold text-[#3D2A1F]">tsumestats</span>
        <span class="text-[10px] font-mono text-[#8B5E3C] bg-[#FAF0DA] px-1.5 py-0.5 rounded border border-[#D6BA96]/60">v{APP_VERSION}</span>
        <span class="text-[#D6BA96]">•</span>
        {#if isWeiqi}
          <span>A specialized tool for <a href="https://www.101weiqi.com" target="_blank" rel="noopener noreferrer" class="text-[#8B5E3C] hover:underline">101weiqi</a> Go solvers</span>
        {:else}
          <span>A specialized tool for <a href="https://tsumego-hero.com" target="_blank" rel="noopener noreferrer" class="text-[#8C52FF] hover:underline">Tsumego Hero</a> Go solvers</span>
        {/if}
      </div>

      <div class="flex items-center gap-1 text-[11px]">
        <ShieldCheck class="w-3.5 h-3.5 {isWeiqi ? 'text-[#88C13F]' : 'text-[#8C52FF]'}" />
        <span>100% Client-Side. Your records remain private in your browser.</span>
      </div>
    </div>
  </footer>

  <!-- Ingestion / Bookmarklet Modal -->
  <ImportModal
    open={isImportOpen}
    initialTab={importInitialTab}
    onClose={() => (isImportOpen = false)}
  />
</div>
