import { Response } from 'express';
import { ZodError } from 'zod';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public field?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check that all required fields are completed correctly.',
  UNAUTHORIZED: 'You need to be logged in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource could not be found.',
  CONFLICT: 'This action conflicts with existing data. Please check and try again.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  DATABASE_ERROR: 'We encountered a database error. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  RATE_LIMIT: 'Too many requests. Please slow down and try again.',
};

// Get user-friendly error message
export function getUserFriendlyMessage(code: string, defaultMessage?: string): string {
  return ERROR_MESSAGES[code] || defaultMessage || ERROR_MESSAGES.INTERNAL_ERROR;
}

// Format Zod validation errors
export function formatZodError(error: ZodError): { message: string; field?: string } {
  const firstError = error.errors[0];
  const field = firstError.path.join('.');
  const message = firstError.message;
  
  // Make messages more user-friendly
  const friendlyMessage = message
    .replace(/String must contain at least \d+ character\(s\)/, 'This field is too short')
    .replace(/Invalid email/, 'Please enter a valid email address')
    .replace(/Required/, 'This field is required');
  
  return {
    message: field ? `${field}: ${friendlyMessage}` : friendlyMessage,
    field
  };
}

// Standard error response format
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    field?: string;
  };
}

// Send error response
export function sendErrorResponse(
  res: Response,
  error: any,
  statusCode?: number
): void {
  // Handle different error types
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: getUserFriendlyMessage(error.code, error.message),
        code: error.code,
        field: error.field
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    const { message, field } = formatZodError(error);
    res.status(400).json({
      success: false,
      error: {
        message,
        code: 'VALIDATION_ERROR',
        field
      }
    });
    return;
  }

  // Database errors
  if (error.code === '23505') { // PostgreSQL unique violation
    res.status(409).json({
      success: false,
      error: {
        message: 'This value already exists. Please use a different value.',
        code: 'CONFLICT'
      }
    });
    return;
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    res.status(400).json({
      success: false,
      error: {
        message: 'This action references data that does not exist.',
        code: 'INVALID_REFERENCE'
      }
    });
    return;
  }

  // Default error response
  console.error('Unhandled error:', error);
  res.status(statusCode || 500).json({
    success: false,
    error: {
      message: getUserFriendlyMessage('INTERNAL_ERROR'),
      code: 'INTERNAL_ERROR'
    }
  });
}

// Express middleware for error handling
export function errorMiddleware(
  error: any,
  req: any,
  res: Response,
  next: any
): void {
  sendErrorResponse(res, error);
}