import { IRepositoryService } from '../types/index.js';
import { GraphQLError } from 'graphql';
import { AppError, isOperationalError } from '../errors/index.js';
import { logger } from '../infrastructure/logger.js';

export const typeDefs = `#graphql
  type Repository {
    name: String!
    size: Int!
    owner: String!
  }

  type Webhook {
    id: Int!
    name: String!
    active: Boolean!
    url: String!
    events: [String!]!
  }

  type RepositoryDetails {
    name: String!
    size: Int!
    owner: String!
    isPrivate: Boolean!
    numberOfFiles: Int!
    contentOfOneYamlFile: String
    activeWebhooks: [Webhook!]!
  }

  type Query {
    repositories(token: String!): [Repository!]!
    repositoryDetails(token: String!, repoName: String!): RepositoryDetails!
  }
`;

export interface GraphQLContext {
  repositoryService: IRepositoryService;
}

interface RepositoriesArgs {
  token: string;
}

interface RepositoryDetailsArgs {
  token: string;
  repoName: string;
}

function handleError(error: unknown, operation: string): never {
  logger.error(`GraphQL resolver error: ${operation}`, error as Error, {
    operation,
  });

  if (error instanceof AppError) {
    const extensions: Record<string, unknown> = {
      code: getErrorCode(error),
      statusCode: error.statusCode,
    };

    if (error.context) {
      extensions.details = error.context;
    }

    throw new GraphQLError(error.message, {
      extensions,
    });
  }

  if (!isOperationalError(error)) {
    throw new GraphQLError('An unexpected error occurred', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
      },
    });
  }

  throw error;
}

function getErrorCode(error: AppError): string {
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

export const resolvers = {
  Query: {
    repositories: async (
      _parent: unknown,
      {token}: RepositoriesArgs,
      context: GraphQLContext
    ) => {
      try {
        return await context.repositoryService.listRepositories(token);
      } catch (error) {
        handleError(error, 'repositories');
      }
    },

    repositoryDetails: async (
      _parent: unknown,
      args: RepositoryDetailsArgs,
      context: GraphQLContext
    ) => {
      try {
        return await context.repositoryService.getRepositoryDetails(
          args.token,
          args.repoName
        );
      } catch (error) {
        handleError(error, 'repositoryDetails');
      }
    },
  },
};
