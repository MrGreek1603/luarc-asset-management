import type { FastifyPluginAsync } from "fastify";
import { claimAssetController } from "../controllers/claim.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const claimRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/assets/:id/claim",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Claims"],
        summary: "Claim an asset",
        description:
          "Claims an available asset for the authenticated user.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              minimum: 1,
            },
          },
        },
      },
    },
    claimAssetController,
  );
};