import 'dotenv/config';
import { startApplication } from './bootstrap/app';
import { closeDatabase } from '@lara-node/db';

startApplication();

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[server] ${signal} received — shutting down gracefully`);
  try {
    await closeDatabase();
    console.log('[server] Database connections closed');
  } catch (err) {
    console.error('[server] Error during shutdown:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));
