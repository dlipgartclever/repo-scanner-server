# GitHub Repository Scanner

A production-ready Apollo GraphQL server for scanning GitHub repositories.

## Features

- **List Repositories**: Fetch all repositories accessible to the authenticated user
- **Repository Details**: Get detailed information including file count, YAML content, and webhooks
- **Rate Limit Handling**: Automatic retry with exponential backoff
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
  repositoryDetails(token: "your-github-token", repoName: "GreenridgeApp1") {
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

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARN, ERROR) |
| `SERVICE_NAME` | `github-scanner` | Service name for logs |

## Testing

```bash
npm test
```

## Architecture

```
src/
├── index.ts                 # Entry point
├── server.ts                # Apollo Server setup
├── schema/
│   └── resolvers.ts            # GraphQL type defs + resolvers
├── services/
│   └── repository.service.ts # Business logic
├── clients/
│   └── github.client.ts     # GitHub REST API client
├── infrastructure/
│   ├── logger.ts            # Structured JSON logger
│   ├── concurrency-limiter.ts # Semaphore for parallel limits
│   └── rate-limit-handler.ts  # Rate limit retry logic
├── types/
│   └── index.ts             # TypeScript interfaces
└── errors/
    └── index.ts             # Custom error classes
```

## Security Notes

- GitHub tokens are never logged (automatically redacted)
- Tokens are passed per-request, not stored
- Input validation on all resolver arguments
