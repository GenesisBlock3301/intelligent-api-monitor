import { afterAll, afterEach, describe, expect, it } from "vitest";

import { databasePool } from "../infrastructure/database/pool.js";
import { IncidentRepository } from "./incident.repository.js";

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === "true";
const describeDatabase = runDatabaseTests ? describe : describe.skip;
const repository = new IncidentRepository(databasePool);
const createdIncidentIds: string[] = [];

describeDatabase("IncidentRepository", () => {
  afterEach(async () => {
    if (createdIncidentIds.length > 0) {
      await databasePool.query("DELETE FROM incidents WHERE id = ANY($1::uuid[])", [createdIncidentIds]);
      createdIncidentIds.length = 0;
    }
  });

  afterAll(async () => {
    await databasePool.end();
  });

  it("creates, retrieves, and increments an active incident", async () => {
    const created = await repository.create({
      fingerprint: `AppointmentAPI:HTTP_FAILURE:${crypto.randomUUID()}`,
      event: {
        api_name: "AppointmentAPI",
        response_time_ms: 5500,
        status_code: 500,
        records_returned: 0,
      },
      anomalyTypes: ["HTTP_FAILURE", "HIGH_LATENCY", "ZERO_RECORDS"],
      severity: "CRITICAL",
      alertMessage: "AppointmentAPI is unavailable.",
      alertSource: "FALLBACK",
    });
    createdIncidentIds.push(created.id);

    expect((await repository.findActiveByFingerprint(created.fingerprint))?.id).toBe(created.id);

    const updated = await repository.incrementOccurrence(created.id, {
      api_name: "AppointmentAPI",
      response_time_ms: 6200,
      status_code: 503,
      records_returned: 0,
    });

    expect(updated).toMatchObject({
      id: created.id,
      occurrence_count: 2,
      status_code: 503,
      response_time_ms: 6200,
    });
    expect((await repository.findById(created.id))?.anomaly_types).toEqual([
      "HTTP_FAILURE",
      "HIGH_LATENCY",
      "ZERO_RECORDS",
    ]);
  });
});
