import type { Redis } from "ioredis";
import request from "supertest";
import { describe, expect, it } from "vitest";

import type { SettingsRepository } from "../repositories/settings.repository.js";
import type { MonitoringService } from "../services/monitoring.service.js";
import { createApp } from "./app.js";

const deploymentOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://10.250.140.136:3000",
  "http://10.250.140.136",
];

const app = createApp({
  monitoringService: {} as MonitoringService,
  incidentRepository: {
    findPaginated: () => Promise.reject(new Error("not used")),
    resolve: () => Promise.reject(new Error("not used")),
    deleteAll: () => Promise.reject(new Error("not used")),
  },
  settingsRepository: {} as SettingsRepository,
  redis: {} as Redis,
  rateLimitConfig: { windowSeconds: 60, maxRequests: 100 },
  corsOrigins: deploymentOrigins,
});

describe("CORS allowlist", () => {
  it("returns the requesting origin for an allowed dashboard origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://10.250.140.136:3000")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("http://10.250.140.136:3000");
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("allows the host Nginx origin on port 80", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://10.250.140.136")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("http://10.250.140.136");
  });

  it("answers a preflight for the methods and headers the dashboard uses", async () => {
    const response = await request(app)
      .options("/monitor")
      .set("Origin", "http://10.250.140.136:3000")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe("http://10.250.140.136:3000");
    expect(response.headers["access-control-allow-methods"]).toBe("GET,POST,PUT,PATCH,DELETE");
    expect(response.headers["access-control-allow-headers"]).toBe("Content-Type");
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("grants no CORS permission to an origin outside the allowlist", async () => {
    const preflight = await request(app)
      .options("/alerts")
      .set("Origin", "http://evil.example")
      .set("Access-Control-Request-Method", "GET")
      .expect(204);

    expect(preflight.headers["access-control-allow-origin"]).toBeUndefined();
    expect(preflight.headers["access-control-allow-credentials"]).toBeUndefined();

    const actual = await request(app)
      .get("/health")
      .set("Origin", "https://evil.example")
      .expect(200);

    expect(actual.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
