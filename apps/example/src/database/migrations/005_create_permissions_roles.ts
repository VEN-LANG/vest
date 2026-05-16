import { MigrationSchema, TableBuilder } from "@lara-node/db";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.createTable("permissions_roles", (table: TableBuilder) => {
    table.increments("id");
    table.integer("permissions_id").notNullable();
    table.integer("roles_id").notNullable();

    // composite unique
    table.uniqueIndex(["permissions_id", "roles_id"], "unique_perm_role");
    table.index("permissions_id", "idx_pr_perm");
    table.index("roles_id", "idx_pr_role");

    // foreign keys
    table.foreignKey("permissions_id", "permissions", "id", { onDelete: "CASCADE" });
    table.foreignKey("roles_id", "roles", "id", { onDelete: "CASCADE" });

    table.timestamps();
    table.softDeletes();
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  return schema.dropTable("permissions_roles");
};
