import { env } from "./config/env.js";
import { llmConfig } from "./config/llm.js";
import { monitoringConfig } from "./config/monitoring.js";
import { createApp } from "./http/app.js";
import { databasePool, verifyDatabaseConnection } from "./infrastructure/database/pool.js";
import { logger } from "./infrastructure/logger.js";
import { redis, verifyRedisConnection } from "./infrastructure/redis.js";
import { IncidentRepository } from "./repositories/incident.repository.js";
import { SettingsRepository } from "./repositories/settings.repository.js";
import { MonitoringService } from "./services/monitoring.service.js";
import { EmailService } from "./services/email.service.js";
import { DynamicAlertGenerator } from "./ai/dynamic-alert-generator.js";

async function start(): Promise<void> {
  await verifyDatabaseConnection();
  await verifyRedisConnection();

  const incidentRepository = new IncidentRepository(databasePool);
  const settingsRepository = new SettingsRepository(databasePool);

  const alertGenerator = new DynamicAlertGenerator(
    settingsRepository,
    {
      provider: llmConfig.provider,
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      baseURL: llmConfig.baseURL,
      timeoutMs: llmConfig.timeoutMs,
    },
    logger,
  );

  const emailService = new EmailService(settingsRepository, logger);

  const monitoringService = new MonitoringService(
    incidentRepository,
    monitoringConfig,
    alertGenerator,
    logger,
    (incident) => {
      emailService.sendIncidentAlert(incident).catch((error: unknown) => {
        logger.error({ err: error, incident_id: incident.id }, "Email notification failed");
      });
    },
  );

  const app = createApp({
    monitoringService,
    incidentRepository,
    settingsRepository,
    redis,
    rateLimitConfig: {
      windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "API Sentinel backend listening");
  });

  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down gracefully");
    server.close();
    redis.disconnect();
    await databasePool.end();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

process.on("unhandledRejection", (reason: unknown) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error: Error) => {
  logger.fatal({ err: error }, "Uncaught exception — shutting down");
  process.exit(1);
});

start().catch((error: unknown) => {
  logger.fatal({ err: error }, "Unable to start backend");
  process.exit(1);
});
