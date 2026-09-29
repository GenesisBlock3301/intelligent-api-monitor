import { Redis } from "ioredis";

import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (error: Error) => {
  logger.error({ err: error }, "Redis connection error");
});

export async function verifyRedisConnection(): Promise<void> {
  await redis.connect();
  await redis.ping();
  logger.info("Redis connection verified");
}

export async function deleteKeysByPattern(client: Redis, pattern: string): Promise<number> {
  let cursor = "0";
  let deleted = 0;
  do {
    const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await client.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== "0");
  return deleted;
}
