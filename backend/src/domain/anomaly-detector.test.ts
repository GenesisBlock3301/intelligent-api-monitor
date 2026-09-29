import { describe, expect, it } from "vitest";

import { anomalyTypes, detectAnomalies } from "./anomaly-detector.js";

const config = { highLatencyThresholdMs: 3000 };
const healthyEvent = {
  api_name: "PatientDataAPI",
  response_time_ms: 1200,
  status_code: 200,
  records_returned: 50,
};

describe("detectAnomalies", () => {
  it("returns no anomalies for a healthy event", () => {
    expect(detectAnomalies(healthyEvent, config)).toEqual([]);
  });

  it("detects an HTTP failure", () => {
    expect(detectAnomalies({ ...healthyEvent, status_code: 500 }, config)).toEqual([
      { type: "HTTP_FAILURE", evidence: { status_code: 500 } },
    ]);
  });

  it("detects latency only above the configured threshold", () => {
    expect(anomalyTypes(detectAnomalies({ ...healthyEvent, response_time_ms: 3000 }, config))).toEqual([]);
    expect(detectAnomalies({ ...healthyEvent, response_time_ms: 3001 }, config)).toEqual([
      { type: "HIGH_LATENCY", evidence: { actual_ms: 3001, threshold_ms: 3000 } },
    ]);
  });

  it("detects zero records", () => {
    expect(detectAnomalies({ ...healthyEvent, records_returned: 0 }, config)).toEqual([
      { type: "ZERO_RECORDS", evidence: { records_returned: 0 } },
    ]);
  });

  it("returns all triggered anomalies in deterministic order", () => {
    const anomalies = detectAnomalies({
      ...healthyEvent,
      status_code: 503,
      response_time_ms: 5500,
      records_returned: 0,
    }, config);

    expect(anomalyTypes(anomalies)).toEqual(["HTTP_FAILURE", "HIGH_LATENCY", "ZERO_RECORDS"]);
  });
});
