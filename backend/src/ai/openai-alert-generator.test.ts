import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { OpenAIAlertGenerator } from "./openai-alert-generator.js";

describe("OpenAIAlertGenerator", () => {
  it("sends structured facts and returns the generated alert text", async () => {
    const create = vi.fn().mockResolvedValue({ output_text: "AppointmentAPI requires investigation." });
    const client = { responses: { create } } as unknown as OpenAI;
    const generator = new OpenAIAlertGenerator(client, "gpt-5-mini");

    await expect(generator.generate({
      event: { api_name: "AppointmentAPI", status_code: 500, response_time_ms: 5500, records_returned: 0 },
      anomalyTypes: ["HTTP_FAILURE", "HIGH_LATENCY", "ZERO_RECORDS"],
      severity: "CRITICAL",
    })).resolves.toBe("AppointmentAPI requires investigation.");

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5-mini",
      input: expect.stringContaining('"status_code":500'),
    }));
  });

  it("rejects an empty provider response so the service can fall back", async () => {
    const client = { responses: { create: vi.fn().mockResolvedValue({ output_text: "  " }) } } as unknown as OpenAI;
    const generator = new OpenAIAlertGenerator(client, "gpt-5-mini");

    await expect(generator.generate({
      event: { api_name: "AppointmentAPI", status_code: 500, response_time_ms: 5500, records_returned: 0 },
      anomalyTypes: ["HTTP_FAILURE"],
      severity: "HIGH",
    })).rejects.toThrow("empty alert message");
  });
});
