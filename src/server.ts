import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs, resolvers, GraphQLContext } from './schema/schema.js';
import { createGitHubClient } from './clients/github.client.js';
import { createRepositoryService } from './services/repository.service.js';
import { createConcurrencyLimiter } from './infrastructure/concurrency-limiter.js';
import { logger } from './infrastructure/logger.js';
import { IRepositoryService } from './types/index.js';

export interface ServerConfig {
  port: number;
  repositoryService?: IRepositoryService;
}

const DEFAULT_PORT = 4000;
const MAX_CONCURRENT_REPO_SCANS = 2;

export async function createApolloServer(): Promise<ApolloServer<GraphQLContext>> {
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: true,
    formatError: (formattedError, error) => {
      logger.error('GraphQL Error', error as Error, {
        message: formattedError.message,
        code: formattedError.extensions?.code as string,
        path: formattedError.path?.join('.'),
      });

      if (process.env.NODE_ENV === 'production') {
        return {
          message: formattedError.message,
          extensions: {
            code: formattedError.extensions?.code,
            statusCode: formattedError.extensions?.statusCode,
          },
        };
      }

      return formattedError;
    },
  });

  return server;
}

export function createDefaultRepositoryService(): IRepositoryService {
  const githubClient = createGitHubClient();
  const concurrencyLimiter = createConcurrencyLimiter(MAX_CONCURRENT_REPO_SCANS);
  return createRepositoryService(githubClient, concurrencyLimiter);
}

export async function startServer(config?: Partial<ServerConfig>): Promise<{
  url: string;
  server: ApolloServer<GraphQLContext>;
}> {
  const port = config?.port || Number(process.env.PORT) || DEFAULT_PORT;
  const repositoryService = config?.repositoryService || createDefaultRepositoryService();

  const server = await createApolloServer();

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async (): Promise<GraphQLContext> => ({
      repositoryService,
    }),
  });

  logger.info('Apollo Server started', {
    url,
    port,
    environment: process.env.NODE_ENV || 'development',
  });

  return { url, server };
}

export async function stopServer(server: ApolloServer<GraphQLContext>): Promise<void> {
  await server.stop();
  logger.info('Apollo Server stopped');
}
