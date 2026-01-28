import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs, resolvers, GraphQLContext } from './schema/repository/resolvers.js';
import { createGitHubClient } from './clients/github.client.js';
import { createRepositoryService } from './services/repository.service.js';
import { logger } from './infrastructure/logger.js';
import { IRepositoryService } from './types/index.js';
import { errorLoggingPlugin } from './infrastructure/plugins/errorLoggingPlugin.js';
import { formatGraphQLError } from './infrastructure/utils/formatGraphQLError.js';

export interface ServerConfig {
  port: number;
  repositoryService?: IRepositoryService;
}

const DEFAULT_PORT = 4000;

export async function createApolloServer(): Promise<ApolloServer<GraphQLContext>> {
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: true,
    plugins: [errorLoggingPlugin],
    formatError: formatGraphQLError,
    includeStacktraceInErrorResponses: process.env.NODE_ENV === 'development',
  });

  return server;
}

export function createDefaultRepositoryService(): IRepositoryService {
  const githubClient = createGitHubClient();
  return createRepositoryService(githubClient);
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
