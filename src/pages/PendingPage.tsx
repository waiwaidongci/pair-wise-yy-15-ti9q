import { useMemo } from "react";
import { pendingList } from "../domain/rules";
import { formatDuration, formatSpeed } from "../domain/time";
import type { PageProps } from "./common";
import { batchLabel } from "./common";
import { Empty, HealthTag, IssueTags, Tag } from "../ui/ui";

export function PendingPage({ store, openBatch, openArrival, openPigeon }: PageProps) {
  const { state, analyses } = store;
  const pigeonByRing = useMemo(
    () => new Map(state.pigeons.map((p) => [p.ringId, p])),
    [state.pigeons]
  );
  const rows = useMemo(() => pendingList(analyses), [analyses]);

  return (
    <section className="panel stack">
      <div className="panel-head">
        <h2>待核成绩（{rows.length}）</h2>
      </div>
      <p className="muted">
        缺距离/天气、健康异常、归巢时刻早于放飞或不完整的记录只进待核，不占排行；补正后自动进入排行并从这里移出。
        重复报时列出供核对，成绩始终沿用先到记录。
      </p>
      {rows.length === 0 ? (
        <Empty>没有待核记录，成绩全部有效。</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>足环</th>
              <th>批次</th>
              <th>归巢时刻</th>
              <th>用时</th>
              <th>分速</th>
              <th>健康</th>
              <th>待核原因</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.arrival.id} className={s.isDuplicate ? "row-dup" : "row-pending"}>
                <td>
                  <button className="link-btn" onClick={() => openPigeon(s.arrival.ringId)}>
                    {s.arrival.ringId}
                  </button>
                </td>
                <td>
                  <div>{batchLabel(s.batch)}</div>
                  {(s.issues.includes("missingDistance") || s.issues.includes("missingWeather")) && (
                    <button className="btn mini" onClick={() => openBatch(s.batch.id)}>
                      补批次资料
                    </button>
                  )}
                </td>
                <td>
                  {s.arrival.arrivalDate} {s.arrival.arrivalTime}
                  {s.overnight && <Tag tone="blue">跨夜</Tag>}
                </td>
                <td>{formatDuration(s.durationMs)}</td>
                <td>{formatSpeed(s.speed)}</td>
                <td>
                  <HealthTag health={s.arrival.health} />
                </td>
                <td>
                  <IssueTags issues={s.issues} />
                </td>
                <td className="muted">{s.arrival.note || pigeonByRing.get(s.arrival.ringId)?.note}</td>
                <td>
                  <button className="btn mini" onClick={() => openArrival(s.batch.id, s.arrival)}>
                    更正报时
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
