import { IRepositoryService } from '../../types/index.js';
import { handleError } from '../../infrastructure/errors/index.js';
import { typeDefs } from './typeDefs.js';

export { typeDefs };

export interface GraphQLContext {
  repositoryService: IRepositoryService;
}

interface RepositoriesArgs {
  token: string;
}

interface RepositoryDetailsArgs {
  token: string;
  owner: string;
  repoName: string;
}

export const resolvers = {
  Query: {
    repositories: async (_parent: unknown, { token }: RepositoriesArgs, context: GraphQLContext) => {
      try {
        return await context.repositoryService.listRepositories(token);
      } catch (error) {
        handleError(error, 'repositories');
      }
    },

    repositoryDetails: async (_parent: unknown, args: RepositoryDetailsArgs, context: GraphQLContext) => {
      try {
        return await context.repositoryService.getRepositoryDetails(args.token, args.owner, args.repoName);
      } catch (error) {
        handleError(error, 'repositoryDetails');
      }
    },
  },
};
