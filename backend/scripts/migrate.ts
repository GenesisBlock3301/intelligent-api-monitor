import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { databasePool } from "../src/infrastructure/database/pool.js";

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "../db/migrations");

async function migrate(): Promise<void> {
  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationNames = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of migrationNames) {
    const applied = await databasePool.query<{ name: string }>(
      "SELECT name FROM schema_migrations WHERE name = $1",
      [name],
    );

    if (applied.rowCount) {
      continue;
    }

    const sql = await readFile(join(migrationsDirectory, name), "utf8");
    const client = await databasePool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
      console.log(`Applied migration: ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

migrate()
  .then(() => databasePool.end())
  .catch(async (error: unknown) => {
    console.error("Database migration failed", error);
    await databasePool.end();
    process.exit(1);
  });
