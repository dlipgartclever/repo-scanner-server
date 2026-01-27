import {
    GitHubContentResponse,
    GitHubRepositoryResponse,
    GitHubTreeResponse,
    GitHubWebhookResponse,
    IGitHubClient,
} from '../types/index.js';
import {AuthenticationError, GitHubApiError, NotFoundError,} from '../infrastructure/errors/index.js';
import {logger} from '../infrastructure/logger.js';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30000;

export class GitHubClient implements IGitHubClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string = GITHUB_API_BASE_URL,
  ) {
    this.baseUrl = baseUrl;
  }

  private createHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitHub-Scanner-Service',
    };
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = REQUEST_TIMEOUT_MS
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
          ...options,
          signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async request<T>(
    token: string,
    endpoint: string,
    method: string = 'GET',
    correlationId?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    logger.debug('GitHub API request started', {
      correlationId,
      operation: 'github_api_request',
      endpoint,
      method,
    });

    const response = await this.fetchWithTimeout(url, {
      method,
      headers: this.createHeaders(token),
    });

    const duration = Date.now() - startTime;

    logger.debug('GitHub API response received', {
      correlationId,
      operation: 'github_api_response',
      endpoint,
      statusCode: response.status,
      duration,
    });

    if (response.status === 401) {
      throw new AuthenticationError();
    }

    if (response.status === 404) {
      throw new NotFoundError('GitHub resource', endpoint);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GitHubApiError(
        `GitHub API error: ${errorBody}`,
        response.status,
        endpoint
      );
    }

    return response.json() as Promise<T>;
  }

  async listUserRepositories(token: string): Promise<GitHubRepositoryResponse[]> {
      return await this.request<GitHubRepositoryResponse[]>(
          token,
          '/user/repos?per_page=100&sort=updated'
      );
  }

  async getRepository(
    token: string,
    owner: string,
    repo: string
  ): Promise<GitHubRepositoryResponse> {
      return this.request<GitHubRepositoryResponse>(
        token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
      );
  }

  async getRepositoryTree(
    token: string,
    owner: string,
    repo: string,
    branch: string
  ): Promise<GitHubTreeResponse> {
      return this.request<GitHubTreeResponse>(
        token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`
      );
  }

  async getFileContent(
    token: string,
    owner: string,
    repo: string,
    path: string
  ): Promise<GitHubContentResponse> {
      return this.request<GitHubContentResponse>(
        token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`
      );
  }

  async listWebhooks(
    token: string,
    owner: string,
    repo: string
  ): Promise<GitHubWebhookResponse[]> {
      try {
        return await this.request<GitHubWebhookResponse[]>(
          token,
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          return [];
        }
        if (error instanceof GitHubApiError && error.statusCode === 403) {
          logger.warn('Insufficient permissions to list webhooks', {
            owner,
            repository: repo,
          });
          return [];
        }
        throw error;
      }
  }
}

export const createGitHubClient = (
  baseUrl?: string,
): GitHubClient => {
  return new GitHubClient(baseUrl);
};
