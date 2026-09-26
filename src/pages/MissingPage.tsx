import { useState } from "react";
import { useLoft } from "../store/LoftContext";
import { Badge, Btn, Card, EmptyState } from "../components/ui";
import { HEALTH_OPTIONS, type HealthStatus } from "../domain/types";

export function MissingPage() {
  const { missing, views } = useLoft();
  // 正在补录的键：batchId__ring
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="stack">
      <Card subtitle="未归巢提醒" title="未归巢名单（补录归巢后自动移出）">
        {missing.length === 0 ? (
          <EmptyState text="没有未归巢鸽，所有放飞足环都已报归巢。" />
        ) : (
          <div className="missing-groups">
            {views.map((v) => {
              const items = missing.filter((m) => m.batchId === v.batch.id);
              if (items.length === 0) return null;
              return (
                <div key={v.batch.id} className="missing-group">
                  <h3>
                    {v.batch.releaseDate} {v.batch.location}
                    {v.batch.distanceKm === null ? (
                      <Badge tone="amber">缺距离</Badge>
                    ) : (
                      <Badge tone="blue">{v.batch.distanceKm}km</Badge>
                    )}
                    <Badge tone="red">未归 {items.length}</Badge>
                  </h3>
                  <div className="missing-rows">
                    {items.map((m) => {
                      const key = `${m.batchId}__${m.ring}`;
                      const isActive = active === key;
                      return (
                        <QuickReturn
                          key={key}
                          batchId={m.batchId}
                          ring={m.ring}
                          bloodline={m.bloodline}
                          open={isActive}
                          onToggle={() => setActive(isActive ? null : key)}
                          onSaved={() => {
                            // 保存后收起；补录成功后该羽自动从未归巢名单消失
                            setActive(null);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function QuickReturn({
  batchId,
  ring,
  bloodline,
  open,
  onToggle,
  onSaved,
}: {
  batchId: string;
  ring: string;
  bloodline: string;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const { state, report } = useLoft();
  const batch = state.batches.find((b) => b.id === batchId)!;
  const [date, setDate] = useState(batch.releaseDate);
  const [time, setTime] = useState("12:00");
  const [health, setHealth] = useState<HealthStatus>("正常");

  const overnight = date !== batch.releaseDate;

  return (
    <div className="quick-row">
      <div className="quick-head">
        <strong>{ring}</strong>
        <span className="muted">{bloodline}</span>
        <Btn small variant="primary" onClick={onToggle}>
          {open ? "收起" : "补录归巢"}
        </Btn>
      </div>
      {open && (
        <div className="correct-box">
          <label className="field">
            <span>归巢日期</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>归巢时刻</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="field">
            <span>健康</span>
            <select value={health} onChange={(e) => setHealth(e.target.value as HealthStatus)}>
              <option value="">未登记（待核）</option>
              {HEALTH_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <div className="quick-save">
            {overnight && <Badge tone="blue">跨夜归巢</Badge>}
            <Btn
              small
              variant="primary"
              onClick={() => {
                report({ batchId, ring, returnDate: date, returnTime: time, health });
                onSaved();
              }}
            >
              保存并移出名册
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
