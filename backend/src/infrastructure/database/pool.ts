import { Pool } from "pg";

import { env } from "../../config/env.js";

export const databasePool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function verifyDatabaseConnection(): Promise<void> {
  await databasePool.query("SELECT 1");
}
