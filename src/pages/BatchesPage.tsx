import { useState } from "react";
import { useLoft, type BatchDraft, emptyBatchDraft } from "../store/LoftContext";
import type { TrainingBatch } from "../domain/types";
import { formatSpeed } from "../domain/rules";
import { Badge, Btn, Card, EmptyState, TextField } from "../components/ui";
import { ArrivalRowCard, ReportForm } from "../components/ArrivalForms";

function BatchEditor({ onSaved }: { onSaved: (id: string) => void }) {
  const { state, addBatch } = useLoft();
  const [draft, setDraft] = useState<BatchDraft>(emptyBatchDraft());
  const [open, setOpen] = useState(false);

  const toggleRing = (ring: string) =>
    setDraft((d) => ({
      ...d,
      ringNos: d.ringNos.includes(ring)
        ? d.ringNos.filter((r) => r !== ring)
        : [...d.ringNos, ring],
    }));

  if (!open) {
    return (
      <Btn variant="primary" onClick={() => setOpen(true)}>
        + 登记新训放批次
      </Btn>
    );
  }

  const save = () => {
    const id = addBatch(draft);
    if (id) {
      setDraft(emptyBatchDraft());
      setOpen(false);
      onSaved(id);
    }
  };

  return (
    <div className="batch-editor">
      <div className="field-grid">
        <TextField
          label="放飞日期"
          type="date"
          required
          value={draft.releaseDate}
          onChange={(v) => setDraft({ ...draft, releaseDate: v })}
        />
        <TextField
          label="放飞时刻"
          type="time"
          value={draft.releaseTime}
          onChange={(v) => setDraft({ ...draft, releaseTime: v })}
        />
        <TextField
          label="放飞地点"
          required
          value={draft.location}
          placeholder="如：新乡"
          onChange={(v) => setDraft({ ...draft, location: v })}
        />
        <TextField
          label="放飞距离（公里，留空=缺距离待核）"
          type="number"
          step="0.1"
          value={draft.distanceKm}
          placeholder="如：200"
          onChange={(v) => setDraft({ ...draft, distanceKm: v })}
        />
        <TextField
          label="天气（留空=缺天气待核）"
          value={draft.weather}
          placeholder="如：晴 北风2级"
          onChange={(v) => setDraft({ ...draft, weather: v })}
        />
      </div>
      <div className="roster-pick">
        <span>放飞名单（{draft.ringNos.length} 羽）</span>
        <div className="chips">
          {state.pigeons.length === 0 && <span className="muted">档案为空，请先在「鸽棚档案」建档</span>}
          {state.pigeons.map((p) => (
            <button
              key={p.ring}
              type="button"
              className={draft.ringNos.includes(p.ring) ? "chip chip-on" : "chip"}
              onClick={() => toggleRing(p.ring)}
            >
              {p.ring} · {p.bloodline}
            </button>
          ))}
        </div>
      </div>
      <div className="editor-actions">
        <Btn variant="primary" onClick={save}>保存批次</Btn>
        <Btn onClick={() => setOpen(false)}>取消</Btn>
      </div>
    </div>
  );
}

function BatchMetaInner({ batch }: { batch: TrainingBatch }) {
  const { updateBatch } = useLoft();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(batch.releaseDate);
  const [time, setTime] = useState(batch.releaseTime);
  const [location, setLocation] = useState(batch.location);
  const [distance, setDistance] = useState(batch.distanceKm === null ? "" : String(batch.distanceKm));
  const [weather, setWeather] = useState(batch.weather);

  if (!editing) {
    return (
      <Btn small onClick={() => setEditing(true)}>更正批次</Btn>
    );
  }
  return (
    <div className="batch-meta-edit">
      <div className="field-grid">
        <label className="field">
          <span>放飞日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>放飞时刻</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="field">
          <span>地点</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="field">
          <span>距离（公里）</span>
          <input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </label>
        <label className="field">
          <span>天气</span>
          <input value={weather} onChange={(e) => setWeather(e.target.value)} />
        </label>
      </div>
      <div className="editor-actions">
        <Btn
          small
          variant="primary"
          onClick={() => {
            updateBatch(batch.id, {
              releaseDate: date,
              releaseTime: time,
              location,
              distanceKm: distance.trim() === "" ? null : Number(distance),
              weather,
            });
            setEditing(false);
          }}
        >
          保存
        </Btn>
        <Btn small onClick={() => setEditing(false)}>取消</Btn>
      </div>
    </div>
  );
}

function BatchCard({ batchId }: { batchId: string }) {
  const { view, state, toggleBatchPigeon, removeBatch } = useLoft();
  const v = view(batchId);
  const [showReport, setShowReport] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  if (!v) return null;
  const { batch } = v;

  return (
    <article className="batch-card">
      <div className="batch-head">
        <div>
          <h3>
            {batch.releaseDate} {batch.releaseTime} · {batch.location}
            {batch.distanceKm === null ? (
              <Badge tone="amber">缺距离</Badge>
            ) : (
              <Badge tone="blue">{batch.distanceKm} km</Badge>
            )}
            {batch.weather ? <Badge tone="green">{batch.weather}</Badge> : <Badge tone="amber">缺天气</Badge>}
          </h3>
          <p className="muted">
            放飞 {v.releasedCount} 羽 · 有效归巢 {v.homeCount} 羽 · 归巢率{" "}
            {(v.homeRate * 100).toFixed(0)}% · 平均分速 {formatSpeed(v.avgSpeedMpm)} ·
            待核 {v.pendingRows.length} · 未归巢 {v.missingRings.length}
          </p>
        </div>
        <div className="arrival-actions">
          <Btn small variant="primary" onClick={() => setShowReport((s) => !s)}>
            {showReport ? "收起报时" : "归巢报时"}
          </Btn>
          <Btn small onClick={() => setShowRoster((s) => !s)}>
            放飞名单
          </Btn>
          <BatchMetaInner batch={batch} />
          <Btn small variant="danger" onClick={() => {
            if (window.confirm(`删除批次「${batch.location}」及其全部归巢记录？`)) {
              removeBatch(batch.id);
            }
          }}>
            删除
          </Btn>
        </div>
      </div>

      {showRoster && (
        <div className="roster-pick">
          <span>勾选本批放飞足环（移出名单不会删除已登记成绩）</span>
          <div className="chips">
            {state.pigeons.map((p) => (
              <button
                key={p.ring}
                type="button"
                className={batch.ringNos.includes(p.ring) ? "chip chip-on" : "chip"}
                onClick={() => toggleBatchPigeon(batch.id, p.ring)}
              >
                {p.ring} · {p.bloodline}
              </button>
            ))}
          </div>
        </div>
      )}

      {showReport && <ReportForm batch={batch} onDone={() => setShowReport(false)} />}

      <div className="rank-list">
        {v.validRows.length > 0 && (
          <>
            <h4>有效成绩排行</h4>
            {v.validRows.map((r) => (
              <ArrivalRowCard key={r.arrival.id} row={r} />
            ))}
          </>
        )}
        {v.pendingRows.length > 0 && (
          <>
            <h4 className="pending-title">待核（不占排行）</h4>
            {v.pendingRows.map((r) => (
              <ArrivalRowCard key={r.arrival.id} row={r} />
            ))}
          </>
        )}
        {v.rows.length === 0 && <EmptyState text="尚无归巢报时；未归巢名单包含全部放飞足环。" />}
      </div>

      {v.missingRings.length > 0 && (
        <div className="missing-inline">
          <h4>未归巢（{v.missingRings.length}）</h4>
          <div className="chips">
            {v.missingRings.map((ring) => (
              <Badge key={ring} tone="red">{ring}</Badge>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export function BatchesPage() {
  const { views } = useLoft();
  // 登记新批次后直接滚动到顶部新卡片（views 已按放飞时间倒序）
  const [, setNewId] = useState<string>("");
  return (
    <div className="stack">
      <Card
        subtitle="训放批次"
        title="批次登记：放飞日期 / 地点 / 距离 / 天气"
        actions={<BatchEditor onSaved={(id) => setNewId(id)} />}
      >
        <p className="muted rules-line">
          归巢按「归巢日期 + 时刻」登记，凌晨跨夜归巢会按真实先后计算用时；
          缺距离、缺天气或健康异常的记录只进待核，不占排行。
        </p>
      </Card>

      {views.length === 0 ? (
        <Card><EmptyState text="还没有训放批次，先登记第一批放飞。" /></Card>
      ) : (
        views.map((v) => <BatchCard key={v.batch.id} batchId={v.batch.id} />)
      )}
    </div>
  );
}
