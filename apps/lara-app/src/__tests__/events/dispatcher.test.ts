/**
 * EventDispatcher — unit tests (pure in-memory, no DB or network).
 */
import { describe, expect, it, vi } from 'vitest';
import { EventDispatcher, setEventDispatcher, getEventDispatcher } from '@lara-node/events';
import { UserRegistered, UserLoggedIn, UserLoggedOut } from '../../app/Events/UserEvents';

function fresh() {
  const d = new EventDispatcher();
  setEventDispatcher(d);
  return d;
}

describe('listen / dispatch', () => {
  it('calls the registered listener', async () => {
    const d = fresh();
    const fn = vi.fn();
    d.listen('user.registered', fn);
    await d.dispatch('user.registered', { email: 'a@b.com' });
    expect(fn).toHaveBeenCalledWith({ email: 'a@b.com' });
  });

  it('does not call listener for a different event', async () => {
    const d = fresh();
    const fn = vi.fn();
    d.listen('user.registered', fn);
    await d.dispatch('user.logged_in', {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls multiple listeners for the same event', async () => {
    const d = fresh();
    const a = vi.fn();
    const b = vi.fn();
    d.listen('user.registered', a);
    d.listen('user.registered', b);
    await d.dispatch('user.registered', {});
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('wildcard user.* catches all user events', async () => {
    const d = fresh();
    const fn = vi.fn();
    d.listen('user.*', fn);
    await d.dispatch('user.registered', {});
    await d.dispatch('user.logged_in', {});
    await d.dispatch('user.logged_out', {});
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('dispatching with no listeners does not throw', async () => {
    const d = fresh();
    await expect(d.dispatch('no.listeners', {})).resolves.not.toThrow();
  });
});

describe('Event classes', () => {
  it('UserRegistered has correct eventName and fields', () => {
    const e = new UserRegistered(1, 'alice@test.com', 'Alice');
    expect(e.eventName()).toBe('user.registered');
    expect(e.userId).toBe(1);
    expect(e.email).toBe('alice@test.com');
    expect(e.name).toBe('Alice');
  });

  it('UserLoggedIn has correct eventName and fields', () => {
    const e = new UserLoggedIn(2, 'bob@test.com', '10.0.0.1');
    expect(e.eventName()).toBe('user.logged_in');
    expect(e.userId).toBe(2);
    expect(e.ipAddress).toBe('10.0.0.1');
  });

  it('UserLoggedOut has correct eventName', () => {
    const e = new UserLoggedOut(3);
    expect(e.eventName()).toBe('user.logged_out');
    expect(e.userId).toBe(3);
  });
});

describe('getEventDispatcher', () => {
  it('returns the dispatcher set by setEventDispatcher', () => {
    const d = fresh();
    expect(getEventDispatcher()).toBe(d);
  });
});
