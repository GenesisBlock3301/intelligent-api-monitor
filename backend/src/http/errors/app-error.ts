export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "External service request failed") {
    super(message, 502, "EXTERNAL_SERVICE_ERROR");
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database request failed") {
    super(message, 503, "DATABASE_ERROR");
  }
}
