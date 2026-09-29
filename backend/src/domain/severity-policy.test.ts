import { describe, expect, it } from "vitest";

import { determineSeverity } from "./severity-policy.js";

describe("determineSeverity", () => {
  it.each([
    [[], null],
    [["HIGH_LATENCY"], "MEDIUM"],
    [["ZERO_RECORDS"], "MEDIUM"],
    [["HTTP_FAILURE"], "HIGH"],
    [["HTTP_FAILURE", "ZERO_RECORDS"], "HIGH"],
    [["HTTP_FAILURE", "HIGH_LATENCY"], "CRITICAL"],
    [["HTTP_FAILURE", "HIGH_LATENCY", "ZERO_RECORDS"], "CRITICAL"],
  ] as const)("classifies %j as %s", (anomalies, expectedSeverity) => {
    expect(determineSeverity(anomalies)).toBe(expectedSeverity);
  });
});
