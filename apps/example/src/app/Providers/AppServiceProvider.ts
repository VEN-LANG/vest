import { ServiceProvider } from "@vest/core";
import { AuthService } from "../Services/AuthService.js";
import { UserService } from "../Services/UserService.js";
import { RoleService } from "../Services/RoleService.js";
import { PermissionService } from "../Services/PermissionService.js";
import { FileService } from "../Services/FileService.js";

/**
 * AppServiceProvider
 *
 * Register YOUR application's services here. Framework services (DB, Cache,
 * Events, Queue, Mail, Broadcasting) are registered separately in bootstrap/app.ts.
 */
export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton(AuthService);
    this.singleton(UserService);
    this.singleton(RoleService);
    this.singleton(PermissionService);
    this.singleton(FileService);
  }

  boot(): void {}
}
