import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../middleware/auth.middleware.js";

import {
  createAssetController,
  getAssetPoolController,
  getAssetsController,
  updateAssetController,
} from "../controllers/asset.controller.js";

export const assetRoutes: FastifyPluginAsync = async (
  app,
) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["Assets"],
        summary: "List assets",
        description:
          "Returns paginated assets with optional status filtering.",
        querystring: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            status: {
              type: "string",
              enum: [
                "AVAILABLE",
                "CLAIMED",
                "EXPIRED",
              ],
            },
          },
        },
      },
    },
    getAssetsController,
  );

  app.get(
    "/pool",
    {
      schema: {
        tags: ["Assets"],
        summary: "Get global asset pool",
        description:
          "Returns total asset counts grouped by status.",
      },
    },
    getAssetPoolController,
  );

  app.post(
    "/",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Assets"],
        summary: "Create an asset",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: [
            "code",
            "title",
            "valueInCents",
          ],
          properties: {
            code: {
              type: "string",
              minLength: 1,
            },
            title: {
              type: "string",
              minLength: 1,
            },
            valueInCents: {
              type: "integer",
              minimum: 0,
            },
          },
        },
      },
    },
    createAssetController,
  );

  app.patch(
    "/:id",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Assets"],
        summary: "Update an asset",
        security: [{ bearerAuth: [] }],
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
        body: {
          type: "object",
          required: ["version"],
          properties: {
            title: {
              type: "string",
              minLength: 1,
            },
            valueInCents: {
              type: "integer",
              minimum: 0,
            },
            version: {
              type: "integer",
              minimum: 0,
            },
          },
        },
      },
    },
    updateAssetController,
  );
};