import { env } from "./env.js";

const BASE_URLS: Record<string, string | undefined> = {
  openai: undefined,
  deepseek: "https://api.deepseek.com",
};

const apiKey = env.LLM_PROVIDER === "deepseek" ? env.DEEPSEEK_API_KEY : env.OPENAI_API_KEY;

export const llmConfig = {
  provider: env.LLM_PROVIDER,
  model: env.LLM_MODEL,
  apiKey,
  baseURL: BASE_URLS[env.LLM_PROVIDER],
  timeoutMs: env.LLM_TIMEOUT_MS,
} as const;
