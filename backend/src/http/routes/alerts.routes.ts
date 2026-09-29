import { Router } from "express";
import type { Redis } from "ioredis";

import type { IncidentRepository } from "../../repositories/incident.repository.js";
import { deleteKeysByPattern } from "../../infrastructure/redis.js";

type AlertStore = Pick<IncidentRepository, "findPaginated" | "resolve" | "deleteAll">;

const CACHE_TTL_SECONDS = 5;

export function createAlertsRouter(incidentRepository: AlertStore, redis: Redis): Router {
  const router = Router();

  router.get("/alerts", async (request, response, next) => {
    try {
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));
      const offset = (page - 1) * limit;
      const statusParam = String(request.query.status ?? "ACTIVE").toUpperCase();
      const status = statusParam === "RESOLVED" ? "RESOLVED" : statusParam === "ALL" ? "ALL" : "ACTIVE";

      const cacheKey = `alerts:status=${status}:page=${page}:limit=${limit}`;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          request.log.info({ event: "cache_hit", cacheKey });
          response.setHeader("X-Cache", "HIT");
          response.status(200).json(JSON.parse(cached));
          return;
        }
      } catch {
        request.log.warn({ event: "cache_read_error", cacheKey });
      }

      const result = await incidentRepository.findPaginated(status, limit, offset);
      const totalPages = Math.max(1, Math.ceil(result.total / limit));

      const payload = {
        data: result.data,
        pagination: { page, limit, total: result.total, totalPages },
        summary: result.summary,
      };

      try {
        await redis.set(cacheKey, JSON.stringify(payload), "EX", CACHE_TTL_SECONDS);
      } catch {
        request.log.warn({ event: "cache_write_error", cacheKey });
      }

      response.setHeader("X-Cache", "MISS");
      response.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/alerts/:id/resolve", async (request, response, next) => {
    try {
      const incident = await incidentRepository.resolve(request.params.id);

      if (!incident) {
        response.status(404).json({ error: "NOT_FOUND", message: "Incident not found or already resolved" });
        return;
      }

      request.log.info({ event: "incident_resolved", incident_id: incident.id, api_name: incident.api_name });

      try { await deleteKeysByPattern(redis, "alerts:*"); } catch {}

      response.status(200).json({ data: incident });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/alerts", async (request, response, next) => {
    try {
      const deleted = await incidentRepository.deleteAll();
      request.log.info({ event: "all_incidents_deleted", deleted });

      try { await deleteKeysByPattern(redis, "alerts:*"); } catch {}

      response.status(200).json({ deleted });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
