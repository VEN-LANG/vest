import fs from "fs";
import path from "path";
import type { Application } from "./Application.js";
import type { Abstract } from "./Container.js";
import { middlewareStack, registerMiddleware } from "./middleware.js";
import type {
  MiddlewareEntry,
  Middleware,
  MiddlewareStack as IMiddlewareStack,
} from "./MiddlewareStack.js";
import {
  config as globalConfig,
  setConfig,
  mergeConfig,
  cacheConfig as cacheConfigSnapshot,
} from "./Config.js";

export type ServiceProviderClass = new (app: Application) => ServiceProvider;

/**
 * Minimal interface that describes an Artisan command constructor.
 * Only requires handle() so that protected members like signature/description
 * on the Command base class do not cause TS2322 assignability errors.
 *
 * @example
 * commands(): CommandClass[] {
 *   return [MigrateCommand, DbSeedCommand];
 * }
 */
export type CommandClass = new (...args: never[]) => {
  handle(...args: unknown[]): Promise<void>;
};

export abstract class ServiceProvider {
  /*
    |--------------------------------------------------------------------------
    | Lifecycle Callbacks
    |--------------------------------------------------------------------------
    */
  protected bootingCallbacks: Array<() => void | Promise<void>> = [];
  protected bootedCallbacks: Array<() => void | Promise<void>> = [];

  /** Callbacks to fire after a specific abstract is resolved from the container. */
  private afterResolvingCallbacks: Map<string, Array<(instance: unknown) => void>> = new Map();

  /** Migration paths registered by this provider. */
  private _migrationPaths: string[] = [];

  /** Config files registered via mergeConfigFrom(). */
  private _configFiles: Array<{ key: string; path: string }> = [];

  constructor(protected app: Application) {}

  /*
    |--------------------------------------------------------------------------
    | Container Access
    |--------------------------------------------------------------------------
    */
  protected get container() {
    return this.app.container;
  }

  /**
   * Resolve an abstract from the container with full return-type inference.
   *
   * @example
   * const mailer = this.make(MailService);
   * const cfg = this.make<Record<string,unknown>>('config');
   */
  protected make<T>(abstract: Abstract<T> | string): T {
    return this.app.make<T>(abstract as Abstract<T>);
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

  /**
   * Register a callback to be invoked each time the given abstract is resolved.
   *
   * @example
   * this.callAfterResolving(MailService, (mailer) => {
   *   (mailer as MailService).setFromAddress('noreply@example.com');
   * });
   */
  protected callAfterResolving(abstract: Abstract<unknown> | string, callback: (instance: unknown) => void): void {
    const key = typeof abstract === "string" ? abstract : abstract.name ?? String(abstract);
    const existing = this.afterResolvingCallbacks.get(key) ?? [];
    existing.push(callback);
    this.afterResolvingCallbacks.set(key, existing);
  }

  /** @internal — called by the Application after each container resolution. */
  runAfterResolvingCallbacks(key: string, instance: unknown): void {
    const callbacks = this.afterResolvingCallbacks.get(key) ?? [];
    for (const cb of callbacks) cb(instance);
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

  /**
   * Merge a config file into an existing namespace. Package defaults are set
   * first; application values win on conflict (deep merge).
   *
   * @example
   * // In a package ServiceProvider:
   * this.mergeConfigFrom(path.join(__dirname, '../config/mail.config.js'), 'mail');
   */
  protected mergeConfigFrom(configPath: string, key: string): void {
    this._configFiles.push({ key, path: configPath });
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded: unknown = require(configPath);
      const value = (loaded as { default?: unknown }).default ?? loaded;
      mergeConfig(key, value as Record<string, unknown>);
    } catch {
      /* skip if file not found during development */
    }
  }

  /**
   * Crawl an application config directory and register every `*.config.{ts,js}`
   * file as a config namespace (filename minus the `.config` suffix). Whatever a
   * file default-exports becomes `config('<name>')`, overriding package defaults.
   *
   * Application ConfigServiceProviders call this instead of importing and
   * `setConfig`-ing each file by hand. Package providers should keep their own
   * bundled defaults as the `config('<key>', packageDefault)` fallback.
   *
   * When `persist` is true (default) the resolved snapshot is written to the
   * config cache backend (if one is wired) for faster cross-process retrieval.
   *
   * @example
   * this.loadConfigDir(path.join(__dirname, "../../config"));
   */
  protected loadConfigDir(dir: string, persist: boolean = true): void {
    if (!fs.existsSync(dir)) return;
    const seen = new Set<string>();
    for (const file of fs.readdirSync(dir)) {
      const match = file.match(/^(.+?)\.config\.(?:ts|js|cjs|mjs)$/);
      if (!match) continue;
      const key = match[1];
      if (seen.has(key)) continue; // prefer the first (e.g. .ts in dev, .js in dist)
      seen.add(key);
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const loaded: unknown = require(path.join(dir, file));
        const value = (loaded as { default?: unknown }).default ?? loaded;
        this.setConfig(key, value as Record<string, unknown>);
      } catch {
        /* skip files that fail to load */
      }
    }
    if (persist) void cacheConfigSnapshot();
  }

  /*
    |--------------------------------------------------------------------------
    | Migrations
    |--------------------------------------------------------------------------
    */

  /**
   * Register a directory of migration files with the framework.
   * Called in register() or boot() of any package ServiceProvider.
   *
   * @example
   * this.loadMigrationsFrom(path.join(__dirname, '../migrations'));
   */
  protected loadMigrationsFrom(migrationsPath: string): void {
    if (!fs.existsSync(migrationsPath)) return;
    this._migrationPaths.push(path.resolve(migrationsPath));
    // Notify the app so the migration runner can discover these paths
    const existing: string[] = (this.app as unknown as Record<string, unknown>)["_migrationPaths"] as string[] ?? [];
    existing.push(path.resolve(migrationsPath));
    (this.app as unknown as Record<string, unknown>)["_migrationPaths"] = existing;
  }

  /** Return the migration paths registered by this provider. */
  getMigrationPaths(): string[] {
    return this._migrationPaths;
  }

  /*
    |--------------------------------------------------------------------------
    | Commands
    |--------------------------------------------------------------------------
    |
    | Return command constructors this provider contributes. The console Kernel
    | collects these automatically so commands can live next to the feature
    | that owns them rather than all being shipped in the console module.
    |
    | @example
    | commands(): Array<new () => unknown> {
    |   return [SyncPermissionsCommand, ImportDataCommand];
    | }
    */
  commands(): CommandClass[] {
    return [];
  }

  /*
    |--------------------------------------------------------------------------
    | Publishable Resources (Laravel-style vendor:publish)
    |--------------------------------------------------------------------------
    |
    | Declare files this package/provider makes available for publishing into
    | the consuming application. Supports any package — not just @lara-node/*.
    |
    | @example
    | static publishes(): Array<{ tag: string; from: string; to: string }> {
    |   return [
    |     { tag: 'config', from: 'config/mail.config.ts', to: 'config/mail.config.ts' },
    |     { tag: 'migrations', from: 'migrations/001_create_mails.ts', to: 'database/migrations/001_create_mails.ts' },
    |   ];
    | }
    */
  static publishes(): Array<{ tag: string; from: string; to: string }> {
    return [];
  }

  /*
    |--------------------------------------------------------------------------
    | Deferred Services
    |--------------------------------------------------------------------------
    |
    | A deferred provider is only registered/booted when one of its provided
    | bindings is actually requested from the container — not on every request.
    |
    | @example
    | provides(): string[] {
    |   return ['MailService', 'Mail'];
    | }
    |
    | when(): string[] {
    |   return ['MailService'];  // boot only when MailService is first resolved
    | }
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
