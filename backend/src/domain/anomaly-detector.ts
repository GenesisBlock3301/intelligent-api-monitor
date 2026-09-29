import type { AnomalyType, ApiHealthEvent } from "./contracts.js";

export interface AnomalyDetectorConfig {
  highLatencyThresholdMs: number;
}

export type DetectedAnomaly =
  | { type: "HTTP_FAILURE"; evidence: { status_code: number } }
  | { type: "HIGH_LATENCY"; evidence: { actual_ms: number; threshold_ms: number } }
  | { type: "ZERO_RECORDS"; evidence: { records_returned: number } };

export function detectAnomalies(
  event: ApiHealthEvent,
  config: AnomalyDetectorConfig,
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  if (event.status_code >= 500) {
    anomalies.push({ type: "HTTP_FAILURE", evidence: { status_code: event.status_code } });
  }

  if (event.response_time_ms > config.highLatencyThresholdMs) {
    anomalies.push({
      type: "HIGH_LATENCY",
      evidence: {
        actual_ms: event.response_time_ms,
        threshold_ms: config.highLatencyThresholdMs,
      },
    });
  }

  if (event.records_returned === 0) {
    anomalies.push({ type: "ZERO_RECORDS", evidence: { records_returned: event.records_returned } });
  }

  return anomalies;
}

export function anomalyTypes(anomalies: readonly DetectedAnomaly[]): AnomalyType[] {
  return anomalies.map((anomaly) => anomaly.type);
}
