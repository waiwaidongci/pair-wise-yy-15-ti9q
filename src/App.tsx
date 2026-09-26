import { useRef, useState } from "react";
import "./styles.css";
import { useLoftStore } from "./store";
import type { Arrival, Batch } from "./domain/types";
import { Modal } from "./ui/ui";
import { ArrivalForm, BatchForm, PigeonForm } from "./ui/forms";
import { OverviewPage } from "./pages/OverviewPage";
import { BatchesPage } from "./pages/BatchesPage";
import { RankingPage } from "./pages/RankingPage";
import { PendingPage } from "./pages/PendingPage";
import { MissingPage } from "./pages/MissingPage";
import { PigeonsPage } from "./pages/PigeonsPage";
import { PigeonProfilePage } from "./pages/PigeonProfilePage";
import type { TabKey } from "./pages/common";
import { batchLabel } from "./pages/common";

type ModalState =
  | { kind: "batch"; id?: string }
  | { kind: "arrival"; batchId: string; arrival?: Arrival; defaultRing?: string }
  | { kind: "pigeon"; ringId?: string }
  | null;

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "鸽棚总览" },
  { key: "batches", label: "训放批次" },
  { key: "ranking", label: "成绩排行" },
  { key: "pending", label: "待核" },
  { key: "missing", label: "未归巢" },
  { key: "pigeons", label: "鸽棚档案" },
];

function App() {
  const store = useLoftStore();
  const [tab, setTab] = useState<TabKey>("overview");
  const [modal, setModal] = useState<ModalState>(null);
  const [profileRing, setProfileRing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pageProps = {
    store,
    go: (t: TabKey) => {
      setProfileRing(null);
      setTab(t);
    },
    openBatch: (id?: string) => setModal({ kind: "batch", id }),
    openArrival: (batchId: string, arrival?: Arrival, defaultRing?: string) =>
      setModal({ kind: "arrival", batchId, arrival, defaultRing }),
    openPigeon: (ringId?: string) => {
      if (ringId) {
        setProfileRing(ringId);
        setTab("pigeons");
      } else {
        setModal({ kind: "pigeon" });
      }
    },
  };

  const editingBatch: Batch | undefined =
    modal?.kind === "batch" ? store.state.batches.find((b) => b.id === modal.id) : undefined;
  const editingArrival: Arrival | undefined =
    modal?.kind === "arrival"
      ? store.state.arrivals.find((a) => a.id === modal.arrival?.id)
      : undefined;
  const editingPigeon =
    modal?.kind === "pigeon" && modal.ringId
      ? store.state.pigeons.find((p) => p.ringId === modal.ringId)
      : undefined;
  const arrivalBatch =
    modal?.kind === "arrival" ? store.state.batches.find((b) => b.id === modal.batchId) : undefined;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>赛鸽训放工作台</h1>
          <small>训放批次 · 跨夜计时 · 有效成绩 · 血统档案</small>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={store.doExport}>
            导出存档
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            导入存档
          </button>
          <button
            className="btn"
            onClick={() => {
              if (window.confirm("恢复演示数据将覆盖当前全部记录，确定吗？")) store.doReset();
            }}
          >
            恢复演示
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) store.doImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => {
          const badge =
            t.key === "pending"
              ? store.overview.pendingCount
              : t.key === "missing"
                ? store.overview.missingCount
                : 0;
          return (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "on" : ""}`}
              onClick={() => {
                setProfileRing(null);
                setTab(t.key);
              }}
            >
              {t.label}
              {badge > 0 && <span className="badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <main className="content">
        {tab === "overview" && <OverviewPage {...pageProps} />}
        {tab === "batches" && <BatchesPage {...pageProps} />}
        {tab === "ranking" && <RankingPage {...pageProps} />}
        {tab === "pending" && <PendingPage {...pageProps} />}
        {tab === "missing" && <MissingPage {...pageProps} />}
        {tab === "pigeons" &&
          (profileRing ? (
            <PigeonProfilePage {...pageProps} ringId={profileRing} onBack={() => setProfileRing(null)} />
          ) : (
            <PigeonsPage {...pageProps} />
          ))}
      </main>

      {/* 弹窗：规则在 domain，存档在 data，页面只负责收集输入 */}
      {modal?.kind === "batch" && (
        <Modal
          wide
          title={editingBatch ? `更正批次 · ${batchLabel(editingBatch)}` : "登记训放批次"}
          onClose={() => setModal(null)}
        >
          <BatchForm
            pigeons={store.state.pigeons}
            original={editingBatch}
            onSubmit={(draft) => {
              const id = store.saveBatch(draft, editingBatch?.id);
              if (id) setModal(null);
            }}
            onCancel={() => setModal(null)}
            onDelete={
              editingBatch
                ? () => {
                    if (window.confirm("删除该批次及其全部报时记录？")) {
                      store.deleteBatch(editingBatch.id);
                      setModal(null);
                    }
                  }
                : undefined
            }
          />
        </Modal>
      )}

      {modal?.kind === "arrival" && arrivalBatch && (
        <Modal
          title={editingArrival ? "更正归巢报时" : `登记归巢 · ${batchLabel(arrivalBatch)}`}
          onClose={() => setModal(null)}
        >
          <ArrivalForm
            batch={arrivalBatch}
            pigeons={store.state.pigeons}
            original={editingArrival}
            defaultRing={modal.defaultRing}
            onSubmit={(draft) => {
              if (store.saveArrival(arrivalBatch.id, draft, editingArrival?.id)) setModal(null);
            }}
            onCancel={() => setModal(null)}
            onDelete={
              editingArrival
                ? () => {
                    if (window.confirm("删除这条报时记录？若为先到记录，有效成绩将重算。")) {
                      store.deleteArrival(editingArrival.id);
                      setModal(null);
                    }
                  }
                : undefined
            }
          />
        </Modal>
      )}

      {modal?.kind === "pigeon" && (
        <Modal title={editingPigeon ? `更正档案 · ${editingPigeon.ringId}` : "登记赛鸽"} onClose={() => setModal(null)}>
          <PigeonForm
            pigeons={store.state.pigeons}
            original={editingPigeon}
            onSubmit={(draft) => {
              if (store.savePigeon(draft, editingPigeon?.ringId)) setModal(null);
            }}
            onCancel={() => setModal(null)}
            onDelete={
              editingPigeon
                ? () => {
                    if (window.confirm("删除该赛鸽档案及其全部报时记录？")) {
                      store.deletePigeon(editingPigeon.ringId);
                      setModal(null);
                    }
                  }
                : undefined
            }
          />
        </Modal>
      )}

      <div className="toast-stack">
        {store.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === "warn" ? "warn" : ""}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
