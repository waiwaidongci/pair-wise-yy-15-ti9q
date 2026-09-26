// 规则层冒烟测试：npx esbuild tests/smoke.ts | node
import { analyzeBatch } from "../src/domain/rules";
import type { Arrival, Batch, LoftState } from "../src/domain/types";
import { analyzeAll, buildOverview, buildPigeonProfile, missingList, pendingList } from "../src/domain/rules";
import { SEED } from "../src/data/seed";

let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name} ${extra}`);
  }
}

// 1) 跨夜：傍晚放飞、次日凌晨归巢，用时必须大于零
const overnight = analyzeBatch(
  {
    id: "b1",
    name: "跨夜",
    releaseDate: "2026-09-19",
    releaseTime: "18:30",
    location: "X",
    distanceKm: 320,
    weather: "晴",
    releasedRingIds: ["P1"],
  },
  [{ id: "a1", batchId: "b1", ringId: "P1", arrivalDate: "2026-09-20", arrivalTime: "02:35", health: "normal", note: "", reportedAt: 1 }]
);
check("跨夜归巢不被判为早于放飞", overnight.ranked.length === 1);
check("跨夜用时 8:05:00", overnight.ranked[0] && overnight.ranked[0].durationMs === (8 * 3600 + 5 * 60) * 1000);

// 2) 旧 bug 复现：归巢日期填成放飞当天且时刻早于放飞 -> 待核，不计归巢
const badTime = analyzeBatch(
  {
    id: "b2",
    name: "时刻错误",
    releaseDate: "2026-09-25",
    releaseTime: "07:30",
    location: "X",
    distanceKm: 120,
    weather: "晴",
    releasedRingIds: ["P1"],
  },
  [{ id: "a2", batchId: "b2", ringId: "P1", arrivalDate: "2026-09-25", arrivalTime: "07:10", health: "normal", note: "", reportedAt: 1 }]
);
check("归巢早于放飞：不占排行", badTime.ranked.length === 0);
check("归巢早于放飞：进待核", badTime.pending[0]?.issues.includes("timeBeforeRelease") === true);
check("归巢早于放飞：不计归巢数", badTime.returnCount === 0);
check("归巢早于放飞：仍在未归巢名单", badTime.missingRingIds.includes("P1"));

// 3) 同羽同批重复报时，沿用先到
const dup = analyzeBatch(
  {
    id: "b3",
    name: "重复",
    releaseDate: "2026-09-12",
    releaseTime: "07:00",
    location: "X",
    distanceKm: 80,
    weather: "晴",
    releasedRingIds: ["P1"],
  },
  [
    { id: "d2", batchId: "b3", ringId: "P1", arrivalDate: "2026-09-12", arrivalTime: "08:20", health: "normal", note: "后报", reportedAt: 2 },
    { id: "d1", batchId: "b3", ringId: "P1", arrivalDate: "2026-09-12", arrivalTime: "08:05", health: "normal", note: "先到", reportedAt: 1 },
  ]
);
check("同羽同批只有一条有效成绩", dup.results.length === 1);
check("沿用真实时刻最早的记录", dup.results[0].arrival.id === "d1");
check("重复的一条标记为 duplicateReport", dup.scored.find((s) => s.arrival.id === "d2")?.isDuplicate === true);
check("重复报时不占排行", dup.ranked.length === 1);

// 4) 缺距离 / 缺天气 / 健康异常：只进待核
const qualified: Batch = {
  id: "b4",
  name: "资格",
  releaseDate: "2026-09-12",
  releaseTime: "07:00",
  location: "X",
  distanceKm: 80,
  weather: "晴",
  releasedRingIds: ["P1", "P2", "P3"],
};
const arrivals4: Arrival[] = [
  { id: "q1", batchId: "b4", ringId: "P1", arrivalDate: "2026-09-12", arrivalTime: "08:00", health: "normal", note: "", reportedAt: 1 },
  { id: "q2", batchId: "b4", ringId: "P2", arrivalDate: "2026-09-12", arrivalTime: "08:10", health: "abnormal", note: "伤", reportedAt: 2 },
  { id: "q3", batchId: "b4", ringId: "P3", arrivalDate: "2026-09-12", arrivalTime: "08:20", health: "normal", note: "", reportedAt: 3 },
];
const noDistanceBatch: Batch = { ...qualified, distanceKm: null };
const missingDist = analyzeBatch(noDistanceBatch, arrivals4);
check("缺距离：全员不占排行", missingDist.ranked.length === 0);
check("缺距离：全部进待核", missingDist.pending.length === 3);
const noWeather = analyzeBatch({ ...qualified, weather: "" }, arrivals4);
check("缺天气：全员不占排行", noWeather.ranked.length === 0);
const health = analyzeBatch(qualified, arrivals4);
check("健康异常不占排行，其余正常上榜", health.ranked.length === 2 && health.pending.length === 1);
check("健康异常原因正确", health.pending[0].issues.includes("healthAbnormal"));

// 5) 未归巢 + 补录后移出（模拟补录：重建 state）
const before = analyzeAll(SEED);
const seedMissing = missingList(before);
check("种子数据未归巢名单非空", seedMissing.length > 0);
const afterState: LoftState = {
  ...SEED,
  arrivals: [
    ...SEED.arrivals,
    // 给第二站未归的 CHN-23-009980 补录次日归巢
    { id: "fix-1", batchId: "b-20260919-puyang", ringId: "CHN-23-009980", arrivalDate: "2026-09-20", arrivalTime: "09:00", health: "normal", note: "补录", reportedAt: 99 },
  ],
};
const after = analyzeAll(afterState);
const afterMissing = missingList(after);
const stillMissing = afterMissing.filter((m) => m.batch.id === "b-20260919-puyang");
check(
  "补录后从未归巢名单移出",
  !afterMissing.some((m) => m.batch.id === "b-20260919-puyang" && m.ringId === "CHN-23-009980") &&
    afterMissing.length === seedMissing.length - 1 &&
    stillMissing.length === 1 &&
    stillMissing[0].ringId === "CHN-24-010326"
);

// 6) 总览与血统档案可正常计算
const ov = buildOverview(SEED, before);
check("总览指标可计算", ov.batchCount === 3 && ov.returnCount > 0 && ov.avgSpeed !== null);
const pf = buildPigeonProfile(SEED, before, "CHN-24-001839");
check("单羽档案有历史成绩", !!pf && pf.history.length === 3);
check("重复报时不进入单羽历史", !!pf && pf.history.filter((h) => h.batch.id === "b-20260912-fengqiu").length === 1);

// 7) 第三站缺距离缺天气：5 条有效先到全部待核，且 07:10 那条计未归
const b3Analysis = before.find((a) => a.batch.id === "b-20260925-lankao")!;
check("缺资料批次 0 上榜", b3Analysis.rankedCount === 0);
check("缺资料批次待核 6 条（含早于放飞）", b3Analysis.pending.length === 6);
check("早于放飞者计入未归", b3Analysis.missingRingIds.includes("CHN-25-007720") && b3Analysis.missingRingIds.length === 2);
check("待核总表非空", pendingList(before).length > 0);

console.log(failed === 0 ? "\nALL PASSED" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
