import { useMemo, useState } from "react";
import { buildPigeonProfile, historyByBloodline } from "../domain/rules";
import { formatDuration, formatSpeed } from "../domain/time";
import type { PageProps } from "./common";
import { batchLabel } from "./common";
import { Empty, HealthTag, Tag } from "../ui/ui";

export function PigeonsPage({ store, openPigeon }: PageProps) {
  const { state, analyses } = store;
  const bloodlines = useMemo(
    () => Array.from(new Set(state.pigeons.map((p) => p.bloodline).filter(Boolean))).sort(),
    [state.pigeons]
  );
  const [bloodline, setBloodline] = useState<string>("__all__");

  const profiles = useMemo(
    () =>
      state.pigeons.map((p) => buildPigeonProfile(state, analyses, p.ringId)).filter((p) => p !== null),
    [state, analyses]
  );
  const filteredProfiles =
    bloodline === "__all__" ? profiles : profiles.filter((p) => p!.pigeon.bloodline === bloodline);

  const history = useMemo(
    () => historyByBloodline(analyses, state.pigeons, bloodline),
    [analyses, state.pigeons, bloodline]
  );

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>鸽棚档案（{profiles.length} 羽）</h2>
          <button className="btn primary" onClick={() => openPigeon()}>
            新赛鸽
          </button>
        </div>
        <div className="filter-chips">
          <button className={`chip ${bloodline === "__all__" ? "on" : ""}`} onClick={() => setBloodline("__all__")}>
            全部血统
          </button>
          {bloodlines.map((b) => (
            <button key={b} className={`chip ${bloodline === b ? "on" : ""}`} onClick={() => setBloodline(b)}>
              {b}
            </button>
          ))}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>足环号</th>
              <th>血统</th>
              <th>性别</th>
              <th>训放</th>
              <th>归巢</th>
              <th>上榜</th>
              <th>最佳名次</th>
              <th>平均分速</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <Empty>该血统下暂无赛鸽。</Empty>
                </td>
              </tr>
            )}
            {filteredProfiles.map((pf) => (
              <tr key={pf!.pigeon.ringId}>
                <td>
                  <button className="link-btn strong" onClick={() => openPigeon(pf!.pigeon.ringId)}>
                    {pf!.pigeon.ringId}
                  </button>
                </td>
                <td>{pf!.pigeon.bloodline || "—"}</td>
                <td>{pf!.pigeon.sex || "—"}</td>
                <td>{pf!.flownCount}</td>
                <td>{pf!.returnCount}</td>
                <td>{pf!.rankedCount}</td>
                <td>{pf!.bestRank === null ? "—" : `第 ${pf!.bestRank} 名`}</td>
                <td>{formatSpeed(pf!.avgSpeed)}</td>
                <td>
                  {pf!.missingBatches.length > 0 ? (
                    <Tag tone="red">{pf!.missingBatches.length} 批未归</Tag>
                  ) : pf!.flownCount > 0 ? (
                    <Tag tone="green">在棚</Tag>
                  ) : (
                    <Tag>未训放</Tag>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>按血统筛选历史成绩{bloodline !== "__all__" ? ` · ${bloodline}` : ""}</h2>
        </div>
        {history.length === 0 ? (
          <Empty>暂无成绩记录。</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>归巢日期</th>
                <th>足环</th>
                <th>血统</th>
                <th>批次</th>
                <th>用时</th>
                <th>分速</th>
                <th>名次</th>
                <th>健康</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.arrival.id} className={s.eligible ? "" : "row-pending"}>
                  <td>
                    {s.arrival.arrivalDate}
                    {s.overnight && <Tag tone="blue">跨夜</Tag>}
                  </td>
                  <td>
                    <button className="link-btn" onClick={() => openPigeon(s.arrival.ringId)}>
                      {s.arrival.ringId}
                    </button>
                  </td>
                  <td>{s.pigeon?.bloodline || "—"}</td>
                  <td>{batchLabel(s.batch)}</td>
                  <td>{formatDuration(s.durationMs)}</td>
                  <td>{formatSpeed(s.speed)}</td>
                  <td>{s.eligible ? `第 ${s.rank} 名` : "—"}</td>
                  <td>
                    <HealthTag health={s.arrival.health} />
                  </td>
                  <td>{s.eligible ? <Tag tone="green">有效</Tag> : <Tag tone="orange">待核</Tag>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
