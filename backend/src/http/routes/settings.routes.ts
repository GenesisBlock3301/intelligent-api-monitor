import { Router } from "express";
import { z } from "zod";

import type { SettingsRepository } from "../../repositories/settings.repository.js";

const SENSITIVE_KEYS = new Set(["llm_api_key", "email_password"]);

const VALID_KEYS = new Set([
  "llm_provider",
  "llm_api_key",
  "llm_model",
  "email_enabled",
  "email_to",
  "email_from",
  "email_password",
]);

const settingsSchema = z.record(z.string(), z.string()).refine(
  (obj) => Object.keys(obj).every((k) => VALID_KEYS.has(k)),
  { message: "Unknown settings key" },
);

function maskValue(value: string): string {
  if (value.length <= 4) return "****";
  return "*".repeat(value.length - 4) + value.slice(-4);
}

function maskSettings(settings: Record<string, string>): Record<string, string> {
  const masked = { ...settings };
  for (const key of SENSITIVE_KEYS) {
    if (masked[key]) masked[key] = maskValue(masked[key]);
  }
  return masked;
}

export function createSettingsRouter(settingsRepository: SettingsRepository) {
  const router = Router();

  router.get("/settings", async (_request, response) => {
    const settings = await settingsRepository.getAll();
    response.json({ data: maskSettings(settings) });
  });

  router.put("/settings", async (request, response) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }

    const entries: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (SENSITIVE_KEYS.has(key) && value.includes("*")) continue;
      entries[key] = value;
    }

    if (Object.keys(entries).length > 0) {
      await settingsRepository.setMany(entries);
    }

    const updated = await settingsRepository.getAll();
    response.json({ data: maskSettings(updated) });
  });

  return router;
}
