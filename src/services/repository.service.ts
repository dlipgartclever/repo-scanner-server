import pLimit, { LimitFunction } from 'p-limit';
import {
  Repository,
  RepositoryDetails,
  Webhook,
  IRepositoryService,
  IGitHubClient,
  GitHubTreeItem,
} from '../types/index.js';
import { logger } from '../infrastructure/logger.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

const YAML_EXTENSIONS = ['.yaml', '.yml'];
const MAX_CONCURRENT_REPO_SCANS = 2;

export class RepositoryService implements IRepositoryService {
  private readonly githubClient: IGitHubClient;
  private readonly limit: LimitFunction;

  constructor(
    githubClient: IGitHubClient,
    limit?: LimitFunction
  ) {
    this.githubClient = githubClient;
    this.limit = limit || pLimit(MAX_CONCURRENT_REPO_SCANS);
  }

  async listRepositories(token: string): Promise<Repository[]> {
    this.validateToken(token);

    const correlationId = this.generateCorrelationId();
    const startTime = Date.now();

    logger.info('Fetching user repositories', {
      correlationId,
      operation: 'list_repositories',
    });

    try {
      const repos = await this.githubClient.listUserRepositories(token);

      const repositories: Repository[] = repos.map((repo) => ({
        name: repo.name,
        size: repo.size,
        owner: repo.owner.login,
      }));

      logger.info('Successfully fetched repositories', {
        correlationId,
        operation: 'list_repositories',
        count: repositories.length,
        duration: Date.now() - startTime,
      });

      return repositories;
    } catch (error) {
      logger.error('Failed to fetch repositories', error as Error, {
        correlationId,
        operation: 'list_repositories',
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  async getRepositoryDetails(token: string, repoName: string): Promise<RepositoryDetails> {
    this.validateToken(token);
    this.validateRepoName(repoName);

    const correlationId = this.generateCorrelationId();
    const startTime = Date.now();

    logger.info('Fetching repository details', {
      correlationId,
      operation: 'get_repository_details',
      repository: repoName,
    });

    try {
      const owner = await this.resolveOwner(token, repoName);

      const repoDetails = await this.limit(() =>
        this.fetchRepositoryDetails(token, owner, repoName, correlationId)
      );

      logger.info('Successfully fetched repository details', {
        correlationId,
        operation: 'get_repository_details',
        repository: repoName,
        duration: Date.now() - startTime,
      });

      return repoDetails;
    } catch (error) {
      logger.error('Failed to fetch repository details', error as Error, {
        correlationId,
        operation: 'get_repository_details',
        repository: repoName,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  private async fetchRepositoryDetails(
    token: string,
    owner: string,
    repoName: string,
    correlationId: string
  ): Promise<RepositoryDetails> {
    const repoInfoResult = await this.githubClient.getRepository(token, owner, repoName);

    let treeResult;
    try {
      treeResult = await this.githubClient.getRepositoryTree(
        token,
        owner,
        repoName,
        repoInfoResult.default_branch
      );
    } catch {
      try {
        treeResult = await this.githubClient.getRepositoryTree(token, owner, repoName, 'master');
      } catch {
        treeResult = { tree: [], truncated: false, sha: '', url: '' };
      }
    }

    const webhooksResult = await this.githubClient.listWebhooks(token, owner, repoName);

    const files = treeResult.tree.filter((item) => item.type === 'blob');
    const numberOfFiles = files.length;

    const yamlContent = await this.getFirstYamlFileContent(
      token,
      owner,
      repoName,
      files,
      correlationId
    );

    const activeWebhooks: Webhook[] = webhooksResult
      .filter((hook) => hook.active)
      .map((hook) => ({
        id: hook.id,
        name: hook.name,
        active: hook.active,
        url: hook.config.url || '',
        events: hook.events,
      }));

    return {
      name: repoInfoResult.name,
      size: repoInfoResult.size,
      owner: repoInfoResult.owner.login,
      isPrivate: repoInfoResult.private,
      numberOfFiles,
      contentOfOneYamlFile: yamlContent,
      activeWebhooks,
    };
  }

  private async getFirstYamlFileContent(
    token: string,
    owner: string,
    repoName: string,
    files: GitHubTreeItem[],
    correlationId: string
  ): Promise<string | null> {
    const yamlFile = files.find((file) =>
      YAML_EXTENSIONS.some((ext) => file.path.toLowerCase().endsWith(ext))
    );

    if (!yamlFile) {
      logger.debug('No YAML file found in repository', {
        correlationId,
        repository: repoName,
      });
      return null;
    }

    try {
      const content = await this.githubClient.getFileContent(
        token,
        owner,
        repoName,
        yamlFile.path
      );

      const decodedContent = Buffer.from(content.content, 'base64').toString('utf-8');

      logger.debug('Successfully fetched YAML file content', {
        correlationId,
        repository: repoName,
        filePath: yamlFile.path,
      });

      return decodedContent;
    } catch (error) {
      logger.warn('Failed to fetch YAML file content', {
        correlationId,
        repository: repoName,
        filePath: yamlFile.path,
        error: (error as Error).message,
      });
      return null;
    }
  }

  private async resolveOwner(token: string, repoName: string): Promise<string> {
    const repos = await this.githubClient.listUserRepositories(token);
    const repo = repos.find((r) => r.name.toLowerCase() === repoName.toLowerCase());

    if (!repo) {
      throw new NotFoundError('Repository', repoName);
    }

    return repo.owner.login;
  }

  private validateToken(token: string): void {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new ValidationError('GitHub token is required', 'token');
    }
  }

  private validateRepoName(repoName: string): void {
    if (!repoName || typeof repoName !== 'string' || repoName.trim().length === 0) {
      throw new ValidationError('Repository name is required', 'repoName');
    }

    const validRepoNamePattern = /^[a-zA-Z0-9._-]+$/;
    if (!validRepoNamePattern.test(repoName)) {
      throw new ValidationError(
        'Invalid repository name format',
        'repoName'
      );
    }
  }

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const createRepositoryService = (
  githubClient: IGitHubClient,
  limit?: LimitFunction
): RepositoryService => {
  return new RepositoryService(githubClient, limit);
};
