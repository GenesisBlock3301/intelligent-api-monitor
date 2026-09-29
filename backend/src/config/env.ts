import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("postgresql://api_sentinel:api_sentinel@localhost:5432/api_sentinel"),
});

export const env = envSchema.parse(process.env);
