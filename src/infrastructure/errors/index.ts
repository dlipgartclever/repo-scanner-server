export const ErrorType = {
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, context?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed. Invalid or expired token.') {
    super(message, 401, true, { errorType: ErrorType.AUTHENTICATION_ERROR });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, 404, true, {
      errorType: ErrorType.NOT_FOUND_ERROR,
      resource,
      identifier,
    });
  }
}

export class GitHubApiError extends AppError {
  public readonly endpoint: string;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(message, statusCode, true, { errorType: ErrorType.GITHUB_API_ERROR, endpoint });
    this.endpoint = endpoint;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, true, { errorType: ErrorType.VALIDATION_ERROR, field });
  }
}

export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

export function getErrorCode(error: AppError): string {
  switch (error.statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}
