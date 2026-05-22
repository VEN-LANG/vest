import { ServiceProvider, ServiceProviderClass } from '@lara-node/core';
import { AuthService, UserService, RoleService, PermissionService, FileService } from '@app/Services/index';
import { AuthController } from '../Http/Controllers/User/AuthController';
import { UserController } from '../Http/Controllers/User/UserController';
import { RoleController } from '../Http/Controllers/User/RoleController';
import { PermissionController } from '../Http/Controllers/User/PermissionController';
import { FileController } from '../Http/Controllers/File/FileController';
import { PermissionsSyncCommand, PermissionsListCommand } from '../Console/Commands/PermissionCommands';
import { ConfigServiceProvider } from './ConfigServiceProvider';
import { DatabaseServiceProvider } from '@lara-node/db';
import { CacheServiceProvider } from '@lara-node/cache';
import { MiddlewareServiceProvider } from './MiddlewareServiceProvider';
import { RouteServiceProvider } from './RouteServiceProvider';
import { DocServiceProvider } from '@lara-node/router';
import { EventServiceProvider } from './EventServiceProvider';
import { BroadcastServiceProvider } from './BroadcastServiceProvider';
import { QueueServiceProvider } from './QueueServiceProvider';

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
  ];

  register(): void {
    this.registerProviders(this.additionalProviders);

    this.singleton(AuthService);
    this.singleton(UserService);
    this.singleton(RoleService);
    this.singleton(PermissionService);
    this.singleton(FileService);
    this.singleton(AuthController);
    this.singleton(UserController);
    this.singleton(RoleController);
    this.singleton(PermissionController);
    this.singleton(FileController);
    this.singleton(PermissionsSyncCommand);
    this.singleton(PermissionsListCommand);
  }

  boot(): void {}
}
