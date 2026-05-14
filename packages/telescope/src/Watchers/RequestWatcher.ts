import { Request, Response, NextFunction } from "express";
import { TelescopeStore } from "../TelescopeStore.js";

/*
|--------------------------------------------------------------------------
| Request Watcher
|--------------------------------------------------------------------------
|
| A plain Express RequestHandler (req, res, next) — no factory pattern.
| Call initRequestWatcher(config) once before registering the middleware
| so it knows which paths to ignore and the response-body size limit.
|
| Registered in TelescopeServiceProvider.register() (before routes) so
| it is first in the middleware chain.
|
*/

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "x-auth-token",
  "x-csrf-token",
]);

const SENSITIVE_FIELDS = new Set([
  "password",
  "password_confirmation",
  "current_password",
  "token",
  "secret",
  "credit_card",
]);

/** Module-level config — set once via initRequestWatcher(). */
let _ignoredPaths: string[] = ["/horizon", "/telescope", "/health", "/favicon.ico"];
let _responseSizeLimit = 65536;

/** Configure the watcher before registering it with Express. */
export function initRequestWatcher(config: {
  ignoredPaths?: string[];
  responseBodySizeLimit?: number;
}): void {
  _ignoredPaths = config.ignoredPaths ?? _ignoredPaths;
  _responseSizeLimit = config.responseBodySizeLimit ?? _responseSizeLimit;
}

function sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? "***" : String(v ?? "");
  }
  return out;
}

function sanitizeBody(body: Record<string, any>): Record<string, any> {
  if (!body || typeof body !== "object") return body;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = SENSITIVE_FIELDS.has(k.toLowerCase()) ? "***" : v;
  }
  return out;
}

/** Plain Express middleware — pass directly to app.use(). */
export function requestWatcher(req: Request, res: Response, next: NextFunction): void {
  if (_ignoredPaths.some((p) => req.path.startsWith(p))) return next();

  const start = process.hrtime.bigint();

  // Capture response body by wrapping res.json
  let responseBody: any;
  const origJson = res.json.bind(res);
  res.json = function (body: any) {
    try {
      if (_responseSizeLimit > 0 && JSON.stringify(body).length > _responseSizeLimit) {
        responseBody = "[truncated]";
      } else {
        responseBody = body;
      }
    } catch {
      responseBody = "[unserializable]";
    }
    return origJson(body);
  };

  res.on("finish", () => {
    const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
    const user = (req as any).user;
    const tags: string[] = [req.method, String(res.statusCode)];
    if (user?.id) tags.push(`user:${user.id}`);

    TelescopeStore.record(
      "request",
      {
        method: req.method,
        uri: req.originalUrl,
        status: res.statusCode,
        duration: durationMs,
        ip: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress,
        userId: user?.id ?? null,
        requestHeaders: sanitizeHeaders(req.headers as Record<string, any>),
        requestBody: req.body ? sanitizeBody(req.body) : undefined,
        requestQuery: Object.keys(req.query).length ? req.query : undefined,
        responseBody,
      },
      tags,
    );
  });

  next();
}
