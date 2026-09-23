import { app } from "./app.js";
import { env } from "./config/env.js";

const start = async () => {
  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });

    app.log.info(`Server running on http://localhost:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();