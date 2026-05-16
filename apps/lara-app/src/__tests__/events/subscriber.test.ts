/**
 * UserEventSubscriber — unit tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventDispatcher } from '@lara-node/events';
import { UserEventSubscriber } from '../../app/Subscribers/UserEventSubscriber';

afterEach(() => vi.restoreAllMocks());

describe('UserEventSubscriber — subscribe()', () => {
  it('registers listeners for all user events', () => {
    const dispatcher = new EventDispatcher();
    const spy = vi.spyOn(dispatcher, 'listen');
    new UserEventSubscriber().subscribe(dispatcher);
    const events = spy.mock.calls.map((c) => c[0] as string);
    expect(events).toContain('user.registered');
    expect(events).toContain('user.logged_in');
    expect(events).toContain('user.logged_out');
    expect(events).toContain('user.*');
  });
});

describe('UserEventSubscriber — handlers', () => {
  it('onRegistered logs the email', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new UserEventSubscriber().onRegistered({ email: 'a@b.com' });
    expect(spy).toHaveBeenCalledWith(expect.any(String), 'a@b.com');
  });

  it('onLogin logs the email', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new UserEventSubscriber().onLogin({ email: 'b@c.com' });
    expect(spy).toHaveBeenCalledWith(expect.any(String), 'b@c.com');
  });

  it('onLogout logs the userId', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new UserEventSubscriber().onLogout({ userId: 55 });
    expect(spy).toHaveBeenCalledWith(expect.any(String), 55);
  });

  it('onAnyUserEvent logs any payload', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new UserEventSubscriber().onAnyUserEvent({ type: 'test' });
    expect(spy).toHaveBeenCalledOnce();
  });

  it('full subscription chain fires onRegistered when event is dispatched', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const dispatcher = new EventDispatcher();
    new UserEventSubscriber().subscribe(dispatcher);
    await dispatcher.dispatch('user.registered', { email: 'x@y.com' });
    expect(spy).toHaveBeenCalled();
  });
});
