import type { WeiqiRawRecord, ProcessedRecord } from '$lib/types';
import { rankNumberToLabel } from './rank';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseAndValidateRaw(jsonInput: unknown): WeiqiRawRecord[] {
  let rawArr: unknown[] = [];
  
  if (typeof jsonInput === 'string') {
    const trimmed = jsonInput.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawArr = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).records)) {
        rawArr = (parsed as Record<string, unknown>).records as unknown[];
      } else {
        throw new Error('JSON is not an array of test records');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      throw new Error(`Failed to parse JSON: ${msg}`);
    }
  } else if (Array.isArray(jsonInput)) {
    rawArr = jsonInput;
  } else {
    return [];
  }

  const validRecords: WeiqiRawRecord[] = [];

  for (const item of rawArr) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;

    // t, oknum, totaltime, guanid, number are essential
    const t = Number(rec.t);
    const guanid = Number(rec.guanid);
    if (!t || isNaN(t) || !guanid || isNaN(guanid)) continue;

    const oknum = Math.max(0, Math.min(10, Number(rec.oknum) || 0));
    const totaltime = Math.max(0, Number(rec.totaltime) || 0);
    const number = Math.max(1, Number(rec.number) || 1);
    const status = Number(rec.status) === 2 ? 2 : (Number(rec.status) === 1 ? 1 : (oknum >= 10 ? 2 : 1));

    validRecords.push({
      t,
      status,
      oknum,
      totaltime,
      guanid,
      number
    });
  }

  return validRecords;
}

export function processRecord(raw: WeiqiRawRecord): ProcessedRecord {
  // t is epoch in seconds
  const date = new Date(raw.t * 1000);
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeStr = `${pad(hour)}:${pad(date.getMinutes())}`;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${timeStr}`;

  return {
    ...raw,
    id: String(raw.guanid),
    date,
    dateStr,
    timeStr,
    formattedDate,
    passed: raw.status === 2,
    accuracyPct: Math.round((raw.oknum / 10) * 100),
    secondsPerProblem: Number((raw.totaltime / 10).toFixed(1)),
    rankLabel: rankNumberToLabel(raw.number),
    reviewUrl: `https://www.101weiqi.com/guan/result/${raw.number}/${raw.guanid}/`,
    hourOfDay: hour,
    dayOfWeek,
    dayName: DAY_NAMES[dayOfWeek],
    isWeekend
  };
}

export function deduplicateAndSortRecords(records: WeiqiRawRecord[]): ProcessedRecord[] {
  // Map by guanid to deduplicate
  const map = new Map<number, WeiqiRawRecord>();
  for (const r of records) {
    if (!map.has(r.guanid) || (map.get(r.guanid)!.t < r.t)) {
      map.set(r.guanid, r);
    }
  }

  // Convert to processed
  const processed = Array.from(map.values()).map(processRecord);

  // Default sort: Chronological ascending (oldest to newest) for charts
  processed.sort((a, b) => a.t - b.t);

  return processed;
}
