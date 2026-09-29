import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle2, FlaskConical, Play, X } from "lucide-react";
import { useState } from "react";

import { submitTestEvent, type MonitorResultDetail, type TestEventInput } from "../lib/api";

interface TestEventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const PRESETS: { label: string; description: string; color: string; input: TestEventInput }[] = [
  {
    label: "Healthy API",
    description: "Normal response — should NOT create an incident",
    color: "#16a34a",
    input: { api_name: "PatientDataAPI", status_code: 200, response_time_ms: 150, records_returned: 50 },
  },
  {
    label: "Server Error",
    description: "HTTP 500 failure — will trigger HTTP_FAILURE",
    color: "#d97706",
    input: { api_name: "AppointmentAPI", status_code: 500, response_time_ms: 1200, records_returned: 0 },
  },
  {
    label: "Slow Response",
    description: "High latency only — will trigger HIGH_LATENCY",
    color: "#ca8a04",
    input: { api_name: "BillingAPI", status_code: 200, response_time_ms: 5500, records_returned: 25 },
  },
  {
    label: "No Data",
    description: "Zero records returned — will trigger ZERO_RECORDS",
    color: "#ca8a04",
    input: { api_name: "LabResultsAPI", status_code: 200, response_time_ms: 300, records_returned: 0 },
  },
  {
    label: "Complete Outage",
    description: "All anomalies — CRITICAL severity",
    color: "#dc2626",
    input: { api_name: "CertRotatorAPI", status_code: 500, response_time_ms: 8000, records_returned: 0 },
  },
];

function ResultBanner({ result }: { result: MonitorResultDetail }) {
  if (result.kind === "HEALTHY") {
    return (
      <div className="test-result test-result-healthy">
        <CheckCircle2 size={18} />
        <div>
          <strong>No issues detected</strong>
          <p>{result.api_name} is healthy — no anomalies found. This event was not added to the incident list.</p>
        </div>
      </div>
    );
  }

  if (result.kind === "ANOMALY") {
    return (
      <div className="test-result test-result-anomaly">
        <AlertTriangle size={18} />
        <div>
          <strong>{result.severity} alert — {result.action === "CREATED" ? "New incident created" : "Existing incident updated"}</strong>
          <p>{result.alert_message}</p>
          <span className="test-result-meta">
            Anomalies: {result.anomaly_types?.join(", ")} · Check the incidents list to see it.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="test-result test-result-error">
      <AlertTriangle size={18} />
      <div><strong>Processing error</strong><p>{result.message}</p></div>
    </div>
  );
}

export function TestEventForm({ open, onClose, onSubmitted }: TestEventFormProps) {
  const [form, setForm] = useState<TestEventInput>({
    api_name: "TestAPI",
    status_code: 200,
    response_time_ms: 100,
    records_returned: 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MonitorResultDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: TestEventInput) => {
    setForm({ ...preset });
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    setError(null);
    try {
      const response = await submitTestEvent(form);
      const detail = response.results[0];
      if (detail) setResult(detail);
      onSubmitted();
    } catch {
      setError("Failed to submit event. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="test-event-sheet" aria-describedby="test-event-description">
          <div className="sheet-header">
            <div>
              <p className="eyebrow">TESTING</p>
              <Dialog.Title>Simulate API Event</Dialog.Title>
              <Dialog.Description id="test-event-description">
                Send a test health event through the monitoring pipeline to see how anomaly detection, alert generation, and incident creation work.
              </Dialog.Description>
            </div>
            <Dialog.Close className="sheet-close" aria-label="Close"><X size={20} /></Dialog.Close>
          </div>

          <section className="test-section">
            <h3 className="test-section-title"><FlaskConical size={16} aria-hidden="true" /> Quick presets</h3>
            <div className="test-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="test-preset-btn"
                  onClick={() => applyPreset(preset.input)}
                >
                  <span className="test-preset-dot" style={{ background: preset.color }} />
                  <div>
                    <strong>{preset.label}</strong>
                    <span>{preset.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="test-section">
            <h3 className="test-section-title">Event payload</h3>

            <label className="settings-label">
              API Name
              <input
                className="settings-input"
                type="text"
                value={form.api_name}
                onChange={(e) => setForm((f) => ({ ...f, api_name: e.target.value }))}
              />
            </label>

            <div className="test-form-row">
              <label className="settings-label">
                Status Code
                <input
                  className="settings-input"
                  type="number"
                  min={100}
                  max={599}
                  value={form.status_code}
                  onChange={(e) => setForm((f) => ({ ...f, status_code: Number(e.target.value) }))}
                />
              </label>

              <label className="settings-label">
                Response Time (ms)
                <input
                  className="settings-input"
                  type="number"
                  min={0}
                  value={form.response_time_ms}
                  onChange={(e) => setForm((f) => ({ ...f, response_time_ms: Number(e.target.value) }))}
                />
              </label>

              <label className="settings-label">
                Records Returned
                <input
                  className="settings-input"
                  type="number"
                  min={0}
                  value={form.records_returned}
                  onChange={(e) => setForm((f) => ({ ...f, records_returned: Number(e.target.value) }))}
                />
              </label>
            </div>
          </section>

          {result && <ResultBanner result={result} />}
          {error && (
            <div className="test-result test-result-error">
              <AlertTriangle size={18} />
              <div><strong>Error</strong><p>{error}</p></div>
            </div>
          )}

          <button
            type="button"
            className="test-submit-btn"
            onClick={handleSubmit}
            disabled={submitting || !form.api_name.trim()}
          >
            <Play size={16} aria-hidden="true" />
            {submitting ? "Sending..." : "Send event"}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
