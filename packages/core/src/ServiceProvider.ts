import type { Application } from "./Application.js";
import type { Abstract } from "./Container.js";
import { middlewareStack, registerMiddleware } from "./middleware.js";
import type { MiddlewareEntry, Middleware, MiddlewareStack as IMiddlewareStack } from "./MiddlewareStack.js";
import { config as globalConfig, setConfig } from "./Config.js";

export type ServiceProviderClass = new (app: Application) => ServiceProvider;

export abstract class ServiceProvider {
  /*
    |--------------------------------------------------------------------------
    | Lifecycle Callbacks
    |--------------------------------------------------------------------------
    */
  protected bootingCallbacks: Array<() => void | Promise<void>> = [];
  protected bootedCallbacks: Array<() => void | Promise<void>> = [];

  constructor(protected app: Application) {}

  /*
    |--------------------------------------------------------------------------
    | Container Access
    |--------------------------------------------------------------------------
    */
  protected get container() {
    return this.app.container;
  }

  /*
    |--------------------------------------------------------------------------
    | Registration
    |--------------------------------------------------------------------------
    */
  abstract register(): void;

  singleton<T>(abstract: Abstract<T>, concrete: Abstract<T> = abstract): void {
    this.container.singleton(abstract, concrete);
  }

  boot(): void | Promise<void> {}

  protected registerProvider(provider: ServiceProviderClass): ServiceProvider {
    return this.app.register(provider);
  }

  protected registerProviders(providers: ServiceProviderClass[]): void {
    for (const p of providers) this.registerProvider(p);
  }

  /*
    |--------------------------------------------------------------------------
    | Lifecycle Hooks
    |--------------------------------------------------------------------------
    */
  booting(callback: () => void | Promise<void>): void {
    this.bootingCallbacks.push(callback);
  }

  booted(callback: () => void | Promise<void>): void {
    this.bootedCallbacks.push(callback);
  }

  async callBootingCallbacks(): Promise<void> {
    for (const cb of this.bootingCallbacks) await cb();
  }

  async callBootedCallbacks(): Promise<void> {
    for (const cb of this.bootedCallbacks) await cb();
  }

  /*
    |--------------------------------------------------------------------------
    | Middleware Registration (Laravel-style)
    |--------------------------------------------------------------------------
    */

  /**
   * Register a single middleware alias.
   *
   * @example
   * this.middlewareAlias('auth', authMiddleware);
   * this.middlewareAlias('can', (...perms) => authorizePermissions(...perms));
   */
  protected middlewareAlias(name: string, middleware: MiddlewareEntry | Middleware): this {
    registerMiddleware(name, middleware);
    return this;
  }

  /**
   * Register multiple middleware aliases at once.
   *
   * @example
   * this.middlewareAliases({
   *   auth: authMiddleware,
   *   can: (...perms) => authorizePermissions(...perms),
   *   role: (...roles) => authorizeRoles(...roles),
   * });
   */
  protected middlewareAliases(aliases: Record<string, MiddlewareEntry | Middleware>): this {
    for (const [name, mw] of Object.entries(aliases)) {
      this.middlewareAlias(name, mw);
    }
    return this;
  }

  /**
   * Define a middleware group.
   *
   * @example
   * this.middlewareGroup('api', ['throttle:120,1', 'auth']);
   */
  protected middlewareGroup(
    name: string,
    middleware: (string | MiddlewareEntry | Middleware)[],
  ): this {
    middlewareStack.group(name, middleware);
    return this;
  }

  /**
   * Append middleware to a group.
   */
  protected appendMiddlewareToGroup(
    groupName: string,
    middleware: string | MiddlewareEntry | Middleware,
  ): this {
    middlewareStack.appendToGroup(groupName, middleware);
    return this;
  }

  /**
   * Prepend middleware to a group.
   */
  protected prependMiddlewareToGroup(
    groupName: string,
    middleware: string | MiddlewareEntry | Middleware,
  ): this {
    middlewareStack.prependToGroup(groupName, middleware);
    return this;
  }

  /**
   * Remove middleware from a group.
   */
  protected removeMiddlewareFromGroup(
    groupName: string,
    middleware: string | MiddlewareEntry | Middleware,
  ): this {
    middlewareStack.removeFromGroup(groupName, middleware);
    return this;
  }

  /**
   * Set middleware priority (execution order for named middleware).
   *
   * @example
   * this.middlewarePriority(['auth', 'must-be-active', 'can', 'role']);
   */
  protected middlewarePriority(priority: string[]): this {
    middlewareStack.setPriority(priority);
    return this;
  }

  /**
   * Mark a middleware class as singleton (instantiated only once).
   */
  protected singletonMiddleware(middleware: string | Middleware): this {
    middlewareStack.singleton(middleware);
    return this;
  }

  /**
   * Access the raw middleware stack for advanced configuration.
   */
  protected get middlewareStack(): IMiddlewareStack {
    return middlewareStack;
  }

  /*
    |--------------------------------------------------------------------------
    | Config Access
    |--------------------------------------------------------------------------
    */

  /**
   * Get a config value using dot notation.
   *
   * @example
   * this.config('mail.default')         // → 'smtp'
   * this.config('app.name', 'MyApp')    // → value or fallback
   */
  protected config<T = unknown>(key: string, defaultValue?: T): T {
    return globalConfig<T>(key, defaultValue);
  }

  /**
   * Register a config namespace (or override a package default).
   *
   * @example
   * this.setConfig('mail', myMailConfig);
   */
  protected setConfig(key: string, value: Record<string, unknown> | unknown[]): void {
    setConfig(key, value);
  }

  /*
    |--------------------------------------------------------------------------
    | Deferred Services
    |--------------------------------------------------------------------------
    */
  provides(): string[] {
    return [];
  }

  when(): string[] {
    return [];
  }

  isDeferred(): boolean {
    return this.provides().length > 0;
  }
}
