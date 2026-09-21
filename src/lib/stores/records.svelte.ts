import { browser } from '$app/environment';
import type { WeiqiRawRecord, ProcessedRecord, FilterState, KpiStats } from '$lib/types';
import { parseAndValidateRaw, deduplicateAndSortRecords } from '$lib/utils/records';
import { computeKpis } from '$lib/utils/stats';
import { SAMPLE_RECORDS } from '$lib/data/sample';

const STORAGE_KEY = 'tsumestats_records_v2';
const IS_DEMO_KEY = 'tsumestats_is_demo';

function createRecordsStore() {
  let rawRecords = $state<WeiqiRawRecord[]>([]);
  let isDemo = $state<boolean>(false);
  let isInitialized = $state<boolean>(false);

  // Filters
  let filter = $state<FilterState>({
    datePreset: 'all',
    rankFilter: 'all',
    statusFilter: 'all',
    searchQuery: ''
  });

  // Derived processed list
  let allRecords = $derived<ProcessedRecord[]>(deduplicateAndSortRecords(rawRecords));

  // Filtered records
  let filteredRecords = $derived<ProcessedRecord[]>(allRecords.filter((r) => {
    // Date preset filter
    if (filter.datePreset !== 'all' && allRecords.length > 0) {
      // Base cutoff off the most recent record's timestamp
      const latestEpoch = allRecords[allRecords.length - 1].t;
      const secondsInDay = 86400;
      let days = 60;
      if (filter.datePreset === '7d') days = 7;
      else if (filter.datePreset === '30d') days = 30;
      else if (filter.datePreset === '60d') days = 60;

      const cutoff = latestEpoch - days * secondsInDay;
      if (r.t < cutoff) return false;
    }

    // Rank filter
    if (filter.rankFilter !== 'all') {
      if (r.number !== filter.rankFilter) return false;
    }

    // Status filter
    if (filter.statusFilter === 'pass' && !r.passed) return false;
    if (filter.statusFilter === 'fail' && r.passed) return false;

    // Search query (matches guanid, rank, date)
    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchGuanid = String(r.guanid).includes(q);
      const matchRank = r.rankLabel.toLowerCase().includes(q);
      const matchDate = r.formattedDate.toLowerCase().includes(q);
      if (!matchGuanid && !matchRank && !matchDate) return false;
    }

    return true;
  }));

  // Derived KPIs
  let kpis = $derived<KpiStats>(computeKpis(filteredRecords));

  // Initialize from localStorage or sample
  function init() {
    if (!browser || isInitialized) return;
    isInitialized = true;

    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      let storedIsDemo = localStorage.getItem(IS_DEMO_KEY);

      // Migration from v1: if v1 had user-imported records, preserve them; if it was demo, refresh
      if (!stored) {
        const v1Stored = localStorage.getItem('tsumestats_records_v1');
        const v1IsDemo = localStorage.getItem('tsumestats_is_demo');
        if (v1Stored && v1IsDemo !== 'true') {
          stored = v1Stored;
          storedIsDemo = 'false';
        }
      }

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
      console.error('Failed to load records from localStorage', e);
    }

    // Default: load sample dataset on initial run so the user sees immediate charts
    loadDemo();
  }

  function saveToStorage() {
    if (!browser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rawRecords));
      localStorage.setItem(IS_DEMO_KEY, String(isDemo));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  function importRecords(input: unknown): { added: number; total: number } {
    const parsed = parseAndValidateRaw(input);
    if (parsed.length === 0) {
      throw new Error('No valid 101weiqi test records found in input.');
    }

    // Deduplicate against existing
    const existingMap = new Map<number, WeiqiRawRecord>();
    for (const r of rawRecords) {
      existingMap.set(r.guanid, r);
    }

    let added = 0;
    for (const r of parsed) {
      if (!existingMap.has(r.guanid)) {
        existingMap.set(r.guanid, r);
        added++;
      } else {
        // If newer timestamp, overwrite
        const existing = existingMap.get(r.guanid)!;
        if (r.t > existing.t) {
          existingMap.set(r.guanid, r);
        }
      }
    }

    rawRecords = Array.from(existingMap.values());
    isDemo = false;
    saveToStorage();

    return { added, total: rawRecords.length };
  }

  function loadDemo() {
    rawRecords = [...SAMPLE_RECORDS];
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
    a.download = `tsumestats_101weiqi_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    get rawRecords() { return rawRecords; },
    get allRecords() { return allRecords; },
    get filteredRecords() { return filteredRecords; },
    get isDemo() { return isDemo; },
    get isInitialized() { return isInitialized; },
    get filter() { return filter; },
    get kpis() { return kpis; },
    init,
    importRecords,
    loadDemo,
    clearData,
    exportJson
  };
}

export const recordsStore = createRecordsStore();
