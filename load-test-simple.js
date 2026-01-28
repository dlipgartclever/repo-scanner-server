import autocannon from 'autocannon';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Simple load test - sends 5 concurrent requests to verify p-limit
 *
 * Usage:
 * 1. Start server: npm run dev
 * 2. Run test: node load-test-simple.js
 * 3. Watch server console for concurrency logs
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_TOKEN_HERE';

const query = `
  query GetRepositoryDetails($token: String!, $owner: String!, $repoName: String!) {
    repositoryDetails(token: $token, owner: $owner, repoName: $repoName) {
      name
      size
      isPrivate
      owner
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
`;

console.log('🧪 Repository Scan Concurrency Test\n');
console.log('Sending 5 concurrent repository detail requests...');
console.log('Each request triggers 3 sub-requests (webhooks, files, YAML)\n');
console.log('Expected behavior:');
console.log('  - Max 2 REPOSITORY SCANS executing simultaneously (🟢)');
console.log('  - Sub-requests (📡) can run concurrently without limit\n');
console.log('👀 Watch your server console for colored logs!\n');

const token = process.env.GITHUB_TOKEN;

const result = await autocannon({
  url: 'http://localhost:4000',
  connections: 5,
  amount: 5, // Send exactly 5 requests
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query,
    variables: {
      token,
      owner: 'dlipgartclever',
      repoName: 'GreenridgeApp1',
    },
  }),
});

console.log('\n✅ Test completed!');
console.log(`Requests sent: ${result.requests.total}`);
console.log(`Avg latency: ${result.latency.mean}ms`);
console.log(`\n🎯 Check server logs above - "activeCalls" should never exceed 2!`);
