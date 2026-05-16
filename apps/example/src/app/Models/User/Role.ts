import { Model, use } from "@lara-node/db";
import Permission from "./Permission";
import { SoftDeletes } from "@lara-node/db";
import { Sluggable } from "@lara-node/db";

@use(SoftDeletes, Sluggable)
export class Role extends Model {
  static fillable = ["name", "slug", "description", "created_at", "updated_at", "deleted_at"];
  static hidden: string[] = [];
  static casts = {
    // id: 'int',
    created_at: "datetime",
    updated_at: "datetime",
    deleted_at: "datetime",
  } as any;

  permissions() {
    return this.belongsToMany(Permission, "permissions_roles", "roles_id", "permissions_id");
  }

  // static relationships = {
  //   users: { type: 'belongsToMany', model: User, table: ['roles','users'].sort().join('_') }, // roles_users
  //   // permissions: { type: 'belongsToMany', model: Permission, table: ['permissions','roles'].sort().join('_') } // permissions_roles
  // } as any;
}

export default Role;
