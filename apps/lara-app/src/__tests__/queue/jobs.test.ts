/**
 * Queue Jobs — unit tests.
 * Jobs are instantiated directly and handle() is called; no queue driver needed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WelcomeEmailJob } from '../../app/Jobs/WelcomeEmailJob';
import { CleanupJob } from '../../app/Jobs/CleanupJob';

afterEach(() => vi.restoreAllMocks());

describe('WelcomeEmailJob', () => {
  it('handle() logs the recipient email', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new WelcomeEmailJob({ to: 'alice@test.com', name: 'Alice' }).handle();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('alice@test.com'));
  });

  it('handle() resolves without throwing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      new WelcomeEmailJob({ to: 'bob@test.com', name: 'Bob' }).handle(),
    ).resolves.toBeUndefined();
  });

  it('failed() logs the error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await new WelcomeEmailJob({ to: 'err@test.com', name: 'Err' }).failed(new Error('SMTP down'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('SMTP down'));
  });
});

describe('CleanupJob', () => {
  it('handle() logs cleanup message', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new CleanupJob().handle();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('cleanup'));
  });

  it('handle() resolves without throwing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(new CleanupJob().handle()).resolves.toBeUndefined();
  });
});
