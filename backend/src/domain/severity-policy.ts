import type { AnomalyType, Severity } from "./contracts.js";

export function determineSeverity(anomalyTypes: readonly AnomalyType[]): Severity | null {
  if (anomalyTypes.length === 0) {
    return null;
  }

  const anomalies = new Set(anomalyTypes);

  if (anomalies.has("HTTP_FAILURE") && anomalies.has("HIGH_LATENCY")) {
    return "CRITICAL";
  }

  if (anomalies.has("HTTP_FAILURE")) {
    return "HIGH";
  }

  return "MEDIUM";
}
