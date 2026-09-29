import { Router } from "express";
import type { Redis } from "ioredis";

import { monitoringConfig } from "../../config/monitoring.js";
import { deleteKeysByPattern } from "../../infrastructure/redis.js";
import { MonitoringService } from "../../services/monitoring.service.js";
import { monitorPayloadSchema } from "../../validators/monitor.schema.js";
import { ValidationError } from "../errors/app-error.js";
import { createRateLimiter, type RateLimitConfig } from "../middleware/rate-limiter.js";

export function createMonitorRouter(monitoringService: MonitoringService, redis: Redis, rateLimitConfig: RateLimitConfig): Router {
  const router = Router();

  router.post("/monitor", createRateLimiter(redis, rateLimitConfig), async (request, response, next) => {
    const requestId = response.locals.requestId as string | undefined;
    request.log.info({ event: "monitor_request_received", request_id: requestId });
    const validation = monitorPayloadSchema.safeParse(request.body);

    if (!validation.success) {
      request.log.warn({ event: "validation_failed", request_id: requestId });
      next(new ValidationError("Invalid monitoring payload", validation.error.issues.map(({ code, message, path }) => ({ code, message, path }))));
      return;
    }

    const events = validation.data;

    if (events.length > monitoringConfig.maxMonitorBatchSize) {
      request.log.warn({ event: "validation_failed", request_id: requestId, reason: "batch_size_exceeded" });
      next(new ValidationError(`Monitoring payload exceeds the maximum batch size of ${monitoringConfig.maxMonitorBatchSize}`, []));
      return;
    }

    try {
      const results = await Promise.allSettled(events.map((event) => monitoringService.process(event, { requestId })));
      const processed = results.filter((result) => result.status === "fulfilled");
      const healthy = processed.filter(
        (result) => result.status === "fulfilled" && result.value.kind === "HEALTHY",
      ).length;

      const anomalies = processed.length - healthy;
      if (anomalies > 0) {
        await deleteKeysByPattern(redis, "alerts:*");
      }

      const details = results.map((result) => {
        if (result.status === "rejected") {
          return { kind: "ERROR" as const, message: String(result.reason) };
        }
        const value = result.value;
        if (value.kind === "HEALTHY") {
          return { kind: "HEALTHY" as const, api_name: value.event.api_name };
        }
        return {
          kind: "ANOMALY" as const,
          api_name: value.incident.api_name,
          action: value.action,
          severity: value.severity,
          anomaly_types: value.anomalies.map((a) => a.type),
          incident_id: value.incident.id,
          alert_message: value.incident.alert_message,
        };
      });

      response.status(200).json({
        received: events.length,
        processed: processed.length,
        healthy,
        anomalies,
        failed: results.length - processed.length,
        results: details,
      });
    } catch (error) {
      next(error);
    }
  });

  const SEED_API_NAMES = [
    "PatientDataAPI", "ClaimsAPI", "BillingAPI", "SchedulingAPI", "AppointmentAPI",
    "LabResultsAPI", "PharmacyAPI", "InsuranceAPI", "AuthServiceAPI", "NotificationAPI",
    "ReportingAPI", "AuditLogAPI", "UserProfileAPI", "InventoryAPI", "PaymentGatewayAPI",
    "DocumentStorageAPI", "AnalyticsAPI", "SearchAPI", "MessagingAPI", "ComplianceAPI",
  ];

  const ANOMALY_TEMPLATES = [
    { status_code: 500, response_time_ms: 800, records_returned: 5 },
    { status_code: 200, response_time_ms: 5500, records_returned: 30 },
    { status_code: 200, response_time_ms: 400, records_returned: 0 },
    { status_code: 503, response_time_ms: 8200, records_returned: 0 },
    { status_code: 200, response_time_ms: 6000, records_returned: 0 },
  ];

  function generateSeedScenarios() {
    const scenarios = [];
    for (let i = 0; i < 100; i++) {
      const api = SEED_API_NAMES[Math.floor(i / 5)];
      const template = ANOMALY_TEMPLATES[i % 5];
      const variance = (i * 37) % 500;
      scenarios.push({
        api_name: api,
        status_code: template.status_code,
        response_time_ms: template.response_time_ms + variance,
        records_returned: template.records_returned,
      });
    }
    return scenarios;
  }

  router.post("/seed", async (request, response, next) => {
    const requestId = response.locals.requestId as string | undefined;
    request.log.info({ event: "seed_request_received", request_id: requestId });

    try {
      const scenarios = generateSeedScenarios();
      const BATCH_SIZE = 10;
      let processed = 0;
      let anomalies = 0;
      let failed = 0;

      for (let i = 0; i < scenarios.length; i += BATCH_SIZE) {
        const batch = scenarios.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((event) => monitoringService.process(event, { requestId })),
        );
        for (const r of results) {
          if (r.status === "fulfilled") {
            processed++;
            if (r.value.kind === "ANOMALY") anomalies++;
          } else {
            failed++;
          }
        }
      }

      await deleteKeysByPattern(redis, "alerts:*");

      request.log.info({ event: "seed_completed", request_id: requestId, processed, anomalies });

      response.status(200).json({
        seeded: scenarios.length,
        processed,
        anomalies,
        healthy: processed - anomalies,
        failed,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
