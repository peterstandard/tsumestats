import type {
  ProcessedRecord,
  DifficultyMilestone,
  UnpassedDifficulty,
  MilestoneSummaryStats
} from '$lib/types';
import { rankNumberToLabel } from './rank';

interface RankTracker {
  rankNumber: number;
  rankLabel: string;
  attemptsBeforePass: number;
  cumulativeDurationBeforePass: number;
  firstPass: ProcessedRecord | null;
  totalAttempts: number;
  totalPasses: number;
  bestOkNum: number;
  lastAttemptDate: string;
  totalDuration: number;
}

/**
 * Computes the first-passed test at each difficulty rank, tracking the exact date/time,
 * number of attempts taken up to the first pass, and summary milestones.
 */
export function computeDifficultyMilestones(records: ProcessedRecord[]): MilestoneSummaryStats {
  if (!records || records.length === 0) {
    return {
      milestones: [],
      unpassed: [],
      totalPassedCount: 0,
      firstTryPassesCount: 0,
      firstTryRatePct: 0,
      avgAttemptsToPass: 0,
      hardestMilestone: null,
      fastestMilestone: null,
      highestRankPassed: null,
      lowestRankPassed: null
    };
  }

  // Ensure chronological order
  const sorted = [...records].sort((a, b) => a.t - b.t);
  const trackers = new Map<number, RankTracker>();

  for (const r of sorted) {
    let tr = trackers.get(r.number);
    if (!tr) {
      tr = {
        rankNumber: r.number,
        rankLabel: r.rankLabel || rankNumberToLabel(r.number),
        attemptsBeforePass: 0,
        cumulativeDurationBeforePass: 0,
        firstPass: null,
        totalAttempts: 0,
        totalPasses: 0,
        bestOkNum: 0,
        lastAttemptDate: r.dateStr,
        totalDuration: 0
      };
      trackers.set(r.number, tr);
    }

    tr.totalAttempts += 1;
    tr.totalDuration += r.totaltime;
    if (r.oknum > tr.bestOkNum) tr.bestOkNum = r.oknum;
    tr.lastAttemptDate = r.dateStr;

    if (r.passed) {
      tr.totalPasses += 1;
    }

    if (!tr.firstPass) {
      tr.attemptsBeforePass += 1;
      tr.cumulativeDurationBeforePass += r.totaltime;
      if (r.passed) {
        tr.firstPass = r;
      }
    }
  }

  const milestones: DifficultyMilestone[] = [];
  const unpassed: UnpassedDifficulty[] = [];

  for (const tr of trackers.values()) {
    if (tr.firstPass) {
      milestones.push({
        rankNumber: tr.rankNumber,
        rankLabel: tr.rankLabel,
        firstPassTimestamp: tr.firstPass.t * 1000,
        firstPassDate: tr.firstPass.date,
        dateStr: tr.firstPass.dateStr,
        formattedDate: tr.firstPass.formattedDate,
        attemptsToPass: tr.attemptsBeforePass,
        failedAttemptsBeforePass: tr.attemptsBeforePass - 1,
        firstPassRecord: tr.firstPass,
        totalAttemptsAtRank: tr.totalAttempts,
        totalPassesAtRank: tr.totalPasses,
        lifetimePassRatePct: Math.round((tr.totalPasses / tr.totalAttempts) * 100),
        timeToFirstPassSeconds: tr.cumulativeDurationBeforePass
      });
    } else {
      unpassed.push({
        rankNumber: tr.rankNumber,
        rankLabel: tr.rankLabel,
        attempts: tr.totalAttempts,
        bestOkNum: tr.bestOkNum,
        totalTimeSeconds: tr.totalDuration,
        lastAttemptDate: tr.lastAttemptDate
      });
    }
  }

  // Sort milestones chronologically ascending (oldest first pass to newest)
  milestones.sort((a, b) => a.firstPassTimestamp - b.firstPassTimestamp);

  // Sort unpassed by rankNumber ascending
  unpassed.sort((a, b) => a.rankNumber - b.rankNumber);

  const totalPassedCount = milestones.length;
  const firstTryPassesCount = milestones.filter((m) => m.attemptsToPass === 1).length;
  const firstTryRatePct = totalPassedCount > 0 ? Math.round((firstTryPassesCount / totalPassedCount) * 100) : 0;
  const avgAttemptsToPass = totalPassedCount > 0
    ? Number((milestones.reduce((acc, m) => acc + m.attemptsToPass, 0) / totalPassedCount).toFixed(1))
    : 0;

  // Hardest milestone (most attempts to pass)
  let hardestMilestone: DifficultyMilestone | null = null;
  for (const m of milestones) {
    if (!hardestMilestone || m.attemptsToPass > hardestMilestone.attemptsToPass) {
      hardestMilestone = m;
    }
  }

  // Fastest milestone (1st try and lowest secondsPerProblem)
  let fastestMilestone: DifficultyMilestone | null = null;
  const firstTries = milestones.filter((m) => m.attemptsToPass === 1);
  if (firstTries.length > 0) {
    fastestMilestone = firstTries.reduce((fastest, curr) =>
      curr.firstPassRecord.secondsPerProblem < fastest.firstPassRecord.secondsPerProblem ? curr : fastest
    );
  } else if (milestones.length > 0) {
    fastestMilestone = milestones[0];
  }

  // Highest and lowest ranks passed
  let highestRankPassed: DifficultyMilestone | null = null;
  let lowestRankPassed: DifficultyMilestone | null = null;
  for (const m of milestones) {
    if (!highestRankPassed || m.rankNumber > highestRankPassed.rankNumber) {
      highestRankPassed = m;
    }
    if (!lowestRankPassed || m.rankNumber < lowestRankPassed.rankNumber) {
      lowestRankPassed = m;
    }
  }

  return {
    milestones,
    unpassed,
    totalPassedCount,
    firstTryPassesCount,
    firstTryRatePct,
    avgAttemptsToPass,
    hardestMilestone,
    fastestMilestone,
    highestRankPassed,
    lowestRankPassed
  };
}
