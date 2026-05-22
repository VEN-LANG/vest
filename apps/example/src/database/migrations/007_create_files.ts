import type { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateFilesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('files', (table: TableBuilder) => {
      table.increments('id');
      table.string('original_name', 500).notNullable();
      table.string('filename', 500).notNullable();
      table.string('mime_type', 191).nullable();
      table.bigInteger('size').nullable();
      table.string('disk_path', 1000).nullable();
      table.integer('user_id').nullable();
      table.timestamps();
      table.softDeletes();
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('files');
  }
}
