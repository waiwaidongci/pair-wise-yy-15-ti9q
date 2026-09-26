import { useMemo } from "react";
import { missingList } from "../domain/rules";
import type { PageProps } from "./common";
import { batchLabel } from "./common";
import { Empty, Tag } from "../ui/ui";

export function MissingPage({ store, openArrival, openPigeon }: PageProps) {
  const { state, analyses } = store;
  const pigeonByRing = useMemo(
    () => new Map(state.pigeons.map((p) => [p.ringId, p])),
    [state.pigeons]
  );
  const entries = useMemo(() => missingList(analyses), [analyses]);

  const grouped = analyses.map((a) => ({
    batch: a.batch,
    rings: a.missingRingIds,
  }));

  return (
    <section className="panel stack">
      <div className="panel-head">
        <h2>未归巢名单（{entries.length}）</h2>
      </div>
      <p className="muted">
        已在放飞名单、但本批尚无归巢报时的赛鸽自动列出；补录归巢后立即移出，归巢率与排行同步重算。
      </p>
      {entries.length === 0 ? (
        <Empty>全部到齐，没有未归巢记录。</Empty>
      ) : (
        <div className="missing-groups">
          {grouped
            .filter((g) => g.rings.length > 0)
            .map((g) => (
              <article key={g.batch.id} className="missing-group">
                <header>
                  <div>
                    <h3>{batchLabel(g.batch)}</h3>
                    <p className="muted">
                      {g.batch.releaseDate} {g.batch.releaseTime} 放飞 · {g.batch.location} ·{" "}
                      已归 {g.batch.releasedRingIds.length - g.rings.length}/{g.batch.releasedRingIds.length}
                    </p>
                  </div>
                  <Tag tone="red">{g.rings.length} 羽未归</Tag>
                </header>
                <div className="missing-cards">
                  {g.rings.map((ringId) => {
                    const p = pigeonByRing.get(ringId);
                    return (
                      <div key={ringId} className="missing-card">
                        <div>
                          <button className="link-btn strong" onClick={() => openPigeon(ringId)}>
                            {ringId}
                          </button>
                          <p className="muted">
                            {p?.bloodline || "未填血统"}
                            {p?.sex ? ` · ${p.sex}` : ""}
                          </p>
                        </div>
                        <button
                          className="btn primary mini"
                          onClick={() => openArrival(g.batch.id, undefined, ringId)}
                        >
                          补录归巢
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}
