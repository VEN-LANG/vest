import { MigrationSchema } from "@vest/db";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;
// Migration: add thumbnail_path column to files table
module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.alterTable("files", (table) => {
    table.string("thumbnail_path", 500).nullable();
    table.index(["thumbnail_path"], "files_thumbnail_path_idx");
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.alterTable("files", (table) => {
    table.dropColumn("thumbnail_path");
  });
};
