import { Model, use } from "@lara-node/db";
import User from "@app/Models/User/User";
import { SoftDeletes } from "@lara-node/db";

@use(SoftDeletes)
export class UserProfile extends Model {
  static table = "user_profiles";
  static primaryKey = "id";
  static fillable = [
    "user_id",
    "gender",
    "type",
    "id_number",
    "city",
    "country",
    "address",
    "zip_code",
    "date_of_birth",
    "created_at",
    "updated_at",
    "deleted_at",
    "metadata",
  ];
  static hidden: string[] = [];
  static casts = {
    // id: 'int',
    gender: "string",
    type: "string",
    id_number: "string",
    city: "string",
    country: "string",
    address: "string",
    zip_code: "string",
    date_of_birth: "datetime",
    created_at: "datetime",
    updated_at: "datetime",
    deleted_at: "datetime",
    metadata: "json",
  } as any;

  user() {
    return this.belongsTo(User, "user_id", "id");
  }
}

export default UserProfile;
