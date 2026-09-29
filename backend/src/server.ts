import { env } from "./config/env.js";
import { llmConfig } from "./config/llm.js";
import { monitoringConfig } from "./config/monitoring.js";
import { createApp } from "./http/app.js";
import { databasePool, verifyDatabaseConnection } from "./infrastructure/database/pool.js";
import { logger } from "./infrastructure/logger.js";
import { IncidentRepository } from "./repositories/incident.repository.js";
import { MonitoringService } from "./services/monitoring.service.js";
import { OpenAIAlertGenerator } from "./ai/openai-alert-generator.js";
import OpenAI from "openai";

async function start(): Promise<void> {
  await verifyDatabaseConnection();
  const incidentRepository = new IncidentRepository(databasePool);
  const alertGenerator = llmConfig.provider === "openai" && llmConfig.apiKey
    ? new OpenAIAlertGenerator(new OpenAI({ apiKey: llmConfig.apiKey, timeout: llmConfig.timeoutMs }), llmConfig.model)
    : undefined;
  const monitoringService = new MonitoringService(
    incidentRepository,
    monitoringConfig,
    alertGenerator,
    logger,
  );
  const app = createApp(monitoringService, incidentRepository);

  const server = app.listen(env.PORT, () => {
    console.log(`API Sentinel backend listening on port ${env.PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await databasePool.end();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((error: unknown) => {
  console.error("Unable to start backend", error);
  process.exit(1);
});
