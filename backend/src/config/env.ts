import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("postgresql://api_sentinel:api_sentinel@localhost:5432/api_sentinel"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  HIGH_LATENCY_THRESHOLD_MS: z.coerce.number().nonnegative().default(3000),
  MAX_MONITOR_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(500),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().optional(),
});

/** Browser origins used by the Vite dev server and the local Docker frontend. */
export const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

const ORIGIN_PATTERN = /^https?:\/\/[^/\s]+$/;

export function parseCorsOrigins(value: string | undefined): string[] {
  const configured = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  for (const origin of configured) {
    if (origin === "*" || !ORIGIN_PATTERN.test(origin)) {
      throw new Error(
        `CORS_ORIGINS must list explicit http(s) origins without paths. Invalid entry: ${origin}`,
      );
    }
  }

  return [...new Set<string>([...LOCAL_DEV_ORIGINS, ...configured])];
}

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  corsOrigins: parseCorsOrigins(parsedEnv.CORS_ORIGINS),
};
