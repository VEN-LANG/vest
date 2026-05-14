/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

import { AuthController } from "@app/Http/Controllers/User/AuthController";
import { UserController } from "@app/Http/Controllers/User/UserController";
import { RoleController } from "@app/Http/Controllers/User/RoleController";
import { PermissionController } from "@app/Http/Controllers/User/PermissionController";
import RouterBuilder from "@vest/router";
import { FileController, multerUpload } from "@app/Http/Controllers/File/FileController";

export const routesBuilder = new RouterBuilder();
const rb = routesBuilder;

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/
rb.prefix("/auth").group((g: RouterBuilder) => {
  g.post("/register", [AuthController, "register"]);
  g.post("/register/:user_type", [AuthController, "register"]);
  g.post("/login", [AuthController, "login"]);
  g.get("/me", "auth", [AuthController, "me"]);
});

/*
|--------------------------------------------------------------------------
| User Routes
|--------------------------------------------------------------------------
*/
rb.prefix("/users")
  .middleware(["auth", "must-be-active"])
  .group((g: RouterBuilder) => {
    g.get("/", "can:view_users", [UserController, "index"]);
    g.get("/:id", "can:view_users", [UserController, "show"]);
    g.get("/:id/profile", [UserController, "showProfile"]);
    g.post("/", "can:create_users", [UserController, "store"]);
    g.put("/:id", "can:update_users", [UserController, "update"]);
    g.put("/:id/profile", [UserController, "updateProfile"]);
    g.post("/:id/password", "can:update_users", [UserController, "setPassword"]);
    g.post("/:id/password/reset", [UserController, "resetPassword"]);
    g.post("/:id/roles", "can:add_roles_to_users", [UserController, "addRole"]);
    g.delete("/:id/roles/:roleId", "can:remove_roles_from_users", [UserController, "removeRole"]);
    g.delete("/:id", "can:delete_users", [UserController, "destroy"]);
    g.patch("/:user/status", "can:activate_and_deactivate_users", [UserController, "toggleStatus"]);
  });

/*
|--------------------------------------------------------------------------
| Role Routes
|--------------------------------------------------------------------------
*/
rb.prefix("/roles")
  .middleware(["auth", "must-be-active"])
  .group((g: RouterBuilder) => {
    g.get("/", "can:view_roles", [RoleController, "index"]);
    g.get("/:role", "can:view_roles", [RoleController, "show"]);
    g.post("/", "can:create_roles", [RoleController, "store"]);
    g.put("/:id", "can:update_roles", [RoleController, "update"]);
    g.delete("/:id", "can:delete_roles", [RoleController, "destroy"]);
    g.post("/:id/permissions", "can:add_permissions_to_roles", [RoleController, "syncPermissions"]);
  });

/*
|--------------------------------------------------------------------------
| Permission Routes
|--------------------------------------------------------------------------
*/
rb.prefix("/permissions")
  .middleware(["auth", "must-be-active"])
  .group((g: RouterBuilder) => {
    g.get("/", "can:view_permissions", [PermissionController, "index"]);
    g.get("/:id", "can:view_permissions", [PermissionController, "show"]);
  });

/*
|--------------------------------------------------------------------------
| File Routes
|--------------------------------------------------------------------------
*/
rb.prefix("/files")
  .middleware(["auth", "must-be-active"])
  .group((g: RouterBuilder) => {
    g.get("/", "can:view_files", [FileController, "index"]);
    g.get("/:id", "can:view_files", [FileController, "show"]);
    g.get("/:id/download", "can:view_files", [FileController, "download"]);
    g.get("/:id/view", "can:view_files", [FileController, "view"]);
    g.post("/", multerUpload.single("file") as any, "can:upload_files", [FileController, "store"]);
    g.post("/raw", "can:upload_files", [FileController, "storeRaw"]);
    g.get("/:id/signed-url", "can:view_files", [FileController, "signedUrl"]);
    g.get("/:id/signed-thumbnail", "can:view_files", [FileController, "signedThumbnailUrl"]);
    g.delete("/:id", "can:delete_files", [FileController, "destroy"]);
    g.get("/:id/thumbnail", "can:view_files", [FileController, "thumbnail"]);
    g.post("/:id/thumbnail/regenerate", "can:upload_files", [
      FileController,
      "regenerateThumbnail",
    ]);
  });

export default rb;
