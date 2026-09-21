import type { ProcessedRecord, TimeGranularity, AggregatedBucket, DrillStep } from '$lib/types';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function padZero(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDayKey(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

export function formatMonthKey(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}`;
}

export function formatHourKey(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}-${padZero(d.getHours())}`;
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  // Make Monday the first day of the week
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSecs = seconds % 60;
  if (mins < 60) {
    return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export function aggregateRecordsByTime(
  records: ProcessedRecord[],
  granularity: TimeGranularity,
  fillEmpty = true,
  drillStep?: DrillStep | null
): AggregatedBucket[] {
  if (records.length === 0) return [];

  // Filter records if a drillStep is active
  let targetRecords = records;
  if (drillStep) {
    if (drillStep.level === 'month') {
      targetRecords = records.filter((r) => formatMonthKey(r.date) === drillStep.key);
    } else if (drillStep.level === 'week') {
      targetRecords = records.filter((r) => formatDayKey(getStartOfWeek(r.date)) === drillStep.key);
    } else if (drillStep.level === 'day') {
      targetRecords = records.filter((r) => r.dateStr === drillStep.key);
    }
  }

  if (targetRecords.length === 0) return [];

  // Group records by bucket key
  const groups = new Map<string, ProcessedRecord[]>();
  for (const r of targetRecords) {
    let key: string;
    if (granularity === 'month') {
      key = formatMonthKey(r.date);
    } else if (granularity === 'week') {
      key = formatDayKey(getStartOfWeek(r.date));
    } else if (granularity === 'day') {
      key = r.dateStr;
    } else {
      // hour
      if (drillStep?.level === 'day') {
        key = String(r.hourOfDay);
      } else {
        key = formatHourKey(r.date);
      }
    }

    const existing = groups.get(key);
    if (existing) {
      existing.push(r);
    } else {
      groups.set(key, [r]);
    }
  }

  // Determine span for continuous calendar buckets
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const r of targetRecords) {
    const t = r.date.getTime();
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }

  const startDate = new Date(minTime);
  const endDate = new Date(maxTime);

  const buckets: AggregatedBucket[] = [];

  function createBucketFromRecords(
    key: string,
    label: string,
    shortLabel: string,
    timestamp: number,
    recs: ProcessedRecord[] | undefined,
    subLabel?: string
  ): AggregatedBucket {
    if (!recs || recs.length === 0) {
      return {
        key,
        label,
        shortLabel,
        subLabel,
        timestamp,
        testsCount: 0,
        problemsCount: 0,
        correctCount: 0,
        totalTimeSeconds: 0,
        passCount: 0,
        failCount: 0,
        passRatePct: null,
        accuracyPct: null,
        avgSecondsPerProblem: null,
        records: []
      };
    }

    const testsCount = recs.length;
    const problemsCount = testsCount * 10;
    let correctCount = 0;
    let totalTimeSeconds = 0;
    let passCount = 0;

    for (const r of recs) {
      correctCount += r.oknum;
      totalTimeSeconds += r.totaltime;
      if (r.passed) passCount++;
    }

    const failCount = testsCount - passCount;
    const passRatePct = Number(((passCount / testsCount) * 100).toFixed(1));
    const accuracyPct = Number(((correctCount / problemsCount) * 100).toFixed(1));
    const avgSecondsPerProblem = Number((totalTimeSeconds / problemsCount).toFixed(1));

    return {
      key,
      label,
      shortLabel,
      subLabel,
      timestamp,
      testsCount,
      problemsCount,
      correctCount,
      totalTimeSeconds,
      passCount,
      failCount,
      passRatePct,
      accuracyPct,
      avgSecondsPerProblem,
      records: recs
    };
  }

  if (granularity === 'month') {
    if (!fillEmpty) {
      const sortedKeys = Array.from(groups.keys()).sort();
      for (const key of sortedKeys) {
        const recs = groups.get(key)!;
        const d = recs[0].date;
        const label = `${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`;
        const shortLabel = `${MONTH_NAMES_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
        buckets.push(createBucketFromRecords(key, label, shortLabel, new Date(d.getFullYear(), d.getMonth(), 1).getTime(), recs));
      }
    } else {
      const curr = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      while (curr <= end) {
        const key = formatMonthKey(curr);
        const label = `${MONTH_NAMES_FULL[curr.getMonth()]} ${curr.getFullYear()}`;
        const shortLabel = `${MONTH_NAMES_SHORT[curr.getMonth()]} '${String(curr.getFullYear()).slice(2)}`;
        const recs = groups.get(key);
        buckets.push(createBucketFromRecords(key, label, shortLabel, curr.getTime(), recs));
        curr.setMonth(curr.getMonth() + 1);
      }
    }
  } else if (granularity === 'week') {
    if (!fillEmpty) {
      const sortedKeys = Array.from(groups.keys()).sort();
      for (const key of sortedKeys) {
        const recs = groups.get(key)!;
        const wStart = getStartOfWeek(recs[0].date);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);

        const startM = MONTH_NAMES_SHORT[wStart.getMonth()];
        const endM = MONTH_NAMES_SHORT[wEnd.getMonth()];
        const label = startM === endM
          ? `${startM} ${wStart.getDate()} – ${wEnd.getDate()}, ${wEnd.getFullYear()}`
          : `${startM} ${wStart.getDate()} – ${endM} ${wEnd.getDate()}, ${wEnd.getFullYear()}`;
        const shortLabel = `${startM} ${wStart.getDate()} – ${wEnd.getDate()}`;
        buckets.push(createBucketFromRecords(key, label, shortLabel, wStart.getTime(), recs));
      }
    } else {
      const curr = getStartOfWeek(startDate);
      const end = getStartOfWeek(endDate);
      while (curr <= end) {
        const key = formatDayKey(curr);
        const wEnd = new Date(curr);
        wEnd.setDate(wEnd.getDate() + 6);

        const startM = MONTH_NAMES_SHORT[curr.getMonth()];
        const endM = MONTH_NAMES_SHORT[wEnd.getMonth()];
        const label = startM === endM
          ? `${startM} ${curr.getDate()} – ${wEnd.getDate()}, ${wEnd.getFullYear()}`
          : `${startM} ${curr.getDate()} – ${endM} ${wEnd.getDate()}, ${wEnd.getFullYear()}`;
        const shortLabel = `${startM} ${curr.getDate()} – ${wEnd.getDate()}`;
        const recs = groups.get(key);
        buckets.push(createBucketFromRecords(key, label, shortLabel, curr.getTime(), recs));
        curr.setDate(curr.getDate() + 7);
      }
    }
  } else if (granularity === 'day') {
    if (!fillEmpty) {
      const sortedKeys = Array.from(groups.keys()).sort();
      for (const key of sortedKeys) {
        const recs = groups.get(key)!;
        const d = recs[0].date;
        const label = `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        const shortLabel = `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}`;
        const subLabel = DAY_NAMES[d.getDay()];
        buckets.push(createBucketFromRecords(key, label, shortLabel, d.getTime(), recs, subLabel));
      }
    } else {
      const curr = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      while (curr <= end) {
        const key = formatDayKey(curr);
        const label = `${MONTH_NAMES_SHORT[curr.getMonth()]} ${curr.getDate()}, ${curr.getFullYear()}`;
        const shortLabel = `${MONTH_NAMES_SHORT[curr.getMonth()]} ${curr.getDate()}`;
        const subLabel = DAY_NAMES[curr.getDay()];
        const recs = groups.get(key);
        buckets.push(createBucketFromRecords(key, label, shortLabel, curr.getTime(), recs, subLabel));
        curr.setDate(curr.getDate() + 1);
      }
    }
  } else {
    // Hour
    if (drillStep?.level === 'day') {
      // 24 hours of that specific day
      const [yearStr, monthStr, dayStr] = drillStep.key.split('-');
      const dYear = Number(yearStr);
      const dMonth = Number(monthStr) - 1;
      const dDay = Number(dayStr);

      for (let hour = 0; hour < 24; hour++) {
        const key = String(hour);
        const hourDate = new Date(dYear, dMonth, dDay, hour, 0, 0);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const shortLabel = `${displayHour} ${period}`;
        const label = `${MONTH_NAMES_SHORT[dMonth]} ${dDay}, ${displayHour}:00 ${period}`;
        const recs = groups.get(key);
        buckets.push(createBucketFromRecords(key, label, shortLabel, hourDate.getTime(), recs));
      }
    } else {
      // Across multiple days: sort active hour keys
      const sortedKeys = Array.from(groups.keys()).sort();
      for (const key of sortedKeys) {
        const recs = groups.get(key)!;
        const d = recs[0].date;
        const hour = d.getHours();
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const label = `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}, ${displayHour}:00 ${period}`;
        const shortLabel = `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()} ${displayHour}${period}`;
        buckets.push(createBucketFromRecords(key, label, shortLabel, d.getTime(), recs));
      }
    }
  }

  return buckets;
}

export function computeAggregatedRollingStats(
  buckets: AggregatedBucket[],
  windowSize = 7
): {
  rollingAccuracies: (number | null)[];
  rollingSpeeds: (number | null)[];
} {
  const rollingAccuracies: (number | null)[] = [];
  const rollingSpeeds: (number | null)[] = [];

  // To calculate pooled rolling average across the active buckets
  const activeHistory: { correct: number; problems: number; totalTime: number }[] = [];

  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (b.testsCount === 0) {
      rollingAccuracies.push(null);
      rollingSpeeds.push(null);
      continue;
    }

    activeHistory.push({
      correct: b.correctCount,
      problems: b.problemsCount,
      totalTime: b.totalTimeSeconds
    });

    const window = activeHistory.slice(-windowSize);
    let totalCorrect = 0;
    let totalProblems = 0;
    let totalTime = 0;

    for (const item of window) {
      totalCorrect += item.correct;
      totalProblems += item.problems;
      totalTime += item.totalTime;
    }

    if (totalProblems > 0) {
      rollingAccuracies.push(Number(((totalCorrect / totalProblems) * 100).toFixed(1)));
      rollingSpeeds.push(Number((totalTime / totalProblems).toFixed(1)));
    } else {
      rollingAccuracies.push(null);
      rollingSpeeds.push(null);
    }
  }

  return { rollingAccuracies, rollingSpeeds };
}

export function computeAggregatedSpeedTrend(buckets: AggregatedBucket[]): {
  slope: number;
  speedChange: number;
  startSpeed: number;
  endSpeed: number;
  trendline: (number | null)[];
} {
  const activeIndices: number[] = [];
  const activeSpeeds: number[] = [];

  buckets.forEach((b, idx) => {
    if (b.avgSecondsPerProblem !== null && b.testsCount > 0) {
      activeIndices.push(idx);
      activeSpeeds.push(b.avgSecondsPerProblem);
    }
  });

  const n = activeSpeeds.length;
  if (n < 2) {
    return {
      slope: 0,
      speedChange: 0,
      startSpeed: activeSpeeds[0] ?? 0,
      endSpeed: activeSpeeds[0] ?? 0,
      trendline: buckets.map((b) => b.avgSecondsPerProblem)
    };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += activeIndices[i];
    sumY += activeSpeeds[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXX = 0;
  let ssXY = 0;
  for (let i = 0; i < n; i++) {
    const dx = activeIndices[i] - meanX;
    const dy = activeSpeeds[i] - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
  }

  const slope = ssXX > 0 ? ssXY / ssXX : 0;
  const intercept = meanY - slope * meanX;

  const firstIdx = activeIndices[0];
  const lastIdx = activeIndices[activeIndices.length - 1];
  const startSpeed = Number((slope * firstIdx + intercept).toFixed(1));
  const endSpeed = Number((slope * lastIdx + intercept).toFixed(1));
  const speedChange = Number((endSpeed - startSpeed).toFixed(1));

  const trendline = buckets.map((b, idx) => {
    if (b.testsCount === 0) return null;
    return Number((slope * idx + intercept).toFixed(1));
  });

  return {
    slope: Number(slope.toFixed(3)),
    speedChange,
    startSpeed,
    endSpeed,
    trendline
  };
}
