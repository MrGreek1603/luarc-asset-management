import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const start = async () => {
  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });

    app.log.info(`Server running on http://localhost:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down gracefully...`);

  try {
    await app.close();
    await prisma.$disconnect();

    app.log.info("Application shutdown complete.");
    process.exit(0);
  } catch (error) {
    app.log.error(error, "Graceful shutdown failed.");
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();