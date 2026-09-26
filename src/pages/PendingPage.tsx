import { useEffect, useState } from "react";
import { useLoft } from "../store/LoftContext";
import { Badge, Btn, Card, EmptyState } from "../components/ui";
import { ArrivalRowCard } from "../components/ArrivalForms";

function BatchFix({ batchId }: { batchId: string }) {
  const { state, updateBatch } = useLoft();
  const batch = state.batches.find((b) => b.id === batchId)!;
  const [distance, setDistance] = useState(batch.distanceKm === null ? "" : String(batch.distanceKm));
  const [weather, setWeather] = useState(batch.weather);

  // 外部更正批次后同步本地输入
  useEffect(() => {
    setDistance(batch.distanceKm === null ? "" : String(batch.distanceKm));
    setWeather(batch.weather);
  }, [batch.distanceKm, batch.weather]);

  const dirty =
    distance !== (batch.distanceKm === null ? "" : String(batch.distanceKm)) ||
    weather !== batch.weather;

  const needsFix =
    batch.distanceKm === null || !(batch.distanceKm > 0) || batch.weather.trim() === "";

  if (!needsFix) return null;

  return (
    <div className="pending-batch-fix">
      <Badge tone="amber">批次信息待补：补录后该批正常记录自动进入排行</Badge>
      <div className="correct-box">
        <label className="field">
          <span>距离（公里）</span>
          <input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="缺距离" />
        </label>
        <label className="field">
          <span>天气</span>
          <input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="缺天气" />
        </label>
        <Btn
          small
          variant="primary"
          disabled={!dirty}
          onClick={() =>
            updateBatch(batch.id, {
              distanceKm: distance.trim() === "" ? null : Number(distance),
              weather,
            })
          }
        >
          补录并重算
        </Btn>
      </div>
    </div>
  );
}

export function PendingPage() {
  const { views } = useLoft();
  const groups = views.filter((v) => v.pendingRows.length > 0);

  return (
    <div className="stack">
      <Card subtitle="待核队列" title="只进待核、不占排行的归巢记录">
        <p className="muted rules-line">
          缺距离、缺天气、健康异常或未登记健康、归巢早于放飞的记录都在此处；
          补全批次信息或在成绩上点「更正」后，排行 / 总览 / 血统档案立即重算。
        </p>
        {groups.length === 0 && <EmptyState text="没有待核记录，所有归巢成绩均有效。" />}
      </Card>

      {groups.map((v) => (
        <Card
          key={v.batch.id}
          subtitle={`${v.batch.releaseDate} ${v.batch.releaseTime}`}
          title={`${v.batch.location} · ${v.batch.distanceKm === null ? "缺距离" : `${v.batch.distanceKm}km`} · ${v.batch.weather || "缺天气"}`}
        >
          <BatchFix batchId={v.batch.id} />
          <div className="rank-list">
            {v.pendingRows.map((r) => (
              <ArrivalRowCard key={r.arrival.id} row={r} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
