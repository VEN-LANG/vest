import { MigrationSchema, TableBuilder } from "@vest/db";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.createTable("cache_store", (table: TableBuilder) => {
    table.string("k", 255).primary();
    table.text("v").nullable();
    // store epoch milliseconds (or seconds) as string to avoid missing bigint helper
    table.string("expires_at", 20).nullable();
    table.timestamps();
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.dropTable("cache_store");
};
