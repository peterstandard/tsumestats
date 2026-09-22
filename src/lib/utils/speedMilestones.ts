import type {
  ProcessedRecord,
  SpeedRecordMilestone,
  RankSpeedMilestoneGroup,
  SpeedMilestoneSummary
} from '$lib/types';
import { rankNumberToLabel } from './rank';

/**
 * Computes speed record milestones (personal bests) per difficulty level over time.
 * Tracks when a new fastest test speed was achieved for each rank, how many tests
 * it took to beat the prior record, and calendar time elapsed.
 */
export function computeSpeedMilestones(records: ProcessedRecord[]): SpeedMilestoneSummary {
  if (!records || records.length === 0) {
    return {
      byRank: new Map(),
      ranksWithPBs: [],
      allMilestonesChronological: [],
      totalPBsCount: 0,
      biggestImprovement: null,
      hardestToBeat: null,
      fastestOverallSpeed: null,
      pbGuanidMap: new Map()
    };
  }

  // Sort chronologically ascending
  const sorted = [...records].sort((a, b) => a.t - b.t);

  // Group records by difficulty rank
  const rankBuckets = new Map<number, ProcessedRecord[]>();
  for (const r of sorted) {
    let bucket = rankBuckets.get(r.number);
    if (!bucket) {
      bucket = [];
      rankBuckets.set(r.number, bucket);
    }
    bucket.push(r);
  }

  const byRank = new Map<number, RankSpeedMilestoneGroup>();
  const allMilestonesChronological: SpeedRecordMilestone[] = [];
  const pbGuanidMap = new Map<number, SpeedRecordMilestone>();

  // Process each rank independently to preserve distinct milestone progressions
  // Sort ranks ascending (15k -> 1d)
  const rankNumbers = Array.from(rankBuckets.keys()).sort((a, b) => a - b);

  for (const rankNum of rankNumbers) {
    const rankRecords = rankBuckets.get(rankNum)!;
    const rankLabel = rankRecords[0]?.rankLabel || rankNumberToLabel(rankNum);

    let currentFastestTime = Infinity;
    let lastPBRecord: ProcessedRecord | null = null;
    let testsSinceLastPB = 0;
    const rankPBs: SpeedRecordMilestone[] = [];

    for (const r of rankRecords) {
      testsSinceLastPB++;

      // Only passed tests can establish speed records
      if (r.passed) {
        if (r.totaltime < currentFastestTime) {
          const isInitial = currentFastestTime === Infinity;
          const prevTime = isInitial ? null : currentFastestTime;
          const prevSpeed = isInitial ? null : Number((currentFastestTime / 10).toFixed(1));
          const improvementSec = isInitial ? 0 : currentFastestTime - r.totaltime;
          const improvementSpeed = isInitial ? 0 : Number((improvementSec / 10).toFixed(1));
          const improvementPct = isInitial ? 0 : Math.round((improvementSec / currentFastestTime) * 100);

          const timeToBeatSeconds = lastPBRecord ? r.t - lastPBRecord.t : 0;
          const daysToBeat = lastPBRecord ? Number(((r.t - lastPBRecord.t) / 86400).toFixed(1)) : 0;

          const milestone: SpeedRecordMilestone = {
            id: String(r.guanid),
            guanid: r.guanid,
            rankNumber: rankNum,
            rankLabel,
            timestamp: r.t * 1000,
            dateStr: r.dateStr,
            formattedDate: r.formattedDate,
            totaltime: r.totaltime,
            secondsPerProblem: r.secondsPerProblem,
            previousRecordTotalTime: prevTime,
            previousRecordSpeed: prevSpeed,
            improvementSeconds: improvementSec,
            improvementSpeed,
            improvementPct,
            testsToBeat: testsSinceLastPB,
            timeToBeatSeconds,
            daysToBeat,
            isInitialRecord: isInitial,
            recordIndex: rankPBs.length + 1,
            record: r
          };

          rankPBs.push(milestone);
          allMilestonesChronological.push(milestone);
          pbGuanidMap.set(r.guanid, milestone);

          currentFastestTime = r.totaltime;
          lastPBRecord = r;
          testsSinceLastPB = 0;
        }
      }
    }

    if (rankPBs.length > 0) {
      const initialRecord = rankPBs[0];
      const bestRecord = rankPBs[rankPBs.length - 1];
      const subsequentPBs = rankPBs.slice(1);

      const totalImprovementSec = initialRecord.totaltime - bestRecord.totaltime;
      const totalImprovementPct =
        initialRecord.totaltime > 0
          ? Math.round((totalImprovementSec / initialRecord.totaltime) * 100)
          : 0;

      const avgTestsToBeat =
        subsequentPBs.length > 0
          ? Number((subsequentPBs.reduce((sum, m) => sum + m.testsToBeat, 0) / subsequentPBs.length).toFixed(1))
          : initialRecord.testsToBeat;

      let longestGrindMilestone: SpeedRecordMilestone | null = null;
      let maxTestsToBeat = 0;
      for (const m of subsequentPBs) {
        if (m.testsToBeat > maxTestsToBeat) {
          maxTestsToBeat = m.testsToBeat;
          longestGrindMilestone = m;
        }
      }
      if (!longestGrindMilestone) {
        longestGrindMilestone = initialRecord;
        maxTestsToBeat = initialRecord.testsToBeat;
      }

      byRank.set(rankNum, {
        rankNumber: rankNum,
        rankLabel,
        records: rankPBs,
        currentBestSpeed: bestRecord.secondsPerProblem,
        currentBestTotalTime: bestRecord.totaltime,
        initialSpeed: initialRecord.secondsPerProblem,
        initialTotalTime: initialRecord.totaltime,
        totalImprovementSec,
        totalImprovementPct,
        totalPBs: rankPBs.length,
        avgTestsToBeat,
        maxTestsToBeat,
        longestGrindMilestone
      });
    }
  }

  // Sort chronological milestones
  allMilestonesChronological.sort((a, b) => a.timestamp - b.timestamp);

  const ranksWithPBs = Array.from(byRank.values()).sort((a, b) => a.rankNumber - b.rankNumber);

  // Overall key milestones
  let biggestImprovement: SpeedRecordMilestone | null = null;
  let hardestToBeat: SpeedRecordMilestone | null = null;
  let fastestOverallSpeed: SpeedRecordMilestone | null = null;

  for (const m of allMilestonesChronological) {
    if (!m.isInitialRecord) {
      if (!biggestImprovement || m.improvementSeconds > biggestImprovement.improvementSeconds) {
        biggestImprovement = m;
      }
      if (!hardestToBeat || m.testsToBeat > hardestToBeat.testsToBeat) {
        hardestToBeat = m;
      }
    }
    if (!fastestOverallSpeed || m.secondsPerProblem < fastestOverallSpeed.secondsPerProblem) {
      fastestOverallSpeed = m;
    }
  }

  return {
    byRank,
    ranksWithPBs,
    allMilestonesChronological,
    totalPBsCount: allMilestonesChronological.length,
    biggestImprovement,
    hardestToBeat,
    fastestOverallSpeed,
    pbGuanidMap
  };
}
