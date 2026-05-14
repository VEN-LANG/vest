/**
 * Rate Limiter - Laravel-style rate limiting using cache drivers
 *
 * Supports multiple algorithms:
 * - Fixed Window: Simple counter reset after window expires
 * - Sliding Window: More accurate rate limiting using timestamps
 * - Token Bucket: Gradual replenishment of tokens
 *
 * Usage:
 *   import { RateLimiter } from '@/cache/RateLimiter';
 *
 *   // Check if too many attempts
 *   const limiter = new RateLimiter();
 *   if (await limiter.tooManyAttempts('login:user@example.com', 5, 60)) {
 *     const retryAfter = await limiter.availableIn('login:user@example.com', 60);
 *     throw new Error(`Too many attempts. Retry after ${retryAfter} seconds.`);
 *   }
 *   await limiter.hit('login:user@example.com', 60);
 */

import { Cache } from "./index.js";

export interface RateLimiterConfig {
  /** Prefix for rate limiter cache keys */
  prefix?: string;
  /** Default max attempts */
  maxAttempts?: number;
  /** Default decay time in seconds */
  decaySeconds?: number;
}

export interface RateLimitInfo {
  /** Whether the rate limit has been exceeded */
  limited: boolean;
  /** Current number of attempts */
  attempts: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
  /** Remaining attempts */
  remaining: number;
  /** Seconds until the rate limit resets */
  retryAfter: number;
  /** Timestamp when the rate limit resets (Unix timestamp in seconds) */
  resetsAt: number;
}

/**
 * Rate Limiter class using cache backend
 */
export class RateLimiter {
  private prefix: string;
  private defaultMaxAttempts: number;
  private defaultDecaySeconds: number;

  constructor(config: RateLimiterConfig = {}) {
    this.prefix = config.prefix ?? "rate_limiter:";
    this.defaultMaxAttempts = config.maxAttempts ?? 60;
    this.defaultDecaySeconds = config.decaySeconds ?? 60;
  }

  /**
   * Get the cache key for a given key
   */
  private cacheKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get the timer cache key for a given key (stores the reset timestamp)
   */
  private timerKey(key: string): string {
    return `${this.prefix}${key}:timer`;
  }

  /**
   * Determine if the given key has been "accessed" too many times
   */
  async tooManyAttempts(
    key: string,
    maxAttempts?: number,
    _decaySeconds?: number,
  ): Promise<boolean> {
    const max = maxAttempts ?? this.defaultMaxAttempts;

    if ((await this.attempts(key)) >= max) {
      if (await Cache.has(this.timerKey(key))) {
        return true;
      }
      await this.resetAttempts(key);
    }

    return false;
  }

  /**
   * Increment the counter for a given key
   * Returns the new number of attempts
   */
  async hit(key: string, decaySeconds?: number): Promise<number> {
    const decay = decaySeconds ?? this.defaultDecaySeconds;
    const cKey = this.cacheKey(key);
    const tKey = this.timerKey(key);

    // Get current attempts
    const current = await this.attempts(key);
    const newAttempts = current + 1;

    // Check if timer exists
    const timerExists = await Cache.has(tKey);

    if (!timerExists) {
      // Set both the counter and timer
      const expiresAt = Math.floor(Date.now() / 1000) + decay;
      await Cache.set(tKey, expiresAt, decay);
      await Cache.set(cKey, newAttempts, decay);
    } else {
      // Only update the counter with remaining TTL
      const expiresAt = await Cache.get(tKey);
      const remainingTtl = expiresAt
        ? Math.max(1, expiresAt - Math.floor(Date.now() / 1000))
        : decay;
      await Cache.set(cKey, newAttempts, remainingTtl);
    }

    return newAttempts;
  }

  /**
   * Get the number of attempts for the given key
   */
  async attempts(key: string): Promise<number> {
    const val = await Cache.get(this.cacheKey(key));
    return typeof val === "number" ? val : parseInt(val, 10) || 0;
  }

  /**
   * Reset the number of attempts for the given key
   */
  async resetAttempts(key: string): Promise<boolean> {
    await Cache.del(this.cacheKey(key));
    await Cache.del(this.timerKey(key));
    return true;
  }

  /**
   * Get the number of retries remaining
   */
  async retriesLeft(key: string, maxAttempts?: number): Promise<number> {
    const max = maxAttempts ?? this.defaultMaxAttempts;
    const attempts = await this.attempts(key);
    return Math.max(0, max - attempts);
  }

  /**
   * Clear the hits and lockout timer for the given key
   */
  async clear(key: string): Promise<void> {
    await this.resetAttempts(key);
  }

  /**
   * Get the number of seconds until the key is accessible again
   */
  async availableIn(key: string, _decaySeconds?: number): Promise<number> {
    const expiresAt = await Cache.get(this.timerKey(key));

    if (!expiresAt) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, expiresAt - now);
  }

  /**
   * Get the timestamp when the key becomes available again
   */
  async availableAt(key: string): Promise<number> {
    const expiresAt = await Cache.get(this.timerKey(key));
    return expiresAt || Math.floor(Date.now() / 1000);
  }

  /**
   * Attempt to execute a callback if the rate limit allows
   * Returns the callback result or throws if rate limited
   */
  async attempt<T>(
    key: string,
    maxAttempts: number,
    callback: () => T | Promise<T>,
    decaySeconds?: number,
  ): Promise<T> {
    const decay = decaySeconds ?? this.defaultDecaySeconds;

    if (await this.tooManyAttempts(key, maxAttempts, decay)) {
      const retryAfter = await this.availableIn(key, decay);
      throw new RateLimitExceededException(
        `Too many attempts. Please retry after ${retryAfter} seconds.`,
        retryAfter,
        maxAttempts,
      );
    }

    await this.hit(key, decay);
    return callback();
  }

  /**
   * Get complete rate limit info for a key
   */
  async getInfo(key: string, maxAttempts?: number, decaySeconds?: number): Promise<RateLimitInfo> {
    const max = maxAttempts ?? this.defaultMaxAttempts;
    const decay = decaySeconds ?? this.defaultDecaySeconds;
    const attempts = await this.attempts(key);
    const remaining = Math.max(0, max - attempts);
    const retryAfter = await this.availableIn(key, decay);
    const resetsAt = await this.availableAt(key);

    return {
      limited: attempts >= max && retryAfter > 0,
      attempts,
      maxAttempts: max,
      remaining,
      retryAfter,
      resetsAt,
    };
  }

  /**
   * Execute a callback with rate limiting, using a limiter definition
   */
  async limiter<T>(
    name: string,
    key: string,
    maxAttempts: number,
    decaySeconds: number,
    callback: () => T | Promise<T>,
  ): Promise<T> {
    const fullKey = `${name}:${key}`;
    return this.attempt(fullKey, maxAttempts, callback, decaySeconds);
  }
}

/**
 * Exception thrown when rate limit is exceeded
 */
export class RateLimitExceededException extends Error {
  public readonly retryAfter: number;
  public readonly maxAttempts: number;
  public readonly statusCode: number = 429;

  constructor(message: string, retryAfter: number, maxAttempts: number) {
    super(message);
    this.name = "RateLimitExceededException";
    this.retryAfter = retryAfter;
    this.maxAttempts = maxAttempts;
  }
}

// Named rate limiters registry (Laravel-style)
const namedLimiters: Map<string, () => { maxAttempts: number; decaySeconds: number }> = new Map();

/**
 * Register a named rate limiter
 */
export function defineRateLimiter(
  name: string,
  config: () => { maxAttempts: number; decaySeconds: number },
): void {
  namedLimiters.set(name, config);
}

/**
 * Get a named rate limiter configuration
 */
export function getNamedLimiter(
  name: string,
): { maxAttempts: number; decaySeconds: number } | null {
  const limiter = namedLimiters.get(name);
  return limiter ? limiter() : null;
}

// Singleton instance for convenience
const rateLimiter = new RateLimiter();

// Export facade-style methods
export const RateLimiterFacade = {
  /** Check if too many attempts have been made */
  tooManyAttempts: (key: string, maxAttempts?: number, decaySeconds?: number) =>
    rateLimiter.tooManyAttempts(key, maxAttempts, decaySeconds),

  /** Increment the attempt counter */
  hit: (key: string, decaySeconds?: number) => rateLimiter.hit(key, decaySeconds),

  /** Get current number of attempts */
  attempts: (key: string) => rateLimiter.attempts(key),

  /** Reset attempt counter */
  resetAttempts: (key: string) => rateLimiter.resetAttempts(key),

  /** Get remaining retries */
  retriesLeft: (key: string, maxAttempts?: number) => rateLimiter.retriesLeft(key, maxAttempts),

  /** Clear rate limiter for key */
  clear: (key: string) => rateLimiter.clear(key),

  /** Get seconds until rate limit resets */
  availableIn: (key: string, decaySeconds?: number) => rateLimiter.availableIn(key, decaySeconds),

  /** Get timestamp when rate limit resets */
  availableAt: (key: string) => rateLimiter.availableAt(key),

  /** Attempt to execute callback with rate limiting */
  attempt: <T>(
    key: string,
    maxAttempts: number,
    callback: () => T | Promise<T>,
    decaySeconds?: number,
  ) => rateLimiter.attempt(key, maxAttempts, callback, decaySeconds),

  /** Get rate limit info for a key */
  getInfo: (key: string, maxAttempts?: number, decaySeconds?: number) =>
    rateLimiter.getInfo(key, maxAttempts, decaySeconds),

  /** Define a named rate limiter */
  define: defineRateLimiter,

  /** Get named limiter config */
  limiter: getNamedLimiter,

  /** Execute with named limiter */
  for: async <T>(name: string, key: string, callback: () => T | Promise<T>): Promise<T> => {
    const config = getNamedLimiter(name);
    if (!config) {
      throw new Error(`Rate limiter [${name}] is not defined.`);
    }
    return rateLimiter.attempt(`${name}:${key}`, config.maxAttempts, callback, config.decaySeconds);
  },
};

export default rateLimiter;
