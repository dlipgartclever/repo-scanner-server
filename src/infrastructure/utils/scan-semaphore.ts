import { Sema } from 'async-sema';

const MAX_CONCURRENT_REPO_SCANS = Number(process.env.MAX_CONCURRENT_REPO_SCANS) || 2;

export const repositorySemaphore = new Sema(MAX_CONCURRENT_REPO_SCANS);
