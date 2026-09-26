import { useMemo, useState } from "react";
import { batchRanking, overallRanking } from "../domain/rules";
import type { RankingRow } from "../domain/rules";
import { formatDuration, formatSpeed } from "../domain/time";
import type { PageProps } from "./common";
import { batchLabel } from "./common";
import { Empty, Tag } from "../ui/ui";

export function RankingPage({ store, openPigeon }: PageProps) {
  const { state, analyses } = store;
  const [mode, setMode] = useState<"overall" | "batch">("overall");
  const [batchId, setBatchId] = useState<string>(analyses[0]?.batch.id ?? "");

  const rows: RankingRow[] = useMemo(() => {
    if (mode === "overall") return overallRanking(analyses, state.pigeons);
    const a = analyses.find((x) => x.batch.id === batchId);
    return a ? batchRanking(a, state.pigeons) : [];
  }, [mode, batchId, analyses, state.pigeons]);

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>训放成绩排行</h2>
          <div className="btn-row">
            <div className="seg">
              <button className={mode === "overall" ? "on" : ""} onClick={() => setMode("overall")}>
                全棚总排行
              </button>
              <button className={mode === "batch" ? "on" : ""} onClick={() => setMode("batch")}>
                按批次
              </button>
            </div>
            {mode === "batch" && (
              <select className="ctrl" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                {analyses.map((a) => (
                  <option key={a.batch.id} value={a.batch.id}>
                    {batchLabel(a.batch)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty>没有可占排行的成绩。缺距离/天气、健康异常的报时请在「待核」里补正。</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>名次</th>
                <th>足环</th>
                <th>血统</th>
                {mode === "overall" && <th>批次</th>}
                <th>归巢时刻</th>
                <th>用时</th>
                <th>距离</th>
                <th>分速（米/分）</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.arrival.id}>
                  <td className="rank-cell">
                    {s.rank <= 3 ? <span className={`medal m${s.rank}`}>{s.rank}</span> : s.rank}
                  </td>
                  <td>
                    <button className="link-btn" onClick={() => openPigeon(s.arrival.ringId)}>
                      {s.arrival.ringId}
                    </button>
                  </td>
                  <td>{s.pigeon?.bloodline || "—"}</td>
                  {mode === "overall" && <td>{batchLabel(s.batch)}</td>}
                  <td>
                    {s.arrival.arrivalDate} {s.arrival.arrivalTime}
                    {s.overnight && <Tag tone="blue">跨夜</Tag>}
                  </td>
                  <td>{formatDuration(s.durationMs)}</td>
                  <td>{s.batch.distanceKm ?? "—"} km</td>
                  <td className="speed-cell">{formatSpeed(s.speed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small">
          只有距离、天气齐全、健康正常且时刻有效的先到成绩参与排行；跨夜归巢按真实日期计时。
        </p>
      </section>
    </div>
  );
}
