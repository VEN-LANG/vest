import { ServiceProvider } from "@lara-node/core";
import { ExampleService } from "./ExampleService.js";

/*
|--------------------------------------------------------------------------
| Example Service Provider
|--------------------------------------------------------------------------
|
| Apps wire your package into their lifecycle by registering this provider
| (e.g. in AppServiceProvider.additionalProviders). register() binds services
| into the container; boot() runs once all providers are registered — use it
| for cross-package wiring (registering jobs, listeners, routes, etc.).
|
*/

export class ExampleServiceProvider extends ServiceProvider {
  register(): void {
    // Bind the service as a container singleton so the whole app shares one instance.
    this.singleton(ExampleService);
  }

  boot(): void {
    // Cross-package wiring goes here. Runs after every provider has registered.
  }
}
