/**
 * Shared business vocabulary for monitoring, incidents, and alerts.
 * This module deliberately has no HTTP, database, or LLM dependencies.
 */

export interface ApiHealthEvent {
  api_name: string;
  response_time_ms: number;
  status_code: number;
  records_returned: number;
}

export const ANOMALY_TYPES = [
  "HTTP_FAILURE",
  "HIGH_LATENCY",
  "ZERO_RECORDS",
] as const;

export type AnomalyType = (typeof ANOMALY_TYPES)[number];

export const SEVERITIES = ["MEDIUM", "HIGH", "CRITICAL"] as const;

export type Severity = (typeof SEVERITIES)[number];

export const INCIDENT_STATUSES = ["ACTIVE", "RESOLVED"] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const ALERT_SOURCES = ["LLM", "FALLBACK"] as const;

export type AlertSource = (typeof ALERT_SOURCES)[number];

export interface Incident {
  id: string;
  fingerprint: string;
  api_name: string;
  anomaly_types: AnomalyType[];
  severity: Severity;
  status_code: number;
  response_time_ms: number;
  records_returned: number;
  alert_message: string;
  alert_source: AlertSource;
  status: IncidentStatus;
  occurrence_count: number;
  first_seen_at: Date;
  last_seen_at: Date;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
