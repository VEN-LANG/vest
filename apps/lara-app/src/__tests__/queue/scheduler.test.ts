/**
 * Scheduler — tests that the correct jobs and schedules are configured.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { scheduler } from '@lara-node/queue';
import { QueueServiceProvider } from '../../app/Providers/QueueServiceProvider';
import { container, Application } from '@lara-node/core';

describe('QueueServiceProvider — scheduled jobs', () => {
  beforeAll(() => {
    const app = new Application(container);
    const provider = new QueueServiceProvider(app);
    provider.register();
    provider.boot();
  });

  it('registers at least two scheduled entries', () => {
    const tasks = scheduler.getTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(2);
  });

  it('CleanupJob is scheduled', () => {
    const tasks = scheduler.getTasks();
    const entry = tasks.find((t) => t.name === 'job:CleanupJob');
    expect(entry).toBeDefined();
  });

  it('WelcomeEmailJob is scheduled', () => {
    const tasks = scheduler.getTasks();
    const entry = tasks.find((t) => t.name === 'job:WelcomeEmailJob');
    expect(entry).toBeDefined();
  });
});
