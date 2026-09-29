import { Router } from "express";

import type { IncidentRepository } from "../../repositories/incident.repository.js";

type AlertStore = Pick<IncidentRepository, "findActive">;

export function createAlertsRouter(incidentRepository: AlertStore): Router {
  const router = Router();

  router.get("/alerts", async (_request, response, next) => {
    try {
      response.status(200).json({ data: await incidentRepository.findActive() });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
