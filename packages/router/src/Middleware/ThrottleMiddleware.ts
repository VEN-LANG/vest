/**
 * Rate Limiter Middleware
 *
 * Laravel-style rate limiting middleware for Express routes.
 * Uses the cache-backed RateLimiter.
 *
 * Usage in routes:
 *   router.get('/api/users', throttle(60, 1), controller);  // 60 requests per minute
 *   router.post('/api/login', throttle(5, 1), controller);  // 5 requests per minute
 *
 * Using named limiters:
 *   // Define in a service provider or bootstrap
 *   defineRateLimiter('api', () => ({ maxAttempts: 60, decaySeconds: 60 }));
 *   defineRateLimiter('login', () => ({ maxAttempts: 5, decaySeconds: 60 }));
 *
 *   // Use in routes
 *   router.get('/api/users', throttle('api'), controller);
 *   router.post('/api/login', throttle('login'), controller);
 */

import { Request, Response, NextFunction, RequestHandler } from "express";
import { RateLimiter, RateLimitExceededException, getNamedLimiter } from "@vest-ts/cache";
import { registerMiddleware } from "./middleware.js";

const rateLimiter = new RateLimiter();

/**
 * Get the rate limit key for a request
 * Uses IP address by default, can be customized
 */
export type KeyResolver = (req: Request) => string;

const defaultKeyResolver: KeyResolver = (req: Request): string => {
  // Try to get real IP from various headers (for reverse proxies)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ips.trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return req.ip || req.socket.remoteAddress || "unknown";
};

/**
 * Get the rate limit key including the route path
 */
const pathKeyResolver: KeyResolver = (req: Request): string => {
  const ip = defaultKeyResolver(req);
  const path = req.path || req.url;
  return `${ip}|${path}`;
};

/**
 * Get the rate limit key using authenticated user ID
 */
const userKeyResolver: KeyResolver = (req: Request): string => {
  const user = (req as any).user;
  if (user && user.id) {
    return `user:${user.id}`;
  }
  return defaultKeyResolver(req);
};

export interface ThrottleOptions {
  /** Maximum number of attempts allowed */
  maxAttempts?: number;
  /** Decay time in minutes */
  decayMinutes?: number;
  /** Decay time in seconds (takes precedence over decayMinutes) */
  decaySeconds?: number;
  /** Custom key resolver function */
  keyResolver?: KeyResolver;
  /** Prefix for the rate limit key */
  prefix?: string;
  /** Custom response handler when rate limited */
  responseHandler?: (req: Request, res: Response, retryAfter: number) => void;
}

/**
 * Default rate limit exceeded response
 */
const defaultResponseHandler = (req: Request, res: Response, retryAfter: number): void => {
  res.status(429).json({
    message: "Too Many Attempts.",
    retry_after: retryAfter,
  });
};

/**
 * Create a throttle middleware
 *
 * @param maxAttemptsOrName - Max attempts per decay period, or named limiter name
 * @param decayMinutes - Decay period in minutes (default: 1)
 * @param options - Additional options
 */
export function throttle(
  maxAttemptsOrName?: number | string,
  decayMinutes?: number,
  options?: ThrottleOptions,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let maxAttempts: number;
      let decaySeconds: number;

      // Check if using a named limiter
      if (
        !Number.isFinite(maxAttemptsOrName ? +maxAttemptsOrName : undefined) &&
        typeof maxAttemptsOrName === "string"
      ) {
        const namedConfig = getNamedLimiter(maxAttemptsOrName);
        if (!namedConfig) {
          console.warn(`Rate limiter [${maxAttemptsOrName}] is not defined. Using defaults.`);
          maxAttempts = options?.maxAttempts ?? 60;
          decaySeconds = options?.decaySeconds ?? (options?.decayMinutes ?? 1) * 60;
        } else {
          maxAttempts = namedConfig.maxAttempts;
          decaySeconds = namedConfig.decaySeconds;
        }
      } else {
        maxAttempts = Number(maxAttemptsOrName) ?? options?.maxAttempts ?? 60;
        decaySeconds =
          options?.decaySeconds ?? Number(decayMinutes ?? options?.decayMinutes ?? 1) * 60;
      }
      const keyResolver = options?.keyResolver ?? defaultKeyResolver;
      const responseHandler = options?.responseHandler ?? defaultResponseHandler;
      const prefix = options?.prefix ?? "throttle";

      const key = `${prefix}:${keyResolver(req)}`;

      // Check if rate limited
      if (await rateLimiter.tooManyAttempts(key, maxAttempts, decaySeconds)) {
        const retryAfter = await rateLimiter.availableIn(key, decaySeconds);
        const info = await rateLimiter.getInfo(key, maxAttempts, decaySeconds);

        // Set rate limit headers
        res.setHeader("X-RateLimit-Limit", maxAttempts);
        res.setHeader("X-RateLimit-Remaining", info.remaining);
        res.setHeader("X-RateLimit-Reset", info.resetsAt);
        res.setHeader("Retry-After", retryAfter);

        responseHandler(req, res, retryAfter);
        return;
      }

      // Increment the counter
      await rateLimiter.hit(key, decaySeconds);
      const info = await rateLimiter.getInfo(key, maxAttempts, decaySeconds);

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", maxAttempts);
      res.setHeader("X-RateLimit-Remaining", info.remaining);
      res.setHeader("X-RateLimit-Reset", info.resetsAt);

      next();
    } catch (error) {
      // If rate limiting fails (e.g., cache unavailable), let the request through
      console.error("Rate limiter error:", error);
      next();
    }
  };
}

/**
 * Create a throttle middleware for API routes (using path-based keys)
 */
export function apiThrottle(maxAttempts: number = 60, decayMinutes: number = 1): RequestHandler {
  return throttle(maxAttempts, decayMinutes, {
    keyResolver: pathKeyResolver,
    prefix: "api_throttle",
  });
}

/**
 * Create a throttle middleware for authenticated users (using user ID)
 */
export function userThrottle(maxAttempts: number = 60, decayMinutes: number = 1): RequestHandler {
  return throttle(maxAttempts, decayMinutes, {
    keyResolver: userKeyResolver,
    prefix: "user_throttle",
  });
}

/**
 * Create a throttle middleware for sensitive actions (like login)
 * Uses stricter limits and includes path in key
 */
export function sensitiveThrottle(
  maxAttempts: number = 5,
  decayMinutes: number = 1,
): RequestHandler {
  return throttle(maxAttempts, decayMinutes, {
    keyResolver: pathKeyResolver,
    prefix: "sensitive_throttle",
  });
}

// Register middleware with the middleware system
// registerMiddleware('throttle', throttle);
// registerMiddleware('api.throttle', apiThrottle);
// registerMiddleware('user.throttle', userThrottle);
// registerMiddleware('sensitive.throttle', sensitiveThrottle);

// Export key resolvers for custom usage
export const keyResolvers = {
  ip: defaultKeyResolver,
  path: pathKeyResolver,
  user: userKeyResolver,
};

export default throttle;
