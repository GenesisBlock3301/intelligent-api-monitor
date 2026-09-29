import { describe, expect, it } from "vitest";

import { monitorPayloadSchema } from "./monitor.schema.js";

const validEvent = {
  api_name: "PatientDataAPI",
  response_time_ms: 1200,
  status_code: 200,
  records_returned: 50,
};

describe("monitor payload schema", () => {
  it("accepts and normalizes a single health event to an array", () => {
    expect(monitorPayloadSchema.parse(validEvent)).toEqual([validEvent]);
  });

  it("accepts a non-empty batch of health events", () => {
    expect(monitorPayloadSchema.parse([validEvent, { ...validEvent, api_name: "AppointmentAPI" }]))
      .toHaveLength(2);
  });

  it.each([
    ["a missing field", { api_name: "PatientDataAPI", status_code: 200, records_returned: 1 }],
    ["a wrong field type", { ...validEvent, records_returned: "50" }],
    ["a negative response time", { ...validEvent, response_time_ms: -1 }],
    ["an invalid status code", { ...validEvent, status_code: 600 }],
    ["an empty batch", []],
  ])("rejects %s", (_description, payload) => {
    expect(monitorPayloadSchema.safeParse(payload).success).toBe(false);
  });
});
