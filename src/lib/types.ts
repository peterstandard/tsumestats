export interface WeiqiRawRecord {
  t: number;          // Unix epoch timestamp in seconds
  status: number;     // 1 = Fail, 2 = Pass
  oknum: number;      // Correct questions out of 10
  totaltime: number;  // Total duration in seconds
  guanid: number;     // Level result ID
  number: number;     // Difficulty level (1 = 15k, 6 = 10k, ..., up to 7d)
}

export interface ProcessedRecord extends WeiqiRawRecord {
  id: string;
  date: Date;
  dateStr: string;           // YYYY-MM-DD
  timeStr: string;           // HH:mm
  formattedDate: string;     // e.g. "Sep 13, 2026, 14:32"
  passed: boolean;
  accuracyPct: number;       // oknum / 10 * 100
  secondsPerProblem: number; // totaltime / 10
  rankLabel: string;         // e.g. "10k", "5k", "1d"
  reviewUrl: string;         // https://www.101weiqi.com/guan/result/{number}/{guanid}/
  hourOfDay: number;         // 0 - 23
  dayOfWeek: number;         // 0 = Sunday, 6 = Saturday
  dayName: string;           // "Sun", "Mon", ...
  isWeekend: boolean;
}

export interface KpiStats {
  totalTests: number;
  totalProblems: number;
  totalCorrect: number;
  overallAccuracyPct: number;
  passCount: number;
  passRatePct: number;
  avgTotalTimeSeconds: number;
  avgTimePerProblemSeconds: number;
  lowestRankLabel: string;
  highestRankLabel: string;
  activeDaysCount: number;
}

export interface FilterState {
  datePreset: 'all' | '7d' | '30d' | '60d';
  rankFilter: number | 'all'; // 'all' or specific number
  statusFilter: 'all' | 'pass' | 'fail';
  searchQuery: string;
}

export interface DifficultyStat {
  rankNumber: number;
  rankLabel: string;
  count: number;
  accuracyPct: number;
  passRatePct: number;
  avgSecondsPerProblem: number;
}

export interface HourlyStat {
  hour: number;
  label: string; // "12 AM", "1 AM", ...
  count: number;
  accuracyPct: number;
  avgSecondsPerProblem: number;
}

export interface DayOfWeekStat {
  dayIndex: number;
  dayName: string; // "Mon", "Tue", ...
  count: number;
  accuracyPct: number;
  avgSecondsPerProblem: number;
  isWeekend: boolean;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  points: [number, number][]; // [x, y]
  trendPoints: [number, number][]; // line start and end points [x, y]
}

export type TimeGranularity = 'month' | 'week' | 'day' | 'hour';

export interface DrillStep {
  level: TimeGranularity;
  key: string;       // e.g. "2026-08" or "2026-09-12"
  label: string;     // e.g. "August 2026" or "Sep 12, 2026"
}

export interface AggregatedBucket {
  key: string;
  label: string;
  shortLabel: string;
  subLabel?: string;
  timestamp: number;
  testsCount: number;
  problemsCount: number;
  correctCount: number;
  totalTimeSeconds: number;
  passCount: number;
  failCount: number;
  passRatePct: number | null;
  accuracyPct: number | null;
  avgSecondsPerProblem: number | null;
  records: ProcessedRecord[];
}

export interface DifficultyMilestone {
  rankNumber: number;
  rankLabel: string;
  firstPassTimestamp: number;        // Epoch ms for ECharts
  firstPassDate: Date;
  dateStr: string;                   // YYYY-MM-DD
  formattedDate: string;             // e.g. "Jul 15, 2026, 10:48"
  attemptsToPass: number;            // Attempts before and including first pass
  failedAttemptsBeforePass: number;  // attemptsToPass - 1
  firstPassRecord: ProcessedRecord;
  totalAttemptsAtRank: number;       // All attempts lifetime at this rank
  totalPassesAtRank: number;         // All passes lifetime at this rank
  lifetimePassRatePct: number;       // totalPassesAtRank / totalAttemptsAtRank * 100
  timeToFirstPassSeconds: number;    // Cumulative duration of attempts leading to first pass
}

export interface UnpassedDifficulty {
  rankNumber: number;
  rankLabel: string;
  attempts: number;
  bestOkNum: number;
  totalTimeSeconds: number;
  lastAttemptDate: string;
}

export interface MilestoneSummaryStats {
  milestones: DifficultyMilestone[];
  unpassed: UnpassedDifficulty[];
  totalPassedCount: number;
  firstTryPassesCount: number;
  firstTryRatePct: number;
  avgAttemptsToPass: number;
  hardestMilestone: DifficultyMilestone | null;
  fastestMilestone: DifficultyMilestone | null;
  highestRankPassed: DifficultyMilestone | null;
  lowestRankPassed: DifficultyMilestone | null;
}

