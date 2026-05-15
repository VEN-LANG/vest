import { MigrationSchema, TableBuilder } from "@vest-ts/db";
type QueryFn = (sql: string, params?: any[]) => Promise<any>;

// Migration: files table
// Stores uploaded file metadata and path
module.exports.up = async function (schema: MigrationSchema, query: QueryFn) {
  return schema.createTable("files", (table: TableBuilder) => {
    table.increments("id");
    table.string("original_name", 255).notNullable();
    table.string("filename", 255).notNullable();
    table.string("mime_type", 100).notNullable();
    table.integer("size").notNullable();
    table.string("disk_path", 500).notNullable();
    table.integer("user_id").nullable();
    table.foreign(["user_id"]).references(["id"]).inTable("users").onDelete("SET NULL");
    table.timestamps();
    table.softDeletes();
    table.index(["user_id"], "files_user_id_idx");
  });
};

module.exports.down = async function (schema: MigrationSchema, query: QueryFn) {
  return schema.dropTable("files");
};
