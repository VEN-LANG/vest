import { Request, Response, NextFunction } from 'express';
import { Middleware } from '@lara-node/router';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

/*
|--------------------------------------------------------------------------
| ThrottleMiddleware — rate limiting per IP
|--------------------------------------------------------------------------
|
| @Middleware('throttle') registers this class under the 'throttle' alias
| automatically — no manual registration in MiddlewareServiceProvider.
|
| Usage on route:
|   g.post('/login', 'throttle:10', [AuthController, 'login']);
|
*/
@Middleware('throttle')
export class ThrottleMiddleware {
  constructor(
    private readonly maxRequests: number = 60,
    private readonly windowMs: number = 60_000,
  ) {}

  handle(req: Request, res: Response, next: NextFunction): void {
    const key = (req.ip || 'unknown') + ':' + req.path;
    const now = Date.now();
    const entry = requestCounts.get(key);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + this.windowMs });
      next();
      return;
    }

    if (entry.count >= this.maxRequests) {
      res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
      return;
    }

    entry.count++;
    next();
  }

  toHandler() {
    return (req: Request, res: Response, next: NextFunction) => this.handle(req, res, next);
  }
}
