import express, { Application as ExpressApp, ErrorRequestHandler, RequestHandler } from "express";
import { createServer, Server as HttpServer } from "http";
import cors from "cors";
import { Container } from "./Container.js";
import type { ServiceProvider, ServiceProviderClass } from "./ServiceProvider.js";
import { getRegisteredProviders } from "./decorators.js";

export class Application {
  private providers: ServiceProvider[] = [];
  private loadedProviders: Map<string, ServiceProvider> = new Map();
  private deferredServices: Map<string, ServiceProviderClass> = new Map();
  private booted = false;
  private expressApp: ExpressApp;
  private httpServer: HttpServer | null = null;

  constructor(public container: Container) {
    this.expressApp = express();
  }

  // ---------------------------------------------------------------------------
  // Service Providers
  // ---------------------------------------------------------------------------

  register(provider: ServiceProviderClass, force = false): ServiceProvider {
    const name = provider.name;
    if (!force && this.loadedProviders.has(name)) {
      return this.loadedProviders.get(name)!;
    }

    const instance = new provider(this);
    this.markAsRegistered(instance);

    if (this.booted) {
      void this.bootProvider(instance);
    }

    return instance;
  }

  protected markAsRegistered(provider: ServiceProvider): void {
    this.providers.push(provider);
    this.loadedProviders.set(provider.constructor.name, provider);
    provider.register();
  }

  registerDeferredProvider(provider: ServiceProviderClass): void {
    const instance = new provider(this);
    for (const service of instance.provides()) {
      this.deferredServices.set(service, provider);
    }
  }

  loadDeferredProvider(service: string): void {
    if (!this.deferredServices.has(service)) return;
    const provider = this.deferredServices.get(service)!;
    this.deferredServices.delete(service);
    this.register(provider);
  }

  make<T>(abstract: string | (new (...args: any[]) => T)): T {
    const key = typeof abstract === "string" ? abstract : abstract.name;
    if (this.deferredServices.has(key)) this.loadDeferredProvider(key);
    return this.container.make<T>(abstract as any);
  }

  async boot(): Promise<void> {
    if (this.booted) return;

    for (const provider of this.providers) await provider.callBootingCallbacks();
    for (const provider of this.providers) await this.bootProvider(provider);
    for (const provider of this.providers) await provider.callBootedCallbacks();

    this.booted = true;
  }

  protected async bootProvider(provider: ServiceProvider): Promise<void> {
    await provider.boot();
  }

  /**
   * Register all service providers decorated with @Provider() in the order
   * their modules were first loaded (i.e. import order in bootstrap).
   */
  discoverProviders(): void {
    for (const provider of getRegisteredProviders()) {
      this.register(provider);
    }
  }

  getProviders(): ServiceProvider[] {
    return this.providers;
  }

  getProvider(cls: ServiceProviderClass): ServiceProvider | undefined {
    return this.loadedProviders.get(cls.name);
  }

  isBooted(): boolean {
    return this.booted;
  }

  getDeferredServices(): Map<string, ServiceProviderClass> {
    return this.deferredServices;
  }

  // ---------------------------------------------------------------------------
  // Express / HTTP
  // ---------------------------------------------------------------------------

  getExpressApp(): ExpressApp {
    return this.expressApp;
  }

  useMiddleware(middleware: RequestHandler): void {
    this.expressApp.use(middleware);
  }

  useMiddlewares(middlewares: RequestHandler[]): void {
    for (const mw of middlewares) this.expressApp.use(mw);
  }

  mountRoutes(prefix: string, router: any): void {
    this.expressApp.use(prefix, router);
  }

  configureBaseMiddleware(): void {
    this.expressApp.use(cors());
    this.expressApp.use(express.json());
    this.expressApp.use(express.urlencoded({ extended: true }));
  }

  configure404Handler(): void {
    this.expressApp.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl}`,
      });
    });
  }

  configureErrorHandler(handler: ErrorRequestHandler): void {
    this.expressApp.use(handler);
  }

  getHttpServer(): HttpServer | null {
    return this.httpServer;
  }

  createHttpServer(): HttpServer {
    if (!this.httpServer) {
      this.httpServer = createServer(this.expressApp);
    }
    return this.httpServer;
  }

  listen(port: number | string, callback?: () => void): void {
    this.createHttpServer().listen(port, callback);
  }
}
