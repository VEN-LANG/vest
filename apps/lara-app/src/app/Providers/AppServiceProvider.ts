import { ServiceProvider, ServiceProviderClass } from '@lara-node/core';
import { DatabaseServiceProvider } from '@lara-node/db';
import { HorizonServiceProvider } from '@lara-node/horizon';
import { TelescopeServiceProvider } from '@lara-node/telescope';
import { DocServiceProvider } from '@lara-node/router';
import { ConfigServiceProvider } from './ConfigServiceProvider';
import { MiddlewareServiceProvider } from './MiddlewareServiceProvider';
import { RouteServiceProvider } from './RouteServiceProvider';
import { EventServiceProvider } from './EventServiceProvider';
import { QueueServiceProvider } from './QueueServiceProvider';
import { GreetCommand } from '../Console/Commands/GreetCommand';

export class AppServiceProvider extends ServiceProvider {
  protected additionalProviders: ServiceProviderClass[] = [
    ConfigServiceProvider,
    DatabaseServiceProvider,
    MiddlewareServiceProvider,
    TelescopeServiceProvider,
    RouteServiceProvider,
    DocServiceProvider,
    EventServiceProvider,
    QueueServiceProvider,
    HorizonServiceProvider,
  ];

  register(): void {
    this.registerProviders(this.additionalProviders);
    this.singleton(GreetCommand);
  }

  boot(): void {}
}
