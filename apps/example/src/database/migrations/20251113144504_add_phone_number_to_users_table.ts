import { MigrationSchema, TableBuilder } from "@vest/db";
import User from "@app/Models/User/User";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;

// Migration: add_phone_number_to_users_table
module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.alterTable(User.getTable(), (table: TableBuilder) => {
    table.string("phone_number", 12).nullable();
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  // Drop the table on rollback
  return schema.alterTable(User.getTable(), (table: TableBuilder) => {
    table.dropColumn("phone_number");
  });
};
