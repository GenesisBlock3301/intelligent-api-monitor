import * as Dialog from "@radix-ui/react-dialog";
import { Bot, CheckCircle2, Clock3, Database, ShieldAlert, X } from "lucide-react";

import type { Incident } from "../lib/api";
import { SeverityBadge } from "./SeverityBadge";

interface IncidentDetailsSheetProps {
  incident: Incident | null;
  onClose: () => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function IncidentDetailsSheet({ incident, onClose }: IncidentDetailsSheetProps) {
  return (
    <Dialog.Root open={incident !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="incident-sheet" aria-describedby="incident-details-description">
          {incident && (
            <>
              <div className="sheet-header">
                <div>
                  <p className="eyebrow">INCIDENT DETAILS</p>
                  <Dialog.Title>{incident.api_name}</Dialog.Title>
                  <Dialog.Description id="incident-details-description">Current operational context and alert evidence.</Dialog.Description>
                </div>
                <Dialog.Close className="sheet-close" aria-label="Close incident details"><X size={20} /></Dialog.Close>
              </div>

              <div className="sheet-badges"><SeverityBadge severity={incident.severity} /><span className="status-badge">{incident.status}</span></div>

              <section className="sheet-section">
                <h3><ShieldAlert size={17} aria-hidden="true" /> Triggered rules</h3>
                <div className="rule-list">{incident.anomaly_types.map((type) => <span key={type}>{type}</span>)}</div>
              </section>

              <section className="sheet-section">
                <h3><Database size={17} aria-hidden="true" /> Deterministic facts</h3>
                <dl className="metrics-list">
                  <div><dt>HTTP status</dt><dd>{incident.status_code}</dd></div>
                  <div><dt>Response time</dt><dd>{incident.response_time_ms.toLocaleString()} ms</dd></div>
                  <div><dt>Records returned</dt><dd>{incident.records_returned.toLocaleString()}</dd></div>
                </dl>
              </section>

              <section className="sheet-section explanation-section">
                <h3><Bot size={17} aria-hidden="true" /> {incident.alert_source === "LLM" ? "AI explanation" : "Deterministic fallback explanation"}</h3>
                <p>{incident.alert_message}</p>
                <span className="alert-source">Source: {incident.alert_source}</span>
              </section>

              <section className="sheet-section">
                <h3><Clock3 size={17} aria-hidden="true" /> Incident timeline</h3>
                <dl className="metrics-list">
                  <div><dt>First seen</dt><dd>{formatDate(incident.first_seen_at)}</dd></div>
                  <div><dt>Last seen</dt><dd>{formatDate(incident.last_seen_at)}</dd></div>
                  <div><dt>Occurrences</dt><dd><CheckCircle2 size={15} aria-hidden="true" /> {incident.occurrence_count}</dd></div>
                </dl>
              </section>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
