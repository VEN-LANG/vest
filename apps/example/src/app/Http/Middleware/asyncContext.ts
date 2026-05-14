import { AsyncLocalStorage } from "async_hooks";
import type { Request, Response, NextFunction } from "express";

export const asyncLocalStorage = new AsyncLocalStorage<Record<string, any>>();

export function asyncContextMiddleware(req: Request, res: Response, next: NextFunction) {
  // Create a fresh store for each request so downstream code (and helpers) can access it
  asyncLocalStorage.run({ req }, () => next());
}
