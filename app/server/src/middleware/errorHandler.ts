// Global error handling middleware
import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
});

export interface ApiError extends Error {
  statusCode?: number;
  details?: unknown;
}

// Global error handler
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error with request context
  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
      statusCode,
    },
    req: {
      method: req.method,
      url: req.url,
      body: req.body,
    },
  }, 'Request error');

  // Don't expose internal errors in production
  const response: { error: string; details?: unknown } = {
    error:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : message,
  };

  if (err.details) {
    response.details = err.details;
  }

  res.status(statusCode).json(response);
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
}

// Helper to create API errors
export function createApiError(message: string, statusCode = 500, details?: unknown): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
