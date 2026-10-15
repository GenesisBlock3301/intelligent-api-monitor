import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import type { Redis } from "ioredis";

import { LOCAL_DEV_ORIGINS } from "../config/env.js";
import { logger } from "../infrastructure/logger.js";
import type { IncidentRepository } from "../repositories/incident.repository.js";
import type { SettingsRepository } from "../repositories/settings.repository.js";
import { createMonitorRouter } from "./routes/monitor.routes.js";
import { createAlertsRouter } from "./routes/alerts.routes.js";
import { createSettingsRouter } from "./routes/settings.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import type { RateLimitConfig } from "./middleware/rate-limiter.js";
import type { MonitoringService } from "../services/monitoring.service.js";

interface AppDependencies {
  monitoringService: MonitoringService;
  incidentRepository: Pick<IncidentRepository, "findPaginated" | "resolve" | "deleteAll">;
  settingsRepository: SettingsRepository;
  redis: Redis;
  rateLimitConfig: RateLimitConfig;
  corsOrigins?: readonly string[];
}

const CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const CORS_ALLOWED_HEADERS = ["Content-Type"];

export function createApp({
  monitoringService,
  incidentRepository,
  settingsRepository,
  redis,
  rateLimitConfig,
  corsOrigins = LOCAL_DEV_ORIGINS,
}: AppDependencies) {
  const app = express();

  app.use(pinoHttp({ logger, autoLogging: true }));
  app.use(cors({
    origin: [...corsOrigins],
    methods: CORS_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    credentials: false,
    optionsSuccessStatus: 204,
  }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });
  app.use(createMonitorRouter(monitoringService, redis, rateLimitConfig));
  app.use(createAlertsRouter(incidentRepository, redis));
  app.use(createSettingsRouter(settingsRepository));
  app.use(errorHandler);

  return app;
}
