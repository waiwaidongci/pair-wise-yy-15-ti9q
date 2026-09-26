import { useState } from "react";
import { LoftProvider, useLoft } from "./store/LoftContext";
import { Toasts } from "./components/ui";
import { OverviewPage } from "./pages/OverviewPage";
import { BatchesPage } from "./pages/BatchesPage";
import { RankingPage } from "./pages/RankingPage";
import { MissingPage } from "./pages/MissingPage";
import { PendingPage } from "./pages/PendingPage";
import { LoftPage } from "./pages/LoftPage";

export type TabKey =
  | "overview"
  | "batches"
  | "ranking"
  | "missing"
  | "pending"
  | "loft";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "鸽棚总览" },
  { key: "batches", label: "训放批次" },
  { key: "ranking", label: "成绩排行" },
  { key: "missing", label: "未归巢" },
  { key: "pending", label: "待核" },
  { key: "loft", label: "血统档案" },
];

function Shell() {
  const [tab, setTab] = useState<TabKey>("overview");
  const { overview, resetAll } = useLoft();

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <h1>赛鸽训放工作台</h1>
          <p>训放批次 · 归巢登记 · 排行 / 未归巢 / 待核自动重算</p>
        </div>
        <div className="top-badges">
          <span className="pill">归巢率 {(overview.homeRate * 100).toFixed(0)}%</span>
          <span className="pill pill-red">未归 {overview.missingCount}</span>
          <span className="pill pill-amber">待核 {overview.pendingCount}</span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              if (window.confirm("清空当前存档并恢复内置示例数据？")) resetAll();
            }}
          >
            重置示例
          </button>
        </div>
      </header>

      <nav className="main-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "main-tab main-tab-on" : "main-tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "missing" && overview.missingCount > 0 && (
              <i className="tab-dot">{overview.missingCount}</i>
            )}
            {t.key === "pending" && overview.pendingCount > 0 && (
              <i className="tab-dot tab-dot-amber">{overview.pendingCount}</i>
            )}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewPage go={setTab} />}
      {tab === "batches" && <BatchesPage />}
      {tab === "ranking" && <RankingPage />}
      {tab === "missing" && <MissingPage />}
      {tab === "pending" && <PendingPage />}
      {tab === "loft" && <LoftPage />}

      <footer className="foot">
        规则（src/domain）、存档（src/store）、页面（src/pages）三层分离 · 数据保存在本浏览器 localStorage
      </footer>

      <Toasts />
    </main>
  );
}

export default function App() {
  return (
    <LoftProvider>
      <Shell />
    </LoftProvider>
  );
}
