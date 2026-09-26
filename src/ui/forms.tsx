import { useState } from "react";
import type { BatchDraft, ArrivalDraft, PigeonDraft } from "../store";
import type { Arrival, Batch, Pigeon } from "../domain/types";
import { todayStr } from "../domain/time";
import { Field } from "./ui";

function batchToDraft(b?: Batch): BatchDraft {
  return {
    name: b?.name ?? "",
    releaseDate: b?.releaseDate ?? todayStr(),
    releaseTime: b?.releaseTime ?? "07:00",
    location: b?.location ?? "",
    distanceKm: b?.distanceKm == null ? "" : String(b.distanceKm),
    weather: b?.weather ?? "",
    releasedRingIds: b?.releasedRingIds ?? [],
  };
}

export function BatchForm({
  pigeons,
  original,
  onSubmit,
  onCancel,
  onDelete,
}: {
  pigeons: Pigeon[];
  original?: Batch;
  onSubmit: (draft: BatchDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<BatchDraft>(() => batchToDraft(original));

  const toggleRing = (ringId: string) =>
    setDraft((d) => ({
      ...d,
      releasedRingIds: d.releasedRingIds.includes(ringId)
        ? d.releasedRingIds.filter((r) => r !== ringId)
        : [...d.releasedRingIds, ringId],
    }));

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft);
      }}
    >
      <Field label="批次名称" hint="可留空，自动按日期+地点命名">
        <input
          className="ctrl"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="如：第二站·濮阳"
        />
      </Field>
      <Field label="放飞地点" required>
        <input
          className="ctrl"
          value={draft.location}
          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
          placeholder="如：濮阳"
        />
      </Field>
      <Field label="放飞日期" required hint="跨夜归巢时，归巢日期单独登记，系统按真实先后计时">
        <input
          className="ctrl"
          type="date"
          value={draft.releaseDate}
          onChange={(e) => setDraft({ ...draft, releaseDate: e.target.value })}
        />
      </Field>
      <Field label="放飞时刻" required>
        <input
          className="ctrl"
          type="time"
          value={draft.releaseTime}
          onChange={(e) => setDraft({ ...draft, releaseTime: e.target.value })}
        />
      </Field>
      <Field label="放飞距离（公里）" required hint="留空则本批成绩只进待核，不占排行">
        <input
          className="ctrl"
          type="number"
          min="0"
          step="0.1"
          value={draft.distanceKm}
          onChange={(e) => setDraft({ ...draft, distanceKm: e.target.value })}
          placeholder="如：320"
        />
      </Field>
      <Field label="天气" required hint="留空则本批成绩只进待核，不占排行">
        <input
          className="ctrl"
          value={draft.weather}
          onChange={(e) => setDraft({ ...draft, weather: e.target.value })}
          placeholder="如：晴 / 多云转逆风"
        />
      </Field>

      <div className="form-full">
        <span className="field-label">实际放飞名单（{draft.releasedRingIds.length} 羽）</span>
        <div className="ring-picker">
          {pigeons.length === 0 && <p className="muted">还没有赛鸽档案，请先在「鸽棚档案」登记足环。</p>}
          {pigeons.map((p) => (
            <label key={p.ringId} className={`ring-chip ${draft.releasedRingIds.includes(p.ringId) ? "on" : ""}`}>
              <input type="checkbox" checked={draft.releasedRingIds.includes(p.ringId)} onChange={() => toggleRing(p.ringId)} />
              <span>{p.ringId}</span>
              <small>{p.bloodline || "未填血统"}</small>
            </label>
          ))}
        </div>
      </div>

      <div className="form-actions form-full">
        {onDelete && (
          <button type="button" className="btn danger" onClick={onDelete}>
            删除批次
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn primary">
          {original ? "保存更正并重算" : "登记批次"}
        </button>
      </div>
    </form>
  );
}

function arrivalToDraft(a?: Arrival, defaultRing = ""): ArrivalDraft {
  return {
    ringId: a?.ringId ?? defaultRing,
    arrivalDate: a?.arrivalDate ?? todayStr(),
    arrivalTime: a?.arrivalTime ?? "08:00",
    health: a?.health ?? "normal",
    note: a?.note ?? "",
  };
}

export function ArrivalForm({
  batch,
  pigeons,
  original,
  defaultRing,
  onSubmit,
  onCancel,
  onDelete,
}: {
  batch: Batch;
  pigeons: Pigeon[];
  original?: Arrival;
  defaultRing?: string;
  onSubmit: (draft: ArrivalDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<ArrivalDraft>(() => arrivalToDraft(original, defaultRing));
  const overnight = draft.arrivalDate > batch.releaseDate;

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft);
      }}
    >
      <div className="form-full callout">
        {batch.name} · {batch.releaseDate} {batch.releaseTime} 放飞 · {batch.location}
        {batch.distanceKm === null || !batch.weather.trim() ? (
          <strong className="warn-text">（批次缺距离或天气，报时先进待核）</strong>
        ) : (
          <span className="muted"> · {batch.distanceKm}km · {batch.weather}</span>
        )}
      </div>

      <Field label="足环号" required>
        <select
          className="ctrl"
          value={draft.ringId}
          onChange={(e) => setDraft({ ...draft, ringId: e.target.value })}
        >
          <option value="">请选择足环</option>
          {pigeons.map((p) => (
            <option key={p.ringId} value={p.ringId}>
              {p.ringId}（{p.bloodline || "未填血统"}）
            </option>
          ))}
          {draft.ringId && !pigeons.some((p) => p.ringId === draft.ringId) && (
            <option value={draft.ringId}>{draft.ringId}（档案中不存在）</option>
          )}
        </select>
      </Field>
      <Field label="健康状态" required hint="异常只进待核，不占排行">
        <select
          className="ctrl"
          value={draft.health}
          onChange={(e) => setDraft({ ...draft, health: e.target.value as ArrivalDraft["health"] })}
        >
          <option value="normal">正常</option>
          <option value="abnormal">异常（受伤/迟归观察等）</option>
        </select>
      </Field>
      <Field label="归巢日期" required hint={overnight ? "跨夜归巢：按真实日期计时，不会被判成早于放飞" : "若次日凌晨归巢，请把日期改成放飞次日"}>
        <input
          className="ctrl"
          type="date"
          value={draft.arrivalDate}
          onChange={(e) => setDraft({ ...draft, arrivalDate: e.target.value })}
        />
      </Field>
      <Field label="归巢时刻" required>
        <input
          className="ctrl"
          type="time"
          value={draft.arrivalTime}
          onChange={(e) => setDraft({ ...draft, arrivalTime: e.target.value })}
        />
      </Field>
      <div className="form-full">
        <Field label="备注">
          <input
            className="ctrl"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="如：左翼擦伤、棚友代报"
          />
        </Field>
      </div>
      <div className="form-full muted small">
        同一足环同批可重复报时，系统只保留真实归巢最早的一条作为有效成绩，其余自动标记为重复报时。
      </div>

      <div className="form-actions form-full">
        {onDelete && (
          <button type="button" className="btn danger" onClick={onDelete}>
            删除报时
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn primary">
          {original ? "保存更正并重算" : "登记归巢"}
        </button>
      </div>
    </form>
  );
}

function pigeonToDraft(p?: Pigeon): PigeonDraft {
  return {
    ringId: p?.ringId ?? "",
    bloodline: p?.bloodline ?? "",
    sex: p?.sex ?? "",
    mateRingId: p?.mateRingId ?? "",
    note: p?.note ?? "",
  };
}

export function PigeonForm({
  pigeons,
  original,
  onSubmit,
  onCancel,
  onDelete,
}: {
  pigeons: Pigeon[];
  original?: Pigeon;
  onSubmit: (draft: PigeonDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<PigeonDraft>(() => pigeonToDraft(original));

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft);
      }}
    >
      <Field label="足环号" required hint="全棚唯一，修改后批次与报时同步更新">
        <input
          className="ctrl"
          value={draft.ringId}
          onChange={(e) => setDraft({ ...draft, ringId: e.target.value })}
          placeholder="如：CHN-24-001839"
        />
      </Field>
      <Field label="血统" hint="用于血统档案与按血统筛选历史成绩">
        <input
          className="ctrl"
          value={draft.bloodline}
          onChange={(e) => setDraft({ ...draft, bloodline: e.target.value })}
          placeholder="如：詹森系"
        />
      </Field>
      <Field label="性别">
        <select className="ctrl" value={draft.sex} onChange={(e) => setDraft({ ...draft, sex: e.target.value as Pigeon["sex"] })}>
          <option value="">未填</option>
          <option value="雄">雄</option>
          <option value="雌">雌</option>
        </select>
      </Field>
      <Field label="配对足环">
        <select
          className="ctrl"
          value={draft.mateRingId}
          onChange={(e) => setDraft({ ...draft, mateRingId: e.target.value })}
        >
          <option value="">无配对</option>
          {pigeons
            .filter((p) => p.ringId !== draft.ringId)
            .map((p) => (
              <option key={p.ringId} value={p.ringId}>
                {p.ringId}（{p.bloodline || "未填血统"}）
              </option>
            ))}
        </select>
      </Field>
      <div className="form-full">
        <Field label="备注">
          <input
            className="ctrl"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="如：留种、伤病记录"
          />
        </Field>
      </div>

      <div className="form-actions form-full">
        {onDelete && (
          <button type="button" className="btn danger" onClick={onDelete}>
            删除档案
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn primary">
          {original ? "保存更正" : "登记赛鸽"}
        </button>
      </div>
    </form>
  );
}
