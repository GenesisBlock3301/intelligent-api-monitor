import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { KeyboardEvent } from "react";

import type { Incident, Pagination } from "../lib/api";
import { SeverityBadge } from "./SeverityBadge";

interface IncidentTableProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelect: (incident: Incident) => void;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (size: number) => void;
  showStatus: boolean;
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

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);

  return pages;
}

export function IncidentTable({ incidents, selectedIncidentId, onSelect, pagination, onPageChange, pageSize, pageSizeOptions, onPageSizeChange, showStatus }: IncidentTableProps) {
  const { page, total, totalPages, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">API</th>
              <th scope="col">Severity</th>
              <th scope="col">Status Code</th>
              <th scope="col">Anomaly types</th>
              <th scope="col">Occurrences</th>
              <th scope="col">Last seen</th>
              {showStatus && <th scope="col">Status</th>}
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
                <td><span className={`status-code-badge ${incident.status_code >= 500 ? "status-code-error" : incident.status_code >= 400 ? "status-code-warn" : "status-code-ok"}`}>{incident.status_code}</span></td>
                <td><span className="anomaly-text" title={incident.anomaly_types.join(", ")}>{incident.anomaly_types.join(" · ")}</span></td>
                <td>{incident.occurrence_count}</td>
                <td title={new Date(incident.last_seen_at).toLocaleString()}>{relativeTime(incident.last_seen_at)}</td>
                {showStatus && (
                  <td>
                    <span className={`status-badge ${incident.status === "RESOLVED" ? "status-resolved" : "status-active"}`}>
                      {incident.status}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <div className="pagination-left">
          <label className="page-size-label">
            Rows per page
            <select
              className="page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <span className="pagination-info">Showing {from}–{to} of {total}</span>
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              aria-label="First page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {pageNumbers(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="page-ellipsis">&hellip;</span>
              ) : (
                <button
                  key={p}
                  className={`page-btn ${p === page ? "page-btn-active" : ""}`}
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </button>
              ),
            )}

            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              aria-label="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
