import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("postgresql://api_sentinel:api_sentinel@localhost:5432/api_sentinel"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  HIGH_LATENCY_THRESHOLD_MS: z.coerce.number().nonnegative().default(3000),
  MAX_MONITOR_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  LLM_PROVIDER: z.enum(["openai", "deepseek", "disabled"]).default("deepseek"),
  LLM_MODEL: z.string().min(1).default("deepseek-chat"),
  OPENAI_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  DEEPSEEK_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
});

export const env = envSchema.parse(process.env);
