import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long."),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required."),
});

export const env = envSchema.parse(process.env);