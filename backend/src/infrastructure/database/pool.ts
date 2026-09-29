import { Pool } from "pg";

import { env } from "../../config/env.js";

export const databasePool = new Pool({ connectionString: env.DATABASE_URL });

export async function verifyDatabaseConnection(): Promise<void> {
  await databasePool.query("SELECT 1");
}
