import { describe, expect, it, vi } from "vitest";

import type { Incident } from "../domain/contracts.js";
import { MonitoringService } from "./monitoring.service.js";

const event = {
  api_name: "AppointmentAPI",
  response_time_ms: 5500,
  status_code: 500,
  records_returned: 0,
};

const existingIncident: Incident = {
  id: "incident-1",
  fingerprint: "AppointmentAPI:HIGH_LATENCY|HTTP_FAILURE",
  api_name: "AppointmentAPI",
  anomaly_types: ["HTTP_FAILURE", "HIGH_LATENCY"],
  severity: "CRITICAL",
  status_code: 500,
  response_time_ms: 5500,
  records_returned: 0,
  alert_message: "AppointmentAPI is returning errors and responding unusually slowly.",
  alert_source: "FALLBACK",
  status: "ACTIVE",
  occurrence_count: 1,
  first_seen_at: new Date(),
  last_seen_at: new Date(),
  resolved_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

function createRepositoryMock() {
  return {
    findActiveByFingerprint: vi.fn(),
    create: vi.fn(),
    incrementOccurrence: vi.fn(),
  };
}

describe("MonitoringService", () => {
  it("returns a healthy outcome without touching persistence", async () => {
    const repository = createRepositoryMock();
    const service = new MonitoringService(repository, { highLatencyThresholdMs: 3000 });

    await expect(service.process({ ...event, status_code: 200, response_time_ms: 500, records_returned: 1 }))
      .resolves.toMatchObject({ kind: "HEALTHY" });
    expect(repository.findActiveByFingerprint).not.toHaveBeenCalled();
  });

  it("creates an incident for a new anomaly fingerprint", async () => {
    const repository = createRepositoryMock();
    repository.findActiveByFingerprint.mockResolvedValue(null);
    repository.create.mockResolvedValue(existingIncident);
    const service = new MonitoringService(repository, { highLatencyThresholdMs: 3000 });

    const result = await service.process(event);

    expect(result).toMatchObject({
      kind: "ANOMALY",
      action: "CREATED",
      severity: "CRITICAL",
      fingerprint: "AppointmentAPI:HIGH_LATENCY|HTTP_FAILURE",
    });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      alertSource: "FALLBACK",
      alertMessage: "AppointmentAPI is returning errors and responding unusually slowly.",
    }));
  });

  it("updates the existing active incident for a repeated anomaly", async () => {
    const repository = createRepositoryMock();
    repository.findActiveByFingerprint.mockResolvedValue(existingIncident);
    repository.incrementOccurrence.mockResolvedValue({ ...existingIncident, occurrence_count: 2 });
    const service = new MonitoringService(repository, { highLatencyThresholdMs: 3000 });

    const result = await service.process(event);

    expect(result).toMatchObject({ kind: "ANOMALY", action: "UPDATED", incident: { occurrence_count: 2 } });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("stores an LLM alert when the generator succeeds", async () => {
    const repository = createRepositoryMock();
    repository.findActiveByFingerprint.mockResolvedValue(null);
    repository.create.mockResolvedValue(existingIncident);
    const alertGenerator = { generate: vi.fn().mockResolvedValue("AppointmentAPI is unavailable.") };
    const service = new MonitoringService(repository, { highLatencyThresholdMs: 3000 }, alertGenerator);

    await service.process(event);

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      alertMessage: "AppointmentAPI is unavailable.",
      alertSource: "LLM",
    }));
  });

  it("falls back and still creates an incident when the LLM generator fails", async () => {
    const repository = createRepositoryMock();
    repository.findActiveByFingerprint.mockResolvedValue(null);
    repository.create.mockResolvedValue(existingIncident);
    const alertGenerator = { generate: vi.fn().mockRejectedValue(new Error("Provider timeout")) };
    const service = new MonitoringService(repository, { highLatencyThresholdMs: 3000 }, alertGenerator);

    await service.process(event);

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      alertSource: "FALLBACK",
      alertMessage: "AppointmentAPI is returning errors and responding unusually slowly.",
    }));
  });
});
