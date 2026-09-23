import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/auth.middleware.js";

import {
  loginController,
  registerController,
} from "../controllers/auth.controller.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/register",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Register a user",
        description: "Creates a new user account.",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 8,
            },
          },
        },
      },
    },
    registerController,
  );

  app.post(
    "/login",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Login",
        description: "Validates credentials and returns a JWT.",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 8,
            },
          },
        },
      },
    },
    loginController,
  );

  app.get(
  "/me",
  {
    preHandler: authenticate,
    schema: {
      tags: ["Authentication"],
      summary: "Get current authenticated user",
      security: [{ bearerAuth: [] }],
    },
  },
  async (request) => {
    return {
      user: request.user,
    };
  },
);
};