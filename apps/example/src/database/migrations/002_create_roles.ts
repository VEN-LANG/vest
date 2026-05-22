import type { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateRolesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('roles', (table: TableBuilder) => {
      table.increments('id');
      table.string('name', 191).notNullable();
      table.string('slug', 191).notNullable();
      table.string('description', 500).nullable();
      table.timestamps();
      table.softDeletes();
      table.unique('slug');
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('roles');
  }
}
