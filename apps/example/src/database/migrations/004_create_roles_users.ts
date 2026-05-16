import { MigrationSchema, TableBuilder } from "@lara-node/db";
import { RolesUsers } from "@app/Models/User/RolesUsers";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.createTable(RolesUsers.getTable(), (table: TableBuilder) => {
    table.increments("id");
    table.integer("roles_id").notNullable();
    table.integer("users_id").notNullable();

    // composite unique
    table.uniqueIndex(["roles_id", "users_id"], "unique_role_user");
    table.index("roles_id", "idx_ru_role");
    table.index("users_id", "idx_ru_user");

    // foreign keys
    table.foreignKey("roles_id", "roles", "id", { onDelete: "CASCADE" });
    table.foreignKey("users_id", "users", "id", { onDelete: "CASCADE" });

    table.timestamps();
    table.softDeletes();
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.dropTable(RolesUsers.getTable());
};
