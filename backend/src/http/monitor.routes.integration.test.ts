import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Redis } from "ioredis";

import { env } from "../config/env.js";
import { monitoringConfig } from "../config/monitoring.js";
import { buildIncidentFingerprint } from "../domain/incident-fingerprint.js";
import { createApp } from "./app.js";
import { databasePool } from "../infrastructure/database/pool.js";
import { IncidentRepository } from "../repositories/incident.repository.js";
import { SettingsRepository } from "../repositories/settings.repository.js";
import { MonitoringService } from "../services/monitoring.service.js";

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === "true";
const describeDatabase = runDatabaseTests ? describe : describe.skip;
const repository = new IncidentRepository(databasePool);
const settingsRepository = new SettingsRepository(databasePool);
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
const app = createApp({
  monitoringService: new MonitoringService(repository, monitoringConfig),
  incidentRepository: repository,
  settingsRepository,
  redis,
  rateLimitConfig: { windowSeconds: 60, maxRequests: 10000 },
});
const apiName = `MonitorIntegrationAPI-${crypto.randomUUID()}`;

describeDatabase("POST /monitor", () => {
  afterEach(async () => {
    await databasePool.query("DELETE FROM incidents WHERE api_name = $1", [apiName]);
  });

  afterAll(async () => {
    redis.disconnect();
    await databasePool.end();
  });

  it("persists an anomaly and increments the existing incident for a duplicate event", async () => {
    const event = {
      api_name: apiName,
      response_time_ms: 5500,
      status_code: 500,
      records_returned: 0,
    };

    await request(app)
      .post("/monitor")
      .send(event)
      .expect(200)
      .expect({ received: 1, processed: 1, healthy: 0, anomalies: 1, failed: 0 });

    await request(app)
      .post("/monitor")
      .send(event)
      .expect(200)
      .expect({ received: 1, processed: 1, healthy: 0, anomalies: 1, failed: 0 });

    const incident = await repository.findActiveByFingerprint(buildIncidentFingerprint(apiName, [
      "HTTP_FAILURE",
      "HIGH_LATENCY",
      "ZERO_RECORDS",
    ]));

    expect(incident).toMatchObject({ occurrence_count: 2, severity: "CRITICAL" });
  });

  it("deduplicates identical events submitted in one batch", async () => {
    const event = { api_name: apiName, response_time_ms: 5500, status_code: 500, records_returned: 0 };

    await request(app).post("/monitor").send([event, event]).expect(200);

    const incident = await repository.findActiveByFingerprint(buildIncidentFingerprint(apiName, [
      "HTTP_FAILURE",
      "HIGH_LATENCY",
      "ZERO_RECORDS",
    ]));

    expect(incident).toMatchObject({ occurrence_count: 2 });
  });

  it("reports healthy and anomalous events independently for a batch", async () => {
    await request(app)
      .post("/monitor")
      .send([
        { api_name: `${apiName}-healthy`, response_time_ms: 100, status_code: 200, records_returned: 1 },
        { api_name: apiName, response_time_ms: 4000, status_code: 200, records_returned: 1 },
      ])
      .expect(200)
      .expect({ received: 2, processed: 2, healthy: 1, anomalies: 1, failed: 0 });

    await databasePool.query("DELETE FROM incidents WHERE api_name = $1", [`${apiName}-healthy`]);
  });

  it("returns active incidents through GET /alerts", async () => {
    await request(app)
      .post("/monitor")
      .send({ api_name: apiName, response_time_ms: 4000, status_code: 200, records_returned: 1 })
      .expect(200);

    const response = await request(app).get("/alerts").expect(200);

    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ api_name: apiName, status: "ACTIVE", severity: "MEDIUM" }),
    ]));
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 20 });
    expect(response.body.summary).toMatchObject({ affectedApis: expect.any(Number) });
  });

  it("rejects invalid telemetry before processing", async () => {
    await request(app)
      .post("/monitor")
      .send({ api_name: "", response_time_ms: -1, status_code: 600, records_returned: "none" })
      .expect(400)
      .expect((response) => {
        expect(response.body.error).toBe("VALIDATION_ERROR");
        expect(response.body.details.length).toBeGreaterThan(0);
      });
  });
});
