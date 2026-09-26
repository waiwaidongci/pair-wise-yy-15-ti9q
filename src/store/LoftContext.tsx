import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildBatchView,
  buildBatchViews,
  buildOverview,
  buildPigeonProfile,
  checkArrival,
  historyByBloodline,
  listMissing,
  listPending,
  reportArrival,
  summarizeByBloodline,
  uid,
} from "../domain/rules";
import type {
  ArrivalDraft,
  ArrivalRecord,
  Gender,
  LoftState,
  Pigeon,
  TrainingBatch,
} from "../domain/types";
import { loadState, normalize, resetState, saveState } from "./seed";

export interface Notice {
  id: string;
  kind: "ok" | "warn" | "info";
  text: string;
}

export interface BatchDraft {
  releaseDate: string;
  releaseTime: string;
  location: string;
  distanceKm: string; // 表单内用字符串，允许留空（缺距离 -> 待核）
  weather: string;
  ringNos: string[];
}

interface LoftContextValue {
  state: LoftState;
  notices: Notice[];
  notify: (kind: Notice["kind"], text: string) => void;
  dismissNotice: (id: string) => void;

  // 赛鸽档案
  addPigeon: (data: Omit<Pigeon, "createdAt">) => void;
  updatePigeon: (ring: string, data: Partial<Omit<Pigeon, "ring">>) => void;
  removePigeon: (ring: string) => void;

  // 训放批次
  addBatch: (draft: BatchDraft) => string;
  updateBatch: (id: string, data: Partial<TrainingBatch>) => void;
  removeBatch: (id: string) => void;
  toggleBatchPigeon: (batchId: string, ring: string) => void;

  // 归巢登记
  report: (draft: ArrivalDraft) => void;
  correctArrival: (id: string, data: Partial<ArrivalDraft>) => void;
  deleteArrival: (id: string) => void;

  resetAll: () => void;

  // 选择器：每次状态变更后由规则层重算
  views: ReturnType<typeof buildBatchViews>;
  view: (id: string) => ReturnType<typeof buildBatchView>;
  overview: ReturnType<typeof buildOverview>;
  missing: ReturnType<typeof listMissing>;
  pending: ReturnType<typeof listPending>;
  profile: (ring: string) => ReturnType<typeof buildPigeonProfile>;
  bloodlineStats: ReturnType<typeof summarizeByBloodline>;
  bloodlineHistory: (bloodline: string) => ReturnType<typeof historyByBloodline>;
  precheckArrival: (
    batch: TrainingBatch,
    draft: ArrivalDraft,
  ) => ReturnType<typeof checkArrival>;
}

const LoftContext = createContext<LoftContextValue | null>(null);

function todayDate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function emptyBatchDraft(): BatchDraft {
  return {
    releaseDate: todayDate(),
    releaseTime: "07:00",
    location: "",
    distanceKm: "",
    weather: "",
    ringNos: [],
  };
}

export function LoftProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoftState>(() => normalize(loadState()));
  const [notices, setNotices] = useState<Notice[]>([]);

  const commit = useCallback((next: LoftState) => {
    const clean = normalize(next);
    setState(clean);
    saveState(clean);
  }, []);

  const notify = useCallback((kind: Notice["kind"], text: string) => {
    const id = uid("note");
    setNotices((prev) => [...prev.slice(-3), { id, kind, text }]);
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((n) => n.id !== id));
    }, 4200);
  }, []);

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /* ---------------- 赛鸽 ---------------- */

  const addPigeon = useCallback(
    (data: Omit<Pigeon, "createdAt">) => {
      const ring = data.ring.trim();
      if (!ring) {
        notify("warn", "足环号不能为空");
        return;
      }
      if (state.pigeons.some((p) => p.ring === ring)) {
        notify("warn", `足环 ${ring} 已建档`);
        return;
      }
      commit({
        ...state,
        pigeons: [
          ...state.pigeons,
          {
            ring,
            bloodline: data.bloodline.trim(),
            gender: data.gender as Gender,
            pairRing: data.pairRing.trim(),
            createdAt: Date.now(),
          },
        ],
      });
      notify("ok", `已建档 ${ring}`);
    },
    [state, commit, notify],
  );

  const updatePigeon = useCallback(
    (ring: string, data: Partial<Omit<Pigeon, "ring">>) => {
      commit({
        ...state,
        pigeons: state.pigeons.map((p) =>
          p.ring === ring
            ? {
                ...p,
                bloodline: data.bloodline?.trim() ?? p.bloodline,
                gender: (data.gender ?? p.gender) as Gender,
                pairRing: data.pairRing?.trim() ?? p.pairRing,
              }
            : p,
        ),
      });
      notify("ok", "血统档案已更正，排行与总览已重算");
    },
    [state, commit, notify],
  );

  const removePigeon = useCallback(
    (ring: string) => {
      commit({
        ...state,
        pigeons: state.pigeons.filter((p) => p.ring !== ring),
        batches: state.batches.map((b) => ({
          ...b,
          ringNos: b.ringNos.filter((r) => r !== ring),
        })),
        arrivals: state.arrivals.filter((a) => a.ring !== ring),
      });
      notify("info", `已删除 ${ring} 及其全部成绩`);
    },
    [state, commit, notify],
  );

  /* ---------------- 批次 ---------------- */

  const addBatch = useCallback(
    (draft: BatchDraft): string => {
      if (!draft.location.trim()) {
        notify("warn", "请填写放飞地点");
        return "";
      }
      if (!draft.releaseDate) {
        notify("warn", "请选择放飞日期");
        return "";
      }
      const id = uid("batch");
      const batch: TrainingBatch = {
        id,
        releaseDate: draft.releaseDate,
        releaseTime: draft.releaseTime || "00:00",
        location: draft.location.trim(),
        distanceKm: draft.distanceKm.trim() === ""
          ? null
          : Number(draft.distanceKm),
        weather: draft.weather.trim(),
        ringNos: Array.from(new Set(draft.ringNos)),
        createdAt: Date.now(),
      };
      commit({ ...state, batches: [...state.batches, batch] });
      notify(
        "ok",
        `已登记训放批次「${batch.location}」` +
          (batch.distanceKm === null ? "（缺距离，归巢记录先进待核）" : "") +
          (batch.weather === "" ? "（缺天气，归巢记录先进待核）" : ""),
      );
      return id;
    },
    [state, commit, notify],
  );

  const updateBatch = useCallback(
    (id: string, data: Partial<TrainingBatch>) => {
      commit({
        ...state,
        batches: state.batches.map((b) =>
          b.id === id
            ? {
                ...b,
                ...data,
                distanceKm:
                  data.distanceKm === undefined
                    ? b.distanceKm
                    : data.distanceKm,
              }
            : b,
        ),
      });
      notify("ok", "批次信息已更正，排行、总览与血统档案已重算");
    },
    [state, commit, notify],
  );

  const removeBatch = useCallback(
    (id: string) => {
      commit({
        ...state,
        batches: state.batches.filter((b) => b.id !== id),
        arrivals: state.arrivals.filter((a) => a.batchId !== id),
      });
      notify("info", "批次及其归巢记录已删除");
    },
    [state, commit, notify],
  );

  const toggleBatchPigeon = useCallback(
    (batchId: string, ring: string) => {
      commit({
        ...state,
        batches: state.batches.map((b) => {
          if (b.id !== batchId) return b;
          const has = b.ringNos.includes(ring);
          return {
            ...b,
            ringNos: has
              ? b.ringNos.filter((r) => r !== ring)
              : [...b.ringNos, ring],
          };
        }),
      });
    },
    [state, commit],
  );

  /* ---------------- 归巢 ---------------- */

  const report = useCallback(
    (draft: ArrivalDraft) => {
      const batch = state.batches.find((b) => b.id === draft.batchId);
      if (!batch) {
        notify("warn", "批次不存在");
        return;
      }
      if (!draft.ring.trim()) {
        notify("warn", "请选择足环号");
        return;
      }
      if (!draft.returnDate || !draft.returnTime) {
        notify("warn", "请填写归巢日期与时刻");
        return;
      }
      const result = reportArrival(state.arrivals, draft);
      if (result.dropped) {
        if (result.incomingEarlier) {
          notify(
            "warn",
            `${draft.ring} 在本批已有归巢记录，重复报时沿用先到记录；如确属报错请用「更正」修改原记录`,
          );
        } else {
          notify(
            "info",
            `${draft.ring} 已报过归巢，重复报时沿用先到记录（${result.kept.returnDate} ${result.kept.returnTime}）`,
          );
        }
        return;
      }
      commit({ ...state, arrivals: result.arrivals });
      const issue = checkArrival(batch, result.kept);
      if (issue.status === "valid") {
        notify("ok", `${draft.ring} 归巢已登记，进入排行，从未归巢名单移出`);
      } else {
        notify("warn", `${draft.ring} 归巢已登记，但待核：${issue.reasons.join("、")}，暂不占排行`);
      }
    },
    [state, commit, notify],
  );

  const correctArrival = useCallback(
    (id: string, data: Partial<ArrivalDraft>) => {
      const target = state.arrivals.find((a) => a.id === id);
      if (!target) return;
      // 更正后的时间若与同羽同批另一条冲突（理论上去重后不会发生），仍只保留本条
      commit({
        ...state,
        arrivals: state.arrivals.map((a) =>
          a.id === id
            ? {
                ...a,
                ...data,
                ring: (data.ring ?? a.ring).trim(),
              }
            : a,
        ),
      });
      const batch = state.batches.find((b) => b.id === target.batchId);
      const issue = batch
        ? checkArrival(batch, { ...target, ...data } as ArrivalRecord)
        : null;
      notify(
        "ok",
        issue?.status === "pending"
          ? `成绩已更正，该记录仍待核：${issue.reasons.join("、")}`
          : "成绩已更正，排行、总览与血统档案已重算",
      );
    },
    [state, commit, notify],
  );

  const deleteArrival = useCallback(
    (id: string) => {
      const target = state.arrivals.find((a) => a.id === id);
      commit({ ...state, arrivals: state.arrivals.filter((a) => a.id !== id) });
      if (target) {
        notify("info", `${target.ring} 的归巢记录已删除，重新进入未归巢名单`);
      }
    },
    [state, commit, notify],
  );

  const resetAll = useCallback(() => {
    setState(normalize(resetState()));
    setNotices([]);
    notify("info", "已恢复内置示例数据");
  }, [notify]);

  const value = useMemo<LoftContextValue>(() => {
    const views = buildBatchViews(state);
    return {
      state,
      notices,
      notify,
      dismissNotice,
      addPigeon,
      updatePigeon,
      removePigeon,
      addBatch,
      updateBatch,
      removeBatch,
      toggleBatchPigeon,
      report,
      correctArrival,
      deleteArrival,
      resetAll,
      views,
      view: (id) => buildBatchView(state, id),
      overview: buildOverview(state),
      missing: listMissing(state),
      pending: listPending(state),
      profile: (ring) => buildPigeonProfile(state, ring),
      bloodlineStats: summarizeByBloodline(state),
      bloodlineHistory: (bloodline) => historyByBloodline(state, bloodline),
      precheckArrival: (batch, draft) => checkArrival(batch, draft),
    };
  }, [
    state,
    notices,
    notify,
    dismissNotice,
    addPigeon,
    updatePigeon,
    removePigeon,
    addBatch,
    updateBatch,
    removeBatch,
    toggleBatchPigeon,
    report,
    correctArrival,
    deleteArrival,
    resetAll,
  ]);

  return <LoftContext.Provider value={value}>{children}</LoftContext.Provider>;
}

export function useLoft(): LoftContextValue {
  const ctx = useContext(LoftContext);
  if (!ctx) throw new Error("useLoft 必须在 LoftProvider 内使用");
  return ctx;
}
