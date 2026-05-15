import type { MigrationSchema, TableBuilder } from "@vest-ts/db";

export async function up(schema: MigrationSchema): Promise<void> {
  return schema.createTable("users", (table: TableBuilder) => {
    table.id();
    table.string("name");
    table.string("email").unique();
    table.string("password");
    table.timestamps();
    table.softDeletes();
  });
}

export async function down(schema: MigrationSchema): Promise<void> {
  return schema.dropTable("users");
}
