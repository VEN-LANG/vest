import type { HandlerOrAlias } from "./router.js";

/*
|--------------------------------------------------------------------------
| Controller Route Decorators
|--------------------------------------------------------------------------
|
| @Route(prefix) — applied to a controller class, sets the base path.
| @Route.get / .post / .put / .patch / .delete — applied to methods,
|   define individual routes with optional middleware.
|
| Registration flow:
|   1. Method decorators (@Route.get etc.) run and store route metadata
|      on the constructor.
|   2. @Route (class decorator) runs last, moves the metadata into the
|      global controllerRegistry.
|   3. At boot time, RouteServiceProvider (or any code) calls
|      router.addController(UserController) — or uses
|      RouterBuilder.fromControllers() to build a full router automatically.
|
*/

/** A single annotated route on a controller method. */
export interface MethodRoute {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  /** Middleware aliases or handler aliases (same as the router's HandlerOrAlias strings). */
  middleware: string[];
  handlerKey: string;
}

/** Everything @Route(prefix) stores for a controller class. */
export interface ControllerMeta {
  prefix: string;
  /** Class-level middleware applied to every route in this controller. */
  classMiddleware: string[];
  routes: MethodRoute[];
}

// Temporary staging key — method decorators write here, class decorator reads it.
const STAGING_KEY = "__routeStaging__";

// Global registry — populated by the @Route class decorator.
const controllerRegistry = new Map<new (...args: any[]) => any, ControllerMeta>();

export function getRegisteredControllers(): Map<new (...args: any[]) => any, ControllerMeta> {
  return controllerRegistry;
}

/** Build a method decorator for the given HTTP verb. */
function makeVerbDecorator(httpMethod: MethodRoute["method"]) {
  /**
   * @param path     - Route path relative to the controller prefix (e.g. `'/'`, `'/:user'`).
   * @param middleware - Zero or more middleware aliases (e.g. `'auth'`, `'can:view_users'`).
   */
  return (path: string, ...middleware: string[]): MethodDecorator => {
    return (target: object, propertyKey: string | symbol) => {
      const ctor = (target as any).constructor;
      const existing: MethodRoute[] = ctor[STAGING_KEY] ?? [];
      existing.push({ method: httpMethod, path, middleware, handlerKey: String(propertyKey) });
      ctor[STAGING_KEY] = existing;
    };
  };
}

/**
 * @Route(prefix, ...classMiddleware)
 *
 * Class decorator that declares a controller's base route prefix and optionally
 * applies middleware to every route defined in the class.
 *
 * Combined with the method decorators (@Route.get / .post etc.), the controller
 * registers its routes in the global controller registry automatically when the
 * module is loaded.
 *
 * @param prefix          - Base path prefix for all routes in this controller.
 * @param classMiddleware - Middleware aliases applied to every route (e.g. `'auth'`).
 *
 * @example
 * import { Route } from '@lara-node/router';
 * import type { Request, Response } from 'express';
 *
 * @Route('/api/users', 'auth')
 * export class UserController {
 *   @Route.get('/')                           // GET  /api/users
 *   async index(req: Request, res: Response) { ... }
 *
 *   @Route.post('/', 'can:create_users')      // POST /api/users (+ can middleware)
 *   async store(req: Request, res: Response) { ... }
 *
 *   @Route.get('/:user')                      // GET  /api/users/:user (auto-bound)
 *   async show(req: Request, res: Response) { ... }
 *
 *   @Route.put('/:user', 'can:update_users')  // PUT  /api/users/:user
 *   async update(req: Request, res: Response) { ... }
 *
 *   @Route.delete('/:user', 'can:delete_users') // DELETE /api/users/:user
 *   async destroy(req: Request, res: Response) { ... }
 * }
 *
 * // In RouteServiceProvider.boot():
 * const router = RouterBuilder.fromControllers();
 * this.app.mountRoutes('/', router.build());
 *
 * // Or selectively:
 * const router = new RouterBuilder();
 * router.addController(UserController);
 * router.addController(AuthController);
 * this.app.mountRoutes('/api', router.build());
 */
function _route(prefix: string, ...classMiddleware: string[]): ClassDecorator {
  return (target: any) => {
    const routes: MethodRoute[] = target[STAGING_KEY] ?? [];
    delete target[STAGING_KEY];
    controllerRegistry.set(target as new (...args: any[]) => any, {
      prefix,
      classMiddleware,
      routes,
    });
    return target;
  };
}

/**
 * @Route(prefix, ...classMiddleware)
 *
 * Class decorator that declares a controller's base route prefix and optionally
 * applies middleware to every route defined in the class.
 *
 * Combined with the method decorators (@Route.get / .post etc.), the controller
 * registers its routes in the global controller registry automatically when the
 * module is loaded.
 *
 * @param prefix          - Base path prefix for all routes in this controller.
 * @param classMiddleware - Middleware aliases applied to every route (e.g. `'auth'`).
 *
 * @example
 * import { Route } from '@lara-node/router';
 * import type { Request, Response } from 'express';
 *
 * @Route('/api/users', 'auth')
 * export class UserController {
 *   @Route.get('/')                           // GET  /api/users
 *   async index(req: Request, res: Response) { ... }
 *
 *   @Route.post('/', 'can:create_users')      // POST /api/users
 *   async store(req: Request, res: Response) { ... }
 *
 *   @Route.get('/:user')                      // GET  /api/users/:user (auto-bound)
 *   async show(req: Request, res: Response) { ... }
 *
 *   @Route.put('/:user', 'can:update_users')
 *   async update(req: Request, res: Response) { ... }
 *
 *   @Route.delete('/:user', 'can:delete_users')
 *   async destroy(req: Request, res: Response) { ... }
 * }
 *
 * // In RouteServiceProvider.boot():
 * const router = RouterBuilder.fromControllers();
 * this.app.mountRoutes('/', router.build());
 *
 * // Or selectively:
 * const router = new RouterBuilder();
 * router.addController(UserController);
 * router.addController(AuthController);
 * this.app.mountRoutes('/api', router.build());
 */
export const Route = Object.assign(_route, {
  /** @Route.get(path, ...middleware) — registers a GET route on this method. */
  get:    makeVerbDecorator("get"),
  /** @Route.post(path, ...middleware) — registers a POST route on this method. */
  post:   makeVerbDecorator("post"),
  /** @Route.put(path, ...middleware) — registers a PUT route on this method. */
  put:    makeVerbDecorator("put"),
  /** @Route.patch(path, ...middleware) — registers a PATCH route on this method. */
  patch:  makeVerbDecorator("patch"),
  /** @Route.delete(path, ...middleware) — registers a DELETE route on this method. */
  delete: makeVerbDecorator("delete"),
});
