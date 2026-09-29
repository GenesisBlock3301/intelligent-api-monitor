import { Router } from "express";

import { monitoringConfig } from "../../config/monitoring.js";
import { logger } from "../../infrastructure/logger.js";
import { MonitoringService } from "../../services/monitoring.service.js";
import { monitorPayloadSchema } from "../../validators/monitor.schema.js";
import { ValidationError } from "../errors/app-error.js";

export function createMonitorRouter(monitoringService: MonitoringService): Router {
  const router = Router();

  router.post("/monitor", async (request, response, next) => {
    const requestId = response.locals.requestId as string | undefined;
    logger.info({ event: "monitor_request_received", request_id: requestId });
    const validation = monitorPayloadSchema.safeParse(request.body);

    if (!validation.success) {
      logger.warn({ event: "validation_failed", request_id: requestId });
      next(new ValidationError("Invalid monitoring payload", validation.error.issues.map(({ code, message, path }) => ({ code, message, path }))));
      return;
    }

    const events = validation.data;

    if (events.length > monitoringConfig.maxMonitorBatchSize) {
      logger.warn({ event: "validation_failed", request_id: requestId, reason: "batch_size_exceeded" });
      next(new ValidationError(`Monitoring payload exceeds the maximum batch size of ${monitoringConfig.maxMonitorBatchSize}`, []));
      return;
    }

    try {
      const results = await Promise.allSettled(events.map((event) => monitoringService.process(event, { requestId })));
      const processed = results.filter((result) => result.status === "fulfilled");
      const healthy = processed.filter(
        (result) => result.status === "fulfilled" && result.value.kind === "HEALTHY",
      ).length;

      response.status(200).json({
        received: events.length,
        processed: processed.length,
        healthy,
        anomalies: processed.length - healthy,
        failed: results.length - processed.length,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
