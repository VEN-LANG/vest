import type { Request, Response, NextFunction } from "express";

// Simple request logger inspired by Laravel's HTTP kernel logging.
// Logs: METHOD URL STATUS - DURATION ms - IP - optional user id/email
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  const { method, originalUrl } = req;
  const ip = (req.ip ||
    req.headers["x-forwarded-for"] ||
    (req.socket && req.socket.remoteAddress)) as string | undefined;
  const maybeUser = (req as any).user;

  res.on("finish", () => {
    const [sec, nano] = process.hrtime(start);
    const ms = (sec * 1e3 + nano / 1e6).toFixed(2);
    const status = res.statusCode;

    // colorize status like many dev servers (green 2xx, yellow 4xx, red 5xx)
    const reset = "\x1b[0m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const red = "\x1b[31m";
    let color = green;
    if (status >= 500) color = red;
    else if (status >= 400) color = yellow;

    const userInfo = maybeUser
      ? ` - user:${maybeUser.id ?? maybeUser.email ?? JSON.stringify(maybeUser)}`
      : "";
    const query =
      req.query && Object.keys(req.query).length ? ` query=${JSON.stringify(req.query)}` : "";
    const params =
      req.params && Object.keys(req.params).length ? ` params=${JSON.stringify(req.params)}` : "";

    console.log(
      `${method} ${originalUrl} ${color}${status}${reset} - ${ms} ms - ${ip || "-"}${userInfo}${query}${params}`,
    );
  });

  next();
}

export default requestLoggerMiddleware;
