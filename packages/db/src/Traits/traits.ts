// traits.ts - New file for trait system
// traits.ts - Enhanced with class-based trait support
import { Model } from "../Model.js";
import { EloquentBuilder } from "../EloquentBuilder.js";

export interface TraitMethods {
  [methodName: string]: Function;
}

export interface ScopeMethod<T extends Model> {
  (builder: EloquentBuilder<T>, ...args: any[]): void;
}

export interface Trait {
  methods?: TraitMethods;
  boot?: (model: typeof Model) => void;
  scope?: { [name: string]: ScopeMethod<any> };
  macros?: { [name: string]: Function };
}

// Class-based trait interface
export interface ClassBasedTrait {
  new (): any;
  boot?(model: typeof Model): void;
  // __scopes?: Record<string, Function>;
  // __macros?: Record<string, Function>;
}

// Global trait registry
const traitRegistry = new Map<string, Trait>();
const classTraitRegistry = new Map<Function, Trait>();

/**
 * Register a trait globally by name
 */
export function registerTrait(name: string, trait: Trait): void {
  traitRegistry.set(name, trait);
}

/**
 * Register a class-based trait
 */
export function registerClassTrait(traitClass: ClassBasedTrait, trait: Trait): void {
  classTraitRegistry.set(traitClass, trait);
}

/**
 * Get a trait by name
 */
export function getTrait(name: string): Trait | undefined {
  return traitRegistry.get(name);
}

/**
 * Get a trait by class
 */
export function getTraitByClass(traitClass: Function): Trait | undefined {
  return classTraitRegistry.get(traitClass);
}

/**
 * Convert a trait class to a Trait configuration
 */
function convertTraitClassToConfig(traitClass: ClassBasedTrait): Trait {
  const traitConfig: Trait = {};
  const instance = new traitClass();

  // Collect instance methods
  const methods: TraitMethods = {};
  const prototype = Object.getPrototypeOf(instance);

  // Get all methods from the trait class
  const getAllMethods = (obj: any): string[] => {
    const methods: string[] = [];
    while (obj && obj !== Object.prototype) {
      methods.push(...Object.getOwnPropertyNames(obj));
      obj = Object.getPrototypeOf(obj);
    }
    return methods.filter((method) => method !== "constructor");
  };

  const methodNames = getAllMethods(prototype);
  methodNames.forEach((methodName) => {
    if (typeof instance[methodName] === "function") {
      // Use the unbound prototype method so that when it is mixed into a model's
      // prototype and called on a model instance, `this` refers to the model (not
      // the trait instance).  A pre-bound function cannot be re-bound, which would
      // cause `this` to be the trait instance rather than the model.
      methods[methodName] = traitClass.prototype[methodName];
    }
  });

  if (Object.keys(methods).length > 0) {
    traitConfig.methods = methods;
  }

  // Check for static methods (scopes/macros)
  const staticProperties = Object.getOwnPropertyNames(traitClass);
  const scopeMethods: { [name: string]: ScopeMethod<any> } = {};
  const macros: { [name: string]: Function } = {};

  staticProperties.forEach((prop) => {
    if (prop === "length" || prop === "name" || prop === "prototype") return;

    const value = (traitClass as any)[prop];
    if (typeof value === "function") {
      // Check if it's a scope method (starts with 'scope')
      if (prop.startsWith("scope") && prop.length > 5) {
        const scopeName = prop.charAt(5).toLowerCase() + prop.slice(6);
        scopeMethods[scopeName] = value;
      } else {
        // Treat as macro
        macros[prop] = value;
      }
    }
  });

  if (Object.keys(scopeMethods).length > 0) {
    traitConfig.scope = scopeMethods;
  }

  if (Object.keys(macros).length > 0) {
    traitConfig.macros = macros;
  }

  // Check for boot method
  if (typeof (traitClass as any).boot === "function") {
    traitConfig.boot = (traitClass as any).boot;
  }

  // Also check for boot method on instance
  if (typeof instance.boot === "function") {
    const originalBoot = traitConfig.boot;
    traitConfig.boot = (model: typeof Model) => {
      if (originalBoot) originalBoot(model);
      instance.boot(model);
    };
  }

  return traitConfig;
}

/**
 * Apply traits to a model class (supports both string names and classes)
 */
export function applyTraits(
  modelClass: typeof Model,
  traitNamesOrClasses: Array<string | ClassBasedTrait>,
): void {
  for (const traitRef of traitNamesOrClasses) {
    let trait: Trait | undefined;

    if (typeof traitRef === "string") {
      // String trait name
      trait = traitRegistry.get(traitRef);
      if (!trait) {
        throw new Error(`Trait "${traitRef}" not found`);
      }
    } else {
      // Class-based trait
      trait = getTraitByClass(traitRef);
      if (!trait) {
        // Convert class to trait configuration
        trait = convertTraitClassToConfig(traitRef);
        registerClassTrait(traitRef, trait);
      }
    }

    // Apply methods
    if (trait.methods) {
      Object.entries(trait.methods).forEach(([methodName, method]) => {
        if (!(methodName in modelClass.prototype)) {
          modelClass.prototype[methodName] = method;
        } else {
          // Avoid overriding existing methods
          //console.warn(`Trait method "${methodName}" skipped: already exists on model.`);
        }
      });
    }

    // Apply scopes
    if (trait.scope) {
      Object.entries(trait.scope).forEach(([scopeName, scopeMethod]) => {
        const staticMethodName = `scope${scopeName.charAt(0).toUpperCase() + scopeName.slice(1)}`;
        if (!(staticMethodName in modelClass)) {
          (modelClass as any)[staticMethodName] = scopeMethod;
        } else {
          // console.warn(`Trait scope "${staticMethodName}" skipped: already exists on model.`);
        }
      });
    }

    // Apply macros
    if (trait.macros) {
      Object.entries(trait.macros).forEach(([macroName, macro]) => {
        if (!(macroName in modelClass)) {
          (modelClass as any)[macroName] = macro;
        } else {
          //console.warn(`Trait macro "${macroName}" skipped: already exists on model.`);
        }
        if (!(macroName in EloquentBuilder.prototype)) {
          (EloquentBuilder.prototype as any)[macroName] = macro;
        }
      });
    }

    if (trait.boot) {
      trait.boot(modelClass);
    }
  }
}

/**
 * Define a scope trait
 */
export function scope(name: string, callback: ScopeMethod<any>): void {
  const scopeMethodName = `scope${name.charAt(0).toUpperCase() + name.slice(1)}`;
  const traitName = `Scopes${name.charAt(0).toUpperCase() + name.slice(1)}`;

  if (!traitRegistry.has(traitName)) {
    registerTrait(traitName, {
      scope: {
        [name]: callback,
      },
    });
  }
}

/**
 * Define a macro trait
 */
export function macro(name: string, callback: Function): void {
  const traitName = `Macros${name.charAt(0).toUpperCase() + name.slice(1)}`;

  if (!traitRegistry.has(traitName)) {
    registerTrait(traitName, {
      macros: {
        [name]: callback,
      },
    });
  }
}

/**
 * Decorator for class-based traits
 */
export function trait(name?: string): ClassDecorator {
  return function (constructor: Function): void {
    const traitConfig = convertTraitClassToConfig(constructor as ClassBasedTrait);
    if (name) {
      registerTrait(name, traitConfig);
    }
    registerClassTrait(constructor as ClassBasedTrait, traitConfig);
  };
}

/**
 * Decorator for marking methods as scopes
 * Usage:
 * @scopeMethod()
 * static scopeFindBySlug(builder: EloquentBuilder<any>, slug: string) { ... }
 */
export function scopeMethod(): MethodDecorator {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    if (typeof propertyKey === "string") {
      if (propertyKey.startsWith("scope") && propertyKey.length > 5) {
        const scopeName = propertyKey.charAt(5).toLowerCase() + propertyKey.slice(6);
        const ctor = (target as any).constructor as Function & {
          __scopes?: Record<string, Function>;
        };
        ctor.__scopes = ctor.__scopes || {};
        ctor.__scopes[scopeName] = descriptor.value as Function;
      }
    }
  };
}

/**
 * Decorator for marking methods as macros
 * Usage:
 * @macroMethod()
 * static cached(callback: Function, key: string, ttl: number) { ... }
 */
export function macroMethod(): MethodDecorator {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    if (typeof propertyKey === "string") {
      const ctor = (target as any).constructor as Function & {
        __macros?: Record<string, Function>;
      };
      ctor.__macros = ctor.__macros || {};
      ctor.__macros[propertyKey] = descriptor.value as Function;
    }
  };
}

/**
 * Alternative: Function-based decorators without TypeScript decorator metadata
 * These work with older TypeScript versions or when decorator metadata is disabled
 */

/**
 * Function to mark a method as a scope (alternative to decorator)
 */
export function markAsScope(
  target: any,
  propertyKey: string,
  descriptor?: PropertyDescriptor,
): void {
  if (propertyKey.startsWith("scope") && propertyKey.length > 5) {
    const scopeName = propertyKey.charAt(5).toLowerCase() + propertyKey.slice(6);
    const ctor = target.constructor as Function & { __scopes?: Record<string, Function> };
    ctor.__scopes = ctor.__scopes || {};
    ctor.__scopes[scopeName] = (descriptor?.value ?? target[propertyKey]) as Function;
  }
}

/**
 * Function to mark a method as a macro (alternative to decorator)
 */
export function markAsMacro(
  target: any,
  propertyKey: string,
  descriptor?: PropertyDescriptor,
): void {
  const ctor = target.constructor as Function & { __macros?: Record<string, Function> };
  ctor.__macros = ctor.__macros || {};
  ctor.__macros[propertyKey] = (descriptor?.value ?? target[propertyKey]) as Function;
}

/**
 * Common traits similar to Laravel
 */

// SoftDeletes trait
registerTrait("SoftDeletes", {
  methods: {
    /**
     * Force delete the model (bypass soft delete)
     */
    async forceDelete(this: Model): Promise<boolean> {
      return this.delete(true);
    },

    /**
     * Restore a soft-deleted model
     */
    async restore(this: Model): Promise<boolean> {
      return (this as any).restore();
    },

    /**
     * Determine if the model has been soft-deleted
     */
    trashed(this: Model): boolean {
      return !!(this as any).deleted_at;
    },

    /**
     * Determine if the model is not soft-deleted
     */
    isNotTrashed(this: Model): boolean {
      return !(this as any).deleted_at;
    },
  },

  boot: (modelClass: typeof Model) => {
    // Add soft delete flags
    (modelClass as any).softDeletes = true;
  },
});

// HasApiTokens trait (similar to Laravel Sanctum)
registerTrait("HasApiTokens", {
  methods: {
    /**
     * Create a new token for the user
     */
    async createToken(this: Model, name: string, abilities: string[] = ["*"]): Promise<any> {
      // Implementation would depend on your token system
      console.log(`Creating token "${name}" with abilities:`, abilities);
      return { token: "generated-token" };
    },

    /**
     * Get current access token
     */
    currentAccessToken(this: Model): any {
      return null;
    },

    /**
     * Get all tokens
     */
    async tokens(this: Model): Promise<any[]> {
      return [];
    },

    /**
     * Revoke all tokens
     */
    async revokeAllTokens(this: Model): Promise<void> {
      console.log("All tokens revoked");
    },
  },
});

// Notifiable trait (similar to Laravel Notifications)
registerTrait("Notifiable", {
  methods: {
    /**
     * Send notification
     */
    async notify(this: Model, notification: any): Promise<void> {
      console.log("Notification sent:", notification);
    },

    /**
     * Route notifications for the mail channel
     */
    routeNotificationForMail(this: Model): string {
      return (this as any).email;
    },

    /**
     * Get notification preferences
     */
    notificationPreferences(this: Model): any {
      return {};
    },
  },
});

// HasEvents trait (for model events)
registerTrait("HasEvents", {
  boot: (modelClass: typeof Model) => {
    // Initialize event listeners map on the specific model class.
    // If the class inherits the base Model.eventListeners object (shared), clone it
    // so that each model class has its own listener arrays.
    const baseMap = (Model as any).eventListeners as any;
    const current = (modelClass as any).eventListeners;
    if (!current || current === baseMap) {
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

    // Add event methods (class-level helpers)
    (modelClass as any).addEventListener = function (event: string, callback: Function): void {
      // Ensure the target (this) has its own eventListeners map
      if (!(this as any).eventListeners || (this as any).eventListeners === baseMap) {
        (this as any).eventListeners = { ...((modelClass as any).eventListeners || {}) } as any;
      }
      if (!(this as any).eventListeners[event]) {
        (this as any).eventListeners[event] = [];
      }
      (this as any).eventListeners[event].push(callback);
    };

    (modelClass as any).dispatchEvent = function (event: string, model: Model): void {
      const listeners = (this as any).eventListeners?.[event] || [];
      listeners.forEach((listener: Function) => listener(model));
    };

    // Compatibility: expose `on` as a chainable alias for `addEventListener` so traits
    // that call `modelClass.on('event', ...)` won't throw if `on` is missing.
    if (!(modelClass as any).on) {
      (modelClass as any).on = function (event: string, callback: Function) {
        // Use addEventListener on the class/ prototype
        if (typeof (this as any).addEventListener === "function") {
          (this as any).addEventListener(event, callback);
        } else if (typeof (modelClass as any).addEventListener === "function") {
          (modelClass as any).addEventListener(event, callback);
        }
        return this;
      };
    }
  },
});
