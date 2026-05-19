import type { Model } from "@lara-node/db";
import RouterBuilder from "./router.js";
import { registerMiddleware } from "./Middleware/middleware.js";
import type { Middleware as MiddlewareEntry } from "./Middleware/MiddlewareStack.js";

/**
 * @Bind(name?)
 *
 * Class decorator that registers a Model subclass for route-model binding.
 * When applied, the router automatically resolves route parameters (e.g. `:user`,
 * `:role`) to loaded model instances — no manual `RouterBuilder.registerModel()`
 * call needed.
 *
 * The model is registered when the module is first loaded. Combine with
 * `autoRegisterModels()` (which walks the Models directory and requires every
 * file) so registration happens at app startup without listing models manually.
 *
 * @param name - Route param name to bind to (defaults to lowercase class name).
 *
 * @example
 * import { Model, use } from '@lara-node/db';
 * import { Bind } from '@lara-node/router';
 *
 * @Bind()               // registers as 'user' (class name lowercased)
 * @Bind('user')         // explicit name
 * export class User extends Model { ... }
 *
 * // In routes:
 * g.get('/:user', [UserController, 'show']);
 * // req.params.user is a loaded User instance
 */
export function Bind(name?: string) {
  return function <T extends typeof Model>(target: T): T {
    RouterBuilder.registerModel(name ?? target.name.toLowerCase(), target);
    return target;
  };
}

/**
 * @Middleware(alias)
 *
 * Class decorator that registers an IMiddleware class under a named alias.
 * Equivalent to calling `registerMiddleware(alias, TheClass)` in a service
 * provider — but self-contained in the middleware file itself.
 *
 * @param alias - The string alias used in route definitions (e.g. 'auth', 'can').
 *
 * @example
 * import { Injectable } from '@lara-node/core';
 * import { Middleware } from '@lara-node/router';
 * import type { IMiddleware } from '@lara-node/router';
 * import type { Request, Response, NextFunction } from 'express';
 *
 * @Middleware('auth')
 * @Injectable()
 * export class AuthMiddleware implements IMiddleware {
 *   handle(req: Request, res: Response, next: NextFunction) {
 *     // ...
 *   }
 * }
 *
 * // In routes (no manual registration needed):
 * g.get('/profile', 'auth', [UserController, 'profile']);
 */
export function Middleware(alias: string) {
  return function <T extends MiddlewareEntry>(target: T): T {
    registerMiddleware(alias, target);
    return target;
  };
}
