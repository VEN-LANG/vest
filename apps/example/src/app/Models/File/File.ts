import { Model, use } from "@lara-node/db";
import User from "@app/Models/User/User";
import { SoftDeletes } from "@lara-node/db";

@use(SoftDeletes)
export class File extends Model {
  static table = "files";
  static fillable = [
    "original_name",
    "filename",
    "mime_type",
    "size",
    "disk_path",
    "thumbnail_path",
    "thumbnails", // new multi-size thumbnails json mapping
    "original_width",
    "original_height",
    "user_id",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  static casts = {
    size: "int",
    original_width: "int",
    original_height: "int",
    thumbnails: "json", // cast thumbnails json
    created_at: "datetime",
    updated_at: "datetime",
    deleted_at: "datetime",
  } as any;
  static timestamps = true;
  static softDeletes = true;

  user() {
    return this.belongsTo(User, "user_id", "id");
  }
}

export default File;
