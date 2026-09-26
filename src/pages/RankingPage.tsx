import { useMemo, useState } from "react";
import { useLoft } from "../store/LoftContext";
import { formatDuration, formatSpeed } from "../domain/rules";
import { Badge, Card, EmptyState } from "../components/ui";

export function RankingPage() {
  const { views, state } = useLoft();
  const [batchId, setBatchId] = useState<string>("all");
  const [bloodline, setBloodline] = useState<string>("all");
  const [showPending, setShowPending] = useState(true);

  const bloodlines = useMemo(
    () => Array.from(new Set(state.pigeons.map((p) => p.bloodline))).sort(),
    [state.pigeons],
  );

  const rows = useMemo(() => {
    const picked = batchId === "all" ? views : views.filter((v) => v.batch.id === batchId);
    return picked.flatMap((v) =>
      v.validRows
        .filter((r) => bloodline === "all" || r.bloodline === bloodline)
        .map((r) => ({ v, r })),
    );
  }, [views, batchId, bloodline]);

  const pending = useMemo(() => {
    const picked = batchId === "all" ? views : views.filter((v) => v.batch.id === batchId);
    return picked.flatMap((v) =>
      v.pendingRows
        .filter((r) => bloodline === "all" || r.bloodline === bloodline)
        .map((r) => ({ v, r })),
    );
  }, [views, batchId, bloodline]);

  return (
    <div className="stack">
      <Card subtitle="训放成绩排行" title="有效成绩排行（待核不占位）">
        <div className="filters">
          <label className="field inline-field">
            <span>批次</span>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="all">全部批次</option>
              {views.map((v) => (
                <option key={v.batch.id} value={v.batch.id}>
                  {v.batch.releaseDate} {v.batch.location}（{v.batch.distanceKm === null ? "缺距离" : `${v.batch.distanceKm}km`}）
                </option>
              ))}
            </select>
          </label>
          <label className="field inline-field">
            <span>血统</span>
            <select value={bloodline} onChange={(e) => setBloodline(e.target.value)}>
              <option value="all">全部血统</option>
              {bloodlines.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={showPending}
              onChange={(e) => setShowPending(e.target.checked)}
            />
            同时显示待核（{pending.length}）
          </label>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>名次</th>
                <th>足环号</th>
                <th>血统</th>
                <th>批次</th>
                <th>归巢时刻</th>
                <th>用时</th>
                <th>分速</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ v, r }) => (
                <tr key={r.arrival.id}>
                  <td><b className="rank-no">#{r.rank}</b></td>
                  <td>{r.ring}</td>
                  <td>{r.bloodline}</td>
                  <td>{v.batch.releaseDate} {v.batch.location} {v.batch.distanceKm}km</td>
                  <td>
                    {r.arrival.returnDate} {r.arrival.returnTime}
                    {r.overnight && <Badge tone="blue">跨夜</Badge>}
                  </td>
                  <td>{formatDuration(r.elapsedMs)}</td>
                  <td>{formatSpeed(r.speedMpm)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState text="当前筛选下没有有效成绩；待核记录需补齐距离/天气/健康后才进入排行。" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showPending && pending.length > 0 && (
        <Card subtitle="待核队列" title={`待核记录（${pending.length}）— 不占排行`}>
          <div className="table-wrap">
            <table className="data-table pending-table">
              <thead>
                <tr>
                  <th>足环号</th>
                  <th>批次</th>
                  <th>归巢时刻</th>
                  <th>用时</th>
                  <th>待核原因</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(({ v, r }) => (
                  <tr key={r.arrival.id}>
                    <td>{r.ring}</td>
                    <td>{v.batch.releaseDate} {v.batch.location}</td>
                    <td>{r.arrival.returnDate} {r.arrival.returnTime}</td>
                    <td>{formatDuration(r.elapsedMs)}</td>
                    <td><Badge tone="amber">{r.reasons.join("、")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
