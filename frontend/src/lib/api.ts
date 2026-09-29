export type Severity = "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "ACTIVE" | "RESOLVED";
export type StatusFilter = "ACTIVE" | "RESOLVED" | "ALL";

export interface Incident {
  id: string;
  api_name: string;
  anomaly_types: string[];
  severity: Severity;
  status_code: number;
  response_time_ms: number;
  records_returned: number;
  alert_source: "LLM" | "FALLBACK";
  status: IncidentStatus;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  alert_message: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AlertsSummary {
  active: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  affectedApis: number;
}

export interface AlertsResponse {
  data: Incident[];
  pagination: Pagination;
  summary: AlertsSummary;
}

export interface AppSettings {
  llm_provider: string;
  llm_api_key: string;
  llm_model: string;
  email_enabled: string;
  email_to: string;
  email_from: string;
  email_password: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function fetchAlerts(page = 1, limit = 20, status: StatusFilter = "ACTIVE", signal?: AbortSignal): Promise<AlertsResponse> {
  const url = `${apiBaseUrl}/alerts?page=${page}&limit=${limit}&status=${status}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Alerts request failed with status ${response.status}`);
  }

  return await response.json() as AlertsResponse;
}

export async function fetchSettings(): Promise<AppSettings> {
  const response = await fetch(`${apiBaseUrl}/settings`);
  if (!response.ok) throw new Error(`Settings request failed with status ${response.status}`);
  const payload = await response.json() as { data: AppSettings };
  return payload.data;
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const response = await fetch(`${apiBaseUrl}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error(`Settings update failed with status ${response.status}`);
  const payload = await response.json() as { data: AppSettings };
  return payload.data;
}

export interface TestEventInput {
  api_name: string;
  status_code: number;
  response_time_ms: number;
  records_returned: number;
}

export interface MonitorResultDetail {
  kind: "HEALTHY" | "ANOMALY" | "ERROR";
  api_name?: string;
  action?: "CREATED" | "UPDATED";
  severity?: Severity;
  anomaly_types?: string[];
  incident_id?: string;
  alert_message?: string;
  message?: string;
}

export interface MonitorResponse {
  received: number;
  processed: number;
  healthy: number;
  anomalies: number;
  failed: number;
  results: MonitorResultDetail[];
}

export async function submitTestEvent(event: TestEventInput): Promise<MonitorResponse> {
  const response = await fetch(`${apiBaseUrl}/monitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([event]),
  });
  if (!response.ok) throw new Error(`Monitor request failed with status ${response.status}`);
  return await response.json() as MonitorResponse;
}

const LIVE_DEMO_SCENARIOS: TestEventInput[] = [
  { api_name: "PatientDataAPI", status_code: 500, response_time_ms: 4200, records_returned: 0 },
  { api_name: "BillingAPI", status_code: 200, response_time_ms: 7800, records_returned: 12 },
  { api_name: "SchedulingAPI", status_code: 200, response_time_ms: 320, records_returned: 0 },
  { api_name: "AppointmentAPI", status_code: 503, response_time_ms: 9200, records_returned: 0 },
  { api_name: "ClaimsAPI", status_code: 500, response_time_ms: 1100, records_returned: 5 },
  { api_name: "LabResultsAPI", status_code: 200, response_time_ms: 6500, records_returned: 0 },
];

export function startLiveDemo(
  onEvent: (index: number, total: number) => void,
  onDone: () => void,
): () => void {
  let cancelled = false;
  const total = LIVE_DEMO_SCENARIOS.length;

  (async () => {
    for (let i = 0; i < total; i++) {
      if (cancelled) return;
      await submitTestEvent(LIVE_DEMO_SCENARIOS[i]);
      onEvent(i + 1, total);
      if (i < total - 1 && !cancelled) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
    if (!cancelled) onDone();
  })();

  return () => { cancelled = true; };
}

export async function deleteAllIncidents(): Promise<{ deleted: number }> {
  const response = await fetch(`${apiBaseUrl}/alerts`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Delete request failed with status ${response.status}`);
  return await response.json() as { deleted: number };
}

const SEED_API_NAMES = [
  "PatientDataAPI", "ClaimsAPI", "BillingAPI", "SchedulingAPI", "AppointmentAPI",
  "LabResultsAPI", "PharmacyAPI", "InsuranceAPI", "AuthServiceAPI", "NotificationAPI",
  "ReportingAPI", "AuditLogAPI", "UserProfileAPI", "InventoryAPI", "PaymentGatewayAPI",
  "DocumentStorageAPI", "AnalyticsAPI", "SearchAPI", "MessagingAPI", "ComplianceAPI",
];

const SEED_TEMPLATES: TestEventInput[] = [
  { api_name: "", status_code: 500, response_time_ms: 800, records_returned: 5 },
  { api_name: "", status_code: 200, response_time_ms: 5500, records_returned: 30 },
  { api_name: "", status_code: 200, response_time_ms: 400, records_returned: 0 },
  { api_name: "", status_code: 503, response_time_ms: 8200, records_returned: 0 },
  { api_name: "", status_code: 200, response_time_ms: 6000, records_returned: 0 },
];

function generateSeedScenarios(): TestEventInput[] {
  const scenarios: TestEventInput[] = [];
  for (let i = 0; i < 100; i++) {
    const api = SEED_API_NAMES[Math.floor(i / 5)];
    const template = SEED_TEMPLATES[i % 5];
    const variance = (i * 37) % 500;
    scenarios.push({ ...template, api_name: api, response_time_ms: template.response_time_ms + variance });
  }
  return scenarios;
}

export function startSeed(
  onProgress: (completed: number, total: number) => void,
  onDone: () => void,
): () => void {
  let cancelled = false;
  const scenarios = generateSeedScenarios();
  const total = scenarios.length;
  const batchSize = 5;

  (async () => {
    for (let i = 0; i < total; i += batchSize) {
      if (cancelled) return;
      const batch = scenarios.slice(i, i + batchSize);
      const response = await fetch(`${apiBaseUrl}/monitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (!response.ok) throw new Error(`Seed batch failed with status ${response.status}`);
      onProgress(Math.min(i + batchSize, total), total);
    }
    if (!cancelled) onDone();
  })();

  return () => { cancelled = true; };
}

export async function resolveIncident(id: string): Promise<Incident> {
  const response = await fetch(`${apiBaseUrl}/alerts/${id}/resolve`, { method: "PATCH" });

  if (!response.ok) {
    throw new Error(`Resolve request failed with status ${response.status}`);
  }

  const payload = await response.json() as { data: Incident };
  return payload.data;
}
