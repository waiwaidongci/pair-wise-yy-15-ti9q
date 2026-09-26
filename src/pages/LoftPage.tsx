import { useMemo, useState } from "react";
import { useLoft } from "../store/LoftContext";
import type { Gender } from "../domain/types";
import { formatDuration, formatSpeed } from "../domain/rules";
import { Badge, Btn, Card, EmptyState } from "../components/ui";

/* ---------------- 建档表单 ---------------- */

function PigeonForm() {
  const { state, addPigeon } = useLoft();
  const [ring, setRing] = useState("");
  const [bloodline, setBloodline] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [pairRing, setPairRing] = useState("");

  return (
    <div className="pigeon-form">
      <div className="field-grid">
        <label className="field">
          <span>足环号<em>*</em></span>
          <input value={ring} onChange={(e) => setRing(e.target.value)} placeholder="如：CHN-26-009999" />
        </label>
        <label className="field">
          <span>血统</span>
          <input value={bloodline} onChange={(e) => setBloodline(e.target.value)} placeholder="如：詹森系" />
        </label>
        <label className="field">
          <span>性别</span>
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <option value="">未填</option>
            <option value="雄">雄</option>
            <option value="雌">雌</option>
          </select>
        </label>
        <label className="field">
          <span>配对足环</span>
          <input
            value={pairRing}
            onChange={(e) => setPairRing(e.target.value)}
            placeholder="配对记录（可空）"
            list="pair-ring-options"
          />
          <datalist id="pair-ring-options">
            {state.pigeons.map((p) => (
              <option key={p.ring} value={p.ring} />
            ))}
          </datalist>
        </label>
      </div>
      <Btn
        variant="primary"
        onClick={() => {
          addPigeon({ ring, bloodline, gender, pairRing });
          setRing("");
          setBloodline("");
          setGender("");
          setPairRing("");
        }}
      >
        建档
      </Btn>
    </div>
  );
}

/* ---------------- 单羽档案 ---------------- */

function ProfileDetail({ ring, onClose }: { ring: string; onClose: () => void }) {
  const { profile, state } = useLoft();
  const p = profile(ring);
  const pair = p.pigeon?.pairRing
    ? state.pigeons.find((x) => x.ring === p.pigeon!.pairRing)
    : undefined;
  const pairText = !p.pigeon?.pairRing
    ? "无"
    : p.pigeon.pairRing + (pair ? `（${pair.bloodline}）` : "（未建档）");

  return (
    <div className="profile-detail">
      <div className="profile-head">
        <div>
          <h3>
            {ring}{" "}
            <Badge tone="blue">{p.bloodline}</Badge>
            {p.pigeon?.gender && <Badge tone="gray">{p.pigeon.gender}</Badge>}
          </h3>
          <p className="muted">
            配对：{pairText}
            {" · "}有效成绩 {p.validCount} 条 · 待核 {p.pendingCount} 条 · 未归批次 {p.missingBatches.length}
          </p>
        </div>
        <Btn small onClick={onClose}>返回列表</Btn>
      </div>

      <div className="profile-best">
        <span>最佳分速</span>
        <strong>{formatSpeed(p.bestSpeedMpm)}</strong>
        {p.bestEntry && (
          <span className="muted">
            {p.bestEntry.batch.releaseDate} {p.bestEntry.batch.location} · 名次 #{p.bestEntry.row.rank}
          </span>
        )}
      </div>

      <h4>历史成绩（按放飞日期倒序）</h4>
      {p.history.length === 0 ? (
        <EmptyState text="这羽鸽还没有归巢记录。" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>批次</th>
                <th>距离/天气</th>
                <th>归巢时刻</th>
                <th>用时</th>
                <th>分速</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {p.history.map((h) => (
                <tr key={h.row.arrival.id}>
                  <td>{h.batch.releaseDate} {h.batch.location}</td>
                  <td>
                    {h.batch.distanceKm === null ? "缺距离" : `${h.batch.distanceKm}km`} ·{" "}
                    {h.batch.weather || "缺天气"}
                  </td>
                  <td>
                    {h.row.arrival.returnDate} {h.row.arrival.returnTime}
                    {h.row.overnight && <Badge tone="blue">跨夜</Badge>}
                  </td>
                  <td>{formatDuration(h.row.elapsedMs)}</td>
                  <td>{formatSpeed(h.row.speedMpm)}</td>
                  <td>
                    {h.row.status === "valid" ? (
                      <Badge tone="green">#{h.row.rank} 有效</Badge>
                    ) : (
                      <Badge tone="amber">{h.row.reasons.join("、")}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {p.missingBatches.length > 0 && (
        <>
          <h4>未归批次</h4>
          <div className="chips">
            {p.missingBatches.map((b) => (
              <Badge key={b.id} tone="red">
                {b.releaseDate} {b.location}
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- 档案列表 + 编辑 ---------------- */

function PigeonRow({ ring, onOpen }: { ring: string; onOpen: () => void }) {
  const { state, updatePigeon, removePigeon } = useLoft();
  const pigeon = state.pigeons.find((p) => p.ring === ring)!;
  const profile = useLoft().profile(ring);
  const [editing, setEditing] = useState(false);
  const [bloodline, setBloodline] = useState(pigeon.bloodline);
  const [gender, setGender] = useState<Gender>(pigeon.gender);
  const [pairRing, setPairRing] = useState(pigeon.pairRing);

  return (
    <div className="pigeon-row">
      <div className="pigeon-line" onClick={onOpen}>
        <strong>{pigeon.ring}</strong>
        <Badge tone="blue">{pigeon.bloodline || "未填血统"}</Badge>
        {pigeon.gender && <Badge tone="gray">{pigeon.gender}</Badge>}
        <span className="muted">
          有效 {profile.validCount} · 待核 {profile.pendingCount} · 最佳 {formatSpeed(profile.bestSpeedMpm)}
        </span>
      </div>
      <div className="pigeon-ops">
        <Btn small onClick={onOpen}>档案</Btn>
        <Btn small onClick={() => setEditing((v) => !v)}>{editing ? "收起" : "编辑"}</Btn>
        <Btn
          small
          variant="danger"
          onClick={() => {
            if (window.confirm(`删除 ${pigeon.ring}？其全部批次名单与成绩会一并移除。`)) {
              removePigeon(pigeon.ring);
            }
          }}
        >
          删除
        </Btn>
      </div>
      {editing && (
        <div className="correct-box">
          <label className="field">
            <span>血统</span>
            <input value={bloodline} onChange={(e) => setBloodline(e.target.value)} />
          </label>
          <label className="field">
            <span>性别</span>
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="">未填</option>
              <option value="雄">雄</option>
              <option value="雌">雌</option>
            </select>
          </label>
          <label className="field">
            <span>配对足环</span>
            <input value={pairRing} onChange={(e) => setPairRing(e.target.value)} list="pair-ring-options" />
          </label>
          <Btn
            small
            variant="primary"
            onClick={() => {
              updatePigeon(pigeon.ring, { bloodline, gender, pairRing });
              setEditing(false);
            }}
          >
            保存
          </Btn>
        </div>
      )}
    </div>
  );
}

/* ---------------- 血统筛选历史成绩 ---------------- */

function BloodlinePanel() {
  const { state, bloodlineStats, bloodlineHistory } = useLoft();
  const bloodlines = useMemo(
    () => Array.from(new Set(state.pigeons.map((p) => p.bloodline).filter(Boolean))).sort(),
    [state.pigeons],
  );
  const [pick, setPick] = useState<string>("");
  const selected = pick || bloodlines[0] || "";
  const stats = bloodlineStats;
  const members = selected ? bloodlineHistory(selected) : [];

  return (
    <>
      <div className="chips">
        {bloodlines.map((b) => (
          <button
            key={b}
            type="button"
            className={b === selected ? "chip chip-on" : "chip"}
            onClick={() => setPick(b)}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="blood-stat-grid">
        {stats
          .filter((s) => s.bloodline === selected)
          .map((s) => (
            <div key={s.bloodline} className="blood-stat">
              <span>在册 {s.pigeonCount} 羽</span>
              <span>有效成绩 {s.validCount} 条</span>
              <span>待核 {s.pendingCount} 条</span>
              <span>平均 {formatSpeed(s.avgSpeedMpm)}</span>
              <strong>最佳 {formatSpeed(s.bestSpeedMpm)}</strong>
            </div>
          ))}
      </div>

      {members.map(({ ring, profile }) => (
        <div key={ring} className="blood-member">
          <h4>
            {ring}
            <Badge tone="gray">有效 {profile.validCount}</Badge>
            <Badge tone="green">最佳 {formatSpeed(profile.bestSpeedMpm)}</Badge>
          </h4>
          {profile.validHistory.length === 0 ? (
            <p className="muted">暂无有效历史成绩。</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>地点</th>
                    <th>距离</th>
                    <th>用时</th>
                    <th>分速</th>
                    <th>名次</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.validHistory.map((h) => (
                    <tr key={h.row.arrival.id}>
                      <td>{h.batch.releaseDate}</td>
                      <td>{h.batch.location}</td>
                      <td>{h.batch.distanceKm === null ? "—" : `${h.batch.distanceKm}km`}</td>
                      <td>{formatDuration(h.row.elapsedMs)}</td>
                      <td>{formatSpeed(h.row.speedMpm)}</td>
                      <td>#{h.row.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function LoftPage() {
  const { state } = useLoft();
  const [openRing, setOpenRing] = useState<string | null>(null);
  const [mode, setMode] = useState<"book" | "bloodline">("book");

  return (
    <div className="stack">
      <div className="tabs-inner">
        <button className={mode === "book" ? "tab tab-on" : "tab"} onClick={() => setMode("book")}>
          鸽棚档案（{state.pigeons.length}）
        </button>
        <button className={mode === "bloodline" ? "tab tab-on" : "tab"} onClick={() => setMode("bloodline")}>
          按血统筛选历史成绩
        </button>
      </div>

      {mode === "book" ? (
        openRing ? (
          <Card subtitle="单羽赛鸽档案" title={openRing}>
            <ProfileDetail ring={openRing} onClose={() => setOpenRing(null)} />
          </Card>
        ) : (
          <>
            <Card subtitle="新鸽建档" title="足环号 / 血统 / 配对记录">
              <PigeonForm />
            </Card>
            <Card subtitle="鸽棚名册" title="单羽赛鸽档案入口">
              {state.pigeons.length === 0 ? (
                <EmptyState text="鸽棚还没有档案，先在上方建档。" />
              ) : (
                <div className="pigeon-list">
                  {state.pigeons
                    .slice()
                    .sort((a, b) => a.ring.localeCompare(b.ring, "zh-CN"))
                    .map((p) => (
                      <PigeonRow key={p.ring} ring={p.ring} onOpen={() => setOpenRing(p.ring)} />
                    ))}
                </div>
              )}
            </Card>
          </>
        )
      ) : (
        <Card subtitle="血统档案" title="按血统筛选历史成绩">
          <BloodlinePanel />
        </Card>
      )}
    </div>
  );
}
