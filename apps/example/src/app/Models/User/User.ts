import { Model, use } from "@vest/db";
import Role from "./Role";
import FileModel from "@app/Models/File/File";
import UserProfile from "@app/Models/User/UserProfile";
import { EUserType } from "@app/Enums";
import { RolesUsers } from "@app/Models/User/RolesUsers";
import { Cacheable, Sortable, Timestamps } from "@vest/db";
import { SoftDeletes } from "@vest/db";

/*
|--------------------------------------------------------------------------
| User Model
|--------------------------------------------------------------------------
|
| The User model represents authenticated users in the application.
| It includes relationships for roles, profile, and files.
|
*/

@use(Sortable, SoftDeletes, Timestamps, Cacheable)
export class User extends Model {
  static primaryKey = "id";

  static fillable = [
    "name",
    "email",
    "email_verified_at",
    "password",
    "active",
    "last_login",
    "last_seen_at",
    "last_login_ip",
    "default_role_id",
    "remember_token",
    "created_at",
    "updated_at",
    "deleted_at",
    "active_status",
    "status",
    "avatar",
    "dark_mode",
    "messenger_color",
    "phone_number",
  ];

  static hidden = ["password", "remember_token"];

  static casts = {
    active_status: "int",
    dark_mode: "int",
    created_at: "datetime",
    updated_at: "datetime",
    deleted_at: "datetime",
    last_login: "datetime",
    last_seen_at: "datetime",
  } as any;

  /*
  |--------------------------------------------------------------------------
  | Relationships
  |--------------------------------------------------------------------------
  */

  roles() {
    return this.belongsToMany(Role, RolesUsers.getTable(), "users_id", "roles_id");
  }

  profile() {
    return this.hasOne(UserProfile, "user_id", "id");
  }

  files() {
    return this.hasMany(FileModel, "user_id");
  }

  /*
  |--------------------------------------------------------------------------
  | Helper Methods
  |--------------------------------------------------------------------------
  */

  /**
   * Check if the user is an admin
   */
  isAdmin() {
    return this.hasUserType(EUserType.ADMIN);
  }

  /**
   * Check if the user has a specific type via their profile
   */
  private hasUserType(type: EUserType) {
    if (typeof this.profile === "function") {
      return this.profile().where("type", type).exists();
    }
    return (this as any)?.profile?.type === type;
  }

  /**
   * Check if the user account is active
   */
  isActive() {
    const status = this.getAttribute("status");
    return typeof status === "undefined" || status === null || status === "active";
  }

  /*
  |--------------------------------------------------------------------------
  | Constructor
  |--------------------------------------------------------------------------
  */

  constructor(attributes: any = {}) {
    super({
      avatar: "avatar.png",
      active_status: 0,
      dark_mode: 0,
      ...attributes,
    });
  }
}

export default User;
