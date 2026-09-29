import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";

import { logger } from "../infrastructure/logger.js";
import type { IncidentRepository } from "../repositories/incident.repository.js";
import { createMonitorRouter } from "./routes/monitor.routes.js";
import { createAlertsRouter } from "./routes/alerts.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import type { MonitoringService } from "../services/monitoring.service.js";

export function createApp(monitoringService: MonitoringService, incidentRepository: Pick<IncidentRepository, "findActive">) {
  const app = express();

  app.use((_request, response, next) => {
    response.locals.requestId = randomUUID();
    response.setHeader("X-Request-Id", response.locals.requestId);
    next();
  });

  app.use((request, response, next) => {
    const startedAt = performance.now();

    response.on("finish", () => {
      logger.info({
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      }, "HTTP request completed");
    });

    next();
  });
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });
  app.use(createMonitorRouter(monitoringService));
  app.use(createAlertsRouter(incidentRepository));
  app.use(errorHandler);

  return app;
}
