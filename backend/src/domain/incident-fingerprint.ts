import type { AnomalyType } from "./contracts.js";

export function buildIncidentFingerprint(apiName: string, anomalyTypes: readonly AnomalyType[]): string {
  const normalizedTypes = [...new Set(anomalyTypes)].sort();

  if (normalizedTypes.length === 0) {
    throw new Error("Cannot build an incident fingerprint without anomaly types");
  }

  return `${apiName}:${normalizedTypes.join("|")}`;
}
