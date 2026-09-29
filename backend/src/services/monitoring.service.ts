import { detectAnomalies, type AnomalyDetectorConfig, type DetectedAnomaly } from "../domain/anomaly-detector.js";
import { buildIncidentFingerprint } from "../domain/incident-fingerprint.js";
import type { ApiHealthEvent, Incident, Severity } from "../domain/contracts.js";
import { determineSeverity } from "../domain/severity-policy.js";
import type { IncidentRepository } from "../repositories/incident.repository.js";
import type { Logger } from "pino";

import type { AlertGenerator } from "../ai/alert-generator.js";

type IncidentStore = Pick<IncidentRepository, "findActiveByFingerprint" | "create" | "incrementOccurrence">;

export type MonitoringResult =
  | { kind: "HEALTHY"; event: ApiHealthEvent }
  | {
    kind: "ANOMALY";
    action: "CREATED" | "UPDATED";
    anomalies: DetectedAnomaly[];
    fingerprint: string;
    incident: Incident;
    severity: Severity;
  };

const ANOMALY_DESCRIPTIONS: Record<string, string> = {
  HTTP_FAILURE: "returning errors",
  HIGH_LATENCY: "responding unusually slowly",
  ZERO_RECORDS: "not returning any data",
};

function createFallbackAlertMessage(event: ApiHealthEvent, anomalyTypes: readonly DetectedAnomaly["type"][]): string {
  const issues = anomalyTypes.map((t) => ANOMALY_DESCRIPTIONS[t] ?? t).join(" and ");
  return `${event.api_name} is ${issues}.`;
}

interface ProcessingContext {
  requestId?: string;
}

export class MonitoringService {
  constructor(
    private readonly incidentRepository: IncidentStore,
    private readonly detectorConfig: AnomalyDetectorConfig,
    private readonly alertGenerator?: AlertGenerator,
    private readonly logger?: Logger,
    private readonly onIncidentCreated?: (incident: Incident) => void,
  ) {}

  async process(event: ApiHealthEvent, context: ProcessingContext = {}): Promise<MonitoringResult> {
    const anomalies = detectAnomalies(event, this.detectorConfig);

    if (anomalies.length === 0) {
      this.logger?.info({ event: "healthy_event_processed", request_id: context.requestId, api_name: event.api_name });
      return { kind: "HEALTHY", event };
    }

    const anomalyTypes = anomalies.map((anomaly) => anomaly.type);
    const severity = determineSeverity(anomalyTypes);

    if (!severity) {
      throw new Error("Detected anomalies must have a severity");
    }

    const fingerprint = buildIncidentFingerprint(event.api_name, anomalyTypes);
    this.logger?.info({
      event: "anomaly_detected",
      request_id: context.requestId,
      api_name: event.api_name,
      severity,
      anomaly_types: anomalyTypes,
    });
    const activeIncident = await this.incidentRepository.findActiveByFingerprint(fingerprint);

    if (activeIncident) {
      const updatedIncident = await this.incidentRepository.incrementOccurrence(activeIncident.id, event);

      if (updatedIncident) {
        this.logger?.info({
          event: "incident_updated",
          request_id: context.requestId,
          incident_id: updatedIncident.id,
          api_name: event.api_name,
          severity,
          anomaly_types: anomalyTypes,
        });
        return {
          kind: "ANOMALY",
          action: "UPDATED",
          anomalies,
          fingerprint,
          incident: updatedIncident,
          severity,
        };
      }
    }

    const generatedAlert = await this.generateAlert(event, anomalyTypes, severity, context);
    const incident = await this.incidentRepository.create({
      fingerprint,
      event,
      anomalyTypes,
      severity,
      alertMessage: generatedAlert.message,
      alertSource: generatedAlert.source,
    });
    this.logger?.info({
      event: "incident_created",
      request_id: context.requestId,
      incident_id: incident.id,
      api_name: event.api_name,
      severity,
      anomaly_types: anomalyTypes,
    });

    this.onIncidentCreated?.(incident);

    return {
      kind: "ANOMALY",
      action: "CREATED",
      anomalies,
      fingerprint,
      incident,
      severity,
    };
  }

  private async generateAlert(
    event: ApiHealthEvent,
    anomalyTypes: DetectedAnomaly["type"][],
    severity: Severity,
    context: ProcessingContext,
  ): Promise<{ message: string; source: "LLM" | "FALLBACK" }> {
    const hasHttpFailure = anomalyTypes.includes("HTTP_FAILURE");
    if (!this.alertGenerator || !hasHttpFailure) {
      this.logger?.info({
        event: "fallback_used",
        request_id: context.requestId,
        api_name: event.api_name,
        reason: !this.alertGenerator ? "llm_not_configured" : "non_error_anomaly",
      });
      return { message: createFallbackAlertMessage(event, anomalyTypes), source: "FALLBACK" };
    }

    try {
      this.logger?.info({ event: "llm_request_started", request_id: context.requestId, api_name: event.api_name });
      const message = await this.alertGenerator.generate({ event, anomalyTypes, severity });
      return { message, source: "LLM" };
    } catch (error) {
      this.logger?.warn({
        event: "llm_request_failed",
        request_id: context.requestId,
        api_name: event.api_name,
        error: error instanceof Error ? error.message : "Unknown LLM error",
      });
      this.logger?.info({ event: "fallback_used", request_id: context.requestId, api_name: event.api_name });
      return { message: createFallbackAlertMessage(event, anomalyTypes), source: "FALLBACK" };
    }
  }
}
