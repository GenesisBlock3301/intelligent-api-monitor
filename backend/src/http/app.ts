import cors from "cors";
import express from "express";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export const app = express();

app.use((request, response, next) => {
  const startedAt = performance.now();

  response.on("finish", () => {
    logger.info({
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    }, "HTTP request completed");
  });

  next();
});
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});
