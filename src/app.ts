import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { env } from "./config/env.js";
import { AppError } from "./errors/app-error.js";
import { healthRoutes } from "./routes/health.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { assetRoutes } from "./routes/asset.routes.js";
import { claimRoutes } from "./routes/claim.routes.js";

export const app = Fastify({
  logger: true,
});

app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
  request.log.warn(
    {
      code: error.code,
      statusCode: error.statusCode,
    },
    error.message,
  );
} else {
  request.log.error(error);
}

  const fastifyError = error as {
    code?: string;
    validation?: unknown;
  };

  if (fastifyError.code === "FST_ERR_VALIDATION") {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request.",
      details: fastifyError.validation,
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  return reply.status(500).send({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
});

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
});

app.register(swagger, {
  openapi: {
    openapi: "3.0.3",
    info: {
      title: "Luarc Asset Management API",
      description:
        "Asset management API with authentication and concurrency-safe operations.",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development",
      },
    ],
    tags: [
      {
        name: "Health",
        description: "Health check endpoints",
      },
      {
        name: "Authentication",
        description: "Authentication endpoints",
      },
      {
        name: "Assets",
        description: "Asset management endpoints",
      },
      {
        name: "Claims",
        description: "Asset claiming endpoints",
      },
      {
        name: "Users",
        description: "User endpoints",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});

app.register(healthRoutes);

app.register(swaggerUi, {
  routePrefix: "/docs",
});
app.register(authRoutes, {
    prefix:"/auth",
});
app.register(assetRoutes, {
  prefix: "/assets",
});
app.register(claimRoutes);