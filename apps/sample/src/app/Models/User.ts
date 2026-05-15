import { Model, use, Timestamps, SoftDeletes } from "@vest-ts/db";

@use(Timestamps, SoftDeletes)
export class User extends Model {
  static collectionName = "users";
  static fillable = ["name", "email", "password"];
  static hidden = ["password"];
  // posts() { return this.hasMany(Post, 'user_id'); }  — define when Post is imported from a shared index
}
