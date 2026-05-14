// example-traits.ts - Example trait classes
import { trait, scopeMethod, macroMethod } from "./traits.js";
import { Model } from "../Model.js";
import { EloquentBuilder } from "../EloquentBuilder.js";

/**
 * SoftDeletes trait as a class (Laravel style)
 * Usage: use SoftDeletes;
 */
@trait("SoftDeletes")
export class SoftDeletes {
  /**
   * Determine if the model has been soft-deleted
   */
  trashed(): boolean {
    const model = this as any as Model;
    return !!(model as any).deleted_at;
  }

  /**
   * Determine if the model is not soft-deleted
   */
  isNotTrashed(): boolean {
    return !this.trashed();
  }

  /**
   * Force delete the model (bypass soft delete)
   */
  async forceDelete(): Promise<boolean> {
    const model = this as any as Model;
    return model.delete(true);
  }

  /**
   * Restore a soft-deleted model
   */
  async restore(): Promise<boolean> {
    const model = this as any as Model;
    return (model as any).restore();
  }

  /**
   * Boot method for the trait
   */
  static boot(modelClass: typeof Model): void {
    // Add soft delete flags
    (modelClass as any).softDeletes = true;
  }
}

/**
 * Timestamps trait (auto-manages created_at and updated_at)
 * Usage: use Timestamps;
 */
@trait("Timestamps")
export class Timestamps {
  /**
   * Touch the model's timestamps
   */
  async touch(): Promise<void> {
    const model = this as any as Model;
    const staticClass = model.constructor as typeof Model;

    if (!(staticClass as any).timestamps) return;

    model.setAttribute("updated_at", new Date());
    await model.save();
  }

  /**
   * Disable timestamps for the current operation
   */
  withoutTimestamps(callback: Function): any {
    const model = this as any as Model;
    const staticClass = model.constructor as typeof Model;
    const original = (staticClass as any).timestamps;
    (staticClass as any).timestamps = false;

    try {
      return callback();
    } finally {
      (staticClass as any).timestamps = original;
    }
  }

  static boot(modelClass: typeof Model): void {
    modelClass.timestamps = true;
  }
}

/**
 * Sluggable trait for generating slugs
 * Usage: use Sluggable;
 */
@trait("Sluggable")
export class Sluggable {
  /**
   * Generate a slug from a given string
   */
  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim();
  }

  /**
   * Set slug from attribute
   */
  setSlugFrom(sourceField: string = "name"): void {
    const model = this as any as Model;
    const source = model.getAttribute(sourceField);
    if (source) {
      model.setAttribute("slug", this.generateSlug(source));
    }
  }

  /**
   * Scope: Find by slug
   */
  @scopeMethod()
  static scopeFindBySlug(builder: EloquentBuilder<any>, slug: string) {
    return builder.where("slug", slug);
  }

  static boot(modelClass: typeof Model): void {
    // Use the suggested property on Model
    // Adjust if your Model exposes a different API.
    const registerEvent = (eventName: string, handler: Function) => {
      // Ensure static eventListeners map exists on the class and is not the shared base map
      const baseMap = (Model as any).eventListeners as any;
      const current = (modelClass as any).eventListeners;

      if (!current || current === baseMap) {
        // Create a fresh per-class map of empty arrays so we don't accidentally
        // push into the shared base map that other models also reference.
        (modelClass as any).eventListeners = {
          creating: [],
          created: [],
          updating: [],
          updated: [],
          saving: [],
          saved: [],
          deleting: [],
          deleted: [],
          restoring: [],
          restored: [],
          retrieved: [],
        } as any;
      }

      // Fallback: if eventListeners exists but the specific array is missing, create it
      if (!(modelClass as any).eventListeners[eventName]) {
        (modelClass as any).eventListeners[eventName] = [];
      }

      // Push handler directly to the static listeners map
      (modelClass as any).eventListeners[eventName].push(handler as any);
    };

    registerEvent("saving", (model: Model) => {
      const m: any = model as any;
      const isDirtyName = typeof m.isDirty === "function" ? m.isDirty("name") : true;
      const slugVal = typeof m.getAttribute === "function" ? m.getAttribute("slug") : m.slug;
      if (isDirtyName && !slugVal) {
        if (typeof m.setSlugFrom === "function") {
          m.setSlugFrom("name");
        } else if (m.name) {
          m.slug = String(m.name)
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        }
      }
      return true;
    });
  }
}

/**
 * Sortable trait for ordering
 * Usage: use Sortable;
 */
@trait("Sortable")
export class Sortable {
  /**
   * Reorder models
   */
  @macroMethod()
  static async reorder(ids: number[]): Promise<void> {
    const self = this as any;
    for (let i = 0; i < ids.length; i++) {
      await self
        .query()
        .where("id", ids[i])
        .update({ order: i + 1 });
    }
  }

  @macroMethod()
  static latest(this: typeof Model) {
    return this.query().orderBy("created_at", "desc");
  }
  @macroMethod()
  static oldest(this: typeof Model) {
    return this.query().orderBy("created_at", "asc");
  }

  /**
   * Move model up in order
   */
  async moveUp(): Promise<void> {
    const model = this as any as Model;
    const m: any = model as any;
    const currentOrder: number =
      typeof m.getAttribute === "function" ? m.getAttribute("order") : m.order;
    if (typeof currentOrder !== "number") return;
    if (currentOrder > 1) {
      const self = m.constructor as typeof Model as any;
      const itemAbove = await self
        .query()
        .where("order", currentOrder - 1)
        .first();

      if (itemAbove) {
        await m.update({ order: currentOrder - 1 });
        await (itemAbove as any).update({ order: currentOrder });
      }
    }
  }

  /**
   * Move model down in order
   */
  async moveDown(): Promise<void> {
    const model = this as any as Model;
    const m: any = model as any;
    const currentOrder: number =
      typeof m.getAttribute === "function" ? m.getAttribute("order") : m.order;
    if (typeof currentOrder !== "number") return;
    const self = m.constructor as typeof Model as any;
    const maxOrder = await self.query().max("order");

    if (typeof maxOrder === "number" && currentOrder < maxOrder) {
      const itemBelow = await self
        .query()
        .where("order", currentOrder + 1)
        .first();

      if (itemBelow) {
        await m.update({ order: currentOrder + 1 });
        await (itemBelow as any).update({ order: currentOrder });
      }
    }
  }

  /**
   * Scope: Order by order column
   */
  @scopeMethod()
  static scopeOrdered(builder: EloquentBuilder<any>, direction: "asc" | "desc" = "asc") {
    return builder.orderBy("order", direction);
  }
}

/**
 * Searchable trait for full-text search
 * Usage: use Searchable;
 */
@trait("Searchable")
export class Searchable {
  /**
   * Scope: Search in specified fields
   */
  @scopeMethod()
  static scopeSearch(
    builder: EloquentBuilder<any>,
    query: string,
    fields: string[] = ["name", "description"],
  ) {
    if (query) {
      fields.forEach((field, index) => {
        if (index === 0) {
          builder.where(field, "LIKE", `%${query}%`);
        } else {
          builder.orWhere(field, "LIKE", `%${query}%`);
        }
      });
    }
    return builder;
  }

  /**
   * Scope: Advanced search with filters
   */
  @scopeMethod()
  static scopeAdvancedSearch(builder: EloquentBuilder<any>, params: any) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          builder.whereIn(key, value);
        } else {
          builder.where(key, value);
        }
      }
    });
    return builder;
  }
}

/**
 * Cacheable trait for caching queries
 * Usage: use Cacheable;
 */
@trait("Cacheable")
export class Cacheable {
  /**
   * Cache a query result
   */
  @macroMethod()
  static cached(callback: Function, key: string, ttl: number = 3600): any {
    // Implementation depends on your cache system
    console.log(`Caching query with key: ${key}, TTL: ${ttl}s`);
    return callback();
  }

  /**
   * Clear model cache
   */
  @macroMethod()
  static clearCache(): void {
    console.log("Clearing model cache");
  }

  /**
   * Get with cache
   */
  @macroMethod()
  static getCached(id: number): any {
    const self = this as any;
    const cacheKey = `${self.name}:${id}`;
    return self.cached(
      () => self.find(id),
      cacheKey,
      300, // 5 minutes
    );
  }
}
