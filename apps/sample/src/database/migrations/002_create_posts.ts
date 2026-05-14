import type { MigrationSchema, TableBuilder } from "@vest/db";

export async function up(schema: MigrationSchema): Promise<void> {
  return schema.createTable("posts", (table: TableBuilder) => {
    table.id();
    table.string("title");
    table.text("body");
    table.string("user_id");
    table.boolean("published").default(false);
    table.timestamps();
    table.softDeletes();
  });
}

export async function down(schema: MigrationSchema): Promise<void> {
  return schema.dropTable("posts");
}
