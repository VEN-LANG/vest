import type { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateUsersTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('users', (table: TableBuilder) => {
      table.increments('id');
      table.string('name', 191).notNullable();
      table.string('email', 191).notNullable();
      table.datetime('email_verified_at').nullable();
      table.string('password', 255).notNullable();
      table.string('status', 32).default('active');
      table.datetime('last_login').nullable();
      table.datetime('last_seen_at').nullable();
      table.string('last_login_ip', 64).nullable();
      table.integer('default_role_id').nullable();
      table.string('remember_token', 100).nullable();
      table.string('avatar', 191).nullable();
      table.string('phone_number', 32).nullable();
      table.timestamps();
      table.softDeletes();
      table.unique('email');
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('users');
  }
}
