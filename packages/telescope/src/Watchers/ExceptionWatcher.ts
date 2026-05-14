import { Request, Response, NextFunction } from "express";
import { TelescopeStore } from "../TelescopeStore.js";

/*
|--------------------------------------------------------------------------
| Exception Watcher
|--------------------------------------------------------------------------
|
| Express error-handling middleware (4 args). Mount it after all routes.
| It records the error then re-throws so the application's own error
| handler can still respond to the client.
|
*/

export function exceptionWatcher(err: any, req: Request, _res: Response, next: NextFunction): void {
  TelescopeStore.record(
    "exception",
    {
      class: err.constructor?.name ?? "Error",
      message: err.message ?? String(err),
      code: err.code,
      status: err.status ?? err.statusCode,
      stack: err.stack,
      file: extractFile(err.stack),
      request: {
        method: req.method,
        uri: req.originalUrl,
        ip: req.ip,
      },
    },
    [err.constructor?.name ?? "Error"],
  );

  next(err);
}

function extractFile(stack?: string): string | undefined {
  if (!stack) return undefined;
  const lines = stack.split("\n");
  const line = lines.find((l) => l.trim().startsWith("at ") && !l.includes("node_modules"));
  if (!line) return undefined;
  const match = line.match(/\((.+?):\d+:\d+\)/);
  return match ? match[1] : undefined;
}
