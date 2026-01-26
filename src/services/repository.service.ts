import {
  Repository,
  IRepositoryService,
  IGitHubClient,
} from '../types/index.js';
import { ValidationError } from '../errors/index.js';

export class RepositoryService implements IRepositoryService {
  private readonly githubClient: IGitHubClient;

  constructor(
    githubClient: IGitHubClient,
  ) {
    this.githubClient = githubClient;
  }

  async listRepositories(token: string): Promise<Repository[]> {
    this.validateToken(token);


    try {
      const repos = await this.githubClient.listUserRepositories(token);

      const repositories: Repository[] = repos.map((repo) => ({
        name: repo.name,
        size: repo.size,
        owner: repo.owner.login,
      }));

      return repositories;
    } catch (error) {
      throw error;
    }
  }

  private validateToken(token: string): void {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new ValidationError('GitHub token is required', 'token');
    }
  }
}

export const createRepositoryService = (
  githubClient: IGitHubClient,
): RepositoryService => {
  return new RepositoryService(githubClient);
};
