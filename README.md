# GitHub Repository Scanner

Apollo GraphQL server for scanning GitHub repositories.

## Features

- **List Repositories**: Fetch all repositories accessible to the authenticated user
- **Repository Details**: Get detailed information including file count, YAML content, and webhooks
- **Concurrency Control**: Limits parallel repository scans to 2
- **Structured Logging**: JSON logging with correlation IDs

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## GraphQL API

### Queries

#### List Repositories

```graphql
query {
  repositories(token: "your-github-token") {
    name
    size
    owner
  }
}
```

#### Repository Details

```graphql
query {
  repositoryDetails(
    token: "your-github-token"
    owner: "username"
    repoName: "repo-name"
  ) {
    name
    size
    owner
    isPrivate
    numberOfFiles
    contentOfOneYamlFile
    activeWebhooks {
      id
      name
      active
      url
      events
    }
  }
}
```

## Environment Variables

| Variable                  | Default          | Description                              |
| ------------------------- | ---------------- | ---------------------------------------- |
| `PORT`                    | `4000`           | Server port                              |
| `NODE_ENV`                | `development`    | Environment (development/production)     |
| `LOG_LEVEL`               | `info`           | Logging level (debug, info, warn, error) |
| `SERVICE_NAME`            | `github-scanner` | Service name for logs                    |
| `REQUEST_TIMEOUT_MS`      | `30000`          | Request timeout in milliseconds          |
| `MAX_CONCURRENT_REPO_SCANS` | `2`            | Max parallel repository scans            |

## Testing

```bash
npm test
```

## Security Notes

- GitHub tokens are never logged (automatically redacted)
- Tokens are passed per-request, not stored
- Input validation on all resolver arguments
