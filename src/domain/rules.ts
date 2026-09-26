// 训放规则（纯函数，不依赖 React / 存储）：
// 跨夜用时、有效成绩判定、同羽同批去重、排行 / 未归巢 / 待核 / 总览 / 血统档案重算。

import type {
  ArrivalDraft,
  ArrivalRecord,
  HealthStatus,
  LoftState,
  Pigeon,
  TrainingBatch,
} from "./types";

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/* ---------------- 时间：跨夜按真实先后 ---------------- */

/** 日期 + 时刻 -> 毫秒时间戳（按本地时间拼装） */
export function toMillis(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  return new Date(
    (y || 1970),
    (m || 1) - 1,
    d || 1,
    hh || 0,
    mm || 0,
    0,
    0,
  ).getTime();
}

/**
 * 归巢相对放飞的用时（毫秒）。
 * 归巢日期、时刻独立登记；跨夜归巢（次日凌晨）时，
 * 只要时间戳晚于放飞就自动算出跨夜用时，不会被判成“早于放飞”。
 * 若早于放飞时间戳，返回 null（时间矛盾，进待核）。
 */
export function elapsedMillis(
  batch: Pick<TrainingBatch, "releaseDate" | "releaseTime">,
  arrival: Pick<ArrivalRecord, "returnDate" | "returnTime">,
): number | null {
  const start = toMillis(batch.releaseDate, batch.releaseTime);
  const end = toMillis(arrival.returnDate, arrival.returnTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  return end - start;
}

export function isOvernight(
  batch: Pick<TrainingBatch, "releaseDate">,
  arrival: Pick<ArrivalRecord, "returnDate">,
): boolean {
  return arrival.returnDate !== batch.releaseDate;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "时间矛盾";
  const total = Math.round(ms / 60000);
  const days = Math.floor(total / (60 * 24));
  const hours = Math.floor((total % (60 * 24)) / 60);
  const mins = total % 60;
  if (days > 0) return `${days}天${hours}小时${mins}分`;
  if (hours > 0) return `${hours}小时${mins}分`;
  return `${mins}分`;
}

export function formatSpeed(mpm: number | null): string {
  if (mpm === null) return "—";
  return `${mpm.toLocaleString("zh-CN", { maximumFractionDigits: 1 })} m/min`;
}

/* ---------------- 有效成绩 / 待核 ---------------- */

export type RowStatus = "valid" | "pending";

export interface ArrivalIssue {
  status: RowStatus;
  reasons: string[];
}

/**
 * 一条归巢记录是否可占排行：
 * 1) 批次距离已登记且 > 0
 * 2) 批次天气已填
 * 3) 健康为“正常”（未填 / 受伤 / 生病 / 疲惫都只进待核）
 * 4) 归巢时间不早于放飞（跨夜用真实时间戳判断）
 */
export function checkArrival(
  batch: TrainingBatch | undefined,
  arrival: Pick<ArrivalRecord, "returnDate" | "returnTime" | "health">,
): ArrivalIssue {
  const reasons: string[] = [];
  if (!batch) {
    reasons.push("所属批次不存在");
    return { status: "pending", reasons };
  }
  if (batch.distanceKm === null || !(batch.distanceKm > 0)) {
    reasons.push("批次缺距离");
  }
  if (!batch.weather.trim()) {
    reasons.push("批次缺天气");
  }
  if (arrival.health !== "正常") {
    reasons.push(arrival.health === "" ? "健康未登记" : `健康异常（${arrival.health}）`);
  }
  if (elapsedMillis(batch, arrival) === null) {
    reasons.push("归巢早于放飞");
  }
  return { status: reasons.length ? "pending" : "valid", reasons };
}

/* ---------------- 同羽同批只留一条有效成绩：先到为准 ---------------- */

/** 同羽同批的成绩键 */
export function arrivalKey(batchId: string, ring: string): string {
  return `${batchId}__${ring}`;
}

function arriveAt(a: ArrivalRecord): number {
  return toMillis(a.returnDate, a.returnTime);
}

/**
 * 同一足环在同一批次只保留一条记录：
 * 重复报时沿用“先到”记录（归巢时间更早者）；
 * 时间完全相同则沿用早先录入的一条。
 * 返回需要保留的记录（undefined 表示新报时被丢弃）。
 */
export function pickKeptArrival(
  existing: ArrivalRecord | undefined,
  incoming: ArrivalDraft & { createdAt?: number },
): ArrivalRecord | undefined {
  if (!existing) return undefined;
  const t1 = arriveAt(existing);
  const t2 = toMillis(incoming.returnDate, incoming.returnTime);
  if (t2 < t1) return undefined;
  if (t2 === t1 && (incoming.createdAt ?? Date.now()) < existing.createdAt) {
    return undefined;
  }
  return existing;
}

/**
 * 与存储顺序无关地按同羽同批去重：保留归巢时刻最早的一条，
 * 时刻相同则保留录入时间（createdAt）更早的一条。
 * 用于清洗外部写入或旧版遗留的脏存档。
 */
export function dedupeArrivals(arrivals: ArrivalRecord[]): ArrivalRecord[] {
  const kept = new Map<string, ArrivalRecord>();
  for (const a of arrivals) {
    const key = arrivalKey(a.batchId, a.ring);
    const cur = kept.get(key);
    if (!cur) {
      kept.set(key, a);
      continue;
    }
    const ta = arriveAt(a);
    const tc = arriveAt(cur);
    if (ta < tc || (ta === tc && a.createdAt < cur.createdAt)) {
      kept.set(key, a);
    }
  }
  return [...kept.values()];
}

/**
 * 报时入库。返回 { arrivals, kept, dropped }：
 * 同羽同批已存在记录时一律沿用先到记录（重复报时不改库）：
 * - dropped=true：本次报时被丢弃，kept 为库中原记录；
 *   incomingEarlier=true 时说明新报时反而更早，属更正场景，
 *   页面应提示去“更正成绩”而不是被重复报时悄悄替换。
 * - 首次报时：新增一条记录。
 */
export function reportArrival(
  arrivals: ArrivalRecord[],
  draft: ArrivalDraft,
  now: number = Date.now(),
): {
  arrivals: ArrivalRecord[];
  kept: ArrivalRecord;
  dropped: boolean;
  incomingEarlier: boolean;
} {
  const existing = arrivals.find(
    (a) => arrivalKey(a.batchId, a.ring) === arrivalKey(draft.batchId, draft.ring),
  );
  if (existing) {
    const incomingEarlier =
      toMillis(draft.returnDate, draft.returnTime) < arriveAt(existing);
    return { arrivals, kept: existing, dropped: true, incomingEarlier };
  }
  const record: ArrivalRecord = { ...draft, id: uid("arr"), createdAt: now };
  return {
    arrivals: [...arrivals, record],
    kept: record,
    dropped: false,
    incomingEarlier: false,
  };
}

/* ---------------- 排行 / 批次视图（成绩更正后整体重算） ---------------- */

export interface BatchArrivalRow {
  arrival: ArrivalRecord;
  ring: string;
  bloodline: string;
  status: RowStatus;
  reasons: string[];
  elapsedMs: number | null;
  /** 分速 米/分；缺距离或时间矛盾时为 null */
  speedMpm: number | null;
  overnight: boolean;
  /** 有效成绩内的名次；待核不占排行 */
  rank: number | null;
}

export interface BatchView {
  batch: TrainingBatch;
  rows: BatchArrivalRow[];
  validRows: BatchArrivalRow[];
  pendingRows: BatchArrivalRow[];
  /** 未归巢：在放飞名单中但尚无任何归巢记录的足环 */
  missingRings: string[];
  releasedCount: number;
  homeCount: number;
  homeRate: number;
  avgSpeedMpm: number | null;
}

export function getBatch(state: LoftState, batchId: string): TrainingBatch | undefined {
  return state.batches.find((b) => b.id === batchId);
}

export function buildBatchView(state: LoftState, batchId: string): BatchView | null {
  const batch = getBatch(state, batchId);
  if (!batch) return null;
  const bloodlineOf = (ring: string) =>
    state.pigeons.find((p) => p.ring === ring)?.bloodline ?? "未建档";

  const rows: BatchArrivalRow[] = state.arrivals
    .filter((a) => a.batchId === batchId)
    .map((arrival) => {
      const issue = checkArrival(batch, arrival);
      const elapsedMs = elapsedMillis(batch, arrival);
      const speedMpm =
        issue.status === "valid" &&
        batch.distanceKm !== null &&
        elapsedMs !== null &&
        elapsedMs > 0
          ? (batch.distanceKm * 1000) / (elapsedMs / 60000)
          : null;
      return {
        arrival,
        ring: arrival.ring,
        bloodline: bloodlineOf(arrival.ring),
        status: issue.status,
        reasons: issue.reasons,
        elapsedMs,
        speedMpm,
        overnight: isOvernight(batch, arrival),
        rank: null,
      };
    });

  // 排行只看有效成绩：先到在前；同时到按录入先后
  const validRows = rows
    .filter((r) => r.status === "valid")
    .sort(
      (a, b) =>
        (a.elapsedMs ?? 0) - (b.elapsedMs ?? 0) ||
        a.arrival.createdAt - b.arrival.createdAt,
    );
  validRows.forEach((r, i) => {
    r.rank = i + 1;
  });

  const pendingRows = rows
    .filter((r) => r.status === "pending")
    .sort(
      (a, b) =>
        toMillis(a.arrival.returnDate, a.arrival.returnTime) -
          toMillis(b.arrival.returnDate, b.arrival.returnTime) ||
        a.arrival.createdAt - b.arrival.createdAt,
    );

  const arrivedRings = new Set(rows.map((r) => r.ring));
  const missingRings = batch.ringNos
    .filter((ring) => !arrivedRings.has(ring))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

  const releasedCount = new Set(batch.ringNos).size;
  const homeCount = new Set(
    rows.filter((r) => r.status === "valid").map((r) => r.ring),
  ).size;
  const homeRate = releasedCount ? homeCount / releasedCount : 0;
  const speeds = validRows
    .map((r) => r.speedMpm)
    .filter((s): s is number => s !== null);
  const avgSpeedMpm = speeds.length
    ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
    : null;

  return {
    batch,
    rows,
    validRows,
    pendingRows,
    missingRings,
    releasedCount,
    homeCount,
    homeRate,
    avgSpeedMpm,
  };
}

export function buildBatchViews(state: LoftState): BatchView[] {
  return state.batches
    .map((b) => buildBatchView(state, b.id))
    .filter((v): v is BatchView => v !== null)
    .sort(
      (a, b) =>
        toMillis(b.batch.releaseDate, b.batch.releaseTime) -
        toMillis(a.batch.releaseDate, a.batch.releaseTime),
    );
}

/* ---------------- 未归巢名单（补录后自动移出） ---------------- */

export interface MissingEntry {
  batchId: string;
  batch: TrainingBatch;
  ring: string;
  bloodline: string;
}

export function listMissing(state: LoftState): MissingEntry[] {
  return buildBatchViews(state).flatMap((v) =>
    v.missingRings.map((ring) => ({
      batchId: v.batch.id,
      batch: v.batch,
      ring,
      bloodline:
        state.pigeons.find((p) => p.ring === ring)?.bloodline ?? "未建档",
    })),
  );
}

/* ---------------- 待核队列 ---------------- */

export interface PendingEntry {
  view: BatchView;
  row: BatchArrivalRow;
}

export function listPending(state: LoftState): PendingEntry[] {
  return buildBatchViews(state).flatMap((view) =>
    view.pendingRows.map((row) => ({ view, row })),
  );
}

/* ---------------- 鸽棚总览 ---------------- */

export interface LoftOverview {
  pigeonCount: number;
  batchCount: number;
  releasedCount: number;
  homeCount: number;
  homeRate: number;
  missingCount: number;
  pendingCount: number;
  avgSpeedMpm: number | null;
}

export function buildOverview(state: LoftState): LoftOverview {
  const views = buildBatchViews(state);
  const released = views.reduce((s, v) => s + v.releasedCount, 0);
  const home = views.reduce((s, v) => s + v.homeCount, 0);
  const speeds = views.flatMap((v) =>
    v.validRows.map((r) => r.speedMpm).filter((s): s is number => s !== null),
  );
  return {
    pigeonCount: state.pigeons.length,
    batchCount: state.batches.length,
    releasedCount: released,
    homeCount: home,
    homeRate: released ? home / released : 0,
    missingCount: views.reduce((s, v) => s + v.missingRings.length, 0),
    pendingCount: views.reduce((s, v) => s + v.pendingRows.length, 0),
    avgSpeedMpm: speeds.length
      ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
      : null,
  };
}

/* ---------------- 单羽档案 / 血统统计（全部由成绩重算） ---------------- */

export interface HistoryEntry {
  batch: TrainingBatch;
  row: BatchArrivalRow;
}

export interface PigeonProfile {
  pigeon: Pigeon | undefined;
  ring: string;
  bloodline: string;
  history: HistoryEntry[];
  validHistory: HistoryEntry[];
  bestSpeedMpm: number | null;
  bestEntry: HistoryEntry | null;
  validCount: number;
  pendingCount: number;
  missingBatches: TrainingBatch[];
}

export function buildPigeonProfile(state: LoftState, ring: string): PigeonProfile {
  const pigeon = state.pigeons.find((p) => p.ring === ring);
  const views = buildBatchViews(state);
  const history: HistoryEntry[] = views
    .flatMap((view) =>
      view.rows
        .filter((r) => r.ring === ring)
        .map((row) => ({ batch: view.batch, row })),
    )
    .sort(
      (a, b) =>
        toMillis(b.batch.releaseDate, b.batch.releaseTime) -
        toMillis(a.batch.releaseDate, a.batch.releaseTime),
    );
  const validHistory = history.filter((h) => h.row.status === "valid");
  let bestEntry: HistoryEntry | null = null;
  for (const h of validHistory) {
    if (
      h.row.speedMpm !== null &&
      (bestEntry === null ||
        (bestEntry.row.speedMpm ?? -1) < (h.row.speedMpm ?? -1))
    ) {
      bestEntry = h;
    }
  }
  const arrivedBatchIds = new Set(history.map((h) => h.batch.id));
  const missingBatches = views
    .filter(
      (v) =>
        v.batch.ringNos.includes(ring) && !arrivedBatchIds.has(v.batch.id),
    )
    .map((v) => v.batch);

  return {
    pigeon,
    ring,
    bloodline: pigeon?.bloodline ?? "未建档",
    history,
    validHistory,
    bestSpeedMpm: bestEntry?.row.speedMpm ?? null,
    bestEntry,
    validCount: validHistory.length,
    pendingCount: history.length - validHistory.length,
    missingBatches,
  };
}

export interface BloodlineStat {
  bloodline: string;
  pigeonCount: number;
  validCount: number;
  pendingCount: number;
  bestSpeedMpm: number | null;
  bestEntry: HistoryEntry | null;
  avgSpeedMpm: number | null;
}

export function summarizeByBloodline(state: LoftState): BloodlineStat[] {
  const bloodlines = new Set<string>(state.pigeons.map((p) => p.bloodline));
  const stats = [...bloodlines]
    .filter((b) => b.trim() !== "")
    .map((bloodline): BloodlineStat => {
      const pigeons = state.pigeons.filter((p) => p.bloodline === bloodline);
      const rings = new Set(pigeons.map((p) => p.ring));
      const entries = buildBatchViews(state).flatMap((view) =>
        view.rows
          .filter((r) => rings.has(r.ring))
          .map((row) => ({ batch: view.batch, row })),
      );
      const valid = entries.filter((e) => e.row.status === "valid");
      const speeds = valid
        .map((e) => e.row.speedMpm)
        .filter((s): s is number => s !== null);
      let bestEntry: HistoryEntry | null = null;
      for (const e of valid) {
        if (
          e.row.speedMpm !== null &&
          (bestEntry === null ||
            (bestEntry.row.speedMpm ?? -1) < (e.row.speedMpm ?? -1))
        ) {
          bestEntry = e;
        }
      }
      return {
        bloodline,
        pigeonCount: pigeons.length,
        validCount: valid.length,
        pendingCount: entries.length - valid.length,
        bestSpeedMpm: bestEntry?.row.speedMpm ?? null,
        bestEntry,
        avgSpeedMpm: speeds.length
          ? speeds.reduce((s, x) => s + x, 0) / speeds.length
          : null,
      };
    });
  return stats.sort(
    (a, b) =>
      (b.bestSpeedMpm ?? -1) - (a.bestSpeedMpm ?? -1) ||
      b.validCount - a.validCount,
  );
}

/** 按血统筛选某一羽（或某血统全部）的历史成绩 */
export function historyByBloodline(
  state: LoftState,
  bloodline: string,
): { ring: string; profile: PigeonProfile }[] {
  return state.pigeons
    .filter((p) => p.bloodline === bloodline)
    .map((p) => ({ ring: p.ring, profile: buildPigeonProfile(state, p.ring) }))
    .sort((a, b) => (b.profile.bestSpeedMpm ?? -1) - (a.profile.bestSpeedMpm ?? -1));
}

/* ---------------- 校验辅助 ---------------- */

export function emptyDraft(batch: TrainingBatch, ring?: string): ArrivalDraft {
  // 默认按放飞日期同一天预填；凌晨归巢时用户改成次日即可，跨夜用时自动算
  return {
    batchId: batch.id,
    ring: ring ?? batch.ringNos[0] ?? "",
    returnDate: batch.releaseDate,
    returnTime: batch.releaseTime,
    health: "正常",
  };
}

export function healthLabel(h: HealthStatus): string {
  return h === "" ? "未登记" : h;
}
