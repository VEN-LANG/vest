import { RequestHandler, NextFunction, Request, Response } from "express";

export type MiddlewareEntry = RequestHandler | ((...args: any[]) => RequestHandler);
export type Middleware = new (...args: any[]) => IMiddleware;

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
  protected singletonInstances: Map<string | Middleware, any> = new Map();

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

  /**
   * Set global middleware stack.
   */
  use(middleware: (string | MiddlewareEntry | Middleware)[]): this {
    this.globalMiddleware = middleware;
    return this;
  }

  /**
   * Prepend middleware to global stack.
   */
  prepend(middleware: string | MiddlewareEntry | Middleware): this {
    this.globalMiddleware.unshift(middleware);
    return this;
  }

  /**
   * Append middleware to global stack.
   */
  append(middleware: string | MiddlewareEntry | Middleware): this {
    this.globalMiddleware.push(middleware);
    return this;
  }

  /**
   * Remove middleware from global stack.
   */
  remove(middleware: string | MiddlewareEntry | Middleware): this {
    this.globalMiddleware = this.globalMiddleware.filter((m) => m !== middleware);
    return this;
  }

  /**
   * Get resolved global middleware.
   */
  getGlobalMiddleware(): RequestHandler[] {
    return this.resolveMiddlewareStack(this.globalMiddleware);
  }

  /*
    |--------------------------------------------------------------------------
    | Middleware Group Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Define a middleware group.
   */
  group(name: string, middleware: (string | MiddlewareEntry | Middleware)[]): this {
    this.groups.set(name, middleware);
    return this;
  }

  /**
   * Prepend to a middleware group.
   */
  prependToGroup(groupName: string, middleware: string | MiddlewareEntry | Middleware): this {
    const group = this.groups.get(groupName) || [];
    group.unshift(middleware);
    this.groups.set(groupName, group);
    return this;
  }

  /**
   * Append to a middleware group.
   */
  appendToGroup(groupName: string, middleware: string | MiddlewareEntry | Middleware): this {
    const group = this.groups.get(groupName) || [];
    group.push(middleware);
    this.groups.set(groupName, group);
    return this;
  }

  /**
   * Remove from a middleware group.
   */
  removeFromGroup(groupName: string, middleware: string | MiddlewareEntry | Middleware): this {
    const group = this.groups.get(groupName) || [];
    this.groups.set(
      groupName,
      group.filter((m) => m !== middleware),
    );
    return this;
  }

  /**
   * Get middleware group with optional modifications.
   */
  getGroup(
    name: string,
    config?: Partial<MiddlewareGroupConfig>,
  ): (string | MiddlewareEntry | Middleware)[] {
    let group = [...(this.groups.get(name) || [])];

    if (config) {
      // Remove specified middleware
      if (config.remove && config.remove.length > 0) {
        group = group.filter((m) => !config.remove!.includes(m));
      }

      // Prepend middleware
      if (config.prepend && config.prepend.length > 0) {
        group = [...config.prepend, ...group];
      }

      // Append middleware
      if (config.append && config.append.length > 0) {
        group = [...group, ...config.append];
      }
    }

    return group;
  }

  /**
   * Get resolved middleware from a group.
   */
  getResolvedGroup(name: string, config?: Partial<MiddlewareGroupConfig>): RequestHandler[] {
    const group = this.getGroup(name, config);
    return this.resolveMiddlewareStack(group);
  }

  /**
   * Check if a group exists.
   */
  hasGroup(name: string): boolean {
    return this.groups.has(name);
  }

  /**
   * Get all group names.
   */
  getGroupNames(): string[] {
    return Array.from(this.groups.keys());
  }

  /*
    |--------------------------------------------------------------------------
    | Middleware Alias Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Register a middleware alias.
   */
  alias(name: string, middleware: MiddlewareEntry | Middleware): this {
    this.aliases.set(name, middleware);
    return this;
  }

  /**
   * Register multiple aliases at once.
   */
  aliasMany(aliases: Record<string, MiddlewareEntry | Middleware>): this {
    for (const [name, middleware] of Object.entries(aliases)) {
      this.alias(name, middleware);
    }
    return this;
  }

  /**
   * Get middleware by alias.
   */
  getAlias(name: string): MiddlewareEntry | Middleware | undefined {
    return this.aliases.get(name);
  }

  /**
   * Check if an alias exists.
   */
  hasAlias(name: string): boolean {
    return this.aliases.has(name);
  }

  /**
   * Get all aliases.
   */
  getAliases(): Map<string, MiddlewareEntry | Middleware> {
    return new Map(this.aliases);
  }

  /*
    |--------------------------------------------------------------------------
    | Middleware Priority Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Set middleware priority order.
   */
  setPriority(priority: string[]): this {
    this.priority = priority;
    return this;
  }

  /**
   * Get middleware priority.
   */
  getPriority(): string[] {
    return [...this.priority];
  }

  /**
   * Sort middleware by priority.
   */
  sortByPriority(middleware: string[]): string[] {
    return middleware.sort((a, b) => {
      const aIndex = this.priority.indexOf(a);
      const bIndex = this.priority.indexOf(b);

      // If both are in priority list, sort by priority
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is in priority list, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // Neither in priority list, maintain order
      return 0;
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Singleton Middleware Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Mark middleware as singleton (only instantiated once).
   */
  singleton(middleware: string | Middleware): this {
    this.singletons.add(middleware);
    return this;
  }

  /**
   * Check if middleware is a singleton.
   */
  isSingleton(middleware: string | Middleware): boolean {
    return this.singletons.has(middleware);
  }

  /*
    |--------------------------------------------------------------------------
    | Terminating Middleware Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Register terminating middleware that runs after response is sent.
   */
  terminate(middleware: IMiddleware): this {
    this.terminatingMiddleware.push(middleware);
    return this;
  }

  /**
   * Execute all terminating middleware.
   */
  async runTerminatingMiddleware(req: Request, res: Response): Promise<void> {
    for (const middleware of this.terminatingMiddleware) {
      if (middleware.terminate) {
        await middleware.terminate(req, res);
      }
    }
  }

  /**
   * Get terminating middleware.
   */
  getTerminatingMiddleware(): IMiddleware[] {
    return [...this.terminatingMiddleware];
  }

  /*
    |--------------------------------------------------------------------------
    | Resolution Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Resolve a single middleware entry to RequestHandler(s).
   */
  resolve(
    middleware: string | MiddlewareEntry | Middleware,
    args?: string[],
  ): RequestHandler | RequestHandler[] {
    // If it's a string, resolve alias or group
    if (typeof middleware === "string") {
      return this.resolveString(middleware);
    }

    // If it's already a function (RequestHandler), return it
    if (typeof middleware === "function" && !this.isClass(middleware)) {
      if (args && args.length > 0) {
        return (middleware as (...args: any[]) => RequestHandler)(...args);
      }
      return middleware as RequestHandler;
    }

    // If it's a class, instantiate it
    if (this.isClass(middleware)) {
      const instance = this.instantiateMiddlewareClass(middleware as Middleware);
      if (instance.terminate) {
        this.terminate(instance);
      }
      return this.wrapMiddlewareInstance(instance);
    }

    throw new Error(`Invalid middleware type: ${typeof middleware}`);
  }

  /**
   * Resolve a string middleware reference.
   */
  protected resolveString(middleware: string): RequestHandler | RequestHandler[] {
    // Check for parameters (e.g., 'role:admin,user' or 'can:edit_users')
    const [name, paramsStr] = middleware.split(":");
    const params = paramsStr ? paramsStr.split(",").map((s) => s.trim()) : [];

    // Check if it's a group
    if (this.hasGroup(name) && params.length === 0) {
      return this.getResolvedGroup(name);
    }

    // Check if it's an alias
    if (this.hasAlias(name)) {
      const aliased = this.aliases.get(name)!;
      return this.resolve(aliased, params);
    }

    throw new Error(`Unknown middleware: ${middleware}`);
  }

  /**
   * Resolve a stack of middleware.
   */
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

  /**
   * Instantiate a middleware class.
   */
  protected instantiateMiddlewareClass(MiddlewareClass: Middleware): IMiddleware {
    // Check singleton cache
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

  /**
   * Wrap a middleware instance into a RequestHandler.
   */
  protected wrapMiddlewareInstance(instance: IMiddleware): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      return instance.handle(req, res, next);
    };
  }

  /**
   * Check if a value is a class constructor.
   */
  protected isClass(value: any): boolean {
    return (
      typeof value === "function" &&
      value.prototype &&
      value.prototype.constructor === value &&
      value.prototype.handle !== undefined
    );
  }

  /*
    |--------------------------------------------------------------------------
    | Fluent Configuration Builder
    |--------------------------------------------------------------------------
    */

  /**
   * Configure the 'web' middleware group.
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

  /**
   * Configure the 'api' middleware group.
   */
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

// Export singleton instance
export const middlewareStack = new MiddlewareStack();
