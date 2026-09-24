<script lang="ts">
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import {
    CheckCircle2,
    Zap,
    TrendingUp,
    Timer,
    BookOpen,
    Calendar,
    Flame
  } from 'lucide-svelte';

  let kpis = $derived(heroStore.kpis);
</script>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
  <!-- Total Solves -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#5e4537]">
      <span class="text-[11px] font-medium uppercase tracking-wider">Total Solves</span>
      <CheckCircle2 class="w-4 h-4 text-[#8C52FF]" />
    </div>
    <div class="mt-2">
      <div class="text-xl sm:text-2xl font-black text-[#3D2A1F]">
        {kpis.totalSolves.toLocaleString()}
      </div>
      <div class="text-[11px] text-[#5e4537] mt-0.5">
        Across {kpis.setsCount} collections
      </div>
    </div>
  </div>

  <!-- Flawless Rate -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#5e4537]">
      <span class="text-[11px] font-medium uppercase tracking-wider">Flawless Rate</span>
      <Flame class="w-4 h-4 text-[#88C13F]" />
    </div>
    <div class="mt-2">
      <div class="text-xl sm:text-2xl font-black text-[#3D2A1F]">
        {kpis.cleanRatePct}%
      </div>
      <div class="text-[11px] text-[#5e4537] mt-0.5">
        {kpis.cleanSolves} with 0 misplays
      </div>
    </div>
  </div>

  <!-- Training Sessions -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#5e4537]">
      <span class="text-[11px] font-medium uppercase tracking-wider">Sessions</span>
      <Timer class="w-4 h-4 text-[#8B5E3C]" />
    </div>
    <div class="mt-2">
      <div class="text-xl sm:text-2xl font-black text-[#3D2A1F]">
        {kpis.totalSessions}
      </div>
      <div class="text-[11px] text-[#5e4537] mt-0.5">
        Avg {kpis.avgSessionDurationMin} min / session
      </div>
    </div>
  </div>

  <!-- Average Pace -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#5e4537]">
      <span class="text-[11px] font-medium uppercase tracking-wider">Avg Pace</span>
      <Zap class="w-4 h-4 text-[#D97706]" />
    </div>
    <div class="mt-2">
      <div class="text-xl sm:text-2xl font-black text-[#3D2A1F]">
        {kpis.avgPaceSeconds}s
      </div>
      <div class="text-[11px] text-[#5e4537] mt-0.5">
        Per problem solved
      </div>
    </div>
  </div>

  <!-- Rating Progression -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#5e4537]">
      <span class="text-[11px] font-medium uppercase tracking-wider">Elo Rating</span>
      <TrendingUp class="w-4 h-4 text-[#8C52FF]" />
    </div>
    <div class="mt-2">
      <div class="text-xl sm:text-2xl font-black text-[#3D2A1F]">
        {kpis.currentRating || '—'}
      </div>
      <div class="text-[11px] text-[#5e4537] mt-0.5">
        Peak: <span class="font-bold text-[#8C52FF]">{kpis.peakRating}</span>
      </div>
    </div>
  </div>

  <!-- Total XP & Days -->
  <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
    <div class="flex items-center justify-between text-[#5e4537]">
      <span class="text-[11px] font-medium uppercase tracking-wider">Practice Days</span>
      <Calendar class="w-4 h-4 text-[#5e4537]" />
    </div>
    <div class="mt-2">
      <div class="text-xl sm:text-2xl font-black text-[#3D2A1F]">
        {kpis.activeDaysCount}
      </div>
      <div class="text-[11px] text-[#5e4537] mt-0.5">
        {kpis.totalXp.toLocaleString()} XP earned
      </div>
    </div>
  </div>
</div>
