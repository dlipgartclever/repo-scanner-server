import { IRepositoryService } from '../types/index.js';

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



export const resolvers = {
  Query: {
    repositories: async (
      _parent: unknown,
      {token}: RepositoriesArgs,
      context: GraphQLContext
    ) => {
      try {
       // get repositories
      } catch (error) {
       //handle error
      }
    },

    repositoryDetails: async (
      _parent: unknown,
      args: RepositoryDetailsArgs,
      context: GraphQLContext
    ) => {
      try {
        //get repo details
      } catch (error) {
        //handle error
      }
    },
  },
};
