// 成绩规则（纯函数，不碰存储与页面）：
// 1) 每批登记放飞日期/时刻、地点、距离、天气；
// 2) 按足环记归巢日期、时刻与健康；跨夜按真实日期先后算用时；
// 3) 同羽同批只留一条有效成绩：取真实归巢时刻最早的报时，重复报时沿用先到记录；
// 4) 缺距离、缺天气、健康异常、时刻无效/早于放飞的成绩只进待核，不占排行；
// 5) 已放飞但没有有效成绩的足环进入未归巢名单，补录后自动移出；
// 6) 任何更正后，排行、总览、血统档案都由这些函数重新计算。

import type { Arrival, Batch, HealthStatus, LoftState, Pigeon } from "./types";
import { combineDateTime, elapsedMs, isOvernight, speedMpm } from "./time";

/** 待核原因 */
export type IssueCode =
  | "missingDistance"
  | "missingWeather"
  | "healthAbnormal"
  | "timeBeforeRelease"
  | "invalidTime"
  | "duplicateReport";

export const ISSUE_LABEL: Record<IssueCode, string> = {
  missingDistance: "批次缺距离",
  missingWeather: "批次缺天气",
  healthAbnormal: "健康异常",
  timeBeforeRelease: "归巢早于放飞",
  invalidTime: "日期/时刻不完整",
  duplicateReport: "重复报时（沿用先到记录）",
};

/** 某羽在某批的一条报时，附带计算结果 */
export interface ScoredArrival {
  arrival: Arrival;
  batch: Batch;
  /** 真实归巢时间戳；无法解析为 null */
  endTs: number | null;
  /** 用时（毫秒）；归巢早于放飞为 null */
  durationMs: number | null;
  /** 分速（米/分） */
  speed: number | null;
  overnight: boolean;
  /** 待核原因（去重后） */
  issues: IssueCode[];
  /** 是否同羽同批的先到记录（有效成绩） */
  isFirst: boolean;
  /** 是否重复报时里被弃用的那条 */
  isDuplicate: boolean;
  /** 数据齐全且健康正常：只代表"可参与排名资格"，仍必须是先到记录 */
  eligible: boolean;
}

export interface BatchAnalysis {
  batch: Batch;
  /** 该批所有报时（含重复），按真实归巢时刻、录入次序排序 */
  scored: ScoredArrival[];
  /** 同羽同批唯一有效成绩（先到记录） */
  results: ScoredArrival[];
  /** 有效且可占排行的成绩，按分速降序 */
  ranked: ScoredArrival[];
  /** 有效成绩里不满足排行条件的（缺距离/天气、健康异常等） */
  pending: ScoredArrival[];
  /** 已放飞但尚无任何报时的足环 */
  missingRingIds: string[];
  returnCount: number;
  releasedCount: number;
  rankedCount: number;
  returnRate: number | null;
}

export interface RankingRow extends ScoredArrival {
  rank: number;
  pigeon?: Pigeon;
}

export interface LoftOverview {
  pigeonCount: number;
  batchCount: number;
  releasedCount: number;
  returnCount: number;
  /** 归巢率 = 有效成绩羽次 / 放飞羽次 */
  returnRate: number | null;
  /** 全棚可占排行成绩的平均分速 */
  avgSpeed: number | null;
  /** 未归巢条目数（批次 × 足环） */
  missingCount: number;
  /** 待核成绩条数（不含重复报时的弃用记录） */
  pendingCount: number;
  latestResults: ScoredArrival[];
}

export interface PigeonHistoryRow extends RankingRow {}

function arrivalTs(a: Arrival): number | null {
  return combineDateTime(a.arrivalDate, a.arrivalTime);
}

/** 分析单个批次 */
export function analyzeBatch(batch: Batch, arrivals: Arrival[]): BatchAnalysis {
  const inBatch = arrivals
    .filter((a) => a.batchId === batch.id)
    .slice()
    .sort((x, y) => {
      const tx = arrivalTs(x);
      const ty = arrivalTs(y);
      if (tx !== null && ty !== null && tx !== ty) return tx - ty;
      if (tx !== null && ty === null) return -1;
      if (tx === null && ty !== null) return 1;
      return x.reportedAt - y.reportedAt; // 时刻相同或无效时，先报先得
    });

  // 每个足环只认最早一条（先到记录），其余为重复报时
  const firstRing = new Set<string>();
  const scored: ScoredArrival[] = inBatch.map((arrival) => {
    const endTs = arrivalTs(arrival);
    const duration = elapsedMs(
      batch.releaseDate,
      batch.releaseTime,
      arrival.arrivalDate,
      arrival.arrivalTime
    );
    const speed = speedMpm(batch.distanceKm, duration);
    const issues: IssueCode[] = [];

    if (batch.distanceKm === null || batch.distanceKm <= 0) issues.push("missingDistance");
    if (!batch.weather.trim()) issues.push("missingWeather");
    if (arrival.health === "abnormal") issues.push("healthAbnormal");
    if (endTs === null || !batch.releaseDate || !batch.releaseTime) {
      issues.push("invalidTime");
    } else if (duration === null) {
      issues.push("timeBeforeRelease");
    }

    const isFirst = !firstRing.has(arrival.ringId);
    if (isFirst) firstRing.add(arrival.ringId);
    const isDuplicate = !isFirst;
    if (isDuplicate) issues.push("duplicateReport");

    return {
      arrival,
      batch,
      endTs,
      durationMs: duration,
      speed,
      overnight: isOvernight(batch.releaseDate, arrival.arrivalDate),
      issues,
      isFirst,
      isDuplicate,
      eligible: isFirst && issues.length === 0,
    };
  });

  const results = scored.filter((s) => s.isFirst);
  const ranked = results
    .filter((s) => s.eligible)
    .sort((x, y) => (y.speed ?? 0) - (x.speed ?? 0) || x.arrival.ringId.localeCompare(y.arrival.ringId));
  const pending = results.filter((s) => !s.eligible);

  // 只有真实时刻有效的先到记录才算"已确认归巢"；
  // 时刻缺失或归巢早于放飞的记录不能确认归巢，该羽继续留在未归巢名单等待补录/更正。
  const missingRingIds = batch.releasedRingIds.filter(
    (ring) => !results.some((s) => s.arrival.ringId === ring && s.durationMs !== null)
  );

  const releasedCount = batch.releasedRingIds.length;
  const returnCount = new Set(
    results
      .filter((s) => s.durationMs !== null)
      .map((s) => s.arrival.ringId)
  ).size;

  return {
    batch,
    scored,
    results,
    ranked,
    pending,
    missingRingIds,
    returnCount,
    releasedCount,
    rankedCount: ranked.length,
    returnRate: releasedCount ? returnCount / releasedCount : null,
  };
}

export function analyzeAll(state: LoftState): BatchAnalysis[] {
  return state.batches.map((b) => analyzeBatch(b, state.arrivals));
}

/** 单批排行（名次只在该批内计） */
export function batchRanking(analysis: BatchAnalysis, pigeons: Pigeon[] = []): RankingRow[] {
  const byRing = new Map(pigeons.map((p) => [p.ringId, p]));
  return analysis.ranked.map((s, i) => ({ ...s, rank: i + 1, pigeon: byRing.get(s.arrival.ringId) }));
}

/** 全棚总排行（跨批次，按分速） */
export function overallRanking(analyses: BatchAnalysis[], pigeons: Pigeon[] = []): RankingRow[] {
  const byRing = new Map(pigeons.map((p) => [p.ringId, p]));
  return analyses
    .flatMap((a) => a.ranked)
    .sort((x, y) => (y.speed ?? 0) - (x.speed ?? 0) || x.arrival.ringId.localeCompare(y.arrival.ringId))
    .map((s, i) => ({ ...s, rank: i + 1, pigeon: byRing.get(s.arrival.ringId) }));
}

/** 待核总表（含缺距离/天气、健康异常、时刻问题；重复报时的弃用记录单列展示用） */
export function pendingList(analyses: BatchAnalysis[]): ScoredArrival[] {
  return analyses
    .flatMap((a) => a.scored)
    .filter((s) => s.issues.length > 0)
    .sort((x, y) => (x.endTs ?? Infinity) - (y.endTs ?? Infinity));
}

export interface MissingEntry {
  batch: Batch;
  ringId: string;
}

/** 未归巢名单：已放飞但无任何先到成绩 */
export function missingList(analyses: BatchAnalysis[]): MissingEntry[] {
  return analyses.flatMap((a) =>
    a.missingRingIds.map((ringId) => ({ batch: a.batch, ringId }))
  );
}

/** 鸽棚总览 */
export function buildOverview(state: LoftState, analyses: BatchAnalysis[]): LoftOverview {
  const releasedCount = analyses.reduce((n, a) => n + a.releasedCount, 0);
  const returnCount = analyses.reduce((n, a) => n + a.returnCount, 0);
  const allRanked = analyses.flatMap((a) => a.ranked);
  const avgSpeed = allRanked.length
    ? allRanked.reduce((n, s) => n + (s.speed ?? 0), 0) / allRanked.length
    : null;
  const pendingCount = analyses.reduce((n, a) => n + a.pending.length, 0);
  const missingCount = analyses.reduce((n, a) => n + a.missingRingIds.length, 0);

  const latestResults = analyses
    .flatMap((a) => a.results)
    .filter((s) => s.endTs !== null)
    .sort((x, y) => (y.endTs ?? 0) - (x.endTs ?? 0))
    .slice(0, 8);

  return {
    pigeonCount: state.pigeons.length,
    batchCount: analyses.length,
    releasedCount,
    returnCount,
    returnRate: releasedCount ? returnCount / releasedCount : null,
    avgSpeed,
    missingCount,
    pendingCount,
    latestResults,
  };
}

/** 单羽赛鸽档案：血统、归巢历史、汇总 */
export interface PigeonProfile {
  pigeon: Pigeon;
  history: PigeonHistoryRow[];
  flownCount: number;
  returnCount: number;
  rankedCount: number;
  bestRank: number | null;
  avgSpeed: number | null;
  bestSpeed: number | null;
  mate?: Pigeon;
  /** 当前仍在未归巢名单中的批次 */
  missingBatches: Batch[];
}

export function buildPigeonProfile(
  state: LoftState,
  analyses: BatchAnalysis[],
  ringId: string
): PigeonProfile | null {
  const pigeon = state.pigeons.find((p) => p.ringId === ringId);
  if (!pigeon) return null;

  const rows: PigeonHistoryRow[] = [];
  for (const a of analyses) {
    const mine = a.results.find((s) => s.arrival.ringId === ringId);
    if (mine) {
      const rank = a.ranked.findIndex((s) => s.arrival.id === mine.arrival.id);
      rows.push({ ...mine, rank: rank >= 0 ? rank + 1 : 0, pigeon });
    }
  }
  rows.sort((x, y) => (y.endTs ?? 0) - (x.endTs ?? 0));

  const rankedRows = rows.filter((r) => r.eligible);
  const bestRank = rankedRows.reduce<number | null>(
    (best, r) => (best === null || r.rank < best ? r.rank : best),
    null
  );
  const speeds = rankedRows.map((r) => r.speed).filter((v): v is number => v !== null);
  const missingBatches = analyses
    .filter((a) => a.batch.releasedRingIds.includes(ringId))
    .filter((a) => !a.results.some((s) => s.arrival.ringId === ringId))
    .map((a) => a.batch);

  return {
    pigeon,
    history: rows,
    flownCount: analyses.filter((a) => a.batch.releasedRingIds.includes(ringId)).length,
    returnCount: rows.filter((r) => r.durationMs !== null).length,
    rankedCount: rankedRows.length,
    bestRank,
    avgSpeed: speeds.length ? speeds.reduce((n, v) => n + v, 0) / speeds.length : null,
    bestSpeed: speeds.length ? Math.max(...speeds) : null,
    mate: state.pigeons.find((p) => p.ringId === pigeon.mateRingId),
    missingBatches,
  };
}

/** 按血统筛选历史成绩（血统档案页） */
export function historyByBloodline(
  analyses: BatchAnalysis[],
  pigeons: Pigeon[],
  bloodline: string
): RankingRow[] {
  const byRing = new Map(pigeons.map((p) => [p.ringId, p]));
  return analyses
    .flatMap((a) =>
      a.results.map((s) => {
        const rank = a.ranked.findIndex((r) => r.arrival.id === s.arrival.id);
        return { ...s, rank: rank >= 0 ? rank + 1 : 0, pigeon: byRing.get(s.arrival.ringId) };
      })
    )
    .filter((s) => s.pigeon && (bloodline === "__all__" || s.pigeon.bloodline === bloodline))
    .sort((x, y) => (y.endTs ?? 0) - (x.endTs ?? 0));
}

export const HEALTH_LABEL: Record<HealthStatus, string> = {
  normal: "正常",
  abnormal: "异常",
};

export function pct(v: number | null): string {
  return v === null ? "—" : `${(v * 100).toFixed(1)}%`;
}
