import type { FastifyPluginAsync } from "fastify";

import {
  databaseHealthController,
  healthController,
} from "../controllers/health.controller.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Health check",
        description: "Checks whether the API is running.",
      },
    },
    healthController,
  );

  app.get(
    "/health/db",
    {
      schema: {
        tags: ["Health"],
        summary: "Database health check",
        description: "Checks whether PostgreSQL is reachable.",
      },
    },
    databaseHealthController,
  );
};