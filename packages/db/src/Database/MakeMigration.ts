#!/usr/bin/env ts-node
import fs from "fs";
import path from "path";

function pad(n: number) {
  return n < 10 ? "0" + n : String(n);
}

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Parse migration name to extract table name and action type.
 * Follows Laravel conventions:
 * - create_users_table → creates 'users' table
 * - add_column_to_users_table → alters 'users' table
 * - remove_column_from_users_table → alters 'users' table
 * - modify_column_in_users_table → alters 'users' table
 * - drop_users_table → drops 'users' table
 */
function parseMigrationName(name: string): {
  table: string | undefined;
  action: "create" | "alter" | "drop";
} {
  const normalized = name.toLowerCase().replace(/\s+/g, "_");

  // Pattern: create_xxx_table or create_xxx
  const createMatch = normalized.match(/^create_(.+?)(?:_table)?$/);
  if (createMatch) {
    return { table: createMatch[1], action: "create" };
  }

  // Pattern: drop_xxx_table or drop_xxx
  const dropMatch = normalized.match(/^drop_(.+?)(?:_table)?$/);
  if (dropMatch) {
    return { table: dropMatch[1], action: "drop" };
  }

  // Pattern: add_xxx_to_yyy_table or add_xxx_to_yyy
  const addToMatch = normalized.match(/^add_.+_to_(.+?)(?:_table)?$/);
  if (addToMatch) {
    return { table: addToMatch[1], action: "alter" };
  }

  // Pattern: remove_xxx_from_yyy_table or remove_xxx_from_yyy
  const removeFromMatch = normalized.match(/^remove_.+_from_(.+?)(?:_table)?$/);
  if (removeFromMatch) {
    return { table: removeFromMatch[1], action: "alter" };
  }

  // Pattern: modify_xxx_in_yyy_table or change_xxx_in_yyy or update_xxx_in_yyy
  const modifyInMatch = normalized.match(/^(?:modify|change|update)_.+_in_(.+?)(?:_table)?$/);
  if (modifyInMatch) {
    return { table: modifyInMatch[1], action: "alter" };
  }

  // Pattern: rename_xxx_to_yyy_in_zzz_table (rename column)
  const renameColMatch = normalized.match(/^rename_.+_to_.+_in_(.+?)(?:_table)?$/);
  if (renameColMatch) {
    return { table: renameColMatch[1], action: "alter" };
  }

  // Pattern: xxx_to_yyy_table (generic "to table" pattern)
  const toTableMatch = normalized.match(/.+_to_(.+?)(?:_table)?$/);
  if (toTableMatch) {
    return { table: toTableMatch[1], action: "alter" };
  }

  // Pattern: xxx_from_yyy_table (generic "from table" pattern)
  const fromTableMatch = normalized.match(/.+_from_(.+?)(?:_table)?$/);
  if (fromTableMatch) {
    return { table: fromTableMatch[1], action: "alter" };
  }

  // Pattern: xxx_in_yyy_table (generic "in table" pattern)
  const inTableMatch = normalized.match(/.+_in_(.+?)(?:_table)?$/);
  if (inTableMatch) {
    return { table: inTableMatch[1], action: "alter" };
  }

  // Pattern: xxx_on_yyy_table (generic "on table" pattern)
  const onTableMatch = normalized.match(/.+_on_(.+?)(?:_table)?$/);
  if (onTableMatch) {
    return { table: onTableMatch[1], action: "alter" };
  }

  // No pattern matched
  return { table: undefined, action: "create" };
}

function getTemplate(
  name: string,
  className: string,
  table: string | undefined,
  action: "create" | "alter" | "drop",
): string {
  const tbl = table || name.replace(/[^a-z0-9_]/gi, "_").toLowerCase();

  if (action === "drop") {
    return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@vest-ts/db';

/**
 * Migration: ${name}
 * Drop table: ${tbl}
 */
export default class ${className} implements Migration {
  /**
   * Run the migrations.
   */
  async up(schema: MigrationSchema, query?: QueryFn): Promise<any> {
    return schema.dropTable('${tbl}');
  }

  /**
   * Reverse the migrations.
   */
  async down(schema: MigrationSchema, query?: QueryFn): Promise<any> {
    return schema.createTable('${tbl}', (table: TableBuilder) => {
      table.increments('id');
      // Add the columns that were in the original table
      table.timestamps();
    });
  }
}
`;
  }

  if (action === "alter") {
    return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@vest-ts/db';

/**
 * Migration: ${name}
 * Alter table: ${tbl}
 */
export default class ${className} implements Migration {
  /**
   * Run the migrations.
   */
  async up(schema: MigrationSchema, query?: QueryFn): Promise<any> {
    return schema.alterTable('${tbl}', (table: TableBuilder) => {
      // Add a column:
      // table.string('column_name', 255).nullable();
      
      // Add an index:
      // table.index(['column_name']);
      
      // Add a foreign key:
      // table.foreignKey('foreign_id', 'other_table', 'id', { onDelete: 'CASCADE' });

      // Drop a column:
      // table.dropColumn('column_name');

      // Rename a column:
      // table.renameColumn('old_name', 'new_name');
    });
  }

  /**
   * Reverse the migrations.
   */
  async down(schema: MigrationSchema, query?: QueryFn): Promise<any> {
    return schema.alterTable('${tbl}', (table: TableBuilder) => {
      // Reverse the operations performed in up()
    });
  }
}
`;
  }

  // Default: create table
  return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@vest-ts/db';

/**
 * Migration: ${name}
 * Create table: ${tbl}
 */
export default class ${className} implements Migration {
  /**
   * Run the migrations.
   */
  async up(schema: MigrationSchema, query?: QueryFn): Promise<any> {
    return schema.createTable('${tbl}', (table: TableBuilder) => {
      table.increments('id');
      
      // Add your columns here
      // table.string('name', 255).notNullable();
      // table.text('description').nullable();
      // table.unsignedBigInteger('user_id').notNullable();
      
      // Foreign keys
      // table.foreignKey('user_id', 'users', 'id', { onDelete: 'CASCADE' });
      
      table.timestamps();
    });
  }

  /**
   * Reverse the migrations.
   */
  async down(schema: MigrationSchema, query?: QueryFn): Promise<any> {
    return schema.dropTable('${tbl}');
  }
}
`;
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      args[k] = v === undefined ? true : v;
    } else if (!args._) {
      args._ = a;
    }
  }
  return args;
}

// Main execution
const args = parseArgs(process.argv);
const name = (args._ as string) || (args.name as string);
if (!name) {
  console.error("Usage: make-migration <name> [--table=tableName] [--create=tableName]");
  process.exit(1);
}

const tableOption = (args.table as string) || null;
const createOption = (args.create as string) || null;

// Parse the migration name to extract table and action
const parsed = parseMigrationName(name);

// Options override parsed values
const table = createOption || tableOption || parsed.table;
const action = createOption ? "create" : tableOption ? "alter" : parsed.action;

const dir = path.resolve(process.cwd(), "src/database/migrations");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const ts = timestamp();
const fileName = `${ts}_${name.replace(/\s+/g, "_")}.ts`;
const filePath = path.join(dir, fileName);
const className = pascalCase(name) + "Migration";

const template = getTemplate(name, className, table, action);

fs.writeFileSync(filePath, template);
console.log("Created migration:", filePath);
if (table) {
  console.log(`Table: ${table} (${action})`);
}
