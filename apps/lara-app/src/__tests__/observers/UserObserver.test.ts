/**
 * UserObserver — unit tests.
 * All lifecycle hooks tested in isolation; no DB calls.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import User from '../../app/Models/User';
import { UserObserver } from '../../app/Observers/UserObserver';

afterEach(() => vi.restoreAllMocks());

const observer = new UserObserver();

function user(attrs: Record<string, unknown> = {}): User {
  const u = new User();
  for (const [k, v] of Object.entries(attrs)) u.setAttribute(k, v);
  return u;
}

describe('creating()', () => {
  it('sets status to active when absent', () => {
    const u = user();
    observer.creating(u);
    expect(u.getAttribute('status')).toBe('active');
  });

  it('does not overwrite an existing status', () => {
    const u = user({ status: 'pending' });
    observer.creating(u);
    expect(u.getAttribute('status')).toBe('pending');
  });

  it('does not overwrite status=inactive', () => {
    const u = user({ status: 'inactive' });
    observer.creating(u);
    expect(u.getAttribute('status')).toBe('inactive');
  });
});

describe('created()', () => {
  it('logs a message containing the email', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    observer.created(user({ email: 'hello@test.com' }));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('hello@test.com'));
  });
});

describe('updating()', () => {
  it('sets updated_at to a Date near now', () => {
    const before = Date.now();
    const u = user();
    observer.updating(u);
    const ts = u.getAttribute('updated_at') as Date;
    expect(ts).toBeInstanceOf(Date);
    expect(ts.getTime()).toBeGreaterThanOrEqual(before);
    expect(ts.getTime()).toBeLessThanOrEqual(Date.now() + 5);
  });
});

describe('deleting()', () => {
  it('logs a message containing the user id', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    observer.deleting(user({ id: 42 }));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('42'));
  });
});
