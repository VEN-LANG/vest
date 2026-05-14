/*
|--------------------------------------------------------------------------
| DB Facade - Laravel-style Database Facade
|--------------------------------------------------------------------------
|
| This module provides a Laravel-like DB facade for database operations
| including transactions, raw queries, table queries, and more.
|
*/

import { PoolConnection, Pool } from "mysql2/promise";
import { getPool, getDbType, query as dbQuery, getMongoDb } from "./connection.js";
import { ClientSession, Db, Collection as MongoCollection, Document } from "mongodb";
import { emitQueryEvent, createMongoQueryProxy } from "./QueryInstrumentation.js";

// ============================================================================
// TRANSACTION INTERFACES
// ============================================================================

/**
 * Base transaction interface with common methods
 */
export interface ITransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

/**
 * MySQL Transaction interface
 */
export interface IMysqlTransaction extends ITransaction {
  query<T = any>(sql: string, bindings?: any[]): Promise<T[]>;
  select<T = any>(sql: string, bindings?: any[]): Promise<T[]>;
  insert(sql: string, bindings?: any[]): Promise<number>;
  update(sql: string, bindings?: any[]): Promise<number>;
  delete(sql: string, bindings?: any[]): Promise<number>;
  statement(sql: string, bindings?: any[]): Promise<boolean>;
  getConnection(): PoolConnection;
  release(): void;
}

/**
 * MongoDB Transaction interface
 */
export interface IMongoTransaction extends ITransaction {
  collection<T extends Document = Document>(name: string): MongoCollection<T>;
  getSession(): ClientSession;
  endSession(): void;
}

// ============================================================================
// TRANSACTION CLASSES
// ============================================================================

/**
 * Transaction class for managing MySQL database transactions
 */
export class Transaction implements IMysqlTransaction {
  private connection: PoolConnection;
  private committed = false;
  private rolledBack = false;

  constructor(connection: PoolConnection) {
    this.connection = connection;
  }

  async query<T = any>(sql: string, bindings: any[] = []): Promise<T[]> {
    const [rows] = await this.connection.query(sql, bindings);
    return rows as T[];
  }

  async select<T = any>(sql: string, bindings: any[] = []): Promise<T[]> {
    return this.query<T>(sql, bindings);
  }

  async insert(sql: string, bindings: any[] = []): Promise<number> {
    const [result] = await this.connection.query(sql, bindings);
    return (result as any).insertId;
  }

  async update(sql: string, bindings: any[] = []): Promise<number> {
    const [result] = await this.connection.query(sql, bindings);
    return (result as any).affectedRows;
  }

  async delete(sql: string, bindings: any[] = []): Promise<number> {
    const [result] = await this.connection.query(sql, bindings);
    return (result as any).affectedRows;
  }

  async statement(sql: string, bindings: any[] = []): Promise<boolean> {
    await this.connection.query(sql, bindings);
    return true;
  }

  getConnection(): PoolConnection {
    return this.connection;
  }

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error("Transaction already completed");
    }
    await this.connection.commit();
    this.committed = true;
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      return;
    }
    await this.connection.rollback();
    this.rolledBack = true;
  }

  isActive(): boolean {
    return !this.committed && !this.rolledBack;
  }

  release(): void {
    this.connection.release();
  }
}

/**
 * MongoDB Transaction class
 */
export class MongoTransaction implements IMongoTransaction {
  private session: ClientSession;
  private db: Db;
  private committed = false;
  private rolledBack = false;

  constructor(session: ClientSession, db: Db) {
    this.session = session;
    this.db = db;
  }

  collection<T extends Document = Document>(name: string): MongoCollection<T> {
    return this.db.collection<T>(name);
  }

  getSession(): ClientSession {
    return this.session;
  }

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error("Transaction already completed");
    }
    await this.session.commitTransaction();
    this.committed = true;
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      return;
    }
    await this.session.abortTransaction();
    this.rolledBack = true;
  }

  isActive(): boolean {
    return !this.committed && !this.rolledBack;
  }

  endSession(): void {
    this.session.endSession();
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Unified Transaction type
 */
export type UnifiedTransaction = Transaction | MongoTransaction;

/**
 * Transaction callback types
 */
export type TransactionCallback<T> = (trx: Transaction) => Promise<T>;
export type MysqlTransactionCallback<T> = (trx: IMysqlTransaction) => Promise<T>;
export type MongoTransactionCallback<T> = (trx: IMongoTransaction) => Promise<T>;
export type UnifiedTransactionCallback<T> = (trx: UnifiedTransaction) => Promise<T>;

/**
 * Query binding types
 */
export type QueryBindings = any[] | Record<string, any>;

/**
 * Query result interface
 */
export interface QueryResult<T = any> {
  rows: T[];
  affectedRows?: number;
  insertId?: number;
  changedRows?: number;
}

/**
 * Raw query result
 */
export interface RawQueryResult {
  [key: string]: any;
}

// ============================================================================
// DB FACADE CLASS
// ============================================================================

/**
 * DB Facade - Main entry point for database operations
 * Automatically handles both MySQL and MongoDB based on configuration
 *
 * Supports Laravel-style transactions where Model operations automatically
 * use the active transaction:
 *
 * @example
 * await DB.beginTransaction();
 * try {
 *   await User.create({ name: 'John' }); // Uses the transaction
 *   await user.save(); // Uses the transaction
 *   await DB.commit();
 * } catch (e) {
 *   await DB.rollback();
 * }
 */
export class DB {
  private static currentMysqlTransaction: Transaction | null = null;
  private static currentMongoTransaction: MongoTransaction | null = null;
  private static transactionLevel = 0;

  // ==========================================================================
  // QUERY EXECUTION METHODS
  // ==========================================================================

  /**
   * Execute a query using the current transaction if one exists, otherwise use the pool.
   * Emits a `db:query` event via the application EventDispatcher so Telescope and
   * other listeners can observe all database activity without modifying call sites.
   */
  static async executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (getDbType() === "mongodb") {
      throw new Error("executeQuery() is not supported for MongoDB");
    }

    const start = process.hrtime.bigint();
    let rows: T[];
    let queryError: Error | undefined;

    try {
      if (this.currentMysqlTransaction) {
        rows = await this.currentMysqlTransaction.query<T>(sql, params);
      } else {
        rows = await dbQuery<T>(sql, params);
      }
    } catch (err) {
      queryError = err as Error;
      throw err;
    } finally {
      try {
        const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
        emitQueryEvent({
          sql,
          bindings: params,
          duration: durationMs,
          rows: rows! ? rows!.length : 0,
          error: queryError?.message,
          connection: process.env.DB_CONNECTION || "mysql",
        });
      } catch {
        /* never break the query path */
      }
    }

    return rows!;
  }

  /**
   * Execute a raw SQL query (MySQL only)
   */
  static async query<T = any>(sql: string, bindings: any[] = []): Promise<T[]> {
    if (getDbType() === "mongodb") {
      throw new Error(
        "DB.query() is not supported for MongoDB. Use DB.collection() methods instead.",
      );
    }
    return this.executeQuery<T>(sql, bindings);
  }

  /**
   * Execute a raw SELECT query (MySQL only)
   */
  static async select<T = any>(sql: string, bindings: any[] = []): Promise<T[]> {
    return this.query<T>(sql, bindings);
  }

  /**
   * Execute a raw INSERT query (MySQL only)
   */
  static async insert(sql: string, bindings: any[] = []): Promise<number> {
    if (getDbType() === "mongodb") {
      throw new Error(
        "DB.insert() is not supported for MongoDB. Use DB.collection().insertOne() instead.",
      );
    }
    if (this.currentMysqlTransaction) {
      return this.currentMysqlTransaction.insert(sql, bindings);
    }
    const result = await dbQuery<any>(sql, bindings);
    return (result as any).insertId || 0;
  }

  /**
   * Execute a raw UPDATE query (MySQL only)
   */
  static async update(sql: string, bindings: any[] = []): Promise<number> {
    if (getDbType() === "mongodb") {
      throw new Error(
        "DB.update() is not supported for MongoDB. Use DB.collection().updateOne() instead.",
      );
    }
    if (this.currentMysqlTransaction) {
      return this.currentMysqlTransaction.update(sql, bindings);
    }
    const result = await dbQuery<any>(sql, bindings);
    return (result as any).affectedRows || 0;
  }

  /**
   * Execute a raw DELETE query (MySQL only)
   */
  static async delete(sql: string, bindings: any[] = []): Promise<number> {
    if (getDbType() === "mongodb") {
      throw new Error(
        "DB.delete() is not supported for MongoDB. Use DB.collection().deleteOne() instead.",
      );
    }
    if (this.currentMysqlTransaction) {
      return this.currentMysqlTransaction.delete(sql, bindings);
    }
    const result = await dbQuery<any>(sql, bindings);
    return (result as any).affectedRows || 0;
  }

  /**
   * Execute a statement (for DDL or other non-returning queries) - MySQL only
   */
  static async statement(sql: string, bindings: any[] = []): Promise<boolean> {
    if (getDbType() === "mongodb") {
      throw new Error("DB.statement() is not supported for MongoDB.");
    }
    if (this.currentMysqlTransaction) {
      return this.currentMysqlTransaction.statement(sql, bindings);
    }
    await dbQuery(sql, bindings);
    return true;
  }

  /**
   * Execute an unprepared query (without parameter binding) - MySQL only
   */
  static async unprepared(sql: string): Promise<boolean> {
    if (getDbType() === "mongodb") {
      throw new Error("DB.unprepared() is not supported for MongoDB.");
    }
    await dbQuery(sql);
    return true;
  }

  // ==========================================================================
  // TABLE/COLLECTION ACCESS
  // ==========================================================================

  /**
   * Start a query on a table - returns EloquentBuilder for the table
   * Note: For raw table queries without a Model, use DB.query() with raw SQL
   */
  static table(name: string): {
    where: (column: string, operatorOrValue: any, value?: any) => any;
    insert: (data: Record<string, any>) => Promise<number>;
    update: (data: Record<string, any>) => Promise<number>;
    delete: () => Promise<number>;
    get: () => Promise<any[]>;
    first: () => Promise<any>;
    count: () => Promise<number>;
  } {
    if (getDbType() === "mongodb") {
      throw new Error("DB.table() is not supported for MongoDB. Use DB.collection() instead.");
    }

    // Return a simple query builder interface for raw table operations
    const tableName = name;
    let whereClauses: { column: string; operator: string; value: any }[] = [];

    const buildWhere = () => {
      if (whereClauses.length === 0) return { sql: "", params: [] };
      const parts = whereClauses.map((w, i) => {
        const prefix = i === 0 ? " WHERE " : " AND ";
        return `${prefix}${w.column} ${w.operator} ?`;
      });
      return { sql: parts.join(""), params: whereClauses.map((w) => w.value) };
    };

    return {
      where(column: string, operatorOrValue: any, value?: any) {
        const operator = value !== undefined ? operatorOrValue : "=";
        const val = value !== undefined ? value : operatorOrValue;
        whereClauses.push({ column, operator, value: val });
        return this;
      },
      async insert(data: Record<string, any>): Promise<number> {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map(() => "?").join(", ");
        const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
        return DB.insert(sql, values);
      },
      async update(data: Record<string, any>): Promise<number> {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const setClause = columns.map((c) => `${c} = ?`).join(", ");
        const where = buildWhere();
        const sql = `UPDATE ${tableName} SET ${setClause}${where.sql}`;
        return DB.update(sql, [...values, ...where.params]);
      },
      async delete(): Promise<number> {
        const where = buildWhere();
        const sql = `DELETE FROM ${tableName}${where.sql}`;
        return DB.delete(sql, where.params);
      },
      async get(): Promise<any[]> {
        const where = buildWhere();
        const sql = `SELECT * FROM ${tableName}${where.sql}`;
        return DB.query(sql, where.params);
      },
      async first(): Promise<any> {
        const where = buildWhere();
        const sql = `SELECT * FROM ${tableName}${where.sql} LIMIT 1`;
        const results = await DB.query(sql, where.params);
        return results[0] || null;
      },
      async count(): Promise<number> {
        const where = buildWhere();
        const sql = `SELECT COUNT(*) as count FROM ${tableName}${where.sql}`;
        const results = await DB.query<{ count: number }>(sql, where.params);
        return Number(results[0]?.count || 0);
      },
    };
  }

  /**
   * Get a MongoDB collection (MongoDB only).
   * The returned collection is transparently proxied so every operation
   * (find, insertOne, updateMany, aggregate, …) emits a `db:query` event
   * that Telescope's QueryWatcher captures.
   */
  static collection<T extends Document = Document>(name: string): MongoCollection<T> {
    if (getDbType() !== "mongodb") {
      throw new Error("DB.collection() is only supported for MongoDB. Use DB.table() instead.");
    }
    const db = getMongoDb();
    return DB.instrumentMongoCollection<T>(name, db.collection<T>(name));
  }

  /**
  /** Delegates to the shared QueryInstrumentation proxy (same logic as db.config.ts:collection). */
  private static instrumentMongoCollection<T extends Document>(
    collectionName: string,
    col: MongoCollection<T>,
  ): MongoCollection<T> {
    return createMongoQueryProxy(collectionName, col);
  }

  /**
   * Get the current MongoDB session options for use in queries
   * Returns an object with { session } if in a transaction, or empty object
   * This allows MongoDB operations to automatically use the transaction
   *
   * @example
   * const collection = DB.collection('users');
   * await collection.insertOne({ name: 'John' }, DB.getSessionOptions());
   */
  static getSessionOptions(): { session?: ClientSession } {
    if (this.currentMongoTransaction) {
      return { session: this.currentMongoTransaction.getSession() };
    }
    return {};
  }

  /**
   * Execute a MongoDB operation with the current transaction session if available
   * This is the main method that Models should use for MongoDB operations
   *
   * @example
   * await DB.withSession(async (sessionOpts) => {
   *   await collection.insertOne({ name: 'John' }, sessionOpts);
   * });
   */
  static async withSession<T>(
    callback: (sessionOptions: { session?: ClientSession }) => Promise<T>,
  ): Promise<T> {
    return callback(this.getSessionOptions());
  }

  // ==========================================================================
  // TRANSACTION METHODS
  // ==========================================================================

  /**
   * Begin a database transaction (auto-detects database type)
   */
  static async beginTransaction(): Promise<UnifiedTransaction> {
    const dbType = getDbType();

    if (dbType === "mysql") {
      const pool = getPool();
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      const transaction = new Transaction(connection);
      this.currentMysqlTransaction = transaction;
      this.transactionLevel++;

      return transaction;
    } else {
      const db = getMongoDb();
      const client = db.client;
      const session = client.startSession();
      session.startTransaction();

      const transaction = new MongoTransaction(session, db);
      this.currentMongoTransaction = transaction;
      this.transactionLevel++;

      return transaction;
    }
  }

  /**
   * Alias for beginTransaction
   */
  static async begin(): Promise<UnifiedTransaction> {
    return this.beginTransaction();
  }

  /**
   * Commit the current transaction
   */
  static async commit(): Promise<void> {
    const dbType = getDbType();

    if (dbType === "mysql") {
      if (!this.currentMysqlTransaction) {
        throw new Error("No active MySQL transaction to commit");
      }
      await this.currentMysqlTransaction.commit();
      this.currentMysqlTransaction.release();
      this.currentMysqlTransaction = null;
      this.transactionLevel--;
    } else {
      if (!this.currentMongoTransaction) {
        throw new Error("No active MongoDB transaction to commit");
      }
      await this.currentMongoTransaction.commit();
      this.currentMongoTransaction.endSession();
      this.currentMongoTransaction = null;
      this.transactionLevel--;
    }
  }

  /**
   * Rollback the current transaction
   */
  static async rollback(): Promise<void> {
    const dbType = getDbType();

    if (dbType === "mysql") {
      if (!this.currentMysqlTransaction) {
        throw new Error("No active MySQL transaction to rollback");
      }
      await this.currentMysqlTransaction.rollback();
      this.currentMysqlTransaction.release();
      this.currentMysqlTransaction = null;
      this.transactionLevel--;
    } else {
      if (!this.currentMongoTransaction) {
        throw new Error("No active MongoDB transaction to rollback");
      }
      await this.currentMongoTransaction.rollback();
      this.currentMongoTransaction.endSession();
      this.currentMongoTransaction = null;
      this.transactionLevel--;
    }
  }

  /**
   * Execute a callback within a transaction (auto-detects database type)
   * Automatically commits on success, rolls back on error
   *
   * @example
   * // Models automatically use the active transaction
   * await DB.transaction(async () => {
   *   await User.create({ name: 'John' });
   *   await Invoice.create({ user_id: 1, amount: 100 });
   * });
   */
  static async transaction<T>(
    callback: UnifiedTransactionCallback<T> | (() => Promise<T>),
  ): Promise<T> {
    const trx = await this.beginTransaction();

    try {
      const result = await callback(trx);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Execute a callback within a MySQL transaction (type-safe)
   */
  static async mysqlTransaction<T>(callback: MysqlTransactionCallback<T>): Promise<T> {
    if (getDbType() !== "mysql") {
      throw new Error("mysqlTransaction() is only supported for MySQL");
    }

    const trx = (await this.beginTransaction()) as Transaction;

    try {
      const result = await callback(trx);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Execute a callback within a MongoDB transaction (type-safe)
   */
  static async mongoTransaction<T>(callback: MongoTransactionCallback<T>): Promise<T> {
    if (getDbType() !== "mongodb") {
      throw new Error("mongoTransaction() is only supported for MongoDB");
    }

    const trx = (await this.beginTransaction()) as MongoTransaction;

    try {
      const result = await callback(trx);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  // ==========================================================================
  // TRANSACTION STATE HELPERS
  // ==========================================================================

  /**
   * Get the current transaction level
   */
  static getTransactionLevel(): number {
    return this.transactionLevel;
  }

  /**
   * Check if currently in a transaction
   */
  static inTransaction(): boolean {
    return this.currentMysqlTransaction !== null || this.currentMongoTransaction !== null;
  }

  /**
   * Get the current active transaction (if any)
   */
  static getCurrentTransaction(): UnifiedTransaction | null {
    if (getDbType() === "mysql") {
      return this.currentMysqlTransaction;
    }
    return this.currentMongoTransaction;
  }

  /**
   * Get the current MySQL transaction (type-safe)
   */
  static getMysqlTransaction(): Transaction | null {
    return this.currentMysqlTransaction;
  }

  /**
   * Get the current MongoDB transaction (type-safe)
   */
  static getMongoTransaction(): MongoTransaction | null {
    return this.currentMongoTransaction;
  }

  /**
   * Get the current MySQL connection (from transaction or null)
   */
  static getActiveConnection(): PoolConnection | null {
    if (this.currentMysqlTransaction) {
      return this.currentMysqlTransaction.getConnection();
    }
    return null;
  }

  /**
   * Get the current MongoDB session (from transaction or null)
   */
  static getActiveSession(): ClientSession | null {
    if (this.currentMongoTransaction) {
      return this.currentMongoTransaction.getSession();
    }
    return null;
  }

  // ==========================================================================
  // TYPE GUARDS
  // ==========================================================================

  /**
   * Check if a value is a MySQL Transaction
   */
  static isTransaction(trx: any): trx is Transaction {
    return trx instanceof Transaction;
  }

  /**
   * Check if a value is a MongoDB Transaction
   */
  static isMongoTransaction(trx: any): trx is MongoTransaction {
    return trx instanceof MongoTransaction;
  }

  // ==========================================================================
  // DATABASE TYPE HELPERS
  // ==========================================================================

  /**
   * Get the database type (mysql or mongodb)
   */
  static getType(): "mysql" | "mongodb" {
    return getDbType();
  }

  /**
   * Check if using MySQL
   */
  static isMysql(): boolean {
    return getDbType() === "mysql";
  }

  /**
   * Check if using MongoDB
   */
  static isMongo(): boolean {
    return getDbType() === "mongodb";
  }

  /**
   * Get the underlying connection pool (MySQL only)
   */
  static getPool(): Pool {
    if (getDbType() !== "mysql") {
      throw new Error("getPool() is only supported for MySQL");
    }
    return getPool();
  }

  /**
   * Get the MongoDB database instance
   */
  static getMongoDb(): Db {
    if (getDbType() !== "mongodb") {
      throw new Error("getMongoDb() is only supported for MongoDB");
    }
    return getMongoDb();
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Create a raw expression (to use raw SQL in queries)
   */
  static raw(value: string): { __raw: true; value: string } {
    return { __raw: true, value };
  }

  /**
   * Escape a value for safe use in queries (MySQL only)
   */
  static escape(value: any): string {
    if (value === null) return "NULL";
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "1" : "0";
    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return String(value);
  }

  /**
   * Quote a table or column name (MySQL only)
   */
  static quoteName(name: string): string {
    return `\`${name.replace(/`/g, "``")}\``;
  }

  /**
   * Listen for query events (placeholder for query logging)
   */
  static listen(_callback: (query: { sql: string; bindings: any[]; time: number }) => void): void {
    console.warn("DB.listen() is not yet implemented. Query logging coming soon.");
  }
}

// Default export
export default DB;
