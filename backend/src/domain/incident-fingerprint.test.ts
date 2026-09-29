import { describe, expect, it } from "vitest";

import { buildIncidentFingerprint } from "./incident-fingerprint.js";

describe("buildIncidentFingerprint", () => {
  it("uses the API name and sorted unique anomaly types", () => {
    expect(buildIncidentFingerprint("AppointmentAPI", [
      "ZERO_RECORDS",
      "HTTP_FAILURE",
      "HIGH_LATENCY",
      "HTTP_FAILURE",
    ])).toBe("AppointmentAPI:HIGH_LATENCY|HTTP_FAILURE|ZERO_RECORDS");
  });

  it("rejects a fingerprint without anomaly types", () => {
    expect(() => buildIncidentFingerprint("AppointmentAPI", [])).toThrow("without anomaly types");
  });
});
