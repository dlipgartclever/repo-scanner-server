import { Repository, RepositoryDetailsParent, Webhook, IRepositoryService, IGitHubClient, GitHubTree } from '../types/index.js';
import { logger } from '../infrastructure/logger.js';
import { ValidationError } from '../infrastructure/errors/index.js';

const YAML_EXTENSIONS = ['.yaml', '.yml'];

export class RepositoryService implements IRepositoryService {
  private readonly githubClient: IGitHubClient;

  constructor(githubClient: IGitHubClient) {
    this.githubClient = githubClient;
  }

  async listRepositories(token: string): Promise<Repository[]> {
    this.validateToken(token);

    const correlationId = this.generateCorrelationId();

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
      });

      return repositories;
    } catch (error) {
      logger.error('Failed to fetch repositories', error as Error, {
        correlationId,
        operation: 'list_repositories',
      });
      throw error;
    }
  }

  async getRepositoryDetails(token: string, owner: string, repoName: string): Promise<RepositoryDetailsParent> {
    this.validateToken(token);
    this.validateOwner(owner);
    this.validateRepoName(repoName);

    const correlationId = this.generateCorrelationId();

    logger.info('Fetching repository details', {
      correlationId,
      operation: 'get_repository_details',
      repository: repoName,
    });

    try {
      const repoDetails = await this.fetchBasicRepositoryDetails(token, owner, repoName);

      logger.info('Repository details fetched', {
        correlationId,
        repository: repoName,
      });

      return repoDetails;
    } catch (error) {
      logger.error('Failed to fetch repository details', error as Error, {
        correlationId,
        operation: 'get_repository_details',
        repository: repoName,
      });
      throw error;
    }
  }

  async getActiveWebhooks(token: string, owner: string, repoName: string): Promise<Webhook[]> {
    const correlationId = this.generateCorrelationId();

    logger.info('📡 SUB-REQUEST - Fetching active webhooks (NOT limited)', {
      correlationId,
      operation: 'get_active_webhooks',
      repository: repoName,
    });

    const webhooksResult = await this.githubClient.listWebhooks(token, owner, repoName);

    logger.info('✅ SUB-REQUEST - Webhooks fetched', {
      correlationId,
      repository: repoName,
      count: webhooksResult.length,
    });

    return webhooksResult
      .filter((hook) => hook.active)
      .map((hook) => ({
        id: hook.id,
        name: hook.name,
        active: hook.active,
        url: hook.config.url || '',
        events: hook.events,
      }));
  }

  async getNumberOfFiles(token: string, owner: string, repoName: string, defaultBranch: string): Promise<number> {
    const correlationId = this.generateCorrelationId();

    logger.info('📡 SUB-REQUEST - Fetching number of files (NOT limited)', {
      correlationId,
      operation: 'get_number_of_files',
      repository: repoName,
    });

    const treeResult = await this.githubClient.getRepositoryTree(token, owner, repoName, defaultBranch);
    const files = treeResult.tree.filter((item) => item.type === 'blob');

    logger.info('✅ SUB-REQUEST - File count completed', {
      correlationId,
      repository: repoName,
      count: files.length,
    });

    return files.length;
  }

  async getYamlFileContent(token: string, owner: string, repoName: string, defaultBranch: string): Promise<string | null> {
    const correlationId = this.generateCorrelationId();

    logger.info('📡 SUB-REQUEST - Fetching YAML file content (NOT limited)', {
      correlationId,
      operation: 'get_yaml_file_content',
      repository: repoName,
    });

    const treeResult = await this.githubClient.getRepositoryTree(token, owner, repoName, defaultBranch);
    const files = treeResult.tree.filter((item) => item.type === 'blob');

    const result = await this.getFirstYamlFileContent(token, owner, repoName, files, correlationId);

    logger.info('✅ SUB-REQUEST - YAML fetch completed', {
      correlationId,
      repository: repoName,
      found: result !== null,
    });

    return result;
  }

  private async fetchBasicRepositoryDetails(token: string, owner: string, repoName: string): Promise<RepositoryDetailsParent> {
    const repoInfoResult = await this.githubClient.getRepository(token, owner, repoName);

    return {
      token,
      owner: repoInfoResult.owner.login,
      repoName: repoInfoResult.name,
      name: repoInfoResult.name,
      size: repoInfoResult.size,
      isPrivate: repoInfoResult.private,
      defaultBranch: repoInfoResult.default_branch,
    };
  }

  private async getFirstYamlFileContent(
    token: string,
    owner: string,
    repoName: string,
    files: GitHubTree,
    correlationId: string,
  ): Promise<string | null> {
    const yamlFile = files.find((file) => YAML_EXTENSIONS.some((ext) => file.path.toLowerCase().endsWith(ext)));

    if (!yamlFile) {
      logger.info('No YAML file found in repository', {
        correlationId,
        repository: repoName,
      });
      return null;
    }

    try {
      const content = await this.githubClient.getFileContent(token, owner, repoName, yamlFile.path);

      if (Array.isArray(content) || !('content' in content) || !content.content) {
        return null;
      }

      const decodedContent = Buffer.from(content.content, 'base64').toString('utf-8');

      logger.info('Successfully fetched YAML file content', {
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

  private validateToken(token: string): void {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new ValidationError('GitHub token is required', 'token');
    }
  }

  private validateOwner(owner: string): void {
    if (!owner || typeof owner !== 'string' || owner.trim().length === 0) {
      throw new ValidationError('Owner is required', 'owner');
    }
  }

  private validateRepoName(repoName: string): void {
    if (!repoName || typeof repoName !== 'string' || repoName.trim().length === 0) {
      throw new ValidationError('Repository name is required', 'repoName');
    }

    const validRepoNamePattern = /^[a-zA-Z0-9._-]+$/;
    if (!validRepoNamePattern.test(repoName)) {
      throw new ValidationError('Invalid repository name format', 'repoName');
    }
  }

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const createRepositoryService = (githubClient: IGitHubClient): RepositoryService => {
  return new RepositoryService(githubClient);
};
