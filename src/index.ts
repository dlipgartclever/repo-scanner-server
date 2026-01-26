import { startServer } from './server.js';
import { logger } from './infrastructure/logger.js';

async function main(): Promise<void> {
  try {
    const { url } = await startServer();

    logger.info(`🚀 GitHub Scanner GraphQL server ready at ${url}`);
    logger.info('Available queries:');
    logger.info('  - repositories(token: String!): [Repository!]!');
    logger.info('  - repositoryDetails(token: String!, repoName: String!): RepositoryDetails!');

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', reason as Error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

main();
