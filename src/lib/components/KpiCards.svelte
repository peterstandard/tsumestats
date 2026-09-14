<script lang="ts">
  import { recordsStore } from '$lib/stores/records.svelte';
  import {
    Target,
    Award,
    Clock,
    Zap,
    Trophy,
    CalendarCheck
  } from 'lucide-svelte';

  const kpis = $derived(recordsStore.kpis);
</script>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
  <!-- Accuracy -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#8B5E3C] mb-2">
      <span class="text-xs font-semibold uppercase tracking-wider">Accuracy</span>
      <Target class="w-4 h-4 text-[#88C13F]" />
    </div>
    <div>
      <div class="text-2xl font-black text-[#3D2A1F]">
        {kpis.overallAccuracyPct}%
      </div>
      <div class="text-[11px] text-[#5e4537] mt-1 flex items-center justify-between">
        <span>{kpis.totalCorrect} / {kpis.totalProblems}</span>
        <span class="font-medium text-[#88C13F]">solved</span>
      </div>
    </div>
    <!-- Mini progress bar -->
    <div class="w-full bg-[#EED8B8] h-1.5 rounded-full mt-3 overflow-hidden">
      <div
        class="bg-[#88C13F] h-full rounded-full transition-all duration-500"
        style="width: {kpis.overallAccuracyPct}%"
      ></div>
    </div>
  </div>

  <!-- Pass Rate -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#8B5E3C] mb-2">
      <span class="text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
      <Award class="w-4 h-4 text-[#8B5E3C]" />
    </div>
    <div>
      <div class="text-2xl font-black text-[#3D2A1F]">
        {kpis.passRatePct}%
      </div>
      <div class="text-[11px] text-[#5e4537] mt-1 flex items-center justify-between">
        <span>{kpis.passCount} of {kpis.totalTests}</span>
        <span class="font-medium text-[#8B5E3C]">tests</span>
      </div>
    </div>
    <div class="w-full bg-[#EED8B8] h-1.5 rounded-full mt-3 overflow-hidden">
      <div
        class="bg-[#8B5E3C] h-full rounded-full transition-all duration-500"
        style="width: {kpis.passRatePct}%"
      ></div>
    </div>
  </div>

  <!-- Solving Speed -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#8B5E3C] mb-2">
      <span class="text-xs font-semibold uppercase tracking-wider">Avg Speed</span>
      <Clock class="w-4 h-4 text-[#88C13F]" />
    </div>
    <div>
      <div class="text-2xl font-black text-[#3D2A1F]">
        {kpis.avgTimePerProblemSeconds}s
      </div>
      <div class="text-[11px] text-[#5e4537] mt-1 flex items-center justify-between">
        <span>per problem</span>
        <span class="font-medium">{kpis.avgTotalTimeSeconds}s / test</span>
      </div>
    </div>
    <div class="mt-3 text-[10px] text-[#5e4537] font-medium">
      10 problems / checkpoint
    </div>
  </div>

  <!-- Total Tests -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#8B5E3C] mb-2">
      <span class="text-xs font-semibold uppercase tracking-wider">Total Tests</span>
      <Zap class="w-4 h-4 text-[#8B5E3C]" />
    </div>
    <div>
      <div class="text-2xl font-black text-[#3D2A1F]">
        {kpis.totalTests}
      </div>
      <div class="text-[11px] text-[#5e4537] mt-1 flex items-center justify-between">
        <span>{kpis.totalProblems} tsumego</span>
        <span class="text-[#88C13F] font-bold">100%</span>
      </div>
    </div>
    <div class="mt-3 text-[10px] text-[#5e4537] font-medium">
      Checkpoints attempted
    </div>
  </div>

  <!-- Highest Rank -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#8B5E3C] mb-2">
      <span class="text-xs font-semibold uppercase tracking-wider">Max Rank</span>
      <Trophy class="w-4 h-4 text-[#88C13F]" />
    </div>
    <div>
      <div class="text-2xl font-black text-[#3D2A1F]">
        {kpis.highestRankLabel}
      </div>
      <div class="text-[11px] text-[#5e4537] mt-1 flex items-center justify-between">
        <span>Starting: {kpis.lowestRankLabel}</span>
        <span class="text-[#88C13F] font-bold">↑ rank</span>
      </div>
    </div>
    <div class="mt-3 text-[10px] text-[#5e4537] font-medium">
      Rank progression
    </div>
  </div>

  <!-- Practice Days -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4 shadow-xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#8B5E3C] mb-2">
      <span class="text-xs font-semibold uppercase tracking-wider">Active Days</span>
      <CalendarCheck class="w-4 h-4 text-[#8B5E3C]" />
    </div>
    <div>
      <div class="text-2xl font-black text-[#3D2A1F]">
        {kpis.activeDaysCount}
      </div>
      <div class="text-[11px] text-[#5e4537] mt-1 flex items-center justify-between">
        <span>Unique study days</span>
        <span class="font-medium text-[#8B5E3C]">streak</span>
      </div>
    </div>
    <div class="mt-3 text-[10px] text-[#5e4537] font-medium">
      Practice consistency
    </div>
  </div>
</div>
