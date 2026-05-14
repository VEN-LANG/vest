// Simple Laravel-like Schema builder for migrations
// Usage:
// const schema = new Schema();
// const sql = schema.createTable('users', table => {
//   table.increments('id');
//   table.string('name', 191).notNullable();
//   table.string('email', 191).notNullable().unique();
//   table.string('password', 255).notNullable();
//   table.timestamps();
//   table.softDeletes();
// });
// // sql is a CREATE TABLE ... statement

import { getDbType, getMongoDb } from "../connection.js";

// Common interface to support both SQL and Mongo schema builders
export interface MigrationSchema {
  createTable(name: string, callback: (table: TableBuilder) => void): any;
  alterTable(name: string, callback: (table: TableBuilder) => void): any;
  dropTable(name: string): any;
  dropTableIfExists(name: string): any;
  rename(from: string, to: string): any;
  hasTable(name: string): Promise<boolean>;
  hasColumn(table: string, column: string): Promise<boolean>;
  hasColumns(table: string, columns: string[]): Promise<boolean>;
  getColumnType(table: string, column: string): Promise<string | null>;
  getColumnListing(table: string): Promise<string[]>;
  dropColumns(table: string, columns: string[]): any;
  renameColumn(table: string, from: string, to: string): any;
}

export type QueryFn = (sql: string, params?: any[]) => Promise<any>;

export interface Migration {
  up(schema: MigrationSchema, query?: QueryFn): Promise<any>;
  down(schema: MigrationSchema, query?: QueryFn): Promise<any>;
}

type DefaultValue = string | number | boolean | null | RawExpression;

// Raw expression for default values like CURRENT_TIMESTAMP
export class RawExpression {
  constructor(public value: string) {}
  toString() {
    return this.value;
  }
}

// Helper to create raw expressions
export function raw(value: string): RawExpression {
  return new RawExpression(value);
}

export class Column {
  name: string;
  type: string;
  length?: number;
  enumValues?: string[];
  nullableFlag = false;
  defaultValue?: DefaultValue;
  unsignedFlag = false;
  uniqueFlag = false;
  primaryFlag = false;
  autoIncrementFlag = false;
  commentText?: string;
  decimalPlaces?: number;
  // Additional Laravel properties
  afterColumn?: string;
  firstFlag = false;
  virtualAsExpr?: string;
  storedAsExpr?: string;
  useCurrent__ = false;
  useCurrentOnUpdate__ = false;
  charset__?: string;
  collation?: string;
  invisibleFlag = false;
  generatedAs__?: string;
  alwaysAs?: string;

  constructor(name: string, type: string, length?: number, decimalPlaces = 2) {
    this.name = name;
    this.type = type;
    this.length = length;
    this.decimalPlaces = decimalPlaces;
  }

  // set enum values for ENUM columns
  enum(values: string[]) {
    this.enumValues = values.slice();
    this.type = "ENUM";
    return this;
  }

  nullable() {
    this.nullableFlag = true;
    return this;
  }
  notNullable() {
    this.nullableFlag = false;
    return this;
  }
  default(val: DefaultValue) {
    this.defaultValue = val;
    return this;
  }
  unsigned() {
    this.unsignedFlag = true;
    return this;
  }
  unique() {
    this.uniqueFlag = true;
    return this;
  }
  primary() {
    this.primaryFlag = true;
    return this;
  }
  increments() {
    this.autoIncrementFlag = true;
    this.primaryFlag = true;
    return this;
  }
  comment(text: string) {
    this.commentText = text;
    return this;
  }

  // Laravel: Place column after another column
  after(column: string) {
    this.afterColumn = column;
    return this;
  }

  // Laravel: Place column first in the table
  first() {
    this.firstFlag = true;
    return this;
  }

  // Laravel: Set CURRENT_TIMESTAMP as default
  useCurrent() {
    this.useCurrent__ = true;
    return this;
  }

  // Laravel: Use CURRENT_TIMESTAMP on update
  useCurrentOnUpdate() {
    this.useCurrentOnUpdate__ = true;
    return this;
  }

  // Laravel: Set charset for column
  charset(charset: string) {
    this.charset__ = charset;
    return this;
  }

  // Laravel: Set collation for column
  collate(collation: string) {
    this.collation = collation;
    return this;
  }

  // Laravel: Make column invisible (MySQL 8.0.23+)
  invisible() {
    this.invisibleFlag = true;
    return this;
  }

  // Laravel: Create virtual generated column
  virtualAs(expression: string) {
    this.virtualAsExpr = expression;
    return this;
  }

  // Laravel: Create stored generated column
  storedAs(expression: string) {
    this.storedAsExpr = expression;
    return this;
  }

  // Laravel: Create generated column (alias for storedAs)
  generatedAs(expression: string) {
    this.generatedAs__ = expression;
    return this;
  }

  // Laravel: Always store generated column
  always() {
    this.alwaysAs = this.generatedAs__;
    return this;
  }

  // Laravel: Mark column as auto-incrementing starting from value
  from(startingValue: number) {
    // This is typically used with AUTO_INCREMENT in MySQL
    // The actual starting value would be set via ALTER TABLE
    return this;
  }

  // Laravel: Index the column
  index(name?: string) {
    // This is typically handled at table level
    return this;
  }

  // toSQL optionally omits the column name when `omitName` is true
  toSQL(omitName = false): string {
    let sqlType = this.type;
    if (this.enumValues && this.enumValues.length) {
      const vals = this.enumValues.map((v) => `'${escapeSingle(v)}'`).join(",");
      sqlType = `ENUM(${vals})`;
    } else if (
      this.length !== undefined &&
      (this.type.toLowerCase() === "varchar" || this.type.toLowerCase() === "char")
    ) {
      sqlType += `(${this.length})`;
    } else if (this.length !== undefined && this.type.toLowerCase() === "int") {
      sqlType += `(${this.length})`;
    } else if (this.length !== undefined && this.type.toLowerCase() === "decimal") {
      sqlType += `(${this.length},${this.decimalPlaces})`;
    } else if (this.length !== undefined && this.type.toLowerCase() === "float") {
      sqlType += `(${this.length},${this.decimalPlaces})`;
    } else if (this.length !== undefined && this.type.toLowerCase() === "double") {
      sqlType += `(${this.length},${this.decimalPlaces})`;
    }

    if (this.unsignedFlag) sqlType += " UNSIGNED";

    // Character set and collation
    if (this.charset__) sqlType += ` CHARACTER SET ${this.charset__}`;
    if (this.collation) sqlType += ` COLLATE ${this.collation}`;

    const namePart = omitName ? "" : `\`${this.name}\` `;
    let parts = [`${namePart}${sqlType}`.trim()];

    // Generated columns
    if (this.virtualAsExpr) {
      parts.push(`GENERATED ALWAYS AS (${this.virtualAsExpr}) VIRTUAL`);
    } else if (this.storedAsExpr) {
      parts.push(`GENERATED ALWAYS AS (${this.storedAsExpr}) STORED`);
    } else if (this.generatedAs__) {
      parts.push(`GENERATED ALWAYS AS (${this.generatedAs__}) STORED`);
    }

    if (this.autoIncrementFlag) parts.push("AUTO_INCREMENT");

    if (this.primaryFlag && !this.autoIncrementFlag) parts.push("PRIMARY KEY");

    if (!this.nullableFlag) parts.push("NOT NULL");
    else parts.push("NULL");

    if (this.defaultValue !== undefined) {
      parts.push("DEFAULT " + formatDefault(this.defaultValue));
    } else if (this.useCurrent__) {
      parts.push("DEFAULT CURRENT_TIMESTAMP");
    }

    if (this.useCurrentOnUpdate__) {
      parts.push("ON UPDATE CURRENT_TIMESTAMP");
    }

    if (this.invisibleFlag) parts.push("INVISIBLE");

    if (this.commentText) parts.push(`COMMENT '${escapeSingle(this.commentText)}'`);

    // Position modifiers (for ALTER TABLE)
    if (this.firstFlag) parts.push("FIRST");
    else if (this.afterColumn) parts.push(`AFTER \`${this.afterColumn}\``);

    return parts.join(" ");
  }
}

function escapeSingle(s: string) {
  return s.replace(/'/g, "''");
}

function formatDefault(v: DefaultValue) {
  if (v === null) return "NULL";
  if (v instanceof RawExpression) return v.value;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  // assume string
  return `'${escapeSingle(String(v))}'`;
}

export class TableBuilder {
  name: string;
  columns: Column[] = [];
  primaryKeys: string[] = [];
  uniques: string[] = [];
  engine: string = "InnoDB";
  charset: string = "utf8mb4";

  // index & foreign key support
  indexes: { columns: string[]; name?: string; unique?: boolean }[] = [];
  foreignKeys: {
    columns: string[];
    refTable: string;
    refColumns: string[];
    name?: string;
    onDelete?: string;
    onUpdate?: string;
  }[] = [];
  // track dropped indexes/foreign keys in alter mode
  dropIndexes: string[] = [];
  dropForeignKeys: string[] = [];
  // index of last added foreign key (for chaining .onDelete/.onUpdate)
  lastForeignKeyIndex: number | null = null;
  // pending foreign being built by fluent .foreign().references().inTable() chain
  pendingForeign?: {
    columns: string[];
    refTable?: string;
    refColumns?: string[];
    name?: string;
    onDelete?: string;
    onUpdate?: string;
  };

  // alter-mode specific
  drops: string[] = [];
  changes: { oldName: string; col: Column }[] = [];
  renames: { from: string; to: string }[] = [];

  mode: "create" | "alter" = "create";

  constructor(name: string, mode: "create" | "alter" = "create") {
    this.name = name;
    this.mode = mode;
  }

  column(type: string, name: string, length?: number) {
    const col = new Column(name, type, length);
    this.columns.push(col);
    return col;
  }

  // fluent foreign key builder: table.foreign('col').references('id').inTable('users').onDelete('CASCADE')
  foreign(columns: string[] | string) {
    const cols = Array.isArray(columns) ? columns : [columns];
    this.pendingForeign = { columns: cols };
    return this;
  }

  references(refColumns: string[] | string) {
    if (!this.pendingForeign) this.pendingForeign = { columns: [] };
    this.pendingForeign.refColumns = Array.isArray(refColumns) ? refColumns : [refColumns];
    return this;
  }

  inTable(tableName: string, opts: { name?: string } = {}) {
    if (!this.pendingForeign) this.pendingForeign = { columns: [] };
    this.pendingForeign.refTable = tableName;
    if (opts.name) this.pendingForeign.name = opts.name;
    // finalize pending foreign into foreignKeys list
    const pf = this.pendingForeign;
    const idx =
      this.foreignKeys.push({
        columns: pf.columns,
        refTable: pf.refTable || "",
        refColumns: pf.refColumns || ["id"],
        name: pf.name,
        onDelete: pf.onDelete,
        onUpdate: pf.onUpdate,
      }) - 1;
    this.lastForeignKeyIndex = idx;
    // clear pending
    delete this.pendingForeign;
    return this;
  }

  // enum helper
  enum(name: string, values: string[]) {
    const c = this.column("ENUM", name);
    c.enum(values);
    return c;
  }

  // Laravel: SET column type
  set(name: string, values: string[]) {
    const c = this.column("SET", name);
    c.enumValues = values.slice();
    return c;
  }

  // ==================== Primary Key Types ====================

  increments(name = "id") {
    const c = this.column("INT", name);
    c.increments();
    c.unsigned();
    this.primary(name);
    return c;
  }

  // Laravel: Big auto-incrementing ID (BIGINT UNSIGNED)
  bigIncrements(name = "id") {
    const c = this.column("BIGINT", name);
    c.increments();
    c.unsigned();
    this.primary(name);
    return c;
  }

  // Laravel: Medium auto-incrementing ID (MEDIUMINT UNSIGNED)
  mediumIncrements(name = "id") {
    const c = this.column("MEDIUMINT", name);
    c.increments();
    c.unsigned();
    this.primary(name);
    return c;
  }

  // Laravel: Small auto-incrementing ID (SMALLINT UNSIGNED)
  smallIncrements(name = "id") {
    const c = this.column("SMALLINT", name);
    c.increments();
    c.unsigned();
    this.primary(name);
    return c;
  }

  // Laravel: Tiny auto-incrementing ID (TINYINT UNSIGNED)
  tinyIncrements(name = "id") {
    const c = this.column("TINYINT", name);
    c.increments();
    c.unsigned();
    this.primary(name);
    return c;
  }

  // Laravel: UUID primary key
  uuid(name = "id") {
    return this.column("CHAR", name, 36);
  }

  // Laravel: ULID primary key
  ulid(name = "id") {
    return this.column("CHAR", name, 26);
  }

  // Laravel: Auto-incrementing UUID-like ID
  id(name = "id") {
    return this.bigIncrements(name);
  }

  // Laravel: foreignId - BIGINT UNSIGNED for foreign keys
  foreignId(name: string) {
    const c = this.column("BIGINT", name);
    c.unsigned();
    return c;
  }

  // Laravel: foreignUuid - CHAR(36) for UUID foreign keys
  foreignUuid(name: string) {
    return this.uuid(name);
  }

  // Laravel: foreignUlid - CHAR(26) for ULID foreign keys
  foreignUlid(name: string) {
    return this.ulid(name);
  }

  // ==================== Integer Types ====================

  integer(name: string, length?: number) {
    return this.column("INT", name, length);
  }

  // Laravel: Unsigned integer
  unsignedInteger(name: string) {
    const c = this.column("INT", name);
    c.unsigned();
    return c;
  }

  tinyInteger(name: string) {
    return this.column("TINYINT", name);
  }

  // Laravel: Unsigned tiny integer
  unsignedTinyInteger(name: string) {
    const c = this.column("TINYINT", name);
    c.unsigned();
    return c;
  }

  // Laravel: Small integer
  smallInteger(name: string) {
    return this.column("SMALLINT", name);
  }

  // Laravel: Unsigned small integer
  unsignedSmallInteger(name: string) {
    const c = this.column("SMALLINT", name);
    c.unsigned();
    return c;
  }

  // Laravel: Medium integer
  mediumInteger(name: string) {
    return this.column("MEDIUMINT", name);
  }

  // Laravel: Unsigned medium integer
  unsignedMediumInteger(name: string) {
    const c = this.column("MEDIUMINT", name);
    c.unsigned();
    return c;
  }

  // Laravel: Big integer
  bigInteger(name: string) {
    return this.column("BIGINT", name);
  }

  // Laravel: Unsigned big integer
  unsignedBigInteger(name: string) {
    const c = this.column("BIGINT", name);
    c.unsigned();
    return c;
  }

  boolean(name: string) {
    return this.column("TINYINT", name, 1);
  }

  // ==================== String Types ====================

  string(name: string, length = 255) {
    return this.column("VARCHAR", name, length);
  }

  char(name: string, length = 255) {
    return this.column("CHAR", name, length);
  }

  text(name: string) {
    return this.column("TEXT", name);
  }

  // Laravel: Tiny text
  tinyText(name: string) {
    return this.column("TINYTEXT", name);
  }

  // Laravel: Medium text
  mediumText(name: string) {
    return this.column("MEDIUMTEXT", name);
  }

  longText(name: string) {
    return this.column("LONGTEXT", name);
  }

  // ==================== Numeric Types ====================

  decimal(name: string, precision: number = 8, scale: number = 2) {
    const c = this.column("DECIMAL", name, precision);
    c.decimalPlaces = scale;
    return c;
  }

  // Laravel: Unsigned decimal
  unsignedDecimal(name: string, precision: number = 8, scale: number = 2) {
    const c = this.decimal(name, precision, scale);
    c.unsigned();
    return c;
  }

  // Laravel: Float column
  float(name: string, precision: number = 8, scale: number = 2) {
    const c = this.column("FLOAT", name, precision);
    c.decimalPlaces = scale;
    return c;
  }

  // Laravel: Unsigned float
  unsignedFloat(name: string, precision: number = 8, scale: number = 2) {
    const c = this.float(name, precision, scale);
    c.unsigned();
    return c;
  }

  // Laravel: Double column
  double(name: string, precision?: number, scale?: number) {
    const c = this.column("DOUBLE", name, precision);
    if (scale !== undefined) c.decimalPlaces = scale;
    return c;
  }

  // Laravel: Unsigned double
  unsignedDouble(name: string, precision?: number, scale?: number) {
    const c = this.double(name, precision, scale);
    c.unsigned();
    return c;
  }

  // ==================== Date/Time Types ====================

  datetime(name: string, precision?: number) {
    const type = precision !== undefined ? `DATETIME(${precision})` : "DATETIME";
    return this.column(type, name);
  }

  // Laravel: Date column
  date(name: string) {
    return this.column("DATE", name);
  }

  // Laravel: Time column
  time(name: string, precision?: number) {
    const type = precision !== undefined ? `TIME(${precision})` : "TIME";
    return this.column(type, name);
  }

  timestamp(name: string, precision?: number) {
    const type = precision !== undefined ? `TIMESTAMP(${precision})` : "TIMESTAMP";
    const c = this.column(type, name);
    c.nullable();
    return c;
  }

  // Laravel: Timestamp with timezone (alias for timestamp in MySQL)
  timestampTz(name: string, precision?: number) {
    return this.timestamp(name, precision);
  }

  // Laravel: Datetime with timezone (alias for datetime in MySQL)
  datetimeTz(name: string, precision?: number) {
    return this.datetime(name, precision);
  }

  // Laravel: Time with timezone (alias for time in MySQL)
  timeTz(name: string, precision?: number) {
    return this.time(name, precision);
  }

  // Laravel: Year column
  year(name: string) {
    return this.column("YEAR", name);
  }

  timestamps(precision?: number) {
    this.timestamp("created_at", precision).nullable();
    this.timestamp("updated_at", precision).nullable();
    return this;
  }

  // Laravel: Timestamps with timezone
  timestampsTz(precision?: number) {
    return this.timestamps(precision);
  }

  // Laravel: Nullable timestamps
  nullableTimestamps(precision?: number) {
    return this.timestamps(precision);
  }

  softDeletes(column = "deleted_at", precision?: number) {
    this.timestamp(column, precision).nullable();
    return this;
  }

  // Laravel: Soft deletes with timezone
  softDeletesTz(column = "deleted_at", precision?: number) {
    return this.softDeletes(column, precision);
  }

  // ==================== Binary Types ====================

  // Laravel: Binary column
  binary(name: string, length?: number) {
    if (length) {
      return this.column("VARBINARY", name, length);
    }
    return this.column("BLOB", name);
  }

  // ==================== JSON Types ====================

  // JSON column helper (length accepted for API compatibility but ignored in SQL)
  json(name: string) {
    return this.column("JSON", name);
  }

  // Laravel: JSONB column (alias for JSON in MySQL)
  jsonb(name: string) {
    return this.json(name);
  }

  // ==================== Geometry Types ====================

  // Laravel: Geometry column
  geometry(name: string) {
    return this.column("GEOMETRY", name);
  }

  // Laravel: Point column
  point(name: string) {
    return this.column("POINT", name);
  }

  // Laravel: Line string column
  lineString(name: string) {
    return this.column("LINESTRING", name);
  }

  // Laravel: Polygon column
  polygon(name: string) {
    return this.column("POLYGON", name);
  }

  // Laravel: Geometry collection
  geometryCollection(name: string) {
    return this.column("GEOMETRYCOLLECTION", name);
  }

  // Laravel: Multi-point column
  multiPoint(name: string) {
    return this.column("MULTIPOINT", name);
  }

  // Laravel: Multi-line string column
  multiLineString(name: string) {
    return this.column("MULTILINESTRING", name);
  }

  // Laravel: Multi-polygon column
  multiPolygon(name: string) {
    return this.column("MULTIPOLYGON", name);
  }

  // ==================== Special Types ====================

  // Laravel: IP address column (VARCHAR for compatibility)
  ipAddress(name = "ip_address") {
    return this.string(name, 45);
  }

  // Laravel: MAC address column
  macAddress(name = "mac_address") {
    return this.string(name, 17);
  }

  // Laravel: Remember token column
  rememberToken() {
    return this.string("remember_token", 100).nullable();
  }

  // Laravel: Morphs columns (type + id for polymorphic relations)
  morphs(name: string, indexName?: string) {
    this.string(`${name}_type`);
    this.unsignedBigInteger(`${name}_id`);
    this.index([`${name}_type`, `${name}_id`], indexName);
    return this;
  }

  // Laravel: Nullable morphs
  nullableMorphs(name: string, indexName?: string) {
    this.string(`${name}_type`).nullable();
    this.unsignedBigInteger(`${name}_id`).nullable();
    this.index([`${name}_type`, `${name}_id`], indexName);
    return this;
  }

  // Laravel: UUID morphs
  uuidMorphs(name: string, indexName?: string) {
    this.string(`${name}_type`);
    this.uuid(`${name}_id`);
    this.index([`${name}_type`, `${name}_id`], indexName);
    return this;
  }

  // Laravel: Nullable UUID morphs
  nullableUuidMorphs(name: string, indexName?: string) {
    this.string(`${name}_type`).nullable();
    this.uuid(`${name}_id`).nullable();
    this.index([`${name}_type`, `${name}_id`], indexName);
    return this;
  }

  // Laravel: ULID morphs
  ulidMorphs(name: string, indexName?: string) {
    this.string(`${name}_type`);
    this.ulid(`${name}_id`);
    this.index([`${name}_type`, `${name}_id`], indexName);
    return this;
  }

  // Laravel: Nullable ULID morphs
  nullableUlidMorphs(name: string, indexName?: string) {
    this.string(`${name}_type`).nullable();
    this.ulid(`${name}_id`).nullable();
    this.index([`${name}_type`, `${name}_id`], indexName);
    return this;
  }

  unique(name: string) {
    this.uniques.push(name);
    return this;
  }
  primary(name: string) {
    this.primaryKeys.push(name);
    return this;
  }

  // index helpers
  index(columns: string[] | string, name?: string) {
    const cols = Array.isArray(columns) ? columns : [columns];
    this.indexes.push({ columns: cols, name, unique: false });
    return this;
  }

  uniqueIndex(columns: string[] | string, name?: string) {
    const cols = Array.isArray(columns) ? columns : [columns];
    this.indexes.push({ columns: cols, name, unique: true });
    return this;
  }

  // drop an index in alter mode
  dropIndex(name: string) {
    this.dropIndexes.push(name);
    return this;
  }

  // drop a foreign key constraint by name in alter mode
  dropForeignKey(name: string) {
    this.dropForeignKeys.push(name);
    return this;
  }

  // foreign key helper: columns (single or array), referenced table and referenced columns
  foreignKey(
    columns: string[] | string,
    refTable: string,
    refColumns: string[] | string,
    opts: { name?: string; onDelete?: string; onUpdate?: string } = {},
  ) {
    const cols = Array.isArray(columns) ? columns : [columns];
    const refs = Array.isArray(refColumns) ? refColumns : [refColumns];
    const idx =
      this.foreignKeys.push({
        columns: cols,
        refTable,
        refColumns: refs,
        name: opts.name,
        onDelete: opts.onDelete,
        onUpdate: opts.onUpdate,
      }) - 1;
    this.lastForeignKeyIndex = idx;
    return this;
  }

  // chainable helpers to set onDelete/onUpdate for the most recently added or currently pending foreign key
  onDelete(action: string) {
    if (this.pendingForeign) {
      this.pendingForeign.onDelete = action;
    } else if (this.lastForeignKeyIndex !== null) {
      this.foreignKeys[this.lastForeignKeyIndex].onDelete = action;
    }
    return this;
  }
  onUpdate(action: string) {
    if (this.pendingForeign) {
      this.pendingForeign.onUpdate = action;
    } else if (this.lastForeignKeyIndex !== null) {
      this.foreignKeys[this.lastForeignKeyIndex].onUpdate = action;
    }
    return this;
  }

  // alter-mode helpers
  dropColumn(name: string) {
    this.drops.push(name);
    return this;
  }
  renameColumn(from: string, to: string) {
    this.renames.push({ from, to });
    return this;
  }
  // change column: provide old name and a callback that defines the new column
  changeColumn(oldName: string, cb: (col: Column) => Column) {
    // create a temporary column using the oldName as placeholder; callback can change name
    const tmp = new Column(oldName, "VARCHAR");
    const newCol = cb(tmp) || tmp;
    this.changes.push({ oldName, col: newCol });
    return this;
  }

  toSQL(): string {
    const colSql = this.columns.map((c) => c.toSQL());

    const pk = this.primaryKeys.length
      ? `, PRIMARY KEY (${this.primaryKeys.map((n) => `\`${n}\``).join(", ")})`
      : "";
    const uqs = this.uniques.map((n) => `, UNIQUE KEY (\`${n}\`)`).join("");

    // index and foreign key SQL for create mode
    const idxSqlCreate = this.indexes
      .map((ix) => {
        const name =
          ix.name || `${this.name}_${ix.columns.join("_")}${ix.unique ? "_uniq" : "_idx"}`;
        const cols = ix.columns.map((c) => `\`${c}\``).join(", ");
        return ix.unique ? `, UNIQUE KEY \`${name}\` (${cols})` : `, KEY \`${name}\` (${cols})`;
      })
      .join("");

    const fkSqlCreate = this.foreignKeys
      .map((fk) => {
        const name = fk.name || `${this.name}_${fk.columns.join("_")}_fk`;
        const cols = fk.columns.map((c) => `\`${c}\``).join(", ");
        const refs = fk.refColumns.map((c) => `\`${c}\``).join(", ");
        const onDelete = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : "";
        const onUpdate = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : "";
        return `, CONSTRAINT \`${name}\` FOREIGN KEY (${cols}) REFERENCES \`${fk.refTable}\` (${refs})${onDelete}${onUpdate}`;
      })
      .join("");

    if (this.mode === "create") {
      return `CREATE TABLE IF NOT EXISTS \`${this.name}\` (\n  ${colSql.join(",\n  ")}${pk}${uqs}${idxSqlCreate}${fkSqlCreate}\n) ENGINE=${this.engine} DEFAULT CHARSET=${this.charset};`;
    }

    // alter mode: produce one or more ALTER TABLE statements
    const parts: string[] = [];
    // additions
    for (const c of this.columns) {
      parts.push(`ALTER TABLE \`${this.name}\` ADD COLUMN ${c.toSQL()};`);
    }
    // indexes in alter mode
    for (const ix of this.indexes) {
      const name = ix.name || `${this.name}_${ix.columns.join("_")}${ix.unique ? "_uniq" : "_idx"}`;
      const cols = ix.columns.map((c) => `\`${c}\``).join(", ");
      parts.push(
        ix.unique
          ? `ALTER TABLE \`${this.name}\` ADD UNIQUE \`${name}\` (${cols});`
          : `ALTER TABLE \`${this.name}\` ADD INDEX \`${name}\` (${cols});`,
      );
    }

    // drop indexes in alter mode
    for (const idxName of this.dropIndexes) {
      parts.push(`ALTER TABLE \`${this.name}\` DROP INDEX \`${idxName}\`;`);
    }

    // foreign keys in alter mode
    for (const fk of this.foreignKeys) {
      const name = fk.name || `${this.name}_${fk.columns.join("_")}_fk`;
      const cols = fk.columns.map((c) => `\`${c}\``).join(", ");
      const refs = fk.refColumns.map((c) => `\`${c}\``).join(", ");
      const onDelete = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : "";
      const onUpdate = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : "";
      parts.push(
        `ALTER TABLE \`${this.name}\` ADD CONSTRAINT \`${name}\` FOREIGN KEY (${cols}) REFERENCES \`${fk.refTable}\` (${refs})${onDelete}${onUpdate};`,
      );
    }

    // drop foreign keys (by constraint name)
    for (const fkName of this.dropForeignKeys) {
      parts.push(`ALTER TABLE \`${this.name}\` DROP FOREIGN KEY \`${fkName}\`;`);
    }

    // drops
    for (const d of this.drops) {
      parts.push(`ALTER TABLE \`${this.name}\` DROP COLUMN \`${d}\`;`);
    }
    // renames
    for (const r of this.renames) {
      // MySQL 8 supports RENAME COLUMN
      parts.push(`ALTER TABLE \`${this.name}\` RENAME COLUMN \`${r.from}\` TO \`${r.to}\`;`);
    }
    // changes
    for (const ch of this.changes) {
      // CHANGE old_name `<new definition including new name and type>`
      parts.push(`ALTER TABLE \`${this.name}\` CHANGE \`${ch.oldName}\` ${ch.col.toSQL()};`);
    }

    return parts.join("\n");
  }
}

export default class Schema implements MigrationSchema {
  private queryFn?: (sql: string, params?: any[]) => Promise<any>;

  constructor(queryFn?: (sql: string, params?: any[]) => Promise<any>) {
    this.queryFn = queryFn;
  }

  createTable(name: string, callback: (table: TableBuilder) => void) {
    const tb = new TableBuilder(name, "create");
    callback(tb);
    return tb.toSQL();
  }

  alterTable(name: string, callback: (table: TableBuilder) => void) {
    const tb = new TableBuilder(name, "alter");
    callback(tb);
    return tb.toSQL();
  }

  dropTable(name: string) {
    return `DROP TABLE IF EXISTS \`${name}\`;`;
  }

  dropTableIfExists(name: string) {
    return `DROP TABLE IF EXISTS \`${name}\`;`;
  }

  rename(from: string, to: string) {
    return `RENAME TABLE \`${from}\` TO \`${to}\`;`;
  }

  async hasTable(name: string): Promise<boolean> {
    if (!this.queryFn) return false;
    const rows: any[] = await this.queryFn(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [name],
    );
    return rows && rows.length > 0;
  }

  async hasColumn(table: string, column: string): Promise<boolean> {
    if (!this.queryFn) return false;
    const rows: any[] = await this.queryFn(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return rows && rows.length > 0;
  }

  async hasColumns(table: string, columns: string[]): Promise<boolean> {
    for (const col of columns) {
      if (!(await this.hasColumn(table, col))) return false;
    }
    return true;
  }

  async getColumnType(table: string, column: string): Promise<string | null> {
    if (!this.queryFn) return null;
    const rows: any[] = await this.queryFn(
      `SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return rows && rows[0] ? rows[0].DATA_TYPE : null;
  }

  async getColumnListing(table: string): Promise<string[]> {
    if (!this.queryFn) return [];
    const rows: any[] = await this.queryFn(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [table],
    );
    return rows ? rows.map((r: any) => r.COLUMN_NAME) : [];
  }

  dropColumns(table: string, columns: string[]) {
    const drops = columns.map((c) => `DROP COLUMN \`${c}\``).join(", ");
    return `ALTER TABLE \`${table}\` ${drops};`;
  }

  renameColumn(table: string, from: string, to: string) {
    return `ALTER TABLE \`${table}\` RENAME COLUMN \`${from}\` TO \`${to}\`;`;
  }

  // Laravel: Create database
  createDatabase(name: string) {
    return `CREATE DATABASE IF NOT EXISTS \`${name}\`;`;
  }

  // Laravel: Drop database
  dropDatabaseIfExists(name: string) {
    return `DROP DATABASE IF EXISTS \`${name}\`;`;
  }

  // Laravel: Enable foreign key constraints
  enableForeignKeyConstraints() {
    return `SET FOREIGN_KEY_CHECKS = 1;`;
  }

  // Laravel: Disable foreign key constraints
  disableForeignKeyConstraints() {
    return `SET FOREIGN_KEY_CHECKS = 0;`;
  }

  // Laravel: Get all table names
  async getAllTables(): Promise<string[]> {
    if (!this.queryFn) return [];
    const rows: any[] = await this.queryFn(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
    );
    return rows ? rows.map((r: any) => r.TABLE_NAME) : [];
  }

  // Laravel: Get all view names
  async getAllViews(): Promise<string[]> {
    if (!this.queryFn) return [];
    const rows: any[] = await this.queryFn(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'VIEW'`,
    );
    return rows ? rows.map((r: any) => r.TABLE_NAME) : [];
  }
}

// MongoSchema: records operations and applies them using MongoDB
export class MongoSchema implements MigrationSchema {
  private ops: Array<{
    type: "create" | "alter" | "drop" | "rename";
    table: string;
    tb?: TableBuilder;
    newName?: string;
  }> = [];

  createTable(name: string, callback: (table: TableBuilder) => void) {
    const tb = new TableBuilder(name, "create");
    callback(tb);
    this.ops.push({ type: "create", table: name, tb });
    return undefined as any; // runner will call apply()
  }

  alterTable(name: string, callback: (table: TableBuilder) => void) {
    const tb = new TableBuilder(name, "alter");
    callback(tb);
    this.ops.push({ type: "alter", table: name, tb });
    return undefined as any;
  }

  dropTable(name: string) {
    this.ops.push({ type: "drop", table: name });
    return undefined as any;
  }

  dropTableIfExists(name: string) {
    return this.dropTable(name);
  }

  rename(from: string, to: string) {
    this.ops.push({ type: "rename", table: from, newName: to });
    return undefined as any;
  }

  async hasTable(name: string): Promise<boolean> {
    if (getDbType() !== "mongodb") return false;
    const db = getMongoDb();
    return await db.listCollections({ name }).hasNext();
  }

  async hasColumn(table: string, column: string): Promise<boolean> {
    // In MongoDB, columns are dynamic - we check if any document has the field
    if (getDbType() !== "mongodb") return false;
    const db = getMongoDb();
    const doc = await db.collection(table).findOne({ [column]: { $exists: true } });
    return !!doc;
  }

  async hasColumns(table: string, columns: string[]): Promise<boolean> {
    for (const col of columns) {
      if (!(await this.hasColumn(table, col))) return false;
    }
    return true;
  }

  async getColumnType(table: string, column: string): Promise<string | null> {
    // MongoDB is schemaless - return null or infer from first document
    if (getDbType() !== "mongodb") return null;
    const db = getMongoDb();
    const doc = await db.collection(table).findOne({ [column]: { $exists: true } });
    if (!doc || doc[column] === undefined) return null;
    return typeof doc[column];
  }

  async getColumnListing(table: string): Promise<string[]> {
    // Get all unique field names from the collection (limited sample)
    if (getDbType() !== "mongodb") return [];
    const db = getMongoDb();
    const docs = await db.collection(table).find({}).limit(100).toArray();
    const fields = new Set<string>();
    for (const doc of docs) {
      Object.keys(doc).forEach((k) => fields.add(k));
    }
    return Array.from(fields);
  }

  dropColumns(table: string, columns: string[]) {
    // Queue an unset operation for apply()
    const tb = new TableBuilder(table, "alter");
    columns.forEach((c) => tb.dropColumn(c));
    this.ops.push({ type: "alter", table, tb });
    return undefined as any;
  }

  renameColumn(table: string, from: string, to: string) {
    const tb = new TableBuilder(table, "alter");
    tb.renameColumn(from, to);
    this.ops.push({ type: "alter", table, tb });
    return undefined as any;
  }

  async apply(): Promise<void> {
    if (getDbType() !== "mongodb") return;
    const db = getMongoDb();
    for (const op of this.ops) {
      if (op.type === "create" && op.tb) {
        // create collection if not exists
        const exists = await db.listCollections({ name: op.table }).hasNext();
        if (!exists) {
          await db.createCollection(op.table);
        }
        // indexes
        const c = db.collection(op.table);
        // primary key: nothing to do; Mongo always has _id
        // unique indexes
        for (const uq of op.tb.uniques || []) {
          try {
            await c.createIndex({ [uq]: 1 }, { unique: true, name: `${op.table}_${uq}_uniq` });
          } catch (_) {}
        }
        // other indexes
        for (const ix of op.tb.indexes || []) {
          const name =
            ix.name || `${op.table}_${ix.columns.join("_")}${ix.unique ? "_uniq" : "_idx"}`;
          const spec: any = {};
          ix.columns.forEach((col) => (spec[col] = 1));
          try {
            await c.createIndex(spec, { unique: Boolean(ix.unique), name });
          } catch (_) {}
        }
      } else if (op.type === "alter" && op.tb) {
        const c = db.collection(op.table);
        // add indexes
        for (const ix of op.tb.indexes || []) {
          const name =
            ix.name || `${op.table}_${ix.columns.join("_")}${ix.unique ? "_uniq" : "_idx"}`;
          const spec: any = {};
          ix.columns.forEach((col) => (spec[col] = 1));
          try {
            await c.createIndex(spec, { unique: Boolean(ix.unique), name });
          } catch (_) {}
        }
        // drop indexes
        for (const dropName of op.tb.dropIndexes || []) {
          try {
            await c.dropIndex(dropName);
          } catch (_) {}
        }
        // drop columns (unset fields)
        if (op.tb.drops && op.tb.drops.length) {
          const unset: any = {};
          op.tb.drops.forEach((d) => (unset[d] = ""));
          try {
            await c.updateMany({}, { $unset: unset });
          } catch (_) {}
        }
        // rename columns
        if (op.tb.renames && op.tb.renames.length) {
          for (const r of op.tb.renames) {
            try {
              await c.updateMany({}, { $rename: { [r.from]: r.to } });
            } catch (_) {}
          }
        }
      } else if (op.type === "drop") {
        try {
          await db.collection(op.table).drop();
        } catch (_) {}
      } else if (op.type === "rename" && op.newName) {
        try {
          await db.collection(op.table).rename(op.newName);
        } catch (_) {}
      }
    }
    // clear ops after applying
    this.ops = [];
  }
}
