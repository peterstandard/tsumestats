import type {
  HeroRawRecord,
  ProcessedHeroRecord,
  HeroTrainingSession,
  HeroSetStat,
  HeroKpiStats
} from '$lib/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseHeroInput(input: unknown): HeroRawRecord[] {
  let rawArr: unknown[] = [];

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Check if input is HTML (e.g. from saved solvehistory.html)
    if (trimmed.startsWith('<') || trimmed.includes('<table') || trimmed.includes('solveHistory')) {
      return parseHeroHtml(trimmed);
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawArr = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).records)) {
        rawArr = (parsed as Record<string, unknown>).records as unknown[];
      } else {
        throw new Error('JSON is not an array of solve records');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      throw new Error(`Failed to parse Tsumego Hero data: ${msg}`);
    }
  } else if (Array.isArray(input)) {
    rawArr = input;
  } else {
    return [];
  }

  const validRecords: HeroRawRecord[] = [];

  for (const item of rawArr) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;

    const set = String(rec.set || '').trim();
    const tsumego = String(rec.tsumego || '').trim();
    const dateStr = String(rec.date || '').trim();

    if (!set || !tsumego || !dateStr) continue;

    validRecords.push({
      set,
      setUrl: rec.setUrl ? String(rec.setUrl) : null,
      tsumego,
      probUrl: rec.probUrl ? String(rec.probUrl) : null,
      solved: Boolean(rec.solved ?? true),
      misplays: Math.max(0, Number(rec.misplays) || 0),
      rating: Number(rec.rating) || 0,
      xp: Number(rec.xp) || 0,
      date: dateStr
    });
  }

  return validRecords;
}

export function parseHeroHtml(html: string): HeroRawRecord[] {
  const records: HeroRawRecord[] = [];

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    const table = tables.length > 1 ? tables[1] : tables[0];
    if (table) {
      const rows = table.querySelectorAll('tr');
      for (let i = 1; i < rows.length; i++) {
        const tds = rows[i].querySelectorAll('td');
        if (tds.length >= 7) {
          const aSet = tds[0].querySelector('a');
          const aProb = tds[1].querySelector('a');
          const setName = tds[0].textContent?.trim() || '';
          const probRaw = tds[1].textContent?.trim() || '';
          const probNum = probRaw.split('-')[0].trim();
          const solved = tds[2].textContent?.trim() === '✓';
          const misplays = parseInt(tds[3].textContent?.trim() || '0', 10) || 0;
          const rating = parseInt(tds[4].textContent?.trim() || '0', 10) || 0;
          const xp = parseInt(tds[5].textContent?.trim() || '0', 10) || 0;
          const dateStr = tds[6].textContent?.trim() || '';

          if (setName && probNum && dateStr) {
            records.push({
              set: setName,
              setUrl: aSet ? aSet.getAttribute('href') : null,
              tsumego: probNum,
              probUrl: aProb ? aProb.getAttribute('href') : null,
              solved,
              misplays,
              rating,
              xp,
              date: dateStr
            });
          }
        }
      }
    }
  }

  return records;
}

export function parseDateString(dateStr: string): Date {
  // Support "YYYY-MM-DD HH:MM:SS" or ISO
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const parts = dateStr.split(' ');
  if (parts.length === 2) {
    const [y, m, d] = parts[0].split('-').map(Number);
    const [hh, mm, ss] = parts[1].split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0);
  }
  return new Date(dateStr);
}

export function deduplicateAndSortHeroRecords(rawList: HeroRawRecord[]): ProcessedHeroRecord[] {
  const map = new Map<string, HeroRawRecord>();

  for (const r of rawList) {
    // Unique key: date + set + problem
    const key = `${r.date}__${r.set}__${r.tsumego}`;
    if (!map.has(key)) {
      map.set(key, r);
    }
  }

  const processed: ProcessedHeroRecord[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const r of map.values()) {
    const dateObj = parseDateString(r.date);
    const timestamp = dateObj.getTime();
    const epochSeconds = Math.floor(timestamp / 1000);

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}:${minutes}`;
    const formattedDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${year}, ${timeStr}`;

    const hourOfDay = dateObj.getHours();
    const dayOfWeek = dateObj.getDay();
    const dayName = DAY_NAMES[dayOfWeek];

    processed.push({
      ...r,
      id: `${r.date}_${r.set}_${r.tsumego}`,
      timestamp,
      epochSeconds,
      dateObj,
      dateStr,
      timeStr,
      formattedDate,
      hourOfDay,
      dayOfWeek,
      dayName,
      isClean: r.misplays === 0,
      timeSincePrevSeconds: null
    });
  }

  // Sort chronologically (earliest to latest)
  processed.sort((a, b) => a.timestamp - b.timestamp);

  // Compute time gaps between consecutive solves
  for (let i = 1; i < processed.length; i++) {
    const diffSec = Math.max(1, (processed[i].timestamp - processed[i - 1].timestamp) / 1000);
    processed[i].timeSincePrevSeconds = diffSec;
  }

  return processed;
}

export function clusterHeroSessions(
  records: ProcessedHeroRecord[],
  breakThresholdSeconds: number = 900 // 15 mins
): HeroTrainingSession[] {
  if (records.length === 0) return [];

  const sessions: HeroTrainingSession[] = [];
  let currentGroup: ProcessedHeroRecord[] = [records[0]];

  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];
    const gapSec = (curr.timestamp - prev.timestamp) / 1000;

    if (gapSec > breakThresholdSeconds) {
      sessions.push(createSessionObject(currentGroup, sessions.length + 1));
      currentGroup = [curr];
    } else {
      currentGroup.push(curr);
    }
  }

  if (currentGroup.length > 0) {
    sessions.push(createSessionObject(currentGroup, sessions.length + 1));
  }

  return sessions;
}

function createSessionObject(recs: ProcessedHeroRecord[], index: number): HeroTrainingSession {
  const first = recs[0];
  const last = recs[recs.length - 1];

  const startTime = first.dateObj;
  const endTime = last.dateObj;
  const startTimestamp = first.timestamp;
  const endTimestamp = last.timestamp;

  // Duration in seconds: if only 1 problem, assume at least 45 seconds; otherwise end - start
  let durationSeconds = Math.max(30, (endTimestamp - startTimestamp) / 1000);
  if (recs.length === 1) {
    durationSeconds = 45;
  } else if (durationSeconds < recs.length * 5) {
    durationSeconds = recs.length * 10;
  }
  const durationMinutes = Math.round((durationSeconds / 60) * 10) / 10;

  const problemsCount = recs.length;
  const cleanCount = recs.filter((r) => r.isClean).length;
  const cleanRatePct = Math.round((cleanCount / problemsCount) * 1000) / 10;
  const avgPaceSeconds = Math.round((durationSeconds / problemsCount) * 10) / 10;

  // Count sets
  const setCounts = new Map<string, number>();
  for (const r of recs) {
    setCounts.set(r.set, (setCounts.get(r.set) || 0) + 1);
  }
  let primarySet = first.set;
  let maxCount = 0;
  for (const [sName, c] of setCounts.entries()) {
    if (c > maxCount) {
      maxCount = c;
      primarySet = sName;
    }
  }

  const startRating = first.rating;
  const endRating = last.rating;
  const ratingChange = endRating - startRating;
  const xpGained = recs.reduce((sum, r) => sum + r.xp, 0);

  return {
    id: `session_${index}_${first.dateStr}`,
    sessionIndex: index,
    startTime,
    endTime,
    startTimestamp,
    endTimestamp,
    dateStr: first.dateStr,
    formattedDate: first.formattedDate,
    durationSeconds,
    durationMinutes,
    problemsCount,
    cleanCount,
    cleanRatePct,
    avgPaceSeconds,
    primarySet,
    setsList: Array.from(setCounts.keys()),
    startRating,
    endRating,
    ratingChange,
    xpGained,
    records: recs
  };
}

export function computeHeroKpis(
  records: ProcessedHeroRecord[],
  sessions: HeroTrainingSession[]
): HeroKpiStats {
  if (records.length === 0) {
    return {
      totalSolves: 0,
      cleanSolves: 0,
      cleanRatePct: 0,
      totalMisplays: 0,
      totalSessions: 0,
      avgSessionDurationMin: 0,
      avgPaceSeconds: 0,
      currentRating: 0,
      peakRating: 0,
      lowestRating: 0,
      totalXp: 0,
      setsCount: 0,
      activeDaysCount: 0
    };
  }

  const totalSolves = records.length;
  const cleanSolves = records.filter((r) => r.isClean).length;
  const cleanRatePct = Math.round((cleanSolves / totalSolves) * 1000) / 10;
  const totalMisplays = records.reduce((sum, r) => sum + r.misplays, 0);

  const totalSessions = sessions.length;
  const totalSessionMin = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const avgSessionDurationMin = totalSessions > 0 ? Math.round((totalSessionMin / totalSessions) * 10) / 10 : 0;

  const totalDurationSec = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const avgPaceSeconds = totalSolves > 0 ? Math.round((totalDurationSec / totalSolves) * 10) / 10 : 0;

  const ratings = records.map((r) => r.rating).filter((r) => r > 0);
  const currentRating = ratings.length > 0 ? ratings[ratings.length - 1] : 0;
  const peakRating = ratings.length > 0 ? Math.max(...ratings) : 0;
  const lowestRating = ratings.length > 0 ? Math.min(...ratings) : 0;

  const totalXp = records.reduce((sum, r) => sum + r.xp, 0);

  const uniqueSets = new Set(records.map((r) => r.set));
  const uniqueDays = new Set(records.map((r) => r.dateStr));

  return {
    totalSolves,
    cleanSolves,
    cleanRatePct,
    totalMisplays,
    totalSessions,
    avgSessionDurationMin,
    avgPaceSeconds,
    currentRating,
    peakRating,
    lowestRating,
    totalXp,
    setsCount: uniqueSets.size,
    activeDaysCount: uniqueDays.size
  };
}

export function computeHeroSetStats(records: ProcessedHeroRecord[]): HeroSetStat[] {
  const map = new Map<string, {
    setName: string;
    setUrl?: string | null;
    totalCount: number;
    cleanCount: number;
    misplayCount: number;
    ratings: number[];
    lastDate: string;
  }>();

  for (const r of records) {
    if (!map.has(r.set)) {
      map.set(r.set, {
        setName: r.set,
        setUrl: r.setUrl,
        totalCount: 0,
        cleanCount: 0,
        misplayCount: 0,
        ratings: [],
        lastDate: r.dateStr
      });
    }
    const entry = map.get(r.set)!;
    entry.totalCount++;
    if (r.isClean) entry.cleanCount++;
    entry.misplayCount += r.misplays;
    if (r.rating > 0) entry.ratings.push(r.rating);
    if (r.dateStr > entry.lastDate) entry.lastDate = r.dateStr;
  }

  const results: HeroSetStat[] = [];
  for (const e of map.values()) {
    const cleanPct = Math.round((e.cleanCount / e.totalCount) * 1000) / 10;
    const avgMisplays = Math.round((e.misplayCount / e.totalCount) * 100) / 100;
    const minRating = e.ratings.length > 0 ? Math.min(...e.ratings) : 0;
    const maxRating = e.ratings.length > 0 ? Math.max(...e.ratings) : 0;

    results.push({
      setName: e.setName,
      setUrl: e.setUrl,
      totalCount: e.totalCount,
      cleanCount: e.cleanCount,
      misplayCount: e.misplayCount,
      cleanPct,
      avgMisplays,
      minRating,
      maxRating,
      lastPracticedDate: e.lastDate
    });
  }

  // Sort by total count descending
  results.sort((a, b) => b.totalCount - a.totalCount);
  return results;
}

export function computeHeroHourlyHabits(records: ProcessedHeroRecord[]) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
    count: 0,
    cleanCount: 0,
    cleanPct: 0
  }));

  for (const r of records) {
    const h = r.hourOfDay;
    if (h >= 0 && h < 24) {
      hours[h].count++;
      if (r.isClean) hours[h].cleanCount++;
    }
  }

  for (const h of hours) {
    h.cleanPct = h.count > 0 ? Math.round((h.cleanCount / h.count) * 1000) / 10 : 0;
  }

  return hours;
}
