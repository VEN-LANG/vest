import type { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreatePermissionsRolesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('permissions_roles', (table: TableBuilder) => {
      table.increments('id');
      table.integer('permissions_id').notNullable();
      table.integer('roles_id').notNullable();
      table.timestamps();
      table.softDeletes();
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('permissions_roles');
  }
}
