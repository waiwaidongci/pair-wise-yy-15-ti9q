import { buildPigeonProfile } from "../domain/rules";
import { formatDuration, formatSpeed } from "../domain/time";
import type { PageProps } from "./common";
import { batchLabel } from "./common";
import { Empty, HealthTag, IssueTags, Tag } from "../ui/ui";

export function PigeonProfilePage({
  store,
  ringId,
  onBack,
  openPigeon,
}: PageProps & { ringId: string; onBack: () => void }) {
  const { state, analyses } = store;
  const pf = buildPigeonProfile(state, analyses, ringId);

  if (!pf) {
    return (
      <section className="panel">
        <Empty>未找到该足环的档案。</Empty>
        <p>
          <button className="btn" onClick={onBack}>
            返回档案列表
          </button>
        </p>
      </section>
    );
  }

  const { pigeon } = pf;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <button className="btn mini" onClick={onBack}>
              ← 返回鸽棚档案
            </button>
            <h2 className="profile-title">{pigeon.ringId}</h2>
            <p className="muted">
              {pigeon.bloodline || "未填血统"} · {pigeon.sex || "性别未填"}
              {pf.mate ? ` · 配对 ${pf.mate.ringId}（${pf.mate.bloodline || "未填血统"}）` : ""}
            </p>
            {pigeon.note && <p className="muted">备注：{pigeon.note}</p>}
          </div>
          <button className="btn primary" onClick={() => openPigeon(pigeon.ringId)}>
            更正档案
          </button>
        </div>

        <div className="profile-metrics">
          <article>
            <small>训放批次</small>
            <strong>{pf.flownCount}</strong>
          </article>
          <article>
            <small>有效归巢</small>
            <strong>{pf.returnCount}</strong>
          </article>
          <article>
            <small>上榜次数</small>
            <strong>{pf.rankedCount}</strong>
          </article>
          <article>
            <small>最佳名次</small>
            <strong>{pf.bestRank === null ? "—" : `第 ${pf.bestRank} 名`}</strong>
          </article>
          <article>
            <small>平均分速</small>
            <strong>{formatSpeed(pf.avgSpeed)}</strong>
          </article>
          <article>
            <small>最高分速</small>
            <strong>{formatSpeed(pf.bestSpeed)}</strong>
          </article>
        </div>

        {pf.missingBatches.length > 0 && (
          <div className="callout warn">
            当前仍在未归巢名单：
            {pf.missingBatches.map((b) => batchLabel(b)).join("、")}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>归巢历史</h2>
        </div>
        {pf.history.length === 0 ? (
          <Empty>这羽赛鸽还没有归巢记录。</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>批次</th>
                <th>放飞</th>
                <th>归巢时刻</th>
                <th>用时</th>
                <th>距离</th>
                <th>分速</th>
                <th>名次</th>
                <th>健康</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {pf.history.map((s) => (
                <tr key={s.arrival.id} className={s.eligible ? "" : "row-pending"}>
                  <td>{batchLabel(s.batch)}</td>
                  <td>
                    {s.batch.releaseDate} {s.batch.releaseTime}
                  </td>
                  <td>
                    {s.arrival.arrivalDate} {s.arrival.arrivalTime}
                    {s.overnight && <Tag tone="blue">跨夜</Tag>}
                  </td>
                  <td>{formatDuration(s.durationMs)}</td>
                  <td>{s.batch.distanceKm === null ? "—" : `${s.batch.distanceKm}km`}</td>
                  <td>{formatSpeed(s.speed)}</td>
                  <td>{s.eligible ? `第 ${s.rank} 名` : "—"}</td>
                  <td>
                    <HealthTag health={s.arrival.health} />
                  </td>
                  <td>{s.eligible ? <Tag tone="green">有效</Tag> : <IssueTags issues={s.issues} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
