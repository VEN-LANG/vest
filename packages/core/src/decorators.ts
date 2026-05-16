import type { ServiceProviderClass } from "./ServiceProvider.js";

const providerRegistry: ServiceProviderClass[] = [];

/**
 * Returns all service provider classes registered via @Provider().
 * Called by Application.discoverProviders() during bootstrap.
 */
export function getRegisteredProviders(): ServiceProviderClass[] {
  return providerRegistry;
}

/**
 * @Provider()
 *
 * Class decorator that auto-registers a ServiceProvider for discovery.
 * After decorating, call `app.discoverProviders()` in your bootstrap to
 * register all decorated providers in the order their modules were loaded.
 *
 * Registration order = module load order, so import providers in the
 * correct sequence in your bootstrap file.
 *
 * @example
 * import { ServiceProvider, Provider } from '@lara-node/core';
 *
 * @Provider()
 * export class AppServiceProvider extends ServiceProvider {
 *   register() { ... }
 * }
 *
 * // In bootstrap/app.ts:
 * import './app/Providers/AppServiceProvider';    // loads → @Provider fires
 * import './app/Providers/RouteServiceProvider';  // loads → @Provider fires
 * app.discoverProviders();                        // registers all of them
 */
export function Provider(): ClassDecorator {
  return (target: any) => {
    if (!providerRegistry.includes(target)) {
      providerRegistry.push(target as ServiceProviderClass);
    }
  };
}
