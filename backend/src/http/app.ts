import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import type { Redis } from "ioredis";

import { logger } from "../infrastructure/logger.js";
import type { IncidentRepository } from "../repositories/incident.repository.js";
import type { SettingsRepository } from "../repositories/settings.repository.js";
import { createMonitorRouter } from "./routes/monitor.routes.js";
import { createAlertsRouter } from "./routes/alerts.routes.js";
import { createSettingsRouter } from "./routes/settings.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createRateLimiter, type RateLimitConfig } from "./middleware/rate-limiter.js";
import type { MonitoringService } from "../services/monitoring.service.js";

interface AppDependencies {
  monitoringService: MonitoringService;
  incidentRepository: Pick<IncidentRepository, "findPaginated" | "resolve">;
  settingsRepository: SettingsRepository;
  redis: Redis;
  rateLimitConfig: RateLimitConfig;
}

export function createApp({ monitoringService, incidentRepository, settingsRepository, redis, rateLimitConfig }: AppDependencies) {
  const app = express();

  app.use(pinoHttp({ logger, autoLogging: true }));
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(createRateLimiter(redis, rateLimitConfig));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });
  app.use(createMonitorRouter(monitoringService, redis));
  app.use(createAlertsRouter(incidentRepository, redis));
  app.use(createSettingsRouter(settingsRepository));
  app.use(errorHandler);

  return app;
}
