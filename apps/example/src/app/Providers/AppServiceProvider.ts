import { ServiceProvider, ServiceProviderClass } from '@lara-node/core';
import { AuthService, UserService, RoleService, PermissionService, FileService } from '@app/Services/index';
import { ConfigServiceProvider } from './ConfigServiceProvider';
import { DatabaseServiceProvider } from '@lara-node/db';
import { CacheServiceProvider } from '@lara-node/cache';
import { MiddlewareServiceProvider } from './MiddlewareServiceProvider';
import { RouteServiceProvider } from './RouteServiceProvider';
import { DocServiceProvider } from '@lara-node/router';
import { EventServiceProvider } from './EventServiceProvider';
import { BroadcastServiceProvider } from './BroadcastServiceProvider';
import { QueueServiceProvider } from './QueueServiceProvider';
import { HorizonServiceProvider } from '@lara-node/horizon';
import { TelescopeServiceProvider } from '@lara-node/telescope';

export class AppServiceProvider extends ServiceProvider {
  /*
  |--------------------------------------------------------------------------
  | Additional Providers
  |--------------------------------------------------------------------------
  |
  | Order matters:
  |   1. ConfigServiceProvider — loads app config files, overrides package defaults
  |   2. MiddlewareServiceProvider — registers aliases ('auth', 'can', 'role')
  |   3. RouteServiceProvider — boots route files (needs middleware aliases ready)
  |
  */
  protected additionalProviders: ServiceProviderClass[] = [
        ConfigServiceProvider,
    DatabaseServiceProvider,
    CacheServiceProvider,
    MiddlewareServiceProvider,
    RouteServiceProvider,
    DocServiceProvider,
    EventServiceProvider,
    BroadcastServiceProvider,
    QueueServiceProvider,
    HorizonServiceProvider,
    TelescopeServiceProvider,
  ];

  register(): void {
    this.registerProviders(this.additionalProviders);

    this.singleton(AuthService);
    this.singleton(UserService);
    this.singleton(RoleService);
    this.singleton(PermissionService);
    this.singleton(FileService);
  }

  boot(): void {}
}
