import type { ErrorRequestHandler } from "express";

import { logger } from "../../infrastructure/logger.js";
import { AppError, ValidationError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const requestId = response.locals.requestId as string | undefined;
  const normalizedError = error instanceof SyntaxError && "body" in error
    ? new ValidationError("Invalid JSON request body")
    : error;

  if (normalizedError instanceof AppError) {
    logger.warn({
      event: "request_failed",
      request_id: requestId,
      method: request.method,
      path: request.path,
      error_code: normalizedError.code,
    }, normalizedError.message);
    response.status(normalizedError.statusCode).json({
      error: normalizedError.code,
      message: normalizedError.message,
      ...(normalizedError.details === undefined ? {} : { details: normalizedError.details }),
    });
    return;
  }

  logger.error({
    event: "request_failed",
    request_id: requestId,
    method: request.method,
    path: request.path,
    error: normalizedError instanceof Error ? normalizedError.message : "Unknown error",
  }, "Unhandled request error");
  response.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unable to process request",
  });
};
