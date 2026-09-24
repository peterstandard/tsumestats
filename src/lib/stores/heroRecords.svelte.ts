import { browser } from '$app/environment';
import type {
  HeroRawRecord,
  ProcessedHeroRecord,
  HeroFilterState,
  HeroTrainingSession,
  HeroKpiStats,
  HeroSetStat
} from '$lib/types';
import {
  parseHeroInput,
  deduplicateAndSortHeroRecords,
  clusterHeroSessions,
  computeHeroKpis,
  computeHeroSetStats,
  computeHeroHourlyHabits,
  computeHeroDayOfWeekHabits
} from '$lib/utils/heroRecords';
import { SAMPLE_HERO_RECORDS } from '$lib/data/sampleHero';

const STORAGE_KEY = 'tsumestats_hero_v1';
const IS_DEMO_KEY = 'tsumestats_hero_is_demo';

function createHeroStore() {
  let rawRecords = $state<HeroRawRecord[]>([]);
  let isDemo = $state<boolean>(false);
  let isInitialized = $state<boolean>(false);

  // Filters
  let filter = $state<HeroFilterState>({
    datePreset: 'all',
    setFilter: 'all',
    misplayFilter: 'all',
    searchQuery: ''
  });

  // Derived processed list
  let allRecords = $derived<ProcessedHeroRecord[]>(deduplicateAndSortHeroRecords(rawRecords));

  // Filtered records
  let filteredRecords = $derived<ProcessedHeroRecord[]>(
    allRecords.filter((r) => {
      // Date preset filter
      if (filter.datePreset !== 'all' && allRecords.length > 0) {
        const latestEpoch = allRecords[allRecords.length - 1].epochSeconds;
        const secondsInDay = 86400;
        let days = 60;
        if (filter.datePreset === '7d') days = 7;
        else if (filter.datePreset === '30d') days = 30;
        else if (filter.datePreset === '60d') days = 60;

        const cutoff = latestEpoch - days * secondsInDay;
        if (r.epochSeconds < cutoff) return false;
      }

      // Set/Collection filter
      if (filter.setFilter !== 'all') {
        if (r.set !== filter.setFilter) return false;
      }

      // Misplays filter
      if (filter.misplayFilter === 'clean' && !r.isClean) return false;
      if (filter.misplayFilter === 'misplay' && r.isClean) return false;

      // Search query (set, tsumego #, date)
      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase().trim();
        const matchSet = r.set.toLowerCase().includes(q);
        const matchTsumego = r.tsumego.toLowerCase().includes(q);
        const matchDate = r.formattedDate.toLowerCase().includes(q);
        if (!matchSet && !matchTsumego && !matchDate) return false;
      }

      return true;
    })
  );

  // Derived training sessions
  let sessions = $derived<HeroTrainingSession[]>(clusterHeroSessions(filteredRecords));

  // Derived KPIs
  let kpis = $derived<HeroKpiStats>(computeHeroKpis(filteredRecords, sessions));

  // Derived set/collection stats
  let setStats = $derived<HeroSetStat[]>(computeHeroSetStats(filteredRecords));

  // Derived hourly habits
  let hourlyHabits = $derived(computeHeroHourlyHabits(filteredRecords));

  // Derived day of week habits
  let dayOfWeekHabits = $derived(computeHeroDayOfWeekHabits(filteredRecords));

  function init() {
    if (!browser || isInitialized) return;
    isInitialized = true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedIsDemo = localStorage.getItem(IS_DEMO_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (storedIsDemo === 'true') {
            loadDemo();
            return;
          }
          rawRecords = parsed;
          isDemo = false;
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load hero records from localStorage', e);
    }

    // Default: load demo dataset on initial run
    loadDemo();
  }

  function saveToStorage() {
    if (!browser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rawRecords));
      localStorage.setItem(IS_DEMO_KEY, String(isDemo));
    } catch (e) {
      console.error('Failed to save hero records to localStorage', e);
    }
  }

  function importRecords(input: unknown): { added: number; total: number } {
    const parsed = parseHeroInput(input);
    if (parsed.length === 0) {
      throw new Error('No valid Tsumego Hero solve records found.');
    }

    // Deduplicate against existing by date + set + problem (if real data was loaded; if demo, start fresh)
    const existingMap = new Map<string, HeroRawRecord>();
    if (!isDemo) {
      for (const r of rawRecords) {
        const key = `${r.date}__${r.set}__${r.tsumego}`;
        existingMap.set(key, r);
      }
    }

    let added = 0;
    for (const r of parsed) {
      const key = `${r.date}__${r.set}__${r.tsumego}`;
      if (!existingMap.has(key)) {
        existingMap.set(key, r);
        added++;
      }
    }

    rawRecords = Array.from(existingMap.values());
    isDemo = false;
    saveToStorage();

    return { added, total: rawRecords.length };
  }

  function loadDemo() {
    rawRecords = [...SAMPLE_HERO_RECORDS];
    isDemo = true;
    saveToStorage();
  }

  function clearData() {
    rawRecords = [];
    isDemo = false;
    if (browser) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(IS_DEMO_KEY);
    }
  }

  function exportJson() {
    if (!browser || rawRecords.length === 0) return;
    const blob = new Blob([JSON.stringify(rawRecords, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tsumestats_tsumegohero_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    get rawRecords() { return rawRecords; },
    get allRecords() { return allRecords; },
    get filteredRecords() { return filteredRecords; },
    get sessions() { return sessions; },
    get isDemo() { return isDemo; },
    get isInitialized() { return isInitialized; },
    get filter() { return filter; },
    get kpis() { return kpis; },
    get setStats() { return setStats; },
    get hourlyHabits() { return hourlyHabits; },
    get dayOfWeekHabits() { return dayOfWeekHabits; },
    init,
    importRecords,
    loadDemo,
    clearData,
    exportJson
  };
}

export const heroStore = createHeroStore();
