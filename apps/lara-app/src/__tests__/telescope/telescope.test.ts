/**
 * Telescope — verifies the service provider and config are wired up correctly.
 */
import { describe, expect, it } from 'vitest';
import { TelescopeServiceProvider } from '@lara-node/telescope';
import { config, setConfig } from '@lara-node/core';

describe('TelescopeServiceProvider', () => {
  it('is a constructor function', () => {
    expect(typeof TelescopeServiceProvider).toBe('function');
  });

  it('has register and boot methods', () => {
    expect(typeof TelescopeServiceProvider.prototype.register).toBe('function');
    expect(typeof TelescopeServiceProvider.prototype.boot).toBe('function');
  });
});

describe('Telescope config defaults', () => {
  it('path config is accessible after setConfig', () => {
    setConfig('telescope', { path: '/telescope', enabled: true, storageDriver: 'mongodb' });
    const conf = config('telescope') as Record<string, unknown>;
    expect(conf?.path).toBe('/telescope');
    expect(conf?.storageDriver).toBe('mongodb');
  });
});
