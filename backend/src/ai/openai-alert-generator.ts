import OpenAI from "openai";

import type { AlertGenerationContext, AlertGenerator } from "./alert-generator.js";

const instructions = [
  "Generate one concise, human-readable operational alert.",
  "Use only the supplied telemetry facts.",
  "Do not infer a root cause or claim certainty beyond the evidence.",
  "Do not include markdown or a heading.",
].join(" ");

export class OpenAIAlertGenerator implements AlertGenerator {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async generate(context: AlertGenerationContext): Promise<string> {
    const response = await this.client.responses.create({
      model: this.model,
      instructions,
      input: JSON.stringify({
        api_name: context.event.api_name,
        status_code: context.event.status_code,
        response_time_ms: context.event.response_time_ms,
        records_returned: context.event.records_returned,
        anomalies: context.anomalyTypes,
        severity: context.severity,
      }),
    });
    const message = response.output_text.trim();

    if (!message) {
      throw new Error("OpenAI returned an empty alert message");
    }

    return message;
  }
}
