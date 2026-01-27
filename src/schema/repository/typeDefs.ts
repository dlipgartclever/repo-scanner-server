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
    repositoryDetails(token: String!, owner: String!, repoName: String!): RepositoryDetails!
  }
`;
