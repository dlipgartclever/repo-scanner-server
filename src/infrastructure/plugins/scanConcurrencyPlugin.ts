import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLContext } from '../../schema/repository/resolvers.js';
import { logger } from '../logger.js';
import { repositorySemaphore } from '../utils/scan-semaphore.js';

const TRACKED_FIELDS = new Set(['activeWebhooks', 'numberOfFiles', 'contentOfOneYamlFile']);

interface RepoTracking {
  release: () => void;
  pendingFields: number;
  sessionId: string;
}

export const scanConcurrencyPlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart(): Promise<GraphQLRequestListener<GraphQLContext>> {
    const tracking = new Map<string, RepoTracking>();
    let semaphoreAcquired = false;

    return {
      async didResolveOperation(ctx) {
        const operation = ctx.document.definitions.find((def) => def.kind === 'OperationDefinition' && def.operation === 'query');

        if (operation && operation.kind === 'OperationDefinition') {
          const hasRepoDetails = operation.selectionSet.selections.some(
            (sel) => sel.kind === 'Field' && sel.name.value === 'repositoryDetails',
          );

          if (hasRepoDetails) {
            const sessionId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            logger.info('🔵 QUEUED - Waiting for semaphore slot', { sessionId });

            await repositorySemaphore.acquire();
            semaphoreAcquired = true;

            logger.info('🟢 ACQUIRED - Semaphore slot acquired', { sessionId });
          }
        }
      },

      async executionDidStart() {
        return {
          willResolveField({ info, source }) {
            const key = source?.owner && source?.repoName ? `${source.owner}_${source.repoName}` : null;

            if (info.parentType.name === 'RepositoryDetails' && key && TRACKED_FIELDS.has(info.fieldName)) {
              let t = tracking.get(key);

              if (!t) {
                const sessionId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                t = {
                  release: () => {
                    if (semaphoreAcquired) {
                      repositorySemaphore.release();
                      semaphoreAcquired = false;
                      logger.info('🔴 RELEASED - Semaphore slot released', { sessionId });
                    }
                  },
                  pendingFields: 0,
                  sessionId,
                };
                tracking.set(key, t);
              }

              t.pendingFields++;
              logger.info('📡 Field resolver started', {
                sessionId: t.sessionId,
                field: info.fieldName,
                pendingFields: t.pendingFields,
              });

              // Return afterResolve callback
              return (_error: unknown) => {
                const t = tracking.get(key);
                if (t) {
                  t.pendingFields--;

                  logger.info('✅ Field resolver completed', {
                    sessionId: t.sessionId,
                    field: info.fieldName,
                    pendingFields: t.pendingFields,
                    hadError: !!_error,
                  });

                  if (t.pendingFields === 0) {
                    logger.info('🏁 All fields complete, releasing semaphore', {
                      sessionId: t.sessionId,
                    });
                    t.release();
                    tracking.delete(key);
                  }
                }
              };
            }

            return undefined;
          },
        };
      },

      async willSendResponse() {
        if (semaphoreAcquired) {
          logger.warn('⚠️ Safety net: Releasing unreleased semaphore');
          repositorySemaphore.release();
          semaphoreAcquired = false;
        }

        tracking.forEach((t) => t.release());
        tracking.clear();
      },
    };
  },
};
