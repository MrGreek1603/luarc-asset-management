import type { FastifyDynamicSwaggerOptions } from "@fastify/swagger";

export const swaggerOptions: FastifyDynamicSwaggerOptions = {
  openapi: {
    openapi: "3.0.3",
    info: {
      title: "Luarc Asset Management API",
      description:
        "Asset management API with JWT authentication, concurrency-safe claims, and optimistic locking.",
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
        description: "Application health checks",
      },
      {
        name: "Authentication",
        description: "User registration and login",
      },
      {
        name: "Assets",
        description: "Asset management",
      },
      {
        name: "Claims",
        description: "Asset claiming and claim history",
      },
      {
        name: "Users",
        description: "Authenticated user resources",
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
};