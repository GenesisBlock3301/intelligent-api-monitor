import { env } from "./env.js";

export const llmConfig = {
  provider: env.LLM_PROVIDER,
  model: env.LLM_MODEL,
  apiKey: env.OPENAI_API_KEY,
  timeoutMs: env.LLM_TIMEOUT_MS,
} as const;
