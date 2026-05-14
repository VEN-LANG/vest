import { Model, use, Timestamps, SoftDeletes } from "@vest/db";

@use(Timestamps, SoftDeletes)
export class Post extends Model {
  static collectionName = "posts";
  static fillable = ["title", "body", "user_id", "published"];
  // author() { return this.belongsTo(User, 'user_id'); }  — define when User is imported from a shared index
}
