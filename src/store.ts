import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arrival, Batch, HealthStatus, LoftState, Pigeon } from "./domain/types";
import { analyzeAll, buildOverview } from "./domain/rules";
import { exportState, importState, loadState, resetState, saveState } from "./data/storage";

export type Toast = { id: number; text: string; kind: "info" | "warn" };

let seq = Date.now();
const nextId = (prefix: string) => `${prefix}-${(seq++).toString(36)}`;

export interface BatchDraft {
  name: string;
  releaseDate: string;
  releaseTime: string;
  location: string;
  distanceKm: string; // 表单中允许为空
  weather: string;
  releasedRingIds: string[];
}

export interface ArrivalDraft {
  ringId: string;
  arrivalDate: string;
  arrivalTime: string;
  health: HealthStatus;
  note: string;
}

export interface PigeonDraft {
  ringId: string;
  bloodline: string;
  sex: Pigeon["sex"];
  mateRingId: string;
  note: string;
}

export function useLoftStore() {
  const [state, setState] = useState<LoftState>(() => loadState());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const notify = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const analyses = useMemo(() => analyzeAll(state), [state]);
  const overview = useMemo(() => buildOverview(state, analyses), [state, analyses]);

  // ---------- 赛鸽档案 ----------
  const savePigeon = useCallback(
    (draft: PigeonDraft, originalRing?: string) => {
      const ringId = draft.ringId.trim();
      if (!ringId) {
        notify("足环号不能为空", "warn");
        return false;
      }
      let ok = true;
      setState((s) => {
        const exists = s.pigeons.some((p) => p.ringId === ringId && p.ringId !== originalRing);
        if (exists) {
          ok = false;
          return s;
        }
        const pigeon: Pigeon = {
          ringId,
          bloodline: draft.bloodline.trim(),
          sex: draft.sex,
          mateRingId: draft.mateRingId.trim(),
          note: draft.note.trim(),
        };
        if (originalRing) {
          return {
            ...s,
            pigeons: s.pigeons.map((p) => (p.ringId === originalRing ? pigeon : p)),
            batches: s.batches.map((b) => ({
              ...b,
              releasedRingIds: b.releasedRingIds.map((r) => (r === originalRing ? ringId : r)),
            })),
            arrivals: s.arrivals.map((a) => (a.ringId === originalRing ? { ...a, ringId } : a)),
          };
        }
        return { ...s, pigeons: [...s.pigeons, pigeon] };
      });
      if (!ok) notify(`足环号 ${ringId} 已存在`, "warn");
      return ok;
    },
    [notify]
  );

  const deletePigeon = useCallback(
    (ringId: string) => {
      setState((s) => ({
        ...s,
        pigeons: s.pigeons.filter((p) => p.ringId !== ringId),
        batches: s.batches.map((b) => ({
          ...b,
          releasedRingIds: b.releasedRingIds.filter((r) => r !== ringId),
        })),
        arrivals: s.arrivals.filter((a) => a.ringId !== ringId),
      }));
      notify(`已删除 ${ringId} 及其报时记录`);
    },
    [notify]
  );

  // ---------- 训放批次 ----------
  const saveBatch = useCallback(
    (draft: BatchDraft, originalId?: string) => {
      if (!draft.releaseDate || !draft.releaseTime || !draft.location.trim()) {
        notify("放飞日期、时刻、地点为必填", "warn");
        return null;
      }
      const id = originalId ?? nextId("b");
      const batch: Batch = {
        id,
        name: draft.name.trim() || `${draft.releaseDate} ${draft.location.trim()}`,
        releaseDate: draft.releaseDate,
        releaseTime: draft.releaseTime,
        location: draft.location.trim(),
        distanceKm: draft.distanceKm.trim() === "" ? null : Number(draft.distanceKm),
        weather: draft.weather.trim(),
        releasedRingIds: draft.releasedRingIds,
      };
      setState((s) => {
        const others = s.batches.filter((b) => b.id !== id);
        return originalId
          ? { ...s, batches: s.batches.map((b) => (b.id === id ? batch : b)) }
          : { ...s, batches: [...others, batch] };
      });
      notify(originalId ? "批次已更正，排行/总览/血统档案已重算" : "训放批次已登记");
      return id;
    },
    [notify]
  );

  const deleteBatch = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        batches: s.batches.filter((b) => b.id !== id),
        arrivals: s.arrivals.filter((a) => a.batchId !== id),
      }));
      notify("批次及其全部报时已删除");
    },
    [notify]
  );

  // ---------- 归巢报时 ----------
  const saveArrival = useCallback(
    (batchId: string, draft: ArrivalDraft, originalId?: string) => {
      if (!draft.ringId || !draft.arrivalDate || !draft.arrivalTime) {
        notify("足环、归巢日期与时刻为必填", "warn");
        return false;
      }
      const record: Arrival = {
        id: originalId ?? nextId("a"),
        batchId,
        ringId: draft.ringId,
        arrivalDate: draft.arrivalDate,
        arrivalTime: draft.arrivalTime,
        health: draft.health,
        note: draft.note.trim(),
        reportedAt: Date.now(),
      };

      let duplicate = false;
      setState((s) => {
        const batch = s.batches.find((b) => b.id === batchId);
        const otherReports = s.arrivals.filter(
          (a) => a.batchId === batchId && a.ringId === draft.ringId && a.id !== originalId
        );
        duplicate = otherReports.length > 0;

        // 同羽同批已存在报时：不覆盖先到记录，按真实时刻由规则层自动取舍
        const nextArrivals = originalId
          ? s.arrivals.map((a) => (a.id === originalId ? record : a))
          : [...s.arrivals, record];

        const nextBatches =
          batch && !batch.releasedRingIds.includes(draft.ringId)
            ? s.batches.map((b) =>
                b.id === batchId ? { ...b, releasedRingIds: [...b.releasedRingIds, draft.ringId] } : b
              )
            : s.batches;

        return { ...s, arrivals: nextArrivals, batches: nextBatches };
      });
      notify(
        duplicate
          ? "重复报时：同羽同批沿用真实归巢最早的一条，不重复占用排行"
          : "归巢已登记；若此前在未归巢名单中，已自动移出",
        duplicate ? "warn" : "info"
      );
      return true;
    },
    [notify]
  );

  const deleteArrival = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, arrivals: s.arrivals.filter((a) => a.id !== id) }));
      notify("报时记录已删除，有效成绩与排行已重算");
    },
    [notify]
  );

  // ---------- 归档 ----------
  const doExport = useCallback(() => {
    exportState(state);
    notify("已导出 JSON 存档");
  }, [state, notify]);

  const doImport = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const next = importState(String(reader.result));
          setState(next);
          notify("存档已导入，全部视图已重算");
        } catch (e) {
          notify(e instanceof Error ? e.message : "导入失败", "warn");
        }
      };
      reader.readAsText(file);
    },
    [notify]
  );

  const doReset = useCallback(() => {
    setState(resetState());
    notify("已恢复演示数据");
  }, [notify]);

  return {
    state,
    analyses,
    overview,
    toasts,
    notify,
    savePigeon,
    deletePigeon,
    saveBatch,
    deleteBatch,
    saveArrival,
    deleteArrival,
    doExport,
    doImport,
    doReset,
  };
}

export type LoftStore = ReturnType<typeof useLoftStore>;
