import { Activity, AlertTriangle, Boxes, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { IncidentTable } from "./components/IncidentTable";
import { IncidentDetailsSheet } from "./components/IncidentDetailsSheet";
import { SummaryCard } from "./components/SummaryCard";
import { fetchAlerts, type Incident } from "./lib/api";
import "./App.css";

const pollIntervalMs = 8_000;

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setError(null);
      const alerts = await fetchAlerts();
      setIncidents(alerts);
      setSelectedIncidentId((selected) => alerts.some((incident) => incident.id === selected) ? selected : null);
    } catch {
      setError("Unable to load active incidents.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadAlerts(), 0);
    const poller = window.setInterval(() => void loadAlerts(), pollIntervalMs);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(poller);
    };
  }, []);

  const summary = useMemo(() => ({
    active: incidents.length,
    critical: incidents.filter((incident) => incident.severity === "CRITICAL").length,
    affectedApis: new Set(incidents.map((incident) => incident.api_name)).size,
  }), [incidents]);
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? null;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">OPERATIONS CONSOLE</p>
          <h1>API Sentinel</h1>
          <p className="subtitle">Intelligent API monitoring and incident response</p>
        </div>
        <div className="monitoring-status"><span aria-hidden="true" /> Monitoring active</div>
      </header>

      <section className="summary-grid" aria-label="Incident summary">
        <SummaryCard label="Active alerts" value={summary.active} icon={<Activity size={20} />} />
        <SummaryCard label="Critical alerts" value={summary.critical} icon={<AlertTriangle size={20} />} />
        <SummaryCard label="Affected APIs" value={summary.affectedApis} icon={<Boxes size={20} />} />
      </section>

      <section className="incidents-panel" aria-labelledby="incidents-title">
        <div className="panel-heading">
          <div>
            <h2 id="incidents-title">Active incidents</h2>
            <p>Updates automatically every 8 seconds.</p>
          </div>
          <button className="refresh-button" type="button" onClick={() => { setIsLoading(true); void loadAlerts(); }}>
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </button>
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
            <div><strong>No active incidents</strong><p>All monitored API events currently pass the configured health rules.</p></div>
          </div>
        )}
        {!isLoading && !error && incidents.length > 0 && (
          <IncidentTable
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelect={(incident) => setSelectedIncidentId(incident.id)}
          />
        )}
      </section>
      <IncidentDetailsSheet incident={selectedIncident} onClose={() => setSelectedIncidentId(null)} />
    </main>
  );
}

export default App
