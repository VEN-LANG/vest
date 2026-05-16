/**
 * Cache — unit tests using the in-memory driver.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Cache, initCache } from '@lara-node/cache';

beforeEach(async () => {
  await initCache({ driver: 'memory' });
  await Cache.flush();
});

describe('Cache — set / get', () => {
  it('stores and retrieves a string value', async () => {
    await Cache.set('key1', 'hello');
    expect(await Cache.get('key1')).toBe('hello');
  });

  it('stores and retrieves an object', async () => {
    await Cache.set('obj', { a: 1, b: 'two' });
    expect(await Cache.get('obj')).toEqual({ a: 1, b: 'two' });
  });

  it('returns null for a missing key', async () => {
    expect(await Cache.get('missing')).toBeNull();
  });
});

describe('Cache — has', () => {
  it('returns true for an existing key', async () => {
    await Cache.set('exists', 'yes');
    expect(await Cache.has('exists')).toBe(true);
  });

  it('returns false for a missing key', async () => {
    expect(await Cache.has('missing-key')).toBe(false);
  });
});

describe('Cache — forget', () => {
  it('removes a key', async () => {
    await Cache.set('temp', 'value');
    await Cache.forget('temp');
    expect(await Cache.get('temp')).toBeNull();
  });

  it('does not throw when forgetting a non-existent key', async () => {
    await expect(Cache.forget('no-such-key')).resolves.not.toThrow();
  });
});

describe('Cache — TTL', () => {
  it('returns null after TTL expires', async () => {
    await Cache.set('short', 'v', 0.001); // ~1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    expect(await Cache.get('short')).toBeNull();
  });
});

describe('Cache — flush', () => {
  it('clears all cached keys', async () => {
    await Cache.set('a', 1);
    await Cache.set('b', 2);
    await Cache.flush();
    expect(await Cache.get('a')).toBeNull();
    expect(await Cache.get('b')).toBeNull();
  });
});
