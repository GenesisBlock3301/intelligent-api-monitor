import { env } from "./env.js";

export const monitoringConfig = {
  highLatencyThresholdMs: env.HIGH_LATENCY_THRESHOLD_MS,
  maxMonitorBatchSize: env.MAX_MONITOR_BATCH_SIZE,
} as const;
