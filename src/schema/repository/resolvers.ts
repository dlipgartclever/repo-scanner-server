import { IRepositoryService, RepositoryDetailsParent } from '../../types/index.js';
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

  RepositoryDetails: {
    activeWebhooks: async (parent: RepositoryDetailsParent, _args: unknown, context: GraphQLContext) => {
      try {
        return await context.repositoryService.getActiveWebhooks(parent.token, parent.owner, parent.repoName);
      } catch (error) {
        handleError(error, 'activeWebhooks');
      }
    },

    numberOfFiles: async (parent: RepositoryDetailsParent, _args: unknown, context: GraphQLContext) => {
      try {
        return await context.repositoryService.getNumberOfFiles(parent.token, parent.owner, parent.repoName, parent.defaultBranch);
      } catch (error) {
        handleError(error, 'numberOfFiles');
      }
    },

    contentOfOneYamlFile: async (parent: RepositoryDetailsParent, _args: unknown, context: GraphQLContext) => {
      try {
        return await context.repositoryService.getYamlFileContent(parent.token, parent.owner, parent.repoName, parent.defaultBranch);
      } catch (error) {
        handleError(error, 'contentOfOneYamlFile');
      }
    },
  },
};
