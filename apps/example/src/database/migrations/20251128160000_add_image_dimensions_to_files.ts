import { MigrationSchema } from "@vest/db";
type QueryFn = (sql: string, params?: any[]) => Promise<any>;
// Migration: add original_width & original_height to files table
module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.alterTable("files", (table) => {
    table.integer("original_width").nullable();
    table.integer("original_height").nullable();
    table.index(["original_width", "original_height"], "files_original_dimensions_idx");
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.alterTable("files", (table) => {
    table.dropColumn("original_width");
    table.dropColumn("original_height");
  });
};
