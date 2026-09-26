import { useLoft } from "../store/LoftContext";
import { formatSpeed } from "../domain/rules";
import { Badge, Card } from "../components/ui";
import type { TabKey } from "../App";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <article className="metric">
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <span>{sub}</span>}
    </article>
  );
}

export function OverviewPage({ go }: { go: (t: TabKey) => void }) {
  const { overview, views, missing } = useLoft();

  return (
    <div className="stack">
      <div className="metrics">
        <Metric
          label="累计归巢率"
          value={`${(overview.homeRate * 100).toFixed(1)}%`}
          sub={`${overview.homeCount} / ${overview.releasedCount} 羽次`}
        />
        <Metric label="平均分速" value={formatSpeed(overview.avgSpeedMpm)} sub="仅统计有效成绩" />
        <Metric
          label="未归巢"
          value={String(overview.missingCount)}
          sub="羽次 · 补录后自动移出"
        />
        <Metric
          label="待核记录"
          value={String(overview.pendingCount)}
          sub="缺距离/天气或健康异常"
        />
        <Metric label="在册赛鸽" value={String(overview.pigeonCount)} sub="羽" />
        <Metric label="训放批次" value={String(overview.batchCount)} sub="批" />
      </div>

      <Card subtitle="跨夜规则" title="凌晨归巢如何算用时">
        <ul className="rules">
          <li>归巢分别登记<strong>归巢日期与时刻</strong>；次日凌晨到家时把归巢日期选成次日，用时按真实时间先后计算，不会被判成“早于放飞”。</li>
          <li>同羽同批只有<strong>一条有效成绩</strong>：重复报时沿用先到记录；确属报错请在成绩上点「更正」。</li>
          <li><strong>缺距离、缺天气、健康异常（含未登记健康）</strong>的归巢记录只进「待核」，不占排行；补齐信息后自动进入排行。</li>
          <li>放飞名单里尚未报归巢的足环进入<strong>未归巢名单</strong>，补录归巢后自动移出。</li>
          <li>任何成绩或批次更正后，<strong>排行、总览、血统档案</strong>都会重算。</li>
        </ul>
      </Card>

      <Card
        subtitle="批次总览"
        title="各批次一览"
        actions={
          <button className="btn" onClick={() => go("batches")}>
            去训放批次
          </button>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>放飞日期</th>
                <th>地点</th>
                <th>距离</th>
                <th>天气</th>
                <th>归巢率</th>
                <th>平均分速</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {views.map((v) => (
                <tr key={v.batch.id}>
                  <td>{v.batch.releaseDate} {v.batch.releaseTime}</td>
                  <td>{v.batch.location}</td>
                  <td>{v.batch.distanceKm === null ? "缺距离" : `${v.batch.distanceKm} km`}</td>
                  <td>{v.batch.weather || "缺天气"}</td>
                  <td>{(v.homeRate * 100).toFixed(0)}%（{v.homeCount}/{v.releasedCount}）</td>
                  <td>{formatSpeed(v.avgSpeedMpm)}</td>
                  <td>
                    {v.pendingRows.length > 0 && <Badge tone="amber">待核 {v.pendingRows.length}</Badge>}{" "}
                    {v.missingRings.length > 0 && <Badge tone="red">未归 {v.missingRings.length}</Badge>}
                    {v.pendingRows.length === 0 && v.missingRings.length === 0 && <Badge tone="green">齐</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        subtitle="未归巢提醒"
        title={`未归巢名单（${missing.length}）`}
        actions={
          <button className="btn" onClick={() => go("missing")}>
            去补录
          </button>
        }
      >
        {missing.length === 0 ? (
          <p className="muted">各批次放飞名单均已报归巢。</p>
        ) : (
          <div className="chips">
            {missing.slice(0, 20).map((m) => (
              <Badge key={`${m.batchId}-${m.ring}`} tone="red">
                {m.ring} · {m.batch.location}
              </Badge>
            ))}
            {missing.length > 20 && <Badge tone="gray">另 {missing.length - 20} 条…</Badge>}
          </div>
        )}
      </Card>
    </div>
  );
}
