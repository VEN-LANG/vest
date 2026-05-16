import { MigrationSchema, TableBuilder } from "@lara-node/db";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.createTable("users", (table: TableBuilder) => {
    table.increments("id");
    table.string("name", 191).notNullable();
    table.string("email", 191).notNullable();
    table.datetime("email_verified_at").nullable();
    table.string("password", 255).notNullable();
    table.tinyInteger("active").nullable();
    table.datetime("last_login").nullable();
    table.datetime("last_seen_at").nullable();
    table.string("last_login_ip", 64).nullable();
    table.integer("default_role_id").nullable();
    table.string("remember_token", 100).nullable();
    table.tinyInteger("active_status").default(0);
    table.string("avatar", 191).nullable();
    table.tinyInteger("dark_mode").default(0);
    table.string("messenger_color", 32).nullable();
    table.timestamps();
    table.softDeletes();
    table.unique("email");
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.dropTable("users");
};
