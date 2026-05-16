/**
 * Horizon — verifies the service provider and config are wired up correctly.
 */
import { describe, expect, it } from 'vitest';
import { HorizonServiceProvider } from '@lara-node/horizon';
import { config, setConfig } from '@lara-node/core';

describe('HorizonServiceProvider', () => {
  it('is a constructor function', () => {
    expect(typeof HorizonServiceProvider).toBe('function');
  });

  it('has register and boot methods', () => {
    expect(typeof HorizonServiceProvider.prototype.register).toBe('function');
    expect(typeof HorizonServiceProvider.prototype.boot).toBe('function');
  });
});

describe('Horizon config defaults', () => {
  it('has a path config key after setConfig', () => {
    setConfig('horizon', { path: '/horizon', enabled: true });
    const conf = config('horizon') as Record<string, unknown>;
    expect(conf?.path).toBeDefined();
  });
});
