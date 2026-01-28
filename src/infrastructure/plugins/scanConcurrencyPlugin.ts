import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLContext } from '../../schema/repository/resolvers.js';
import { repositorySemaphore } from '../utils/scan-semaphore.js';

const TRACKED_FIELDS = new Set(['activeWebhooks', 'numberOfFiles', 'contentOfOneYamlFile']);

interface RepoTracking {
  release: () => void;
  pendingFields: number;
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
            await repositorySemaphore.acquire();
            semaphoreAcquired = true;
          }
        }
      },

      async executionDidStart() {
        return {
          willResolveField({ info, source }) {
            const key = source?.owner && source?.repoName ? `${source.owner}_${source.repoName}` : null;

            if (info.parentType.name === 'RepositoryDetails' && key && TRACKED_FIELDS.has(info.fieldName)) {
              let repoTrack = tracking.get(key);

              if (!repoTrack) {
                repoTrack = {
                  release: () => {
                    if (semaphoreAcquired) {
                      repositorySemaphore.release();
                      semaphoreAcquired = false;
                    }
                  },
                  pendingFields: 0,
                };
                tracking.set(key, repoTrack);
              }

              repoTrack.pendingFields++;
              return () => {
                const repoTrack = tracking.get(key);
                if (repoTrack) {
                  repoTrack.pendingFields--;
                  if (repoTrack.pendingFields === 0) {
                    repoTrack.release();
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
          repositorySemaphore.release();
          semaphoreAcquired = false;
        }

        tracking.forEach((t) => t.release());
        tracking.clear();
      },
    };
  },
};
