import { Model, use } from "@vest-ts/db";
import Role from "./Role";
import Permission from "./Permission";
import { SoftDeletes } from "@vest-ts/db";

@use(SoftDeletes)
export class PermissionsRoles extends Model {
  static table = "permissions_roles";
  static primaryKey = "id";
  static timestamps = true;

  static fillable = ["permissions_id", "roles_id", "created_at", "updated_at", "deleted_at"];

  static casts = {
    // id: 'int',
    created_at: "datetime",
    updated_at: "datetime",
    deleted_at: "datetime",
  } as any;

  permission() {
    return this.belongsTo(Permission, "permissions_id", "id");
  }

  role() {
    return this.belongsTo(Role, "roles_id", "id");
  }
}

export default PermissionsRoles;
