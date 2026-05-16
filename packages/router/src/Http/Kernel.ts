import type { RequestHandler } from "express";
import type { Application } from "@lara-node/core";
import { registerMiddleware, middlewareStack } from "../Middleware/middleware.js";
import type {
  MiddlewareEntry,
  Middleware,
  MiddlewareStack as IMiddlewareStack,
} from "../Middleware/MiddlewareStack.js";

export type RouteMiddleware = Record<
  string,
  RequestHandler | ((...args: string[]) => RequestHandler)
>;

/**
 * Base HTTP Kernel — extends this in your app's app/Http/Kernel.ts.
 *
 * Override the three properties to configure your application's middleware:
 *
 * @example
 * // app/Http/Kernel.ts
 * import { HttpKernel } from '@lara-node/router';
 * import { authMiddleware } from './Middleware/auth.js';
 *
 * export class Kernel extends HttpKernel {
 *   protected override middleware = [asyncContextMiddleware, requestLoggerMiddleware];
 *   protected override routeMiddleware = {
 *     auth: authMiddleware,
 *     can: (...perms: string[]) => authorizePermissions(...perms),
 *   };
 * }
 */
export abstract class HttpKernel {
  constructor(protected app: Application) {}

  // ---------------------------------------------------------------------------
  // Override these in your app/Http/Kernel.ts
  // ---------------------------------------------------------------------------

  /** Middleware applied on every request. */
  protected middleware: RequestHandler[] = [];

  /** Named aliases used in routes: Route.middleware('auth') */
  protected routeMiddleware: RouteMiddleware = {};

  /** Middleware groups: Route.middleware('api') */
  protected middlewareGroups: Record<string, (string | RequestHandler)[]> = {
    web: [],
    api: [],
  };

  /** Resolution priority when multiple named middleware are applied. */
  protected middlewarePriority: string[] = ["auth", "must-be-active", "can", "role"];

  // ---------------------------------------------------------------------------
  // Boot (called by bootstrap/app.ts before providers boot)
  // ---------------------------------------------------------------------------

  boot(): void {
    this.app.useMiddlewares(this.middleware);

    for (const [name, mw] of Object.entries(this.routeMiddleware)) {
      registerMiddleware(name, mw as MiddlewareEntry);
    }

    for (const [name, mws] of Object.entries(this.middlewareGroups)) {
      middlewareStack.group(name, mws as any);
    }

    middlewareStack.setPriority(this.middlewarePriority);
  }

  /** Must be called after routes are mounted. */
  configureErrorHandling(errorHandler?: RequestHandler): void {
    this.app.configure404Handler();
    if (errorHandler) this.app.configureErrorHandler(errorHandler);
  }

  // ---------------------------------------------------------------------------
  // Fluent runtime API (optional, for programmatic config)
  // ---------------------------------------------------------------------------

  withMiddlewareAlias(name: string, mw: MiddlewareEntry | Middleware): this {
    middlewareStack.alias(name, mw as any);
    registerMiddleware(name, mw as MiddlewareEntry);
    return this;
  }

  withMiddlewareAliases(aliases: Record<string, MiddlewareEntry | Middleware>): this {
    for (const [n, mw] of Object.entries(aliases)) this.withMiddlewareAlias(n, mw);
    return this;
  }

  withMiddlewareGroup(name: string, mws: (string | MiddlewareEntry | Middleware)[]): this {
    middlewareStack.group(name, mws as any);
    return this;
  }

  appendToGroup(group: string, mw: string | MiddlewareEntry | Middleware): this {
    middlewareStack.appendToGroup(group, mw as any);
    return this;
  }

  prependToGroup(group: string, mw: string | MiddlewareEntry | Middleware): this {
    middlewareStack.prependToGroup(group, mw as any);
    return this;
  }

  prependGlobal(mw: RequestHandler): this {
    this.middleware.unshift(mw);
    return this;
  }

  appendGlobal(mw: RequestHandler): this {
    this.middleware.push(mw);
    return this;
  }

  middlewares(): IMiddlewareStack {
    return middlewareStack;
  }
}
