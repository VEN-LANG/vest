// relationships.ts
import { Model } from "./Model.js";
import { EloquentBuilder } from "./EloquentBuilder.js";
import { collection as mongoCollection, getDbType, query as dbQuery } from "./connection.js";
import { ObjectId } from "mongodb";

// Helper: coerce 24-hex strings to ObjectId when writing *_id fields in Mongo
const toObjectIdIfHex = (v: any) => {
  if (v === null || v === undefined) return v;
  if (v instanceof ObjectId) return v;
  const s = String(v);
  if (/^[0-9a-fA-F]{24}$/.test(s)) {
    try {
      return new ObjectId(s);
    } catch {
      /*noop*/
    }
  }
  return v;
};
const coerceFK = (field: string, value: any) =>
    /_id$/i.test(field) ? toObjectIdIfHex(value) : value;

export abstract class Relation<T extends Model> {
  protected builder: EloquentBuilder<T>;
  protected parent: Model;
  protected related: typeof Model;

  constructor(related: typeof Model, parent: Model) {
    this.related = related;
    this.parent = parent;
    this.builder = new EloquentBuilder<T>(related as any);
  }

  abstract getResults(): Promise<T | T[] | null>;

  // ─── Promise / thenable protocol ─────────────────────────────────────────────
  // Allows `await user.profile()` to automatically resolve via getResults(),
  // eliminating the need to always call .getResults() or .first() explicitly.

  then<TResult1 = T | T[] | null, TResult2 = never>(
      onfulfilled?: ((value: T | T[] | null) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return (this.getResults() as Promise<any>).then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | T[] | null | TResult> {
    return (this.getResults() as Promise<any>).catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<T | T[] | null> {
    return (this.getResults() as Promise<any>).finally(onfinally);
  }

  // ─── FK application hook ─────────────────────────────────────────────────────
  // Subclasses override this to apply their FK WHERE clause to the builder.
  // It must be idempotent (guard with a flag — see HasOne/HasMany/BelongsTo).
  // Returns false when the parent has no key, signalling the caller should
  // return an empty result rather than an unbounded query.
  protected applyConstraints(): boolean { return true; }

  // ─── Builder-returning methods ────────────────────────────────────────────────

  /**
   * Return the underlying EloquentBuilder with the FK constraint pre-applied.
   * Use this to chain additional builder methods before executing:
   *   user.posts().query().where('published', 1).orderBy('created_at').get()
   */
  query(): EloquentBuilder<T> {
    this.applyConstraints();
    return this.builder;
  }

  // ─── Execution shortcuts ──────────────────────────────────────────────────────

  /**
   * Execute the relation query and return all matching model instances.
   *   await user.posts().get()
   *   await user.posts().where('published', 1).get()
   */
  async get(): Promise<T[]> {
    this.applyConstraints();
    return this.builder.get();
  }

  async first(): Promise<T | null> {
    this.applyConstraints();
    return this.builder.first();
  }

  async firstOrFail(): Promise<T> {
    this.applyConstraints();
    return this.builder.firstOrFail();
  }

  async paginate(perPage: number = 15, page: number = 1) {
    this.applyConstraints();
    return this.builder.paginate(perPage, page);
  }

  async pluck(column: string, key?: string): Promise<any[] | Record<string, any>> {
    this.applyConstraints();
    return this.builder.pluck(column, key);
  }

  async value(column: string): Promise<any> {
    this.applyConstraints();
    return this.builder.value(column);
  }

  async sole(): Promise<T> {
    this.applyConstraints();
    return this.builder.sole();
  }

  async count(): Promise<number> {
    this.applyConstraints();
    return this.builder.count();
  }

  async exists(): Promise<boolean> {
    this.applyConstraints();
    return this.builder.exists();
  }

  async doesntExist(): Promise<boolean> {
    this.applyConstraints();
    return this.builder.doesntExist();
  }

  // ─── Fluent filter passthrough ────────────────────────────────────────────────

  where(column: string, operator?: any, value?: any): this {
    this.applyConstraints();
    this.builder.where(column, operator, value);
    return this;
  }

  orWhere(column: string, operator?: any, value?: any): this {
    this.applyConstraints();
    this.builder.orWhere(column, operator, value);
    return this;
  }

  whereIn(column: string, values: any[]): this {
    this.applyConstraints();
    this.builder.whereIn(column, values);
    return this;
  }

  whereNotIn(column: string, values: any[]): this {
    this.applyConstraints();
    this.builder.whereNotIn(column, values);
    return this;
  }

  whereNull(column: string): this {
    this.applyConstraints();
    this.builder.whereNull(column);
    return this;
  }

  whereNotNull(column: string): this {
    this.applyConstraints();
    this.builder.whereNotNull(column);
    return this;
  }

  orderBy(column: string, direction: "asc" | "desc" = "asc"): this {
    this.applyConstraints();
    this.builder.orderBy(column, direction);
    return this;
  }

  latest(column: string = "created_at"): this {
    this.applyConstraints();
    this.builder.latest(column);
    return this;
  }

  oldest(column: string = "created_at"): this {
    this.applyConstraints();
    this.builder.oldest(column);
    return this;
  }

  limit(limit: number): this {
    this.applyConstraints();
    this.builder.limit(limit);
    return this;
  }

  offset(offset: number): this {
    this.applyConstraints();
    this.builder.offset(offset);
    return this;
  }

  with(relations: string | string[] | Record<string, any>): this {
    this.applyConstraints();
    this.builder.with(relations);
    return this;
  }

  select(columns: string[] | string): this {
    this.applyConstraints();
    this.builder.select(columns);
    return this;
  }

  getQuery(): EloquentBuilder<T> {
    this.applyConstraints();
    return this.builder;
  }
}

export class HasOne<T extends Model> extends Relation<T> {
  private defaultAttributes?: Record<string, any> | true;
  private fkApplied = false;

  constructor(
      protected relatedModel: typeof Model,
      protected foreignKey: string,
      protected localKey: string = "id",
      parent: Model,
  ) {
    super(relatedModel, parent);
  }

  /**
   * Apply the FK constraint exactly once; subsequent calls are no-ops.
   * This prevents duplicate WHERE clauses when getResults()/first() are
   * called more than once on the same relation instance.
   */
  protected applyFk(): boolean {
    if (this.fkApplied) return true;
    const localValue = (this.parent as any).getAttribute(this.localKey);
    if (localValue === undefined || localValue === null) return false;
    this.builder.where(this.foreignKey, localValue);
    this.fkApplied = true;
    return true;
  }

  protected applyConstraints(): boolean {
    return this.applyFk();
  }

  async getResults(): Promise<T | null> {
    if (!this.applyFk()) return this.resolveDefault();
    const result = await this.builder.first();
    return result ?? this.resolveDefault();
  }

  async first(): Promise<T | null> {
    if (!this.applyFk()) return this.resolveDefault();
    const result = await this.builder.first();
    return result ?? this.resolveDefault();
  }

  /**
   * Provide a default model when the relation returns null.
   * Pass `true` for an empty instance, or a plain object for pre-filled attributes.
   *
   * @example user.profile().withDefault({ gender: 'unknown' })
   */
  withDefault(attributes: Record<string, any> | true = true): this {
    this.defaultAttributes = attributes;
    return this;
  }

  private resolveDefault(): T | null {
    if (!this.defaultAttributes) return null;
    const instance = new (this.relatedModel as any)() as T;
    if (typeof this.defaultAttributes === "object") {
      Object.entries(this.defaultAttributes).forEach(([k, v]) =>
          (instance as any).setAttribute(k, v),
      );
    }
    return instance;
  }

  // HasOne specific methods
  async create(attributes: Record<string, any>): Promise<T> {
    const foreignValue = (this.parent as any).getAttribute(this.localKey);
    attributes[this.foreignKey] = foreignValue;

    const instance = new (this.relatedModel as any)(attributes) as T;
    await (instance as any).save();
    return instance;
  }

  async update(attributes: Record<string, any>): Promise<number> {
    const localValue = (this.parent as any).getAttribute(this.localKey);
    if (localValue === undefined || localValue === null) return 0;

    return await this.builder.where(this.foreignKey, localValue).update(attributes);
  }

  async save(model: T): Promise<T> {
    const localValue = (this.parent as any).getAttribute(this.localKey);
    (model as any).setAttribute(this.foreignKey, localValue);
    await (model as any).save();
    return model;
  }

  // Association management
  async associate(model: T | null): Promise<void> {
    const localValue = (this.parent as any).getAttribute(this.localKey);

    if (model === null) {
      // Dissociate
      await this.builder.where(this.foreignKey, localValue).update({ [this.foreignKey]: null });
    } else {
      const foreignValue = (model as any).getAttribute(
          (this.relatedModel as any).primaryKey || "id",
      );
      if (!foreignValue) {
        await (model as any).save();
      }
      (model as any).setAttribute(this.foreignKey, localValue);
      await (model as any).save();
    }
  }

  async dissociate(): Promise<void> {
    return this.associate(null);
  }
}

export class HasMany<T extends Model> extends Relation<T> {
  private fkApplied = false;

  constructor(
      protected relatedModel: typeof Model,
      protected foreignKey: string,
      protected localKey: string = "id",
      parent: Model,
  ) {
    super(relatedModel, parent);
  }

  protected applyFk(): boolean {
    if (this.fkApplied) return true;
    const localValue = (this.parent as any).getAttribute(this.localKey);
    if (localValue === undefined || localValue === null) return false;
    this.builder.where(this.foreignKey, localValue);
    this.fkApplied = true;
    return true;
  }

  protected applyConstraints(): boolean {
    return this.applyFk();
  }

  async getResults(): Promise<T[]> {
    if (!this.applyFk()) return [];
    return await this.builder.get();
  }

  async first(): Promise<T | null> {
    if (!this.applyFk()) return null;
    return await this.builder.first();
  }

  // HasMany specific methods
  async create(attributes: Record<string, any>): Promise<T> {
    const foreignValue = (this.parent as any).getAttribute(this.localKey);
    attributes[this.foreignKey] = foreignValue;

    const instance = new (this.relatedModel as any)(attributes) as T;
    await (instance as any).save();
    return instance;
  }

  async createMany(rows: Array<Record<string, any>>): Promise<T[]> {
    const foreignValue = (this.parent as any).getAttribute(this.localKey);
    const instances: T[] = [];

    for (const row of rows) {
      row[this.foreignKey] = foreignValue;
      const instance = new (this.relatedModel as any)(row) as T;
      await (instance as any).save();
      instances.push(instance);
    }

    return instances;
  }

  async save(model: T): Promise<T> {
    const foreignValue = (this.parent as any).getAttribute(this.localKey);
    (model as any).setAttribute(this.foreignKey, foreignValue);
    await (model as any).save();
    return model;
  }

  // Collection management
  async attach(model: T | number | string): Promise<void> {
    const dbType = getDbType();
    let relatedId: number | string;

    if (typeof model === "number" || typeof model === "string") {
      relatedId = model;
    } else {
      relatedId = (model as any).getAttribute((this.relatedModel as any).primaryKey || "id");
      if (!relatedId) {
        await (model as any).save();
        relatedId = (model as any).getAttribute((this.relatedModel as any).primaryKey || "id");
      }
    }

    const foreignValue = (this.parent as any).getAttribute(this.localKey);
    if (dbType === "mongodb") {
      const c = mongoCollection((this.relatedModel as typeof Model).getTable());
      const pk = (this.relatedModel as any).primaryKey || "id";
      let filter: any;
      if (pk === "id") {
        const s = String(relatedId);
        try {
          filter = { _id: new (require("mongodb").ObjectId)(s) };
        } catch {
          filter = { _id: s };
        }
      } else {
        filter = { [pk]: relatedId } as any;
      }
      const fkValue = coerceFK(this.foreignKey, foreignValue);
      await c.updateOne(filter, { $set: { [this.foreignKey]: fkValue } });
      return;
    }
    await dbQuery(
        `UPDATE ${(this.relatedModel as typeof Model).getTable()} SET ${this.foreignKey} = ? WHERE ${(this.relatedModel as any).primaryKey || "id"} = ?`,
        [foreignValue, relatedId],
    );
  }

  async detach(model?: T | number | string): Promise<number> {
    const foreignValue = (this.parent as any).getAttribute(this.localKey);
    const dbType = getDbType();

    if (model === undefined) {
      // Detach all
      if (dbType === "mongodb") {
        const c = mongoCollection((this.relatedModel as typeof Model).getTable());
        const res = await c.updateMany(
            { [this.foreignKey]: coerceFK(this.foreignKey, foreignValue) } as any,
            { $set: { [this.foreignKey]: null } },
        );
        return Number(res.modifiedCount || 0);
      }
      return await this.builder
          .where(this.foreignKey, foreignValue)
          .update({ [this.foreignKey]: null });
    }

    let relatedId: number | string;

    if (typeof model === "number" || typeof model === "string") {
      relatedId = model;
    } else {
      relatedId = (model as any).getAttribute((this.relatedModel as any).primaryKey || "id");
    }

    if (dbType === "mongodb") {
      const c = mongoCollection((this.relatedModel as typeof Model).getTable());
      const pk = (this.relatedModel as any).primaryKey || "id";
      let filter: any;
      if (pk === "id") {
        const s = String(relatedId);
        try {
          filter = {
            _id: new (require("mongodb").ObjectId)(s),
            [this.foreignKey]: coerceFK(this.foreignKey, foreignValue),
          };
        } catch {
          filter = { _id: s, [this.foreignKey]: coerceFK(this.foreignKey, foreignValue) };
        }
      } else {
        filter = {
          [pk]: relatedId,
          [this.foreignKey]: coerceFK(this.foreignKey, foreignValue),
        } as any;
      }
      const res = await c.updateOne(filter, { $set: { [this.foreignKey]: null } });
      return Number(res.modifiedCount || 0);
    }
    return await dbQuery(
        `UPDATE ${(this.relatedModel as typeof Model).getTable()} SET ${this.foreignKey} = NULL WHERE ${(this.relatedModel as any).primaryKey || "id"} = ? AND ${this.foreignKey} = ?`,
        [relatedId, foreignValue],
    ).then((result: any) => result.affectedRows || 0);
  }

  async sync(
      models: (T | number | string)[],
      detaching: boolean = true,
  ): Promise<{ attached: any[]; detached: any[]; updated: any[] }> {
    const foreignValue = (this.parent as any).getAttribute(this.localKey);
    const current = await this.getResults();
    const currentIds = new Set(
        current.map((item) =>
            (item as any).getAttribute((this.relatedModel as any).primaryKey || "id"),
        ),
    );

    const newIds = new Set();
    const modelsToSync: T[] = [];

    // Process new models/ids
    for (const model of models) {
      let relatedId: number | string;
      let modelInstance: T;

      if (typeof model === "number" || typeof model === "string") {
        relatedId = model;
        modelInstance = (await (this.relatedModel as any).find(relatedId)) as T;
        if (!modelInstance) continue;
      } else {
        modelInstance = model;
        relatedId = (model as any).getAttribute((this.relatedModel as any).primaryKey || "id");
        if (!relatedId) {
          await (model as any).save();
          relatedId = (model as any).getAttribute((this.relatedModel as any).primaryKey || "id");
        }
      }

      newIds.add(relatedId);
      modelsToSync.push(modelInstance);
    }

    const attached: any[] = [];
    const detached: any[] = [];
    const updated: any[] = [];

    // Detach removed models
    if (detaching) {
      for (const currentId of currentIds) {
        if (!newIds.has(currentId)) {
          await this.detach(currentId);
          detached.push(currentId);
        }
      }
    }

    // Attach/update new models
    for (const model of modelsToSync) {
      const relatedId = (model as any).getAttribute((this.relatedModel as any).primaryKey || "id");

      if (currentIds.has(relatedId)) {
        // Update existing
        await (model as any).save();
        updated.push(relatedId);
      } else {
        // Attach new
        await this.attach(model);
        attached.push(relatedId);
      }
    }

    return { attached, detached, updated };
  }
}

export class BelongsTo<T extends Model> extends Relation<T> {
  private defaultAttributes?: Record<string, any> | true;
  private fkApplied = false;

  constructor(
      private relatedModel: typeof Model,
      private foreignKey: string,
      private ownerKey: string = "id",
      parent: Model,
  ) {
    super(relatedModel, parent);
  }

  protected applyFk(): boolean {
    if (this.fkApplied) return true;
    const foreignValue = (this.parent as any).getAttribute(this.foreignKey);
    if (foreignValue === undefined || foreignValue === null) return false;
    this.builder.where(this.ownerKey, foreignValue);
    this.fkApplied = true;
    return true;
  }

  protected applyConstraints(): boolean {
    return this.applyFk();
  }

  async getResults(): Promise<T | null> {
    if (!this.applyFk()) return this.resolveDefault();
    const result = await this.builder.first();
    return result ?? this.resolveDefault();
  }

  async first(): Promise<T | null> {
    if (!this.applyFk()) return this.resolveDefault();
    const result = await this.builder.first();
    return result ?? this.resolveDefault();
  }

  withDefault(attributes: Record<string, any> | true = true): this {
    this.defaultAttributes = attributes;
    return this;
  }

  private resolveDefault(): T | null {
    if (!this.defaultAttributes) return null;
    const instance = new (this.relatedModel as any)() as T;
    if (typeof this.defaultAttributes === "object") {
      Object.entries(this.defaultAttributes).forEach(([k, v]) =>
          (instance as any).setAttribute(k, v),
      );
    }
    return instance;
  }

  // BelongsTo specific methods
  async associate(model: T | number | string | null): Promise<void> {
    if (model === null) {
      // Dissociate
      (this.parent as any).setAttribute(this.foreignKey, null);
      await (this.parent as any).save();
      return;
    }

    let relatedId: number | string;

    if (typeof model === "number" || typeof model === "string") {
      relatedId = model;
    } else {
      relatedId = (model as any).getAttribute(this.ownerKey);
      if (!relatedId) {
        await (model as any).save();
        relatedId = (model as any).getAttribute(this.ownerKey);
      }
    }

    (this.parent as any).setAttribute(this.foreignKey, relatedId);
    await (this.parent as any).save();
  }

  async dissociate(): Promise<void> {
    return this.associate(null);
  }

  // Update the related model
  async update(attributes: Record<string, any>): Promise<number> {
    const related = await this.getResults();
    if (!related) return 0;

    return await (related as any).update(attributes).then(() => 1);
  }
}

export class BelongsToMany<T extends Model> extends Relation<T> {
  private pivotColumns: string[] = [];
  private pivotWheres: Array<{ column: string; operator: string; value: any }> = [];

  constructor(
      private relatedModel: typeof Model,
      private pivotTable: string,
      private foreignPivotKey: string,
      private relatedPivotKey: string,
      private parentPrimaryKey: string = "id",
      private relatedPrimaryKey: string = "id",
      parent: Model,
      public pivotModel?: typeof Model,
  ) {
    super(relatedModel, parent);
    // Ensure pivot model traits are booted so softDeletes flag is set
    if (pivotModel && typeof (pivotModel as any).ensureBooted === "function") {
      (pivotModel as any).ensureBooted();
    }
  }

  /** Returns true when the pivot model has the SoftDeletes trait applied */
  private get pivotSoftDeletes(): boolean {
    return !!(this.pivotModel && (this.pivotModel as any).softDeletes);
  }

  /**
   * Build the extra WHERE conditions from the pivot model's soft deletes + global scopes (SQL).
   * Returns { sql, params } where sql is a fragment like ' AND deleted_at IS NULL AND ...'
   */
  private buildPivotModelFiltersSQL(): { sql: string; params: any[] } {
    if (!this.pivotModel) return { sql: "", params: [] };
    let sql = "";
    const params: any[] = [];
    if (this.pivotSoftDeletes) {
      sql += " AND deleted_at IS NULL";
    }
    const globalScopes = (this.pivotModel as any).globalScopes as
        | Record<string, (b: EloquentBuilder<any>) => void>
        | undefined;
    if (globalScopes && Object.keys(globalScopes).length) {
      const b = new EloquentBuilder(this.pivotModel!);
      Object.values(globalScopes).forEach((scope) => scope(b));
      const w = (b as any).buildWhereClause() as { sql: string; params: any[] };
      if (w.sql) {
        sql += w.sql.replace(/^\s*WHERE\s*/i, " AND ");
        params.push(...w.params);
      }
    }
    return { sql, params };
  }

  /**
   * Build the extra filter conditions from the pivot model's soft deletes + global scopes (MongoDB).
   */
  private buildPivotModelFiltersMongo(): Record<string, any> {
    if (!this.pivotModel) return {};
    const filter: Record<string, any> = {};
    if (this.pivotSoftDeletes) {
      filter.deleted_at = null;
    }
    const globalScopes = (this.pivotModel as any).globalScopes as
        | Record<string, (b: EloquentBuilder<any>) => void>
        | undefined;
    if (globalScopes && Object.keys(globalScopes).length) {
      const b = new EloquentBuilder(this.pivotModel!);
      Object.values(globalScopes).forEach((scope) => scope(b));
      const scopeFilter = (b as any).buildMongoFilter() as Record<string, any>;
      if (scopeFilter && Object.keys(scopeFilter).length) {
        Object.assign(filter, scopeFilter);
      }
    }
    return filter;
  }

  async getResults(): Promise<T[]> {
    const parentId = (this.parent as any).getAttribute(this.parentPrimaryKey);
    if (parentId === undefined || parentId === null) return [];

    if (getDbType() === "mongodb") {
      const pc = mongoCollection(this.pivotTable);
      const pidStr = String(parentId);
      const pidNum = parseInt(pidStr, 10);
      const parentMatch: any[] = isNaN(pidNum) ? [pidStr] : [pidStr, pidNum];
      const pivotFilter: any = { [this.foreignPivotKey]: { $in: parentMatch } };
      // Apply pivot model filters (soft deletes + global scopes)
      Object.assign(pivotFilter, this.buildPivotModelFiltersMongo());
      this.pivotWheres.forEach((w) => {
        const op = (w.operator || "=").toLowerCase();
        const m =
            op === "!=" || op === "<>"
                ? "$ne"
                : op === "in"
                    ? "$in"
                    : op === "not in"
                        ? "$nin"
                        : "$eq";
        Object.assign(pivotFilter, { [w.column]: { [m]: w.value } });
      });
      const pivots = await pc.find(pivotFilter).toArray();
      if (!pivots.length) return [];
      const relatedIds = pivots.map((r: any) => String(r[this.relatedPivotKey]));
      const rc = mongoCollection((this.relatedModel as typeof Model).getTable());
      const useObjectId = this.relatedPrimaryKey === "id";
      const filter: any = useObjectId
          ? {
            _id: {
              $in: relatedIds.map((v: any) => {
                try {
                  return new ObjectId(String(v));
                } catch {
                  return v;
                }
              }),
            },
          }
          : { [this.relatedPrimaryKey]: { $in: relatedIds } };
      const docs = await rc.find(filter).toArray();
      // map _id to id for ORM
      docs.forEach((d) => {
        if (d && d._id && !("id" in d)) d.id = String(d._id);
      });
      const pivotMap = new Map(pivots.map((r: any) => [String(r[this.relatedPivotKey]), r]));
      return docs.map((row) => {
        const instance = new (this.relatedModel as any)(row) as T;
        const key = String((row as any)[this.relatedPrimaryKey]);
        const pivotData = pivotMap.get(key);
        if (pivotData) (instance as any).pivot = this.createPivot(pivotData);
        return instance;
      });
    }

    // Get related IDs from pivot with additional pivot conditions
    let pivotSql = `SELECT ${this.relatedPivotKey} AS related_id`;

    // Add pivot columns if specified
    if (this.pivotColumns.length > 0) {
      pivotSql += `, ${this.pivotColumns.join(", ")}`;
    }

    pivotSql += ` FROM ${this.pivotTable} WHERE ${this.foreignPivotKey} = ?`;
    // Apply pivot model filters (soft deletes + global scopes)
    const pivotModelFilters = this.buildPivotModelFiltersSQL();
    if (pivotModelFilters.sql) {
      pivotSql += pivotModelFilters.sql;
    }
    const pivotParams: any[] = [parentId, ...pivotModelFilters.params];

    // Add pivot where conditions
    this.pivotWheres.forEach((where) => {
      pivotSql += ` AND ${where.column} ${where.operator} ?`;
      pivotParams.push(where.value);
    });

    const pivotRows = await dbQuery<any>(pivotSql, pivotParams);
    const relatedIds = pivotRows.map((r: any) => r.related_id);

    if (!relatedIds.length) return [];

    const placeholders = relatedIds.map(() => "?").join(",");
    const rows = await dbQuery<any>(
        `SELECT * FROM ${(this.relatedModel as typeof Model).getTable()} WHERE ${this.relatedPrimaryKey} IN (${placeholders})`,
        relatedIds,
    );

    // Attach pivot data to related models
    const pivotMap = new Map(pivotRows.map((r: any) => [r.related_id, r]));

    return rows.map((row) => {
      const instance = new (this.relatedModel as any)(row) as T;
      const pivotData = pivotMap.get(row[this.relatedPrimaryKey]);
      if (pivotData) {
        (instance as any).pivot = this.createPivot(pivotData);
      }
      return instance;
    });
  }

  async get(): Promise<T[]> {
    return this.getResults();
  }

  // Pivot management methods
  withPivot(...columns: string[]): this {
    this.pivotColumns.push(...columns);
    return this;
  }

  wherePivot(column: string, operator: any, value?: any): this {
    if (value === undefined) {
      value = operator;
      operator = "=";
    }

    this.pivotWheres.push({ column, operator, value });
    return this;
  }

  async attach(
      relatedId: number | string | Record<string, any> | (number | string | Record<string, any>)[],
      extra: Record<string, any> = {},
  ): Promise<void> {
    const parentId = (this.parent as any).getAttribute(this.parentPrimaryKey);
    if (parentId === undefined || parentId === null) return;

    const attachments = Array.isArray(relatedId) ? relatedId : [relatedId];
    const isMongo = getDbType() === "mongodb";

    for (const attachment of attachments) {
      let actualRelatedId: number | string;
      let pivotData: Record<string, any> = { ...extra };

      if (typeof attachment === "number" || typeof attachment === "string") {
        actualRelatedId = attachment;
      } else {
        actualRelatedId = attachment[this.relatedPrimaryKey];
        pivotData = { ...attachment, ...extra };
        delete pivotData[this.relatedPrimaryKey];
      }

      if (isMongo) {
        const pc = mongoCollection(this.pivotTable);
        const pid = coerceFK(this.foreignPivotKey, parentId);
        const rid = coerceFK(this.relatedPivotKey, actualRelatedId);
        await pc.updateOne(
            { [this.foreignPivotKey]: pid, [this.relatedPivotKey]: rid } as any,
            { $set: { ...pivotData, [this.foreignPivotKey]: pid, [this.relatedPivotKey]: rid } },
            { upsert: true },
        );
        continue;
      }

      const columns = [this.foreignPivotKey, this.relatedPivotKey, ...Object.keys(pivotData)];
      const placeholders = columns.map(() => "?").join(",");
      const values = [parentId, actualRelatedId, ...Object.values(pivotData)];

      if (Object.keys(pivotData).length === 0) {
        // simple insert for two-column pivot without extra data — ignore duplicates
        await dbQuery(
            `INSERT IGNORE INTO ${this.pivotTable} (${columns.join(",")}) VALUES (${placeholders})`,
            values,
        );
      } else {
        // upsert with provided pivot data
        const updateClause = Object.keys(pivotData)
            .map((k) => `${k} = ?`)
            .join(", ");
        await dbQuery(
            `INSERT INTO ${this.pivotTable} (${columns.join(",")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`,
            [...values, ...Object.values(pivotData)],
        );
      }
    }
  }

  async detach(relatedIds?: (number | string)[]): Promise<number> {
    const parentId = (this.parent as any).getAttribute(this.parentPrimaryKey);
    if (parentId === undefined || parentId === null) return 0;
    const isMongo = getDbType() === "mongodb";

    if (isMongo) {
      const pc = mongoCollection(this.pivotTable);
      const parentForms: any[] = (() => {
        const s = String(parentId);
        const list: any[] = [coerceFK(this.foreignPivotKey, parentId), s];
        const n = parseInt(s, 10);
        if (!isNaN(n)) list.push(n);
        if (/^[0-9a-fA-F]{24}$/.test(s)) {
          try {
            list.push(new ObjectId(s));
          } catch {}
        }
        return Array.from(new Set(list.map((x) => (x instanceof ObjectId ? x : String(x))))).map(
            (x) => (typeof x === "string" && /^[0-9a-fA-F]{24}$/.test(x) ? new ObjectId(x) : x),
        );
      })();
      if (relatedIds && relatedIds.length > 0) {
        const relForms = Array.from(
            new Set(
                relatedIds.flatMap((id) => {
                  const s = String(id);
                  const arr: any[] = [coerceFK(this.relatedPivotKey, id), s];
                  const n = parseInt(s, 10);
                  if (!isNaN(n)) arr.push(n);
                  if (/^[0-9a-fA-F]{24}$/.test(s)) {
                    try {
                      arr.push(new ObjectId(s));
                    } catch {}
                  }
                  return arr;
                }),
            ),
        );
        const res = await pc.deleteMany({
          [this.foreignPivotKey]: { $in: parentForms },
          [this.relatedPivotKey]: { $in: relForms },
        } as any);
        return Number(res.deletedCount || 0);
      }
      const res = await pc.deleteMany({ [this.foreignPivotKey]: { $in: parentForms } } as any);
      return Number(res.deletedCount || 0);
    }

    let sql = `DELETE FROM ${this.pivotTable} WHERE ${this.foreignPivotKey} = ?`;
    const params: any[] = [parentId];

    if (relatedIds && relatedIds.length > 0) {
      const placeholders = relatedIds.map(() => "?").join(",");
      sql += ` AND ${this.relatedPivotKey} IN (${placeholders})`;
      params.push(...relatedIds);
    }

    const result: any = await dbQuery(sql, params);
    return result.affectedRows || 0;
  }

  async sync(
      relatedIds: (number | string | Record<string, any>)[],
      detaching: boolean = true,
  ): Promise<{ attached: any[]; detached: any[]; updated: any[] }> {
    const parentId = (this.parent as any).getAttribute(this.parentPrimaryKey);
    if (parentId === undefined || parentId === null) {
      return { attached: [], detached: [], updated: [] };
    }

    const isMongo = getDbType() === "mongodb";

    // Get current related IDs
    let currentIdsSet = new Set<any>();
    if (isMongo) {
      const pc = mongoCollection(this.pivotTable);
      const pidVal = coerceFK(this.foreignPivotKey, parentId);
      const rows = await pc
          .find({ [this.foreignPivotKey]: pidVal } as any)
          .project({ [this.relatedPivotKey]: 1, _id: 0 })
          .toArray();
      currentIdsSet = new Set(rows.map((r: any) => String(r[this.relatedPivotKey])));
    } else {
      const currentPivotRows = await dbQuery<any>(
          `SELECT ${this.relatedPivotKey} FROM ${this.pivotTable} WHERE ${this.foreignPivotKey} = ?`,
          [parentId],
      );
      currentIdsSet = new Set(currentPivotRows.map((r: any) => r[this.relatedPivotKey]));
    }

    const newIds = new Set<any>();
    const attached: any[] = [];
    const detached: any[] = [];
    const updated: any[] = [];

    for (const related of relatedIds) {
      let actualId: any;
      let extraData: Record<string, any> = {};

      if (typeof related === "number" || typeof related === "string") {
        actualId = related;
      } else {
        actualId = related[this.relatedPrimaryKey];
        extraData = { ...related };
        delete extraData[this.relatedPrimaryKey];
      }

      newIds.add(String(actualId));

      if (currentIdsSet.has(String(actualId))) {
        if (Object.keys(extraData).length > 0) {
          if (isMongo) {
            const pidVal = coerceFK(this.foreignPivotKey, parentId);
            const ridVal = coerceFK(this.relatedPivotKey, actualId);
            await mongoCollection(this.pivotTable).updateOne(
                { [this.foreignPivotKey]: pidVal, [this.relatedPivotKey]: ridVal } as any,
                { $set: extraData },
            );
          } else {
            const setSql = Object.keys(extraData)
                .map((k) => `${k} = ?`)
                .join(", ");
            await dbQuery(
                `UPDATE ${this.pivotTable} SET ${setSql} WHERE ${this.foreignPivotKey} = ? AND ${this.relatedPivotKey} = ?`,
                [...Object.values(extraData), parentId, actualId],
            );
          }
          updated.push(actualId);
        }
      } else {
        await this.attach({ [this.relatedPrimaryKey]: actualId, ...extraData } as any);
        attached.push(actualId);
      }
    }

    if (detaching) {
      for (const currentId of currentIdsSet) {
        if (!newIds.has(String(currentId))) {
          await this.detach([currentId]);
          detached.push(currentId);
        }
      }
    }

    return { attached, detached, updated };
  }

  async toggle(relatedIds: (number | string)[]): Promise<{ attached: any[]; detached: any[] }> {
    const parentId = (this.parent as any).getAttribute(this.parentPrimaryKey);
    if (parentId === undefined || parentId === null) {
      return { attached: [], detached: [] };
    }
    const isMongo = getDbType() === "mongodb";

    // Check which IDs are currently attached
    const toCheck = relatedIds;
    let currentRows: any[] = [];
    if (isMongo) {
      const pc = mongoCollection(this.pivotTable);
      const pidVal = coerceFK(this.foreignPivotKey, parentId);
      const relList = Array.from(
          new Set(
              toCheck.flatMap((id) => {
                const s = String(id);
                const arr: any[] = [coerceFK(this.relatedPivotKey, id), s];
                const n = parseInt(s, 10);
                if (!isNaN(n)) arr.push(n);
                if (/^[0-9a-fA-F]{24}$/.test(s)) {
                  try {
                    arr.push(new ObjectId(s));
                  } catch {}
                }
                return arr;
              }),
          ),
      );
      currentRows = await pc
          .find({ [this.foreignPivotKey]: pidVal, [this.relatedPivotKey]: { $in: relList } } as any)
          .project({ [this.relatedPivotKey]: 1, _id: 0 })
          .toArray();
    } else {
      const placeholders = relatedIds.map(() => "?").join(",");
      currentRows = await dbQuery<any>(
          `SELECT ${this.relatedPivotKey} FROM ${this.pivotTable} 
       WHERE ${this.foreignPivotKey} = ? AND ${this.relatedPivotKey} IN (${placeholders})`,
          [parentId, ...relatedIds],
      );
    }

    const currentIds = new Set(currentRows.map((r: any) => String(r[this.relatedPivotKey])));

    const toAttach = relatedIds.filter((id) => !currentIds.has(String(id)));
    const toDetach = relatedIds.filter((id) => currentIds.has(String(id)));

    if (toAttach.length > 0) {
      await this.attach(toAttach);
    }

    if (toDetach.length > 0) {
      await this.detach(toDetach);
    }

    return {
      attached: toAttach,
      detached: toDetach,
    };
  }

  async updateExistingPivot(
      relatedId: number | string,
      attributes: Record<string, any>,
  ): Promise<number> {
    const parentId = (this.parent as any).getAttribute(this.parentPrimaryKey);
    if (parentId === undefined || parentId === null) return 0;
    const isMongo = getDbType() === "mongodb";

    if (isMongo) {
      const pidStr = String(parentId);
      const ridStr = String(relatedId);
      const res = await mongoCollection(this.pivotTable).updateOne(
          { [this.foreignPivotKey]: pidStr, [this.relatedPivotKey]: ridStr } as any,
          { $set: attributes },
      );
      return Number(res.modifiedCount || 0);
    }

    const setSql = Object.keys(attributes)
        .map((k) => `${k} = ?`)
        .join(", ");
    const result: any = await dbQuery(
        `UPDATE ${this.pivotTable} SET ${setSql} WHERE ${this.foreignPivotKey} = ? AND ${this.relatedPivotKey} = ?`,
        [...Object.values(attributes), parentId, relatedId],
    );

    return result.affectedRows || 0;
  }

  private createPivot(pivotData: Record<string, any>): Pivot {
    return new Pivot(pivotData, this.pivotTable, this.foreignPivotKey, this.relatedPivotKey);
  }
}

// Pivot model for many-to-many relationships
export class Pivot {
  public exists: boolean = true;

  constructor(
      private attributes: Record<string, any>,
      private pivotTable: string,
      private foreignPivotKey: string,
      private relatedPivotKey: string,
  ) {}

  getAttribute<T = any>(key: string): T {
    return this.attributes[key];
  }

  setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  toJSON(): any {
    return { ...this.attributes };
  }

  async save(): Promise<boolean> {
    const foreignValue = this.attributes[this.foreignPivotKey];
    const relatedValue = this.attributes[this.relatedPivotKey];

    if (!foreignValue || !relatedValue) return false;

    const updateData = { ...this.attributes };
    delete updateData[this.foreignPivotKey];
    delete updateData[this.relatedPivotKey];

    if (getDbType() === "mongodb") {
      const res = await mongoCollection(this.pivotTable).updateOne(
          { [this.foreignPivotKey]: foreignValue, [this.relatedPivotKey]: relatedValue } as any,
          { $set: updateData },
      );
      return Number(res.modifiedCount || 0) > 0;
    }

    const setSql = Object.keys(updateData)
        .map((k) => `${k} = ?`)
        .join(", ");
    const values = [...Object.values(updateData), foreignValue, relatedValue];

    const result: any = await dbQuery(
        `UPDATE ${this.pivotTable} SET ${setSql} WHERE ${this.foreignPivotKey} = ? AND ${this.relatedPivotKey} = ?`,
        values,
    );

    return result.affectedRows > 0;
  }

  async delete(): Promise<boolean> {
    const foreignValue = this.attributes[this.foreignPivotKey];
    const relatedValue = this.attributes[this.relatedPivotKey];

    if (!foreignValue || !relatedValue) return false;

    if (getDbType() === "mongodb") {
      const res = await mongoCollection(this.pivotTable).deleteOne({
        [this.foreignPivotKey]: foreignValue,
        [this.relatedPivotKey]: relatedValue,
      } as any);
      if (Number(res.deletedCount || 0) > 0) {
        this.exists = false;
        return true;
      }
      return false;
    }

    const result: any = await dbQuery(
        `DELETE FROM ${this.pivotTable} WHERE ${this.foreignPivotKey} = ? AND ${this.relatedPivotKey} = ?`,
        [foreignValue, relatedValue],
    );

    if (result.affectedRows > 0) {
      this.exists = false;
      return true;
    }

    return false;
  }
}

// ─── Through relationships ────────────────────────────────────────────────────

/**
 * HasOneThrough — reach a distant model through an intermediate one.
 *
 * Example: User hasOneThrough(Insurance, Policy, 'user_id', 'policy_id', 'id', 'id')
 *   users → policies (via policies.user_id) → insurances (via insurances.policy_id)
 */
export class HasOneThrough<T extends Model> extends Relation<T> {
  constructor(
      protected relatedModel: typeof Model,
      protected throughModel: typeof Model,
      protected firstKey: string,
      protected secondKey: string,
      protected localKey: string = "id",
      protected secondLocalKey: string = "id",
      parent: Model,
  ) {
    super(relatedModel, parent);
  }

  async getResults(): Promise<T | null> {
    const localValue = (this.parent as any).getAttribute(this.localKey);
    if (localValue === undefined || localValue === null) return null;

    if (getDbType() === "mongodb") {
      const tc = mongoCollection((this.throughModel as typeof Model).getTable());
      const throughDoc = await tc.findOne({ [this.firstKey]: localValue } as any);
      if (!throughDoc) return null;
      let secondValue = throughDoc[this.secondLocalKey];
      if ((secondValue === undefined || secondValue === null) && this.secondLocalKey === "id" && throughDoc._id) {
        secondValue = String(throughDoc._id);
      }
      if (secondValue === undefined || secondValue === null) return null;
      const rc = mongoCollection((this.relatedModel as typeof Model).getTable());
      const doc = await rc.findOne({ [this.secondKey]: secondValue } as any);
      if (!doc) return null;
      if (doc._id && !("id" in doc)) doc.id = String(doc._id);
      const inst = new (this.relatedModel as any)() as T;
      inst.hydrate(doc);
      return inst;
    }

    const throughTable = (this.throughModel as typeof Model).getTable();
    const relatedTable = (this.relatedModel as typeof Model).getTable();
    const rows = await dbQuery<any>(
        `SELECT ${relatedTable}.* FROM ${relatedTable}
       INNER JOIN ${throughTable} ON ${throughTable}.${this.secondLocalKey} = ${relatedTable}.${this.secondKey}
       WHERE ${throughTable}.${this.firstKey} = ? LIMIT 1`,
        [localValue],
    );
    if (!rows.length) return null;
    const inst = new (this.relatedModel as any)() as T;
    inst.hydrate(rows[0]);
    return inst;
  }

  async get(): Promise<T[]> {
    const result = await this.getResults();
    return result ? [result] : [];
  }

  async first(): Promise<T | null> {
    return this.getResults();
  }
}

/**
 * HasManyThrough — reach many distant models through an intermediate one.
 *
 * Example: Country hasManyThrough(Post, User, 'country_id', 'user_id', 'id', 'id')
 *   countries → users (via users.country_id) → posts (via posts.user_id)
 */
export class HasManyThrough<T extends Model> extends Relation<T> {
  constructor(
      protected relatedModel: typeof Model,
      protected throughModel: typeof Model,
      protected firstKey: string,
      protected secondKey: string,
      protected localKey: string = "id",
      protected secondLocalKey: string = "id",
      parent: Model,
  ) {
    super(relatedModel, parent);
  }

  async getResults(): Promise<T[]> {
    const localValue = (this.parent as any).getAttribute(this.localKey);
    if (localValue === undefined || localValue === null) return [];

    if (getDbType() === "mongodb") {
      const tc = mongoCollection((this.throughModel as typeof Model).getTable());
      const firstMatchVals: any[] = [localValue, String(localValue)];
      if (/^[0-9a-fA-F]{24}$/.test(String(localValue))) {
        try { firstMatchVals.push(new ObjectId(String(localValue))); } catch { /**/ }
      }
      const throughDocs = await tc.find({ [this.firstKey]: { $in: firstMatchVals } } as any).toArray();
      if (!throughDocs.length) return [];
      const secondValues = throughDocs
          .map((d: any) => {
            const val = d[this.secondLocalKey];
            // Raw MongoDB docs have _id not id — fall back to _id when secondLocalKey is "id"
            if ((val === undefined || val === null) && this.secondLocalKey === "id" && d._id) {
              return String(d._id);
            }
            return val;
          })
          .filter((v: any) => v !== undefined && v !== null);
      if (!secondValues.length) return [];
      const rc = mongoCollection((this.relatedModel as typeof Model).getTable());
      // Build $in filter covering both ObjectId and string forms of the IDs
      const matchVals: any[] = Array.from(
          new Set(
              secondValues.flatMap((v: any) => {
                const s = String(v);
                const forms: any[] = [v, s];
                if (/^[0-9a-fA-F]{24}$/.test(s)) {
                  try { forms.push(new ObjectId(s)); } catch { /**/ }
                }
                return forms;
              }),
          ),
      );
      const docs = await rc
          .find({ [this.secondKey]: { $in: matchVals } } as any)
          .toArray();
      return docs.map((doc: any) => {
        if (doc._id && !("id" in doc)) doc.id = String(doc._id);
        const inst = new (this.relatedModel as any)() as T;
        inst.hydrate(doc);
        return inst;
      });
    }

    const throughTable = (this.throughModel as typeof Model).getTable();
    const relatedTable = (this.relatedModel as typeof Model).getTable();

    const whereClauses = (this.builder as any).whereClauses as any[];
    let extraSql = "";
    const extraParams: any[] = [];
    if (whereClauses.length) {
      extraSql = whereClauses
          .map((w: any) => ` AND ${relatedTable}.${w.column} ${w.operator} ?`)
          .join("");
      extraParams.push(...whereClauses.map((w: any) => w.value));
    }

    const softDelete = (this.relatedModel as any).softDeletes
        ? ` AND ${relatedTable}.deleted_at IS NULL`
        : "";

    const rows = await dbQuery<any>(
        `SELECT ${relatedTable}.* FROM ${relatedTable}
       INNER JOIN ${throughTable} ON ${throughTable}.${this.secondLocalKey} = ${relatedTable}.${this.secondKey}
       WHERE ${throughTable}.${this.firstKey} = ?${softDelete}${extraSql}`,
        [localValue, ...extraParams],
    );
    return rows.map((row: any) => {
      const inst = new (this.relatedModel as any)() as T;
      inst.hydrate(row);
      return inst;
    });
  }

  async get(): Promise<T[]> {
    return this.getResults();
  }

  async first(): Promise<T | null> {
    const all = await this.getResults();
    return all[0] || null;
  }
}

// Morph relationships
export class MorphOne<T extends Model> extends HasOne<T> {
  private morphType: string;

  constructor(
      relatedModel: typeof Model,
      morphType: string,
      foreignKey: string,
      localKey: string = "id",
      parent: Model,
  ) {
    super(relatedModel, foreignKey, localKey, parent);
    this.morphType = morphType;
  }

  async getResults(): Promise<T | null> {
    const localValue = (this.parent as any).getAttribute(this.localKey);
    if (localValue === undefined || localValue === null) return null;

    this.builder
        .where(this.foreignKey, localValue)
        .where(`${this.morphType}_type`, this.parent.constructor.name);

    return await this.builder.first();
  }

  async create(attributes: Record<string, any>): Promise<T> {
    attributes[this.foreignKey] = (this.parent as any).getAttribute(this.localKey);
    attributes[`${this.morphType}_type`] = this.parent.constructor.name;

    const instance = new (this.relatedModel as any)(attributes) as T;
    await (instance as any).save();
    return instance;
  }
}

export class MorphMany<T extends Model> extends HasMany<T> {
  private morphType: string;

  constructor(
      relatedModel: typeof Model,
      morphType: string,
      foreignKey: string,
      localKey: string = "id",
      parent: Model,
  ) {
    super(relatedModel, foreignKey, localKey, parent);
    this.morphType = morphType;
  }

  async getResults(): Promise<T[]> {
    const localValue = (this.parent as any).getAttribute(this.localKey);
    if (localValue === undefined || localValue === null) return [];

    this.builder
        .where(this.foreignKey, localValue)
        .where(`${this.morphType}_type`, this.parent.constructor.name);

    return await this.builder.get();
  }

  async create(attributes: Record<string, any>): Promise<T> {
    const foreignValue = (this.parent as any).getAttribute(this.localKey);
    attributes[this.foreignKey] = foreignValue;
    attributes[`${this.morphType}_type`] = this.parent.constructor.name;

    const instance = new (this.relatedModel as any)(attributes) as T;
    await (instance as any).save();
    return instance;
  }
}

export class MorphTo<T extends Model> extends Relation<T> {
  private morphType: string;
  private morphId: string;

  constructor(
      morphType: string,
      morphId: string,
      parent: Model,
      private morphMap?: Record<string, typeof Model>,
  ) {
    super(Model, parent); // Base model, will be overridden
    this.morphType = morphType;
    this.morphId = morphId;
  }

  async getResults(): Promise<T | null> {
    const type = (this.parent as any).getAttribute(this.morphType);
    const id = (this.parent as any).getAttribute(this.morphId);

    if (!type || !id) return null;

    // Resolve the actual model class from morph map or type
    let modelClass: typeof Model = this.morphMap?.[type] || Model;

    // Try to find the model by convention if not in morph map
    if (modelClass === Model) {
      // You might want to implement a naming convention here
      // For example: convert "User" to user model class
    }

    this.related = modelClass;
    this.builder = new EloquentBuilder<T>(modelClass as any);

    this.builder.where((modelClass as any).primaryKey || "id", id);
    return await this.builder.first();
  }
}
