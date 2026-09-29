import { Router } from "express";
import type { Redis } from "ioredis";

import { monitoringConfig } from "../../config/monitoring.js";
import { MonitoringService } from "../../services/monitoring.service.js";
import { monitorPayloadSchema } from "../../validators/monitor.schema.js";
import { ValidationError } from "../errors/app-error.js";

export function createMonitorRouter(monitoringService: MonitoringService, redis: Redis): Router {
  const router = Router();

  router.post("/monitor", async (request, response, next) => {
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
        const keys = await redis.keys("alerts:*");
        if (keys.length > 0) await redis.del(...keys);
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

  return router;
}
