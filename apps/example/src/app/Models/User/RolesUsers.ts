import { Model, use } from "@vest/db";
import { SoftDeletes } from "@vest/db";
import Role from "./Role";
import User from "./User";

@use(SoftDeletes)
export class RolesUsers extends Model {
  static table = "roles_users";
  static primaryKey = "id";
  static timestamps = true;

  static fillable = ["roles_id", "users_id", "created_at", "updated_at", "deleted_at"];
  static casts = {
    // id: 'int',
    created_at: "datetime",
    updated_at: "datetime",
    deleted_at: "datetime",
  } as any;

  role() {
    return this.belongsTo(Role, "roles_id", "id");
  }

  user() {
    return this.belongsTo(User, "users_id", "id");
  }
}
