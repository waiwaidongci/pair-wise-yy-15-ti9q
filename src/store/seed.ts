import { dedupeArrivals, reportArrival } from "../domain/rules";
import type {
  ArrivalDraft,
  ArrivalRecord,
  LoftState,
  Pigeon,
  TrainingBatch,
} from "../domain/types";

// 内置示例数据：覆盖跨夜归巢、重复报时、受伤、缺天气、缺距离、未归巢等情形。
function seed(): LoftState {
  const t0 = Date.parse("2026-09-20T08:00:00");

  const pigeons: Pigeon[] = [
    { ring: "CHN-26-001839", bloodline: "詹森系", gender: "雄", pairRing: "CHN-26-003207", createdAt: t0 },
    { ring: "CHN-26-002114", bloodline: "凡龙系", gender: "雌", pairRing: "", createdAt: t0 + 1 },
    { ring: "CHN-25-008771", bloodline: "胡本系", gender: "雄", pairRing: "", createdAt: t0 + 2 },
    { ring: "CHN-26-003207", bloodline: "詹森系", gender: "雌", pairRing: "CHN-26-001839", createdAt: t0 + 3 },
    { ring: "CHN-25-005520", bloodline: "凡龙系", gender: "雄", pairRing: "", createdAt: t0 + 4 },
    { ring: "CHN-26-006612", bloodline: "盖比系", gender: "雌", pairRing: "", createdAt: t0 + 5 },
  ];

  const batches: TrainingBatch[] = [
    {
      id: "batch-1",
      releaseDate: "2026-09-22",
      releaseTime: "06:30",
      location: "新乡",
      distanceKm: 200,
      weather: "晴 北风2级",
      ringNos: [
        "CHN-26-001839",
        "CHN-26-002114",
        "CHN-25-008771",
        "CHN-26-003207",
        "CHN-25-005520",
        "CHN-26-006612",
      ],
      createdAt: t0 + 10,
    },
    {
      id: "batch-2",
      releaseDate: "2026-09-15",
      releaseTime: "07:00",
      location: "郑州",
      distanceKm: 60,
      weather: "多云",
      ringNos: [
        "CHN-26-001839",
        "CHN-26-002114",
        "CHN-25-008771",
        "CHN-26-003207",
      ],
      createdAt: t0 + 9,
    },
    {
      id: "batch-3",
      releaseDate: "2026-09-08",
      releaseTime: "07:20",
      location: "原阳",
      distanceKm: null, // 距离待补：整批已归巢记录先进待核
      weather: "晴",
      ringNos: ["CHN-26-001839", "CHN-26-002114", "CHN-25-008771"],
      createdAt: t0 + 8,
    },
  ];

  // 用规则函数逐条入库，保证同羽同批只留一条先到记录
  let arrivals: ArrivalRecord[] = [];
  const put = (draft: ArrivalDraft, at: number, dup = false) => {
    const r = reportArrival(arrivals, draft, at);
    arrivals = r.arrivals;
    if (dup && !r.dropped) {
      // 演示数据自身不应触发
      console.warn("seed duplicate not deduped", draft);
    }
  };

  // 批次1：200km，跨夜鸽 + 受伤鸽 + 缺天气不适用（本批有天气）+ 未归巢
  put(
    { batchId: "batch-1", ring: "CHN-26-001839", returnDate: "2026-09-22", returnTime: "09:11", health: "正常" },
    t0 + 100,
  );
  put(
    { batchId: "batch-1", ring: "CHN-26-002114", returnDate: "2026-09-22", returnTime: "09:40", health: "正常" },
    t0 + 101,
  );
  // 凌晨归巢：跨夜按真实先后，用时 18h16m，而非“早于放飞”
  put(
    { batchId: "batch-1", ring: "CHN-25-008771", returnDate: "2026-09-23", returnTime: "00:46", health: "正常" },
    t0 + 102,
  );
  // 受伤：已归巢但只进待核，不占排行
  put(
    { batchId: "batch-1", ring: "CHN-26-003207", returnDate: "2026-09-22", returnTime: "11:05", health: "受伤" },
    t0 + 103,
  );
  // 未填健康：待核
  put(
    { batchId: "batch-1", ring: "CHN-25-005520", returnDate: "2026-09-22", returnTime: "10:22", health: "" },
    t0 + 104,
  );
  // CHN-26-006612 未归巢

  // 对 001839 重复报时（更晚）：沿用先到记录
  put(
    { batchId: "batch-1", ring: "CHN-26-001839", returnDate: "2026-09-22", returnTime: "09:48", health: "正常" },
    t0 + 105,
    true,
  );

  // 批次2：60km
  put(
    { batchId: "batch-2", ring: "CHN-26-001839", returnDate: "2026-09-15", returnTime: "07:58", health: "正常" },
    t0 + 90,
  );
  put(
    { batchId: "batch-2", ring: "CHN-26-003207", returnDate: "2026-09-15", returnTime: "08:05", health: "正常" },
    t0 + 91,
  );
  put(
    { batchId: "batch-2", ring: "CHN-26-002114", returnDate: "2026-09-15", returnTime: "08:26", health: "疲惫" },
    t0 + 92,
  ); // 健康异常待核
  put(
    { batchId: "batch-2", ring: "CHN-25-008771", returnDate: "2026-09-15", returnTime: "08:12", health: "正常" },
    t0 + 93,
  );

  // 批次3：缺距离，全部待核
  put(
    { batchId: "batch-3", ring: "CHN-26-001839", returnDate: "2026-09-08", returnTime: "08:21", health: "正常" },
    t0 + 80,
  );
  put(
    { batchId: "batch-3", ring: "CHN-26-002114", returnDate: "2026-09-08", returnTime: "08:30", health: "正常" },
    t0 + 81,
  );
  put(
    { batchId: "batch-3", ring: "CHN-25-008771", returnDate: "2026-09-08", returnTime: "08:40", health: "正常" },
    t0 + 82,
  );

  return { pigeons, batches, arrivals };
}

const STORAGE_KEY = "hxyfront-62014-loft-v1";

/** 读取存档；损坏或缺失时回到内置示例 */
export function loadState(): LoftState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<LoftState>;
    const state: LoftState = {
      pigeons: Array.isArray(parsed.pigeons) ? parsed.pigeons : [],
      batches: Array.isArray(parsed.batches) ? parsed.batches : [],
      arrivals: Array.isArray(parsed.arrivals) ? parsed.arrivals : [],
    };
    return normalize(state);
  } catch {
    return seed();
  }
}

export function saveState(state: LoftState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储失败（隐私模式等）不影响内存中的使用
  }
}

export function resetState(): LoftState {
  const fresh = seed();
  saveState(fresh);
  return fresh;
}

/** 规范化：去空白足环、按键去重归巢记录（沿用先到）、剔除悬挂引用 */
export function normalize(state: LoftState): LoftState {
  const pigeons = state.pigeons.map((p) => ({
    ...p,
    ring: p.ring.trim(),
    bloodline: p.bloodline.trim(),
    pairRing: p.pairRing.trim(),
  }));

  const batches = state.batches.map((b) => ({
    ...b,
    location: b.location.trim(),
    weather: (b.weather ?? "").trim(),
    ringNos: Array.from(new Set(b.ringNos.map((r) => r.trim()).filter(Boolean))),
  }));
  const batchIds = new Set(batches.map((b) => b.id));

  // 剔除已删除批次的悬挂记录；同羽同批只留一条先到（与存储顺序无关）
  const arrivals = dedupeArrivals(
    state.arrivals
      .filter((a) => batchIds.has(a.batchId))
      .map((a) => ({
        ...a,
        ring: (a.ring ?? "").trim(),
        returnDate: a.returnDate ?? "",
        returnTime: a.returnTime ?? "00:00",
        health: a.health ?? "",
        createdAt: a.createdAt ?? Date.now(),
      }))
      .filter((a) => a.ring !== "" && a.returnDate !== ""),
  );

  return { pigeons, batches, arrivals };
}
