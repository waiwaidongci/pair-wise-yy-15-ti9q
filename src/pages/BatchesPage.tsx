import { useMemo, useState } from "react";
import type { BatchAnalysis } from "../domain/rules";
import { batchRanking } from "../domain/rules";
import type { Arrival, Pigeon } from "../domain/types";
import { formatDuration, formatSpeed } from "../domain/time";
import type { PageProps } from "./common";
import { batchLabel, pigeonLabel } from "./common";
import { Empty, HealthTag, IssueTags, Tag } from "../ui/ui";

export function BatchesPage({ store, openBatch, openArrival, openPigeon }: PageProps) {
  const { state, analyses } = store;
  const [selectedId, setSelectedId] = useState<string | null>(analyses[0]?.batch.id ?? null);
  const selected = analyses.find((a) => a.batch.id === selectedId) ?? null;
  const pigeonByRing = useMemo(
    () => new Map(state.pigeons.map((p) => [p.ringId, p])),
    [state.pigeons]
  );

  return (
    <div className="batch-layout">
      <aside className="panel batch-list">
        <div className="panel-head">
          <h2>训放批次</h2>
          <button className="btn primary" onClick={() => openBatch()}>
            新批次
          </button>
        </div>
        {analyses.length === 0 && <Empty>还没有批次，点击「新批次」登记放飞信息。</Empty>}
        {analyses.map((a) => (
          <button
            key={a.batch.id}
            className={`batch-item ${selectedId === a.batch.id ? "active" : ""}`}
            onClick={() => setSelectedId(a.batch.id)}
          >
            <strong>{batchLabel(a.batch)}</strong>
            <span>
              {a.batch.releaseDate} {a.batch.releaseTime} · {a.batch.location}
            </span>
            <span className="batch-item-tags">
              <Tag tone="green">归 {a.returnCount}/{a.releasedCount}</Tag>
              {a.pending.length > 0 && <Tag tone="orange">核 {a.pending.length}</Tag>}
              {a.missingRingIds.length > 0 && <Tag tone="red">失 {a.missingRingIds.length}</Tag>}
            </span>
          </button>
        ))}
      </aside>

      <section className="panel batch-detail">
        {!selected ? (
          <Empty>选择左侧批次查看详情，或登记一个新批次。</Empty>
        ) : (
          <BatchDetail
            analysis={selected}
            pigeonByRing={pigeonByRing}
            onEditBatch={() => openBatch(selected.batch.id)}
            onAddArrival={() => openArrival(selected.batch.id)}
            onEditArrival={(arrival) => openArrival(selected.batch.id, arrival)}
            onOpenPigeon={(ringId) => openPigeon(ringId)}
          />
        )}
      </section>
    </div>
  );
}

function BatchDetail({
  analysis,
  pigeonByRing,
  onEditBatch,
  onAddArrival,
  onEditArrival,
  onOpenPigeon,
}: {
  analysis: BatchAnalysis;
  pigeonByRing: Map<string, Pigeon>;
  onEditBatch: () => void;
  onAddArrival: (defaultRing?: string) => void;
  onEditArrival: (arrival: Arrival) => void;
  onOpenPigeon: (ringId: string) => void;
}) {
  const { batch, scored, ranked, pending, missingRingIds } = analysis;
  const rows = batchRanking(analysis);
  const rankedById = new Map(rows.filter((r) => r.rank > 0).map((r) => [r.arrival.id, r.rank]));

  return (
    <div className="stack">
      <div className="panel-head">
        <div>
          <h2>{batchLabel(batch)}</h2>
          <p className="muted">
            {batch.releaseDate} {batch.releaseTime} 放飞 · {batch.location} ·{" "}
            {batch.distanceKm === null ? (
              <span className="warn-text">距离未登记</span>
            ) : (
              `${batch.distanceKm}km`
            )}{" "}
            · {batch.weather.trim() ? batch.weather : <span className="warn-text">天气未登记</span>}
          </p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onEditBatch}>
            更正批次
          </button>
          <button className="btn primary" onClick={() => onAddArrival()}>
            登记归巢
          </button>
        </div>
      </div>

      <div className="sub-grid">
        <div className="sub-panel">
          <h3>本批排行（{ranked.length}）</h3>
          {ranked.length === 0 ? (
            <Empty>暂无占排行成绩：补全距离/天气且健康正常后自动上榜。</Empty>
          ) : (
            <table className="table compact">
              <thead>
                <tr>
                  <th>名次</th>
                  <th>足环</th>
                  <th>归巢</th>
                  <th>用时</th>
                  <th>分速</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.arrival.id}>
                    <td className="rank-cell">{s.rank}</td>
                    <td>
                      <button className="link-btn" onClick={() => onOpenPigeon(s.arrival.ringId)}>
                        {s.arrival.ringId}
                      </button>
                    </td>
                    <td>
                      {s.arrival.arrivalDate.slice(5)} {s.arrival.arrivalTime}
                      {s.overnight && <Tag tone="blue">跨夜</Tag>}
                    </td>
                    <td>{formatDuration(s.durationMs)}</td>
                    <td>{formatSpeed(s.speed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="sub-panel">
          <h3>待核（{pending.length}）</h3>
          {pending.length === 0 ? (
            <Empty>无待核成绩。</Empty>
          ) : (
            <ul className="issue-list">
              {pending.map((s) => (
                <li key={s.arrival.id}>
                  <button className="link-btn" onClick={() => onEditArrival(s.arrival)}>
                    {pigeonLabel(pigeonByRing.get(s.arrival.ringId), s.arrival.ringId)}
                  </button>
                  <div className="issue-line">
                    <IssueTags issues={s.issues} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3>未归巢（{missingRingIds.length}）</h3>
          {missingRingIds.length === 0 ? (
            <Empty>已全部归巢。</Empty>
          ) : (
            <ul className="issue-list">
              {missingRingIds.map((ringId) => (
                <li key={ringId}>
                  <button className="link-btn" onClick={() => onOpenPigeon(ringId)}>
                    {pigeonLabel(pigeonByRing.get(ringId), ringId)}
                  </button>
                  <button className="btn mini" onClick={() => onAddArrival(ringId)}>
                    补录归巢
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sub-panel">
        <h3>全部报时记录（{scored.length}，含重复报时）</h3>
        <table className="table">
          <thead>
            <tr>
              <th>足环</th>
              <th>归巢日期</th>
              <th>时刻</th>
              <th>用时</th>
              <th>分速</th>
              <th>健康</th>
              <th>状态</th>
              <th>备注</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scored.map((s) => {
              const rank = rankedById.get(s.arrival.id);
              return (
                <tr key={s.arrival.id} className={s.isDuplicate ? "row-dup" : s.isFirst && s.eligible ? "" : "row-pending"}>
                  <td>
                    <button className="link-btn" onClick={() => onOpenPigeon(s.arrival.ringId)}>
                      {s.arrival.ringId}
                    </button>
                  </td>
                  <td>
                    {s.arrival.arrivalDate}
                    {s.overnight && <Tag tone="blue">次日</Tag>}
                  </td>
                  <td>{s.arrival.arrivalTime}</td>
                  <td>{formatDuration(s.durationMs)}</td>
                  <td>{formatSpeed(s.speed)}</td>
                  <td>
                    <HealthTag health={s.arrival.health} />
                  </td>
                  <td>
                    {s.isDuplicate ? (
                      <Tag tone="gray">重复报时 · 沿用先到</Tag>
                    ) : rank ? (
                      <Tag tone="green">第 {rank} 名</Tag>
                    ) : (
                      <IssueTags issues={s.issues} />
                    )}
                  </td>
                  <td className="muted">{s.arrival.note}</td>
                  <td>
                    <button className="btn mini" onClick={() => onEditArrival(s.arrival)}>
                      更正
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
