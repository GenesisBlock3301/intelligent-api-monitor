import { Activity, AlertTriangle, Boxes, Database, FlaskConical, Radio, RefreshCw, Settings, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { IncidentTable } from "./components/IncidentTable";
import { IncidentDetailsSheet } from "./components/IncidentDetailsSheet";
import { SettingsPanel } from "./components/SettingsPanel";
import { TestEventForm } from "./components/TestEventForm";
import { SummaryCard } from "./components/SummaryCard";
import { deleteAllIncidents, fetchAlerts, resolveIncident, startSeed, startLiveDemo, type AlertsResponse, type AlertsSummary, type Incident, type Pagination, type StatusFilter } from "./lib/api";
import "./App.css";

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 2.5L4.5 7.5v7c0 7.46 4.93 14.45 11.5 16 6.57-1.55 11.5-8.54 11.5-16v-7L16 2.5z" fill="#1e293b" stroke="#475569" strokeWidth="0.75" />
      <path d="M9.5 16.5h3l1.5-3.5 2.5 7 2-5 2 2.5h3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const POLL_INTERVAL_MS = 8_000;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "All", value: "ALL" },
];

function LoadingTable() {
  return (
    <div className="table-scroll" aria-label="Loading incidents">
      <div className="skeleton-header" />
      {[1, 2, 3, 4].map((row) => <div className="skeleton-row" key={row} />)}
    </div>
  );
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<AlertsSummary>({ active: 0, resolved: 0, critical: 0, high: 0, medium: 0, affectedApis: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [demoProgress, setDemoProgress] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [seedExistsOpen, setSeedExistsOpen] = useState(false);
  const [seedProgress, setSeedProgress] = useState<string | null>(null);
  const seedCancelRef = useRef<(() => void) | null>(null);
  const [resetting, setResetting] = useState(false);
  const demoCancelRef = useRef<(() => void) | null>(null);
  const pageRef = useRef(1);
  const pageSizeRef = useRef(pageSize);
  const statusRef = useRef(statusFilter);

  const loadAlerts = useCallback(async (page?: number, limit?: number, status?: StatusFilter) => {
    const targetPage = page ?? pageRef.current;
    const targetLimit = limit ?? pageSizeRef.current;
    const targetStatus = status ?? statusRef.current;
    try {
      setError(null);
      const result: AlertsResponse = await fetchAlerts(targetPage, targetLimit, targetStatus);
      setIncidents(result.data);
      setPagination(result.pagination);
      setSummary(result.summary);
      pageRef.current = result.pagination.page;
      setSelectedIncidentId((selected) => result.data.some((i) => i.id === selected) ? selected : null);
    } catch {
      setError("Unable to load active incidents.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadAlerts(1), 0);
    const poller = window.setInterval(() => void loadAlerts(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(poller);
    };
  }, [loadAlerts]);

  const goToPage = (page: number) => {
    setIsLoading(true);
    void loadAlerts(page);
  };

  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    pageSizeRef.current = newSize;
    setIsLoading(true);
    void loadAlerts(1, newSize);
  };

  const changeStatus = (status: StatusFilter) => {
    setStatusFilter(status);
    statusRef.current = status;
    setIsLoading(true);
    void loadAlerts(1, undefined, status);
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveIncident(id);
      setSelectedIncidentId(null);
      void loadAlerts();
    } catch {
      setError("Failed to resolve incident.");
    }
  };

  const handleStartDemo = () => {
    if (demoCancelRef.current) return;
    setDemoProgress("0/6");
    demoCancelRef.current = startLiveDemo(
      (index, total) => {
        setDemoProgress(`${index}/${total}`);
        void loadAlerts();
      },
      () => {
        setDemoProgress(null);
        demoCancelRef.current = null;
        void loadAlerts();
      },
    );
  };

  const handleStopDemo = () => {
    demoCancelRef.current?.();
    demoCancelRef.current = null;
    setDemoProgress(null);
  };

  const handleRunSeed = () => {
    if (seedCancelRef.current) return;
    if (summary.active + summary.resolved > 0) {
      setSeedExistsOpen(true);
      return;
    }
    startSeeding();
  };

  const startSeeding = () => {
    setSeedExistsOpen(false);
    setSeedProgress("0/100");
    seedCancelRef.current = startSeed(
      (completed, total) => {
        setSeedProgress(`${completed}/${total}`);
        void loadAlerts();
      },
      () => {
        setSeedProgress(null);
        seedCancelRef.current = null;
        void loadAlerts();
      },
    );
  };

  const handleStopSeed = () => {
    seedCancelRef.current?.();
    seedCancelRef.current = null;
    setSeedProgress(null);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await deleteAllIncidents();
      setResetConfirmOpen(false);
      setSelectedIncidentId(null);
      setIncidents([]);
      setSummary({ active: 0, resolved: 0, critical: 0, high: 0, medium: 0, affectedApis: 0 });
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 1, page: 1 }));
      void loadAlerts(1);
    } catch {
      setError("Failed to delete incidents.");
    } finally {
      setResetting(false);
    }
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) ?? null;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand" title="API Sentinel — Intelligent API Monitoring Dashboard">
            <BrandMark />
            <span className="navbar-title">API Sentinel</span>
          </div>
          <div className="navbar-actions">
            {demoProgress ? (
              <button className="navbar-demo-btn navbar-demo-active" type="button" onClick={handleStopDemo} title="Stop the live simulation">
                <Square size={13} aria-hidden="true" /> Auto Simulation <span className="demo-progress">{demoProgress}</span>
              </button>
            ) : (
              <button className="navbar-demo-btn" type="button" onClick={handleStartDemo} title="Run a realistic incident sequence automatically — fires 6 health events in series to demo the full monitoring pipeline">
                <Radio size={15} aria-hidden="true" /> Auto Simulation
              </button>
            )}
            <div className="navbar-divider" aria-hidden="true" />
            <button className="navbar-test-btn" type="button" onClick={() => setTestFormOpen(true)} title="Manually craft and send a single API health event to test anomaly detection rules">
              <FlaskConical size={15} aria-hidden="true" /><span className="btn-label">Manual Test</span>
            </button>
            {seedProgress ? (
              <button className="navbar-demo-btn navbar-demo-active" type="button" onClick={handleStopSeed} title="Stop seeding">
                <Square size={13} aria-hidden="true" /> Seeding <span className="demo-progress">{seedProgress}</span>
              </button>
            ) : (
              <button className="navbar-test-btn" type="button" onClick={handleRunSeed} title="Populate 100 sample incidents — added progressively so you can watch them appear">
                <Database size={15} aria-hidden="true" /><span className="btn-label">Run Seed</span>
              </button>
            )}
            <button className="navbar-reset-btn" type="button" onClick={() => setResetConfirmOpen(true)} title="Delete all incidents and start fresh">
              <Trash2 size={15} aria-hidden="true" /><span className="btn-label">Reset</span>
            </button>
            <button className="navbar-settings-btn" type="button" onClick={() => setSettingsOpen(true)} title="Configure LLM provider, email alerts, and monitoring thresholds">
              <Settings size={15} aria-hidden="true" /> Settings
            </button>
          </div>
        </div>
      </nav>
      <main className="dashboard-content">
        <section className="summary-grid" aria-label="Incident summary">
          <SummaryCard label="Active alerts" value={summary.active} icon={<Activity size={20} />} />
          <SummaryCard label="Critical alerts" value={summary.critical} icon={<AlertTriangle size={20} />} />
          <SummaryCard label="Affected APIs" value={summary.affectedApis} icon={<Boxes size={20} />} />
        </section>

        <section className="incidents-panel" aria-labelledby="incidents-title">
          <div className="panel-heading">
            <div>
              <h2 id="incidents-title">Incidents</h2>
              <p>Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total &middot; Updates every 8s</p>
            </div>
            <div className="panel-actions">
              <div className="status-tabs" role="tablist">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    role="tab"
                    className={`status-tab ${statusFilter === tab.value ? "status-tab-active" : ""}`}
                    aria-selected={statusFilter === tab.value}
                    onClick={() => changeStatus(tab.value)}
                  >
                    {tab.label}
                    {tab.value === "ACTIVE" && summary.active > 0 && <span className="tab-count">{summary.active}</span>}
                    {tab.value === "RESOLVED" && summary.resolved > 0 && <span className="tab-count tab-count-resolved">{summary.resolved}</span>}
                  </button>
                ))}
              </div>
              <button className="refresh-button" type="button" onClick={() => { setIsLoading(true); void loadAlerts(); }} title="Fetch the latest incidents now instead of waiting for the next auto-refresh">
                <RefreshCw size={16} aria-hidden="true" /> Refresh
              </button>
            </div>
          </div>

          {isLoading && <LoadingTable />}
          {!isLoading && error && (
            <div className="state-message error-state" role="alert">
              <AlertTriangle size={22} aria-hidden="true" />
              <div><strong>{error}</strong><button type="button" onClick={() => { setIsLoading(true); void loadAlerts(); }}>Retry</button></div>
            </div>
          )}
          {!isLoading && !error && incidents.length === 0 && (
            <div className="state-message empty-state">
              <Activity size={24} aria-hidden="true" />
              <div>
                <strong>{statusFilter === "RESOLVED" ? "No resolved incidents" : "No active incidents"}</strong>
                <p>{statusFilter === "RESOLVED" ? "No incidents have been resolved yet." : "All monitored API events currently pass the configured health rules."}</p>
              </div>
            </div>
          )}
          {!isLoading && !error && incidents.length > 0 && (
            <IncidentTable
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onSelect={(incident) => setSelectedIncidentId(incident.id)}
              pagination={pagination}
              onPageChange={goToPage}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={changePageSize}
              showStatus={statusFilter === "ALL"}
              showResolvedAt={statusFilter === "RESOLVED" || statusFilter === "ALL"}
            />
          )}
        </section>
      </main>
      <IncidentDetailsSheet incident={selectedIncident} onClose={() => setSelectedIncidentId(null)} onResolve={handleResolve} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TestEventForm open={testFormOpen} onClose={() => setTestFormOpen(false)} onSubmitted={() => void loadAlerts()} />
      {resetConfirmOpen && (
        <div className="confirm-overlay" onClick={() => setResetConfirmOpen(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Reset All Incidents</h3>
            <p>This will permanently delete all incidents. This action cannot be undone.</p>
            <div className="confirm-actions">
              <button className="confirm-cancel" type="button" onClick={() => setResetConfirmOpen(false)} disabled={resetting}>Cancel</button>
              <button className="confirm-delete" type="button" onClick={handleReset} disabled={resetting}>
                {resetting ? <><RefreshCw size={14} className="spin-icon" /> Deleting...</> : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
      {seedExistsOpen && (
        <div className="confirm-overlay" onClick={() => setSeedExistsOpen(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Seed Data Exists</h3>
            <p>There are already {summary.active + summary.resolved} incidents in the system. Reset first to start fresh, or seed anyway to add more data.</p>
            <div className="confirm-actions">
              <button className="confirm-cancel" type="button" onClick={() => setSeedExistsOpen(false)}>Cancel</button>
              <button className="confirm-seed" type="button" onClick={startSeeding}>Seed Anyway</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App
