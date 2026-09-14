import type {
  ProcessedRecord,
  KpiStats,
  DifficultyStat,
  HourlyStat,
  DayOfWeekStat,
  RegressionResult
} from '$lib/types';
import { rankNumberToLabel } from './rank';

export function computeKpis(records: ProcessedRecord[]): KpiStats {
  if (records.length === 0) {
    return {
      totalTests: 0,
      totalProblems: 0,
      totalCorrect: 0,
      overallAccuracyPct: 0,
      passCount: 0,
      passRatePct: 0,
      avgTotalTimeSeconds: 0,
      avgTimePerProblemSeconds: 0,
      lowestRankLabel: '-',
      highestRankLabel: '-',
      activeDaysCount: 0
    };
  }

  const totalTests = records.length;
  const totalProblems = totalTests * 10;
  let totalCorrect = 0;
  let passCount = 0;
  let totalSeconds = 0;
  let minRank = Infinity;
  let maxRank = -Infinity;
  const uniqueDates = new Set<string>();

  for (const r of records) {
    totalCorrect += r.oknum;
    if (r.passed) passCount++;
    totalSeconds += r.totaltime;
    if (r.number < minRank) minRank = r.number;
    if (r.number > maxRank) maxRank = r.number;
    uniqueDates.add(r.dateStr);
  }

  const overallAccuracyPct = Number(((totalCorrect / totalProblems) * 100).toFixed(1));
  const passRatePct = Number(((passCount / totalTests) * 100).toFixed(1));
  const avgTotalTimeSeconds = Number((totalSeconds / totalTests).toFixed(1));
  const avgTimePerProblemSeconds = Number((totalSeconds / totalProblems).toFixed(1));

  return {
    totalTests,
    totalProblems,
    totalCorrect,
    overallAccuracyPct,
    passCount,
    passRatePct,
    avgTotalTimeSeconds,
    avgTimePerProblemSeconds,
    lowestRankLabel: minRank === Infinity ? '-' : rankNumberToLabel(minRank),
    highestRankLabel: maxRank === -Infinity ? '-' : rankNumberToLabel(maxRank),
    activeDaysCount: uniqueDates.size
  };
}

export function computeLinearRegression(points: [number, number][]): RegressionResult {
  if (points.length < 2) {
    return { slope: 0, intercept: 0, r2: 0, points, trendPoints: [] };
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXX = 0;
  let ssXY = 0;
  let ssYY = 0;

  for (const [x, y] of points) {
    const dx = x - meanX;
    const dy = y - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
    ssYY += dy * dy;
  }

  if (ssXX === 0) {
    return { slope: 0, intercept: meanY, r2: 0, points, trendPoints: [] };
  }

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const r2 = (ssYY > 0) ? Math.min(1, Math.max(0, (ssXY * ssXY) / (ssXX * ssYY))) : 0;

  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }

  const trendPoints: [number, number][] = [
    [minX, Number((slope * minX + intercept).toFixed(2))],
    [maxX, Number((slope * maxX + intercept).toFixed(2))]
  ];

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(2)),
    r2: Number(r2.toFixed(3)),
    points,
    trendPoints
  };
}

export function computeRollingAverage(data: number[], windowSize = 7): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const sum = window.reduce((a, b) => a + b, 0);
    result.push(Number((sum / window.length).toFixed(1)));
  }
  return result;
}

export function computeDifficultyStats(records: ProcessedRecord[]): DifficultyStat[] {
  const map = new Map<number, { count: number; totalCorrect: number; passCount: number; totalTime: number }>();

  for (const r of records) {
    let entry = map.get(r.number);
    if (!entry) {
      entry = { count: 0, totalCorrect: 0, passCount: 0, totalTime: 0 };
      map.set(r.number, entry);
    }
    entry.count += 1;
    entry.totalCorrect += r.oknum;
    if (r.passed) entry.passCount += 1;
    entry.totalTime += r.totaltime;
  }

  // Sort ascending by rank number
  const sortedRanks = Array.from(map.keys()).sort((a, b) => a - b);

  return sortedRanks.map((num) => {
    const d = map.get(num)!;
    return {
      rankNumber: num,
      rankLabel: rankNumberToLabel(num),
      count: d.count,
      accuracyPct: Number(((d.totalCorrect / (d.count * 10)) * 100).toFixed(1)),
      passRatePct: Number(((d.passCount / d.count) * 100).toFixed(1)),
      avgSecondsPerProblem: Number((d.totalTime / (d.count * 10)).toFixed(1))
    };
  });
}

export function computeHourlyStats(records: ProcessedRecord[]): HourlyStat[] {
  const buckets: { count: number; totalCorrect: number; totalTime: number }[] = Array.from(
    { length: 24 },
    () => ({ count: 0, totalCorrect: 0, totalTime: 0 })
  );

  for (const r of records) {
    const h = r.hourOfDay;
    buckets[h].count += 1;
    buckets[h].totalCorrect += r.oknum;
    buckets[h].totalTime += r.totaltime;
  }

  return buckets.map((b, hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const label = `${displayHour} ${period}`;
    const accuracyPct = b.count > 0 ? Number(((b.totalCorrect / (b.count * 10)) * 100).toFixed(1)) : 0;
    const avgSecondsPerProblem = b.count > 0 ? Number((b.totalTime / (b.count * 10)).toFixed(1)) : 0;

    return {
      hour,
      label,
      count: b.count,
      accuracyPct,
      avgSecondsPerProblem
    };
  });
}

export function computeDayOfWeekStats(records: ProcessedRecord[]): DayOfWeekStat[] {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = DAYS.map((name, idx) => ({
    dayIndex: idx,
    dayName: name,
    count: 0,
    totalCorrect: 0,
    totalTime: 0,
    isWeekend: idx === 0 || idx === 6
  }));

  for (const r of records) {
    const day = r.dayOfWeek;
    buckets[day].count += 1;
    buckets[day].totalCorrect += r.oknum;
    buckets[day].totalTime += r.totaltime;
  }

  return buckets.map((b) => ({
    dayIndex: b.dayIndex,
    dayName: b.dayName,
    count: b.count,
    accuracyPct: b.count > 0 ? Number(((b.totalCorrect / (b.count * 10)) * 100).toFixed(1)) : 0,
    avgSecondsPerProblem: b.count > 0 ? Number((b.totalTime / (b.count * 10)).toFixed(1)) : 0,
    isWeekend: b.isWeekend
  }));
}
