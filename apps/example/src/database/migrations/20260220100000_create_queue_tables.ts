import { MigrationSchema, TableBuilder } from "@vest/db";

type QueryFn = (sql: string, params?: any[]) => Promise<any>;

/*
|--------------------------------------------------------------------------
| Create Jobs Table Migration
|--------------------------------------------------------------------------
|
| This migration creates the jobs table for the queue system.
|
*/

module.exports.up = async function (schema: MigrationSchema, _query: QueryFn) {
  // Create the jobs table
  await schema.createTable("jobs", (table: TableBuilder) => {
    table.increments("id");
    table.string("uuid", 255).notNullable().unique();
    table.string("queue", 255).notNullable();
    table.text("payload");
    table.integer("attempts").unsigned().default(0);
    table.integer("reserved_at").unsigned().nullable();
    table.integer("available_at").unsigned().notNullable();
    table.integer("created_at").unsigned().notNullable();

    // Add index for queue lookups
    table.index(["queue", "reserved_at", "available_at"]);
  });

  // Create the failed_jobs table
  await schema.createTable("failed_jobs", (table: TableBuilder) => {
    table.increments("id");
    table.string("uuid", 255).notNullable().unique();
    table.text("connection");
    table.text("queue");
    table.text("payload");
    table.text("exception");
    table.timestamp("failed_at").default("CURRENT_TIMESTAMP");
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: QueryFn) {
  await schema.dropTable("failed_jobs");
  await schema.dropTable("jobs");
};
