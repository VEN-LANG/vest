import { ServiceProvider } from "@lara-node/core";
import { AuthService } from "../Services/AuthService.js";
import { UserService } from "../Services/UserService.js";
import { RoleService } from "../Services/RoleService.js";
import { PermissionService } from "../Services/PermissionService.js";
import { FileService } from "../Services/FileService.js";
import { AuthController } from "../Http/Controllers/User/AuthController.js";
import { UserController } from "../Http/Controllers/User/UserController.js";
import { RoleController } from "../Http/Controllers/User/RoleController.js";
import { PermissionController } from "../Http/Controllers/User/PermissionController.js";
import { FileController } from "../Http/Controllers/File/FileController.js";

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton(AuthService);
    this.singleton(UserService);
    this.singleton(RoleService);
    this.singleton(PermissionService);
    this.singleton(FileService);
  }

  boot(): void {
    // Explicit controller wiring — tsx (esbuild) doesn't emit decorator metadata
    // so the container can't auto-resolve constructor params via reflection.
    const c = this.container;
    c.instance(AuthController, new AuthController(c.make(AuthService), c.make(UserService)));
    c.instance(UserController, new UserController(c.make(UserService)));
    c.instance(RoleController, new RoleController(c.make(RoleService)));
    c.instance(PermissionController, new PermissionController(c.make(PermissionService)));
    c.instance(FileController, new FileController(c.make(FileService)));
  }
}
