export interface Repository {
  name: string;
  size: number;
  owner: string;
}

export interface RepositoryDetails {
  name: string;
  size: number;
  owner: string;
  isPrivate: boolean;
  numberOfFiles: number;
  contentOfOneYamlFile: string | null;
  activeWebhooks: Webhook[];
}

export interface Webhook {
  id: number;
  name: string;
  active: boolean;
  url: string;
  events: string[];
}

export interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
  };
  size: number;
  default_branch: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubContentResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  type: string;
  content: string;
  encoding: string;
}

export interface GitHubWebhookResponse {
  id: number;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url?: string;
    content_type?: string;
  };
}

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
  getRepositoryDetails(token: string, owner: string, repoName: string): Promise<RepositoryDetails>;
}
