export type Severity = "MEDIUM" | "HIGH" | "CRITICAL";

export interface Incident {
  id: string;
  api_name: string;
  anomaly_types: string[];
  severity: Severity;
  status_code: number;
  response_time_ms: number;
  records_returned: number;
  alert_source: "LLM" | "FALLBACK";
  status: "ACTIVE" | "RESOLVED";
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  alert_message: string;
}

interface AlertsResponse {
  data: Incident[];
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function fetchAlerts(signal?: AbortSignal): Promise<Incident[]> {
  const response = await fetch(`${apiBaseUrl}/alerts`, { signal });

  if (!response.ok) {
    throw new Error(`Alerts request failed with status ${response.status}`);
  }

  const payload = await response.json() as AlertsResponse;
  return payload.data;
}
