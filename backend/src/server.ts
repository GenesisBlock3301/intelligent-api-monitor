import { env } from "./config/env.js";
import { app } from "./http/app.js";
import { databasePool, verifyDatabaseConnection } from "./infrastructure/database/pool.js";

async function start(): Promise<void> {
  await verifyDatabaseConnection();

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
