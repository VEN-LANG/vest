import { MigrationSchema, TableBuilder } from "@vest/db";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.createTable("roles", (table: TableBuilder) => {
    table.increments("id");
    table.string("name", 191).notNullable();
    table.string("slug", 191).notNullable();
    table.text("description").nullable();
    table.timestamps();
    table.softDeletes();

    table.unique("slug");
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.dropTable("roles");
};
