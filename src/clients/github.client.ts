import { Octokit } from '@octokit/rest';
import {
  GitHubContentResponse,
  GitHubRepositoryResponse,
  GitHubTreeResponse,
  GitHubWebhookResponse,
  IGitHubClient,
} from '../types/index.js';
import { AuthenticationError, GitHubApiError, NotFoundError } from '../infrastructure/errors/index.js';

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30000;

export class GitHubClient implements IGitHubClient {
  private createOctokit(token: string, baseUrl?: string): Octokit {
    return new Octokit({
      auth: token,
      baseUrl,
      request: {
        timeout: REQUEST_TIMEOUT_MS,
      },
      userAgent: 'GitHub-Scanner-Service',
    });
  }

  private handleOctokitError(error: unknown, endpoint: string): never {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) {
      throw new AuthenticationError();
    }

    if (err.status === 404) {
      throw new NotFoundError('GitHub resource', endpoint);
    }

    throw new GitHubApiError(err.message || 'GitHub API error', err.status || 500, endpoint);
  }

  async listUserRepositories(token: string): Promise<GitHubRepositoryResponse[]> {
    const endpoint = '/user/repos';

    try {
      const octokit = this.createOctokit(token);
      const response = await octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
      });

      return response.data as GitHubRepositoryResponse[];
    } catch (error) {
      this.handleOctokitError(error, endpoint);
    }
  }

  async getRepository(token: string, owner: string, repo: string): Promise<GitHubRepositoryResponse> {
    const endpoint = `/repos/${owner}/${repo}`;

    try {
      const octokit = this.createOctokit(token);
      const response = await octokit.repos.get({
        owner,
        repo,
      });

      return response.data as GitHubRepositoryResponse;
    } catch (error) {
      this.handleOctokitError(error, endpoint);
    }
  }

  async getRepositoryTree(token: string, owner: string, repo: string, branch: string): Promise<GitHubTreeResponse> {
    const endpoint = `/repos/${owner}/${repo}/git/trees/${branch}`;

    try {
      const octokit = this.createOctokit(token);
      const response = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
      });

      return response.data;
    } catch (error) {
      this.handleOctokitError(error, endpoint);
    }
  }

  async getFileContent(token: string, owner: string, repo: string, path: string): Promise<GitHubContentResponse> {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;

    try {
      const octokit = this.createOctokit(token);
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      return response.data;
    } catch (error) {
      this.handleOctokitError(error, endpoint);
    }
  }

  async listWebhooks(token: string, owner: string, repo: string): Promise<GitHubWebhookResponse[]> {
    const endpoint = `/repos/${owner}/${repo}/hooks`;

    try {
      const octokit = this.createOctokit(token);
      const response = await octokit.repos.listWebhooks({
        owner,
        repo,
      });

      return response.data as GitHubWebhookResponse[];
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) {
        return [];
      }
      this.handleOctokitError(error, endpoint);
    }
  }
}

export const createGitHubClient = (): GitHubClient => {
  return new GitHubClient();
};
