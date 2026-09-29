import type { Pool } from "pg";

export class SettingsRepository {
  constructor(private readonly pool: Pool) {}

  async getAll(): Promise<Record<string, string>> {
    const result = await this.pool.query<{ key: string; value: string }>(
      "SELECT key, value FROM settings",
    );
    return Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
  }

  async get(key: string): Promise<string | null> {
    const result = await this.pool.query<{ value: string }>(
      "SELECT value FROM settings WHERE key = $1",
      [key],
    );
    return result.rows[0]?.value ?? null;
  }

  async setMany(entries: Record<string, string>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const [key, value] of Object.entries(entries)) {
        await client.query(
          `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, value],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(key: string): Promise<void> {
    await this.pool.query("DELETE FROM settings WHERE key = $1", [key]);
  }
}
