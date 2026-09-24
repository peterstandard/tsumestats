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

export type SpeedAccuracyPolicy = 'best_or_100' | 'non_decreasing' | 'all_passing';

export interface SpeedRecordMilestone {
  id: string;                        // guanid as string
  guanid: number;
  rankNumber: number;
  rankLabel: string;
  timestamp: number;                 // epoch ms
  dateStr: string;                   // YYYY-MM-DD
  formattedDate: string;             // e.g. "Aug 13, 2026, 01:04"
  totaltime: number;                 // total time in seconds
  secondsPerProblem: number;         // seconds per problem (totaltime / 10)
  previousRecordTotalTime: number | null;
  previousRecordSpeed: number | null;
  improvementSeconds: number;        // totaltime reduction
  improvementSpeed: number;          // secondsPerProblem reduction
  improvementPct: number;            // percentage faster than previous record
  testsToBeat: number;               // tests attempted at this rank since previous PB
  timeToBeatSeconds: number;         // seconds elapsed between PBs
  daysToBeat: number;                // days elapsed between PBs
  isInitialRecord: boolean;          // true if first pass at this rank
  recordIndex: number;               // 1-based (PB #1, PB #2, etc.)
  record: ProcessedRecord;
}

export interface RankSpeedMilestoneGroup {
  rankNumber: number;
  rankLabel: string;
  records: SpeedRecordMilestone[];
  currentBestSpeed: number;
  currentBestTotalTime: number;
  initialSpeed: number;
  initialTotalTime: number;
  totalImprovementSec: number;
  totalImprovementPct: number;
  totalPBs: number;
  avgTestsToBeat: number;
  maxTestsToBeat: number;
  longestGrindMilestone: SpeedRecordMilestone | null;
}

export interface SpeedMilestoneSummary {
  byRank: Map<number, RankSpeedMilestoneGroup>;
  ranksWithPBs: RankSpeedMilestoneGroup[];
  allMilestonesChronological: SpeedRecordMilestone[];
  totalPBsCount: number;
  biggestImprovement: SpeedRecordMilestone | null;
  hardestToBeat: SpeedRecordMilestone | null;
  fastestOverallSpeed: SpeedRecordMilestone | null;
  pbGuanidMap: Map<number, SpeedRecordMilestone>;
}

export type ActivePlatform = '101weiqi' | 'tsumegohero';

// ==================== Tsumego Hero Types ====================

export interface HeroRawRecord {
  set: string;
  setUrl?: string | null;
  tsumego: string;
  probUrl?: string | null;
  solved: boolean;
  misplays: number;
  rating: number;
  xp: number;
  date: string; // "YYYY-MM-DD HH:MM:SS"
}

export interface ProcessedHeroRecord extends HeroRawRecord {
  id: string;
  timestamp: number; // Epoch ms
  epochSeconds: number;
  dateObj: Date;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  formattedDate: string; // e.g. "Jul 15, 2026, 12:44"
  hourOfDay: number;
  dayOfWeek: number;
  dayName: string;
  isClean: boolean; // misplays === 0
  timeSincePrevSeconds: number | null;
}

export interface HeroTrainingSession {
  id: string;
  sessionIndex: number;
  startTime: Date;
  endTime: Date;
  startTimestamp: number;
  endTimestamp: number;
  dateStr: string;
  formattedDate: string;
  durationSeconds: number;
  durationMinutes: number;
  problemsCount: number;
  cleanCount: number;
  cleanRatePct: number;
  avgPaceSeconds: number; // durationSeconds / problemsCount
  primarySet: string;
  setsList: string[];
  startRating: number;
  endRating: number;
  ratingChange: number;
  xpGained: number;
  records: ProcessedHeroRecord[];
}

export interface HeroSetStat {
  setName: string;
  setUrl?: string | null;
  totalCount: number;
  cleanCount: number;
  misplayCount: number;
  cleanPct: number;
  avgMisplays: number;
  minRating: number;
  maxRating: number;
  lastPracticedDate: string;
}

export interface HeroKpiStats {
  totalSolves: number;
  cleanSolves: number;
  cleanRatePct: number;
  totalMisplays: number;
  totalSessions: number;
  avgSessionDurationMin: number;
  avgPaceSeconds: number;
  currentRating: number;
  peakRating: number;
  lowestRating: number;
  totalXp: number;
  setsCount: number;
  activeDaysCount: number;
}

export interface HeroFilterState {
  datePreset: 'all' | '7d' | '30d' | '60d';
  setFilter: string | 'all';
  misplayFilter: 'all' | 'clean' | 'misplay';
  searchQuery: string;
}


