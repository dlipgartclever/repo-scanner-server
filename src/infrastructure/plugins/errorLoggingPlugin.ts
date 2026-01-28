import { ApolloServerPlugin } from '@apollo/server';
import { logger } from '../logger.js';
import { AppError, isOperationalError } from '../errors/index.js';

export const errorLoggingPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    return {
      async didEncounterErrors(requestContext) {
        for (const error of requestContext.errors) {
          const originalError = error.originalError;

          const context = {
            operation: requestContext.request.operationName,
            path: error.path?.join('.'),
            variables: requestContext.request.variables,
          };

          if (originalError instanceof AppError) {
            if (originalError.statusCode >= 500) {
              logger.error(`GraphQL Error: ${error.message}`, originalError, {
                ...context,
                statusCode: originalError.statusCode,
                errorContext: originalError.context,
              });
            } else {
              logger.warn(`GraphQL Client Error: ${error.message}`, {
                ...context,
                statusCode: originalError.statusCode,
                errorContext: originalError.context,
              });
            }
          } else if (!isOperationalError(originalError)) {
            logger.error(`Unexpected GraphQL Error: ${error.message}`, originalError as Error, {
              ...context,
              isUnexpected: true,
            });
          }
        }
      },
    };
  },
};
