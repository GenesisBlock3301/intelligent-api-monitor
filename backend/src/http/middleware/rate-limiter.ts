import type { RequestHandler } from "express";
import type { Redis } from "ioredis";

import { logger } from "../../infrastructure/logger.js";

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

export function createRateLimiter(redis: Redis, config: RateLimitConfig): RequestHandler {
  const { windowSeconds, maxRequests } = config;

  return async (request, response, next) => {
    const key = `rate_limit:${request.ip}`;

    try {
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;

      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, windowSeconds);
      const results = await pipeline.exec();

      const count = results?.[2]?.[1] as number;

      response.setHeader("X-RateLimit-Limit", maxRequests);
      response.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count));
      response.setHeader("X-RateLimit-Reset", Math.ceil((now + windowSeconds * 1000) / 1000));

      if (count > maxRequests) {
        logger.warn({
          event: "rate_limit_exceeded",
          ip: request.ip,
          count,
          limit: maxRequests,
        }, "Rate limit exceeded");

        response.status(429).json({
          error: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests. Limit: ${maxRequests} per ${windowSeconds}s`,
          retryAfter: windowSeconds,
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis is down, allow the request through but log the failure
      logger.error({ err: error, event: "rate_limit_error" }, "Rate limiter failed, allowing request");
      next();
    }
  };
}
