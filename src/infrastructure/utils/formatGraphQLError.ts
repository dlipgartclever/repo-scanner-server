import { GraphQLFormattedError } from 'graphql';
import { unwrapResolverError } from '@apollo/server/errors';
import { AppError, ErrorType, getErrorCode } from '../errors/index.js';

export function formatGraphQLError(formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError {
  const originalError = unwrapResolverError(error);

  if (originalError instanceof AppError) {
    const extensions: Record<string, unknown> = {
      code: getErrorCode(originalError),
      statusCode: originalError.statusCode,
    };

    if (process.env.NODE_ENV === 'production') {
      if (originalError.context?.errorType) {
        extensions.errorType = originalError.context.errorType;
      }

      if (originalError.context?.errorType === ErrorType.VALIDATION_ERROR) {
        extensions.field = originalError.context.field;
      }
    } else {
      if (originalError.context) {
        extensions.details = originalError.context;
      }
    }

    return {
      message: originalError.message,
      extensions,
      ...(formattedError.path && { path: formattedError.path }),
      ...(formattedError.locations && { locations: formattedError.locations }),
    };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      message: 'An unexpected error occurred',
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
      },
    };
  }

  return formattedError;
}
