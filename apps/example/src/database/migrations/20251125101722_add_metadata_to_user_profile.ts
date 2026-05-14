import { MigrationSchema, TableBuilder } from "@vest/db";
import UserProfile from "@app/Models/User/UserProfile";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;

// Migration: add_metadata_to_user_profile
module.exports.up = async function (schema: MigrationSchema, query: QueryFn) {
  return schema.alterTable(UserProfile.getTable(), (table: TableBuilder) => {
    table.json("metadata").nullable();
  });
};

module.exports.down = async function (schema: MigrationSchema, query: QueryFn) {
  // Drop the table on rollback
  return schema.alterTable(UserProfile.getTable(), (table: TableBuilder) => {
    table.dropColumn("metadata");
  });
};
