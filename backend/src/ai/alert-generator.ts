import type { AnomalyType, ApiHealthEvent, Severity } from "../domain/contracts.js";

export interface AlertGenerationContext {
  event: ApiHealthEvent;
  anomalyTypes: AnomalyType[];
  severity: Severity;
}

export interface AlertGenerator {
  generate(context: AlertGenerationContext): Promise<string>;
}
