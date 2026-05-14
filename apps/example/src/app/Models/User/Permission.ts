import { Model, use } from "@vest/db";
import { SoftDeletes } from "@vest/db";

@use(SoftDeletes)
export class Permission extends Model {
  static table = "permissions";
  static fillable = ["name", "slug", "description", "created_at", "updated_at", "deleted_at"];
  static hidden: string[] = [];
  static casts = {
    // id: 'int',
    created_at: "datetime",
    updated_at: "datetime",
    deleted_at: "datetime",
  } as any;
}

export default Permission;
