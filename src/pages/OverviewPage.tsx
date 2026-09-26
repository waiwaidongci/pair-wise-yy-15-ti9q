import type { PageProps } from "./common";
import { batchLabel, pigeonLabel } from "./common";
import { pct } from "../domain/rules";
import { formatDuration, formatSpeed } from "../domain/time";
import { Empty, HealthTag, IssueTags, Tag } from "../ui/ui";

export function OverviewPage({ store, go }: PageProps) {
  const { state, overview, analyses } = store;
  const pigeonByRing = new Map(state.pigeons.map((p) => [p.ringId, p]));

  return (
    <div className="stack">
      <div className="metric-grid">
        <article className="metric">
          <small>归巢率</small>
          <strong>{pct(overview.returnRate)}</strong>
          <span>{overview.returnCount} / {overview.releasedCount} 羽次</span>
        </article>
        <article className="metric">
          <small>平均速度（占排行成绩）</small>
          <strong>{formatSpeed(overview.avgSpeed)}</strong>
          <span>米/分</span>
        </article>
        <article className="metric metric-link" onClick={() => go("missing")}>
          <small>未归巢</small>
          <strong className={overview.missingCount ? "num-warn" : ""}>{overview.missingCount}</strong>
          <span>条待归名单，点击查看</span>
        </article>
        <article className="metric metric-link" onClick={() => go("pending")}>
          <small>待核成绩</small>
          <strong className={overview.pendingCount ? "num-warn" : ""}>{overview.pendingCount}</strong>
          <span>缺距离/天气、健康异常等</span>
        </article>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>最近归巢</h2>
            <button className="btn" onClick={() => go("batches")}>
              去批次登记
            </button>
          </div>
          {overview.latestResults.length === 0 ? (
            <Empty>还没有归巢报时。</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>足环</th>
                  <th>批次</th>
                  <th>归巢时刻</th>
                  <th>用时</th>
                  <th>分速</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {overview.latestResults.map((s) => (
                  <tr key={s.arrival.id}>
                    <td>{pigeonLabel(pigeonByRing.get(s.arrival.ringId), s.arrival.ringId)}</td>
                    <td>{batchLabel(s.batch)}</td>
                    <td>
                      {s.arrival.arrivalDate} {s.arrival.arrivalTime}
                      {s.overnight && <Tag tone="blue">跨夜</Tag>}
                    </td>
                    <td>{formatDuration(s.durationMs)}</td>
                    <td>{formatSpeed(s.speed)}</td>
                    <td>
                      <HealthTag health={s.arrival.health} />
                      {!s.eligible && <IssueTags issues={s.issues} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>批次概览</h2>
          </div>
          <div className="batch-summary-list">
            {analyses.length === 0 && <Empty>还没有训放批次。</Empty>}
            {analyses.map((a) => (
              <article key={a.batch.id} className="batch-summary">
                <div>
                  <h3>{batchLabel(a.batch)}</h3>
                  <p>
                    {a.batch.releaseDate} {a.batch.releaseTime} 放飞 · {a.batch.location} ·{" "}
                    {a.batch.distanceKm === null ? "距离未登记" : `${a.batch.distanceKm}km`} ·{" "}
                    {a.batch.weather.trim() || "天气未登记"}
                  </p>
                </div>
                <div className="batch-summary-nums">
                  <span>归巢 {a.returnCount}/{a.releasedCount}</span>
                  <span>上榜 {a.rankedCount}</span>
                  {a.pending.length > 0 && <Tag tone="orange">待核 {a.pending.length}</Tag>}
                  {a.missingRingIds.length > 0 && <Tag tone="red">未归 {a.missingRingIds.length}</Tag>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel rules-card">
        <h2>工作台规则</h2>
        <ul>
          <li>每批登记放飞日期、时刻、地点、距离与天气；按足环登记归巢日期、时刻与健康。</li>
          <li>跨夜归巢按真实日期先后计算用时——次日凌晨归巢不再被误判为「早于放飞」。</li>
          <li>同羽同批只保留一条有效成绩：重复报时沿用真实归巢最早的先到记录，其余不占排行。</li>
          <li>批次缺距离、缺天气，或健康异常、时刻有误的成绩只进待核，不占排行。</li>
          <li>已放飞未归巢的赛鸽自动进入未归巢名单；补录归巢后自动移出。</li>
          <li>任何成绩更正后，排行、总览与血统档案全部自动重算。</li>
        </ul>
      </section>
    </div>
  );
}
