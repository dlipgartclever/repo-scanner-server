import { describe, it, expect, vi, beforeEach } from 'vitest';
import pLimit from 'p-limit';
import { RepositoryService } from '../services/repository.service.js';
import {
  IGitHubClient,
  GitHubRepositoryResponse,
  GitHubTreeResponse,
  GitHubWebhookResponse,
  GitHubContentResponse,
} from '../types/index.js';
import { ValidationError } from '../infrastructure/errors/index.js';

const createMockGitHubClient = (): IGitHubClient => ({
  listUserRepositories: vi.fn(),
  getRepository: vi.fn(),
  getRepositoryTree: vi.fn(),
  getFileContent: vi.fn(),
  listWebhooks: vi.fn(),
});

const mockRepository: GitHubRepositoryResponse = {
  id: 1,
  name: 'test-repo',
  full_name: 'user/test-repo',
  private: false,
  owner: {
    login: 'testuser',
    id: 123,
    node_id: 'node123',
    avatar_url: 'https://avatar.url',
    gravatar_id: null,
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    followers_url: 'https://api.github.com/users/testuser/followers',
    following_url: 'https://api.github.com/users/testuser/following{/other_user}',
    gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
    starred_url: 'https://api.github.com/users/testuser/starred{/owner}{/repo}',
    subscriptions_url: 'https://api.github.com/users/testuser/subscriptions',
    organizations_url: 'https://api.github.com/users/testuser/orgs',
    repos_url: 'https://api.github.com/users/testuser/repos',
    events_url: 'https://api.github.com/users/testuser/events{/privacy}',
    received_events_url: 'https://api.github.com/users/testuser/received_events',
    type: 'User',
    site_admin: false,
  },
  size: 1024,
  default_branch: 'main',
} as GitHubRepositoryResponse;

const mockTree: GitHubTreeResponse = {
  sha: 'abc123',
  url: 'https://api.github.com/repos/user/test-repo/git/trees/main',
  tree: [
    { path: 'README.md', mode: '100644', type: 'blob', sha: 'sha1', url: '' },
    { path: 'config.yaml', mode: '100644', type: 'blob', sha: 'sha2', url: '' },
    { path: 'src', mode: '040000', type: 'tree', sha: 'sha3', url: '' },
  ],
  truncated: false,
};

const mockWebhooks: GitHubWebhookResponse[] = [
  {
    type: 'Repository',
    id: 1,
    name: 'web',
    active: true,
    events: ['push'],
    config: {
      url: 'https://example.com/webhook',
      content_type: 'json',
      insecure_ssl: '0',
    },
    updated_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    url: 'https://api.github.com/repos/user/test-repo/hooks/1',
    test_url: 'https://api.github.com/repos/user/test-repo/hooks/1/test',
    ping_url: 'https://api.github.com/repos/user/test-repo/hooks/1/pings',
    deliveries_url: 'https://api.github.com/repos/user/test-repo/hooks/1/deliveries',
    last_response: {
      code: null,
      status: 'unused',
      message: null,
    },
  },
];

const mockYamlContent: GitHubContentResponse = {
  type: 'file',
  encoding: 'base64',
  size: 50,
  name: 'config.yaml',
  path: 'config.yaml',
  content: Buffer.from('key: value\nname: test').toString('base64'),
  sha: 'sha2',
  url: 'https://api.github.com/repos/user/test-repo/contents/config.yaml',
  git_url: 'https://api.github.com/repos/user/test-repo/git/blobs/sha2',
  html_url: 'https://github.com/user/test-repo/blob/main/config.yaml',
  download_url: 'https://raw.githubusercontent.com/user/test-repo/main/config.yaml',
  _links: {
    self: 'https://api.github.com/repos/user/test-repo/contents/config.yaml',
    git: 'https://api.github.com/repos/user/test-repo/git/blobs/sha2',
    html: 'https://github.com/user/test-repo/blob/main/config.yaml',
  },
};

describe('RepositoryService', () => {
  let mockClient: IGitHubClient;
  let service: RepositoryService;

  beforeEach(() => {
    mockClient = createMockGitHubClient();
    const limit = pLimit(2);
    service = new RepositoryService(mockClient, limit);
  });

  describe('listRepositories', () => {
    it('should return list of repositories', async () => {
      vi.mocked(mockClient.listUserRepositories).mockResolvedValue([mockRepository]);

      const result = await service.listRepositories('valid-token');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'test-repo',
        size: 1024,
        owner: 'testuser',
      });
    });

    it('should throw ValidationError for empty token', async () => {
      await expect(service.listRepositories('')).rejects.toThrow(ValidationError);
      await expect(service.listRepositories('   ')).rejects.toThrow(ValidationError);
    });
  });

  describe('getRepositoryDetails', () => {
    beforeEach(() => {
      vi.mocked(mockClient.getRepository).mockResolvedValue(mockRepository);
    });

    it('should return basic repository details', async () => {
      const result = await service.getRepositoryDetails('valid-token', 'testuser', 'test-repo');

      expect(result.name).toBe('test-repo');
      expect(result.size).toBe(1024);
      expect(result.owner).toBe('testuser');
      expect(result.isPrivate).toBe(false);
      expect(result.defaultBranch).toBe('main');
      expect(result.token).toBe('valid-token');
      expect(result.repoName).toBe('test-repo');
    });

    it('should throw ValidationError for empty token', async () => {
      await expect(service.getRepositoryDetails('', 'owner', 'repo')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty owner', async () => {
      await expect(service.getRepositoryDetails('token', '', 'repo')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty repo name', async () => {
      await expect(service.getRepositoryDetails('token', 'owner', '')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid repo name format', async () => {
      await expect(service.getRepositoryDetails('token', 'owner', 'repo with spaces')).rejects.toThrow(ValidationError);
    });
  });

  describe('getActiveWebhooks', () => {
    beforeEach(() => {
      vi.mocked(mockClient.listWebhooks).mockResolvedValue(mockWebhooks);
    });

    it('should return active webhooks', async () => {
      const result = await service.getActiveWebhooks('valid-token', 'testuser', 'test-repo');

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/webhook');
      expect(result[0].active).toBe(true);
      expect(result[0].events).toEqual(['push']);
    });

    it('should filter out inactive webhooks', async () => {
      const webhooksWithInactive: GitHubWebhookResponse[] = [
        ...mockWebhooks,
        {
          type: 'Repository',
          id: 2,
          name: 'web',
          active: false,
          events: ['pull_request'],
          config: {
            url: 'https://example.com/webhook2',
            content_type: 'json',
            insecure_ssl: '0',
          },
          updated_at: '2023-01-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z',
          url: 'https://api.github.com/repos/user/test-repo/hooks/2',
          test_url: 'https://api.github.com/repos/user/test-repo/hooks/2/test',
          ping_url: 'https://api.github.com/repos/user/test-repo/hooks/2/pings',
          deliveries_url: 'https://api.github.com/repos/user/test-repo/hooks/2/deliveries',
          last_response: {
            code: null,
            status: 'unused',
            message: null,
          },
        },
      ];
      vi.mocked(mockClient.listWebhooks).mockResolvedValue(webhooksWithInactive);

      const result = await service.getActiveWebhooks('valid-token', 'testuser', 'test-repo');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('getNumberOfFiles', () => {
    beforeEach(() => {
      vi.mocked(mockClient.getRepositoryTree).mockResolvedValue(mockTree);
    });

    it('should return correct number of files', async () => {
      const result = await service.getNumberOfFiles('valid-token', 'testuser', 'test-repo', 'main');

      expect(result).toBe(2);
    });

    it('should exclude directories from count', async () => {
      const result = await service.getNumberOfFiles('valid-token', 'testuser', 'test-repo', 'main');

      expect(result).toBe(2);
    });
  });

  describe('getYamlFileContent', () => {
    beforeEach(() => {
      vi.mocked(mockClient.getRepositoryTree).mockResolvedValue(mockTree);
      vi.mocked(mockClient.getFileContent).mockResolvedValue(mockYamlContent);
    });

    it('should return decoded yaml file content', async () => {
      const result = await service.getYamlFileContent('valid-token', 'testuser', 'test-repo', 'main');

      expect(result).toBe('key: value\nname: test');
    });

    it('should return null when no yaml files exist', async () => {
      const treeWithoutYaml: GitHubTreeResponse = {
        ...mockTree,
        tree: [{ path: 'README.md', mode: '100644', type: 'blob', sha: 'sha1', url: '' }],
      };
      vi.mocked(mockClient.getRepositoryTree).mockResolvedValue(treeWithoutYaml);

      const result = await service.getYamlFileContent('valid-token', 'testuser', 'test-repo', 'main');

      expect(result).toBeNull();
    });
  });
});
