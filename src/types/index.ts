import { RestEndpointMethodTypes } from '@octokit/rest';

export interface Repository {
  name: string;
  size: number;
  owner: string;
}

export interface RepositoryDetailsParent {
  token: string;
  owner: string;
  repoName: string;
  name: string;
  size: number;
  isPrivate: boolean;
  defaultBranch: string;
}

export interface Webhook {
  id: number;
  name: string;
  active: boolean;
  url: string;
  events: string[];
}

export type GitHubRepositoryResponse = RestEndpointMethodTypes['repos']['get']['response']['data'];

export type GitHubTreeResponse = RestEndpointMethodTypes['git']['getTree']['response']['data'];

export type GitHubTree = GitHubTreeResponse['tree'];

export type GitHubContentResponse = RestEndpointMethodTypes['repos']['getContent']['response']['data'];

export type GitHubWebhookResponse = RestEndpointMethodTypes['repos']['listWebhooks']['response']['data'][number];

export interface LogContext {
  correlationId?: string;
  operation?: string;
  repository?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: unknown;
}

export interface IGitHubClient {
  listUserRepositories(token: string): Promise<GitHubRepositoryResponse[]>;
  getRepository(token: string, owner: string, repo: string): Promise<GitHubRepositoryResponse>;
  getRepositoryTree(token: string, owner: string, repo: string, branch: string): Promise<GitHubTreeResponse>;
  getFileContent(token: string, owner: string, repo: string, path: string): Promise<GitHubContentResponse>;
  listWebhooks(token: string, owner: string, repo: string): Promise<GitHubWebhookResponse[]>;
}

export interface IRepositoryService {
  listRepositories(token: string): Promise<Repository[]>;
  getRepositoryDetails(token: string, owner: string, repoName: string): Promise<RepositoryDetailsParent>;
  getActiveWebhooks(token: string, owner: string, repoName: string): Promise<Webhook[]>;
  getNumberOfFiles(token: string, owner: string, repoName: string, defaultBranch: string): Promise<number>;
  getYamlFileContent(token: string, owner: string, repoName: string, defaultBranch: string): Promise<string | null>;
}
