import { RequestHandler, NextFunction, Request, Response } from "express";

export type MiddlewareEntry = RequestHandler | ((...args: string[]) => RequestHandler);
export type Middleware = new (...args: unknown[]) => IMiddleware;

export interface IMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void | Promise<void>;
  terminate?(req: Request, res: Response): void | Promise<void>;
}

export interface MiddlewareGroupConfig {
  middleware: (string | MiddlewareEntry | Middleware)[];
  prepend?: (string | MiddlewareEntry | Middleware)[];
  append?: (string | MiddlewareEntry | Middleware)[];
  remove?: (string | MiddlewareEntry | Middleware)[];
}

/**
 * Laravel-style Middleware Stack Manager
 *
 * Handles:
 * - Global middleware
 * - Middleware groups (web, api, etc.)
 * - Middleware aliases
 * - Middleware priority ordering
 * - Singleton middleware
 * - Terminating middleware
 */
export class MiddlewareStack {
  /*
    |--------------------------------------------------------------------------
    | Global Middleware
    |--------------------------------------------------------------------------
    */
  protected globalMiddleware: (string | MiddlewareEntry | Middleware)[] = [];

  /*
    |--------------------------------------------------------------------------
    | Middleware Groups
    |--------------------------------------------------------------------------
    */
  protected groups: Map<string, (string | MiddlewareEntry | Middleware)[]> = new Map();

  /*
    |--------------------------------------------------------------------------
    | Middleware Aliases
    |--------------------------------------------------------------------------
    */
  protected aliases: Map<string, MiddlewareEntry | Middleware> = new Map();

  /*
    |--------------------------------------------------------------------------
    | Middleware Priority
    |--------------------------------------------------------------------------
    */
  protected priority: string[] = [];

  /*
    |--------------------------------------------------------------------------
    | Singleton Middleware
    |--------------------------------------------------------------------------
    */
  protected singletons: Set<string | Middleware> = new Set();
  protected singletonInstances: Map<string | Middleware, IMiddleware> = new Map();

  /*
    |--------------------------------------------------------------------------
    | Terminating Middleware
    |--------------------------------------------------------------------------
    */
  protected terminatingMiddleware: IMiddleware[] = [];

  /*
    |--------------------------------------------------------------------------
    | Global Middleware Methods
    |--------------------------------------------------------------------------
    */

  use(middleware: (string | MiddlewareEntry | Middleware)[]): this {
    this.globalMiddleware = middleware;
    return this;
  }

  prepend(middleware: string | MiddlewareEntry | Middleware): this {
    this.globalMiddleware.unshift(middleware);
    return this;
  }

  append(middleware: string | MiddlewareEntry | Middleware): this {
    this.globalMiddleware.push(middleware);
    return this;
  }

  remove(middleware: string | MiddlewareEntry | Middleware): this {
    this.globalMiddleware = this.globalMiddleware.filter((m) => m !== middleware);
    return this;
  }

  getGlobalMiddleware(): RequestHandler[] {
    return this.resolveMiddlewareStack(this.globalMiddleware);
  }

  /*
    |--------------------------------------------------------------------------
    | Middleware Group Methods
    |--------------------------------------------------------------------------
    */

  group(name: string, middleware: (string | MiddlewareEntry | Middleware)[]): this {
    this.groups.set(name, middleware);
    return this;
  }

  prependToGroup(groupName: string, middleware: string | MiddlewareEntry | Middleware): this {
    const group = this.groups.get(groupName) ?? [];
    group.unshift(middleware);
    this.groups.set(groupName, group);
    return this;
  }

  appendToGroup(groupName: string, middleware: string | MiddlewareEntry | Middleware): this {
    const group = this.groups.get(groupName) ?? [];
    group.push(middleware);
    this.groups.set(groupName, group);
    return this;
  }

  removeFromGroup(groupName: string, middleware: string | MiddlewareEntry | Middleware): this {
    const group = this.groups.get(groupName) ?? [];
    this.groups.set(
      groupName,
      group.filter((m) => m !== middleware),
    );
    return this;
  }

  getGroup(
    name: string,
    config?: Partial<MiddlewareGroupConfig>,
  ): (string | MiddlewareEntry | Middleware)[] {
    let group = [...(this.groups.get(name) ?? [])];

    if (config) {
      if (config.remove?.length) {
        group = group.filter((m) => !config.remove!.includes(m));
      }
      if (config.prepend?.length) {
        group = [...config.prepend, ...group];
      }
      if (config.append?.length) {
        group = [...group, ...config.append];
      }
    }

    return group;
  }

  getResolvedGroup(name: string, config?: Partial<MiddlewareGroupConfig>): RequestHandler[] {
    return this.resolveMiddlewareStack(this.getGroup(name, config));
  }

  hasGroup(name: string): boolean {
    return this.groups.has(name);
  }

  getGroupNames(): string[] {
    return Array.from(this.groups.keys());
  }

  /*
    |--------------------------------------------------------------------------
    | Middleware Alias Methods
    |--------------------------------------------------------------------------
    */

  alias(name: string, middleware: MiddlewareEntry | Middleware): this {
    this.aliases.set(name, middleware);
    return this;
  }

  aliasMany(aliases: Record<string, MiddlewareEntry | Middleware>): this {
    for (const [name, middleware] of Object.entries(aliases)) {
      this.alias(name, middleware);
    }
    return this;
  }

  getAlias(name: string): MiddlewareEntry | Middleware | undefined {
    return this.aliases.get(name);
  }

  hasAlias(name: string): boolean {
    return this.aliases.has(name);
  }

  getAliases(): Map<string, MiddlewareEntry | Middleware> {
    return new Map(this.aliases);
  }

  /*
    |--------------------------------------------------------------------------
    | Middleware Priority Methods
    |--------------------------------------------------------------------------
    */

  setPriority(priority: string[]): this {
    this.priority = priority;
    return this;
  }

  getPriority(): string[] {
    return [...this.priority];
  }

  sortByPriority(middleware: string[]): string[] {
    return middleware.sort((a, b) => {
      const aIndex = this.priority.indexOf(a);
      const bIndex = this.priority.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Singleton Middleware Methods
    |--------------------------------------------------------------------------
    */

  singleton(middleware: string | Middleware): this {
    this.singletons.add(middleware);
    return this;
  }

  isSingleton(middleware: string | Middleware): boolean {
    return this.singletons.has(middleware);
  }

  /*
    |--------------------------------------------------------------------------
    | Terminating Middleware Methods
    |--------------------------------------------------------------------------
    */

  terminate(middleware: IMiddleware): this {
    this.terminatingMiddleware.push(middleware);
    return this;
  }

  async runTerminatingMiddleware(req: Request, res: Response): Promise<void> {
    for (const middleware of this.terminatingMiddleware) {
      if (middleware.terminate) {
        await middleware.terminate(req, res);
      }
    }
  }

  getTerminatingMiddleware(): IMiddleware[] {
    return [...this.terminatingMiddleware];
  }

  /*
    |--------------------------------------------------------------------------
    | Resolution Methods
    |--------------------------------------------------------------------------
    */

  resolve(
    middleware: string | MiddlewareEntry | Middleware,
    args?: string[],
  ): RequestHandler | RequestHandler[] {
    if (typeof middleware === "string") {
      return this.resolveString(middleware);
    }

    if (typeof middleware === "function" && !this.isClass(middleware)) {
      if (args && args.length > 0) {
        return (middleware as (...a: string[]) => RequestHandler)(...args);
      }
      return middleware as RequestHandler;
    }

    if (this.isClass(middleware)) {
      const instance = this.instantiateMiddlewareClass(middleware as Middleware);
      if (instance.terminate) {
        this.terminate(instance);
      }
      return this.wrapMiddlewareInstance(instance);
    }

    throw new Error(`Invalid middleware type: ${typeof middleware}`);
  }

  protected resolveString(middleware: string): RequestHandler | RequestHandler[] {
    const [name, paramsStr] = middleware.split(":");
    const params = paramsStr ? paramsStr.split(",").map((s) => s.trim()) : [];

    if (this.hasGroup(name) && params.length === 0) {
      return this.getResolvedGroup(name);
    }

    if (this.hasAlias(name)) {
      return this.resolve(this.aliases.get(name)!, params);
    }

    throw new Error(`Unknown middleware: ${middleware}`);
  }

  resolveMiddlewareStack(stack: (string | MiddlewareEntry | Middleware)[]): RequestHandler[] {
    const resolved: RequestHandler[] = [];
    for (const middleware of stack) {
      const result = this.resolve(middleware);
      if (Array.isArray(result)) {
        resolved.push(...result);
      } else {
        resolved.push(result);
      }
    }
    return resolved;
  }

  protected instantiateMiddlewareClass(MiddlewareClass: Middleware): IMiddleware {
    if (this.isSingleton(MiddlewareClass)) {
      if (this.singletonInstances.has(MiddlewareClass)) {
        return this.singletonInstances.get(MiddlewareClass)!;
      }
      const instance = new MiddlewareClass();
      this.singletonInstances.set(MiddlewareClass, instance);
      return instance;
    }
    return new MiddlewareClass();
  }

  protected wrapMiddlewareInstance(instance: IMiddleware): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => instance.handle(req, res, next);
  }

  protected isClass(value: unknown): boolean {
    return (
      typeof value === "function" &&
      (value as { prototype?: { constructor?: unknown; handle?: unknown } }).prototype !== undefined &&
      (value as { prototype: { constructor?: unknown } }).prototype.constructor === value &&
      (value as { prototype: { handle?: unknown } }).prototype.handle !== undefined
    );
  }

  /*
    |--------------------------------------------------------------------------
    | Fluent Group Configurators
    |--------------------------------------------------------------------------
    */

  web(config?: Partial<MiddlewareGroupConfig> | ((stack: MiddlewareStack) => void)): this {
    if (typeof config === "function") {
      config(this);
      return this;
    }
    if (config?.middleware) {
      this.group("web", config.middleware);
    }
    return this;
  }

  api(config?: Partial<MiddlewareGroupConfig> | ((stack: MiddlewareStack) => void)): this {
    if (typeof config === "function") {
      config(this);
      return this;
    }
    if (config?.middleware) {
      this.group("api", config.middleware);
    }
    return this;
  }
}

// globalThis singleton — survives multiple versions of this module being loaded
// in the same process (e.g. when pnpm installs core@0.1.x and core@0.1.y for
// different sub-packages, they all share the same runtime stack).
const _STACK_KEY = "__lara_node_middleware_stack__";
if (!(globalThis as Record<string, unknown>)[_STACK_KEY]) {
  (globalThis as Record<string, unknown>)[_STACK_KEY] = new MiddlewareStack();
}
export const middlewareStack: MiddlewareStack = (
  globalThis as Record<string, unknown>
)[_STACK_KEY] as MiddlewareStack;
