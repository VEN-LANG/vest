import type { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateRolesUsersTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('roles_users', (table: TableBuilder) => {
      table.increments('id');
      table.integer('roles_id').notNullable();
      table.integer('users_id').notNullable();
      table.timestamps();
      table.softDeletes();
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('roles_users');
  }
}
