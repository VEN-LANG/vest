/**
 * GreetCommand — unit tests.
 * Tests handle() logic with injected args; no Kernel or DB needed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GreetCommand } from '../../app/Console/Commands/GreetCommand';
import type { ArgumentsCamelCase } from 'yargs';

afterEach(() => vi.restoreAllMocks());

function makeArgs(overrides: Partial<{ name: string; shout: boolean }> = {}): ArgumentsCamelCase {
  return { name: 'World', shout: false, _: [], $0: 'artisan', ...overrides } as any;
}

function infoOutput(cmd: GreetCommand): string {
  const messages: string[] = [];
  vi.spyOn(cmd as any, 'info').mockImplementation((msg: string) => messages.push(msg));
  return messages.join('\n');
}

describe('GreetCommand', () => {
  it('greets "World" by default', async () => {
    const cmd = new GreetCommand();
    const messages: string[] = [];
    vi.spyOn(cmd as any, 'info').mockImplementation((m: string) => messages.push(m));
    await cmd.handle(makeArgs());
    expect(messages[0]).toBe('Hello, World!');
  });

  it('greets a custom name', async () => {
    const cmd = new GreetCommand();
    const messages: string[] = [];
    vi.spyOn(cmd as any, 'info').mockImplementation((m: string) => messages.push(m));
    await cmd.handle(makeArgs({ name: 'Alice' }));
    expect(messages[0]).toContain('Alice');
  });

  it('shouts the greeting when --shout is set', async () => {
    const cmd = new GreetCommand();
    const messages: string[] = [];
    vi.spyOn(cmd as any, 'info').mockImplementation((m: string) => messages.push(m));
    await cmd.handle(makeArgs({ name: 'Bob', shout: true }));
    expect(messages[0]).toBe('HELLO, BOB!');
  });

  it('has correct signature', () => {
    expect((new GreetCommand() as any).signature).toBe('greet');
  });
});
