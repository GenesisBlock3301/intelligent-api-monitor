import { describe, expect, it } from "vitest";

import {
  ALERT_SOURCES,
  ANOMALY_TYPES,
  INCIDENT_STATUSES,
  SEVERITIES,
  type ApiHealthEvent,
} from "./contracts.js";

describe("domain contracts", () => {
  it("defines the API health event shape used throughout monitoring", () => {
    const event: ApiHealthEvent = {
      api_name: "AppointmentAPI",
      response_time_ms: 5500,
      status_code: 500,
      records_returned: 0,
    };

    expect(event).toEqual({
      api_name: "AppointmentAPI",
      response_time_ms: 5500,
      status_code: 500,
      records_returned: 0,
    });
  });

  it("exposes the approved anomaly, severity, status, and alert-source values", () => {
    expect(ANOMALY_TYPES).toEqual(["HTTP_FAILURE", "HIGH_LATENCY", "ZERO_RECORDS"]);
    expect(SEVERITIES).toEqual(["MEDIUM", "HIGH", "CRITICAL"]);
    expect(INCIDENT_STATUSES).toEqual(["ACTIVE", "RESOLVED"]);
    expect(ALERT_SOURCES).toEqual(["LLM", "FALLBACK"]);
  });
});
