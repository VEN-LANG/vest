/**
 * Event Listeners — unit tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendWelcomeEmail, LogUserLogin } from '../../app/Listeners/UserListeners';
import { UserRegistered, UserLoggedIn } from '../../app/Events/UserEvents';

afterEach(() => vi.restoreAllMocks());

describe('SendWelcomeEmail', () => {
  it('handle() logs the recipient email', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new SendWelcomeEmail().handle(new UserRegistered(1, 'alice@test.com', 'Alice'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('alice@test.com'));
  });

  it('handle() resolves without throwing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      new SendWelcomeEmail().handle(new UserRegistered(2, 'bob@test.com', 'Bob')),
    ).resolves.toBeUndefined();
  });
});

describe('LogUserLogin', () => {
  it('handle() logs the userId', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new LogUserLogin().handle(new UserLoggedIn(7, 'user@test.com', '1.2.3.4'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('7'));
  });

  it('handle() works when no IP address is provided', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      new LogUserLogin().handle(new UserLoggedIn(3, 'user@test.com')),
    ).resolves.toBeUndefined();
  });
});
