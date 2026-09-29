import type { ErrorRequestHandler } from "express";

import { AppError, ValidationError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const normalizedError = error instanceof SyntaxError && "body" in error
    ? new ValidationError("Invalid JSON request body")
    : error;

  if (normalizedError instanceof AppError) {
    request.log.warn({
      event: "request_failed",
      error_code: normalizedError.code,
    }, normalizedError.message);
    response.status(normalizedError.statusCode).json({
      error: normalizedError.code,
      message: normalizedError.message,
      ...(normalizedError.details === undefined ? {} : { details: normalizedError.details }),
    });
    return;
  }

  request.log.error({
    event: "request_failed",
    err: normalizedError instanceof Error ? normalizedError : undefined,
  }, "Unhandled request error");
  response.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unable to process request",
  });
};
