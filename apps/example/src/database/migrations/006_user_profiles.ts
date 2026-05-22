import type { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateUserProfilesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('user_profiles', (table: TableBuilder) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.string('gender', 32).nullable();
      table.string('id_number', 64).nullable();
      table.string('city', 191).nullable();
      table.string('country', 191).nullable();
      table.string('address', 500).nullable();
      table.string('zip_code', 32).nullable();
      table.datetime('date_of_birth').nullable();
      table.text('metadata').nullable();
      table.timestamps();
      table.softDeletes();
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('user_profiles');
  }
}
