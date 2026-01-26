import { startServer } from './server.js';

async function main(): Promise<void> {
  try {
    await startServer();

  } catch (error) {
    process.exit(1);
  }
}

main();
