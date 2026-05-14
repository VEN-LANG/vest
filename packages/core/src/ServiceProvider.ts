import type { Application } from "./Application.js";
import type { Abstract } from "./Container.js";

export type ServiceProviderClass = new (app: Application) => ServiceProvider;

export abstract class ServiceProvider {
  protected bootingCallbacks: Array<() => void | Promise<void>> = [];
  protected bootedCallbacks: Array<() => void | Promise<void>> = [];

  constructor(protected app: Application) {}

  protected get container() {
    return this.app.container;
  }

  abstract register(): void;

  singleton<T>(abstract: Abstract<T>, concrete: any = abstract): void {
    this.container.singleton(abstract, concrete);
  }

  boot(): void | Promise<void> {}

  protected registerProvider(provider: ServiceProviderClass): ServiceProvider {
    return this.app.register(provider);
  }

  protected registerProviders(providers: ServiceProviderClass[]): void {
    for (const p of providers) this.registerProvider(p);
  }

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
