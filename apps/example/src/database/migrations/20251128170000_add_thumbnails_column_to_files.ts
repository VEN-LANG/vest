import { MigrationSchema } from "@vest-ts/db";
type QueryFn = (sql: string, params?: any[]) => Promise<any>;
// Migration: add thumbnails json column to files table (stores multi-size thumbnail paths)
module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.alterTable("files", (table) => {
    table.json("thumbnails").nullable();
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.alterTable("files", (table) => {
    table.dropColumn("thumbnails");
  });
};
