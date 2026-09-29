import type { KeyboardEvent } from "react";

import type { Incident } from "../lib/api";
import { SeverityBadge } from "./SeverityBadge";

interface IncidentTableProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelect: (incident: Incident) => void;
}

function relativeTime(isoDate: string): string {
  const differenceMs = new Date(isoDate).getTime() - Date.now();
  const absoluteMinutes = Math.round(Math.abs(differenceMs) / 60_000);

  if (absoluteMinutes < 1) return "just now";
  if (absoluteMinutes < 60) return `${absoluteMinutes}m ago`;
  const hours = Math.round(absoluteMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function selectWithKeyboard(event: KeyboardEvent<HTMLTableRowElement>, incident: Incident, onSelect: (value: Incident) => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect(incident);
  }
}

export function IncidentTable({ incidents, selectedIncidentId, onSelect }: IncidentTableProps) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">API</th>
            <th scope="col">Severity</th>
            <th scope="col">Anomaly types</th>
            <th scope="col">Occurrences</th>
            <th scope="col">Last seen</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              className={selectedIncidentId === incident.id ? "selected-row" : undefined}
              tabIndex={0}
              onClick={() => onSelect(incident)}
              onKeyDown={(event) => selectWithKeyboard(event, incident, onSelect)}
              aria-selected={selectedIncidentId === incident.id}
            >
              <td><strong>{incident.api_name}</strong><span className="table-subtext">{incident.alert_message}</span></td>
              <td><SeverityBadge severity={incident.severity} /></td>
              <td><span className="anomaly-text" title={incident.anomaly_types.join(", ")}>{incident.anomaly_types.join(" · ")}</span></td>
              <td>{incident.occurrence_count}</td>
              <td title={new Date(incident.last_seen_at).toLocaleString()}>{relativeTime(incident.last_seen_at)}</td>
              <td><span className="status-badge">{incident.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
