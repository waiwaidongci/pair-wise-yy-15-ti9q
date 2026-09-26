import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoft } from "../store/LoftContext";
import {
  formatDuration,
  formatSpeed,
  isOvernight,
} from "../domain/rules";
import { HEALTH_OPTIONS, type ArrivalDraft, type HealthStatus, type TrainingBatch } from "../domain/types";
import type { BatchArrivalRow } from "../domain/rules";
import { Badge, Btn } from "./ui";

function useDraft(initial: ArrivalDraft) {
  const [draft, setDraft] = useState<ArrivalDraft>(initial);
  // 稳定的更新函数；值未变时返回原 state，避免 effect 中触发无效重渲染
  const set = useCallback(
    <K extends keyof ArrivalDraft>(key: K, value: ArrivalDraft[K]) =>
      setDraft((d) => (d[key] === value ? d : { ...d, [key]: value })),
    [],
  );
  return [draft, set, setDraft] as const;
}

/** 归巢登记表单：日期 + 时刻分开填，跨夜改日期即可 */
export function ReportForm({
  batch,
  fixedRing,
  defaultTime,
  onDone,
}: {
  batch: TrainingBatch;
  fixedRing?: string;
  defaultTime?: string;
  onDone?: () => void;
}) {
  const { state, report } = useLoft();

  const ringOptions = useMemo(() => {
    const extra = batch.ringNos.filter(
      (r) => !state.pigeons.some((p) => p.ring === r),
    );
    return [...state.pigeons, ...extra.map((ring) => ({ ring, bloodline: "未建档", gender: "" as const, pairRing: "", createdAt: 0 }))];
  }, [state.pigeons, batch.ringNos]);

  const [draft, set] = useDraft({
    batchId: batch.id,
    ring: fixedRing ?? batch.ringNos[0] ?? "",
    returnDate: batch.releaseDate,
    returnTime: defaultTime ?? "12:00",
    health: "正常",
  });

  useEffect(() => {
    if (fixedRing) set("ring", fixedRing);
  }, [fixedRing, set]);

  const preview = useMemo(() => {
    const issueReasons: string[] = [];
    if (batch.distanceKm === null || !(batch.distanceKm > 0)) issueReasons.push("批次缺距离");
    if (!batch.weather.trim()) issueReasons.push("批次缺天气");
    if (draft.health !== "正常") issueReasons.push(draft.health === "" ? "健康未登记" : `健康异常（${draft.health}）`);
    const overnight = isOvernight(batch, draft);
    return { issueReasons, overnight };
  }, [batch, draft]);

  const submit = () => {
    report(draft);
    onDone?.();
  };

  return (
    <div className="report-form">
      <div className="report-grid">
        <label className="field">
          <span>足环号<em>*</em></span>
          {fixedRing ? (
            <input value={fixedRing} disabled />
          ) : (
            <select value={draft.ring} onChange={(e) => set("ring", e.target.value)}>
              <option value="">选择足环</option>
              {ringOptions.map((p) => (
                <option key={p.ring} value={p.ring}>
                  {p.ring}（{p.bloodline}）
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="field">
          <span>归巢日期<em>*</em></span>
          <input
            type="date"
            value={draft.returnDate}
            onChange={(e) => set("returnDate", e.target.value)}
          />
        </label>
        <label className="field">
          <span>归巢时刻<em>*</em></span>
          <input
            type="time"
            value={draft.returnTime}
            onChange={(e) => set("returnTime", e.target.value)}
          />
        </label>
        <label className="field">
          <span>健康</span>
          <select
            value={draft.health}
            onChange={(e) => set("health", e.target.value as HealthStatus)}
          >
            <option value="">未登记</option>
            {HEALTH_OPTIONS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="report-foot">
        <div className="report-hints">
          {preview.overnight && (
            <Badge tone="blue">跨夜归巢 · 用时按真实先后计算</Badge>
          )}
          {preview.issueReasons.map((r) => (
            <Badge key={r} tone="amber">{r} · 只进待核</Badge>
          ))}
        </div>
        <Btn variant="primary" onClick={submit} disabled={!draft.ring}>
          登记归巢
        </Btn>
      </div>
    </div>
  );
}

/** 一条已登记归巢成绩：排行/待核共用，可内联更正、删除 */
export function ArrivalRowCard({ row }: { row: BatchArrivalRow }) {
  const { correctArrival, deleteArrival } = useLoft();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(row.arrival.returnDate);
  const [time, setTime] = useState(row.arrival.returnTime);
  const [health, setHealth] = useState<HealthStatus>(row.arrival.health);

  const valid = row.status === "valid";

  return (
    <div className={`arrival-row arrival-${row.status}`}>
      <div className="arrival-main">
        <div className="arrival-rank">
          {valid ? (
            <b>#{row.rank}</b>
          ) : (
            <Badge tone="amber">待核</Badge>
          )}
        </div>
        <div className="arrival-info">
          <h3>
            {row.ring}
            {row.overnight && <Badge tone="blue">跨夜</Badge>}
          </h3>
          <p className="muted">
            {row.arrival.returnDate} {row.arrival.returnTime} 归巢 · 健康：
            {row.arrival.health === "" ? "未登记" : row.arrival.health} ·{" "}
            {row.bloodline}
          </p>
          {!valid && (
            <p className="reasons">待核原因：{row.reasons.join("、")}（不占排行）</p>
          )}
        </div>
        <div className="arrival-stats">
          <strong>{formatDuration(row.elapsedMs)}</strong>
          <span>分速 {formatSpeed(row.speedMpm)}</span>
        </div>
        <div className="arrival-actions">
          <Btn small onClick={() => setEditing((v) => !v)}>
            {editing ? "收起" : "更正"}
          </Btn>
          <Btn small variant="danger" onClick={() => deleteArrival(row.arrival.id)}>
            删除
          </Btn>
        </div>
      </div>

      {editing && (
        <div className="correct-box">
          <label className="field">
            <span>归巢日期</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>归巢时刻</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="field">
            <span>健康</span>
            <select value={health} onChange={(e) => setHealth(e.target.value as HealthStatus)}>
              <option value="">未登记</option>
              {HEALTH_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <Btn
            variant="primary"
            small
            onClick={() => {
              correctArrival(row.arrival.id, { returnDate: date, returnTime: time, health });
              setEditing(false);
            }}
          >
            保存更正
          </Btn>
        </div>
      )}
    </div>
  );
}
