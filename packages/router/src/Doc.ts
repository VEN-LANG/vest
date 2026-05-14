/*
|--------------------------------------------------------------------------
| @Doc Decorator & Metadata Store
|--------------------------------------------------------------------------
|
| Provides decorators and helpers to annotate controller methods with
| API documentation metadata (summary, description, tags, parameters,
| request body schema, response examples, deprecation flag).
|
| Works with both class-based controllers (via decorators) and
| plain-object controllers (via Doc.describe()).
|
*/

import "reflect-metadata";

// ─── Metadata interfaces ───────────────────────────────────────────────────────

export interface DocParamMeta {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required?: boolean;
  type?: string;
  example?: any;
  enum?: string[];
}

export interface DocBodyFieldMeta {
  type?: string;
  description?: string;
  required?: boolean;
  example?: any;
  enum?: string[];
  format?: string;
  items?: { type: string };
}

export interface DocResponseMeta {
  status: number;
  description?: string;
  schema?: Record<string, any>;
  example?: any;
}

export interface DocMetadata {
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  params?: DocParamMeta[];
  body?: Record<string, DocBodyFieldMeta | string>;
  responses?: DocResponseMeta[];
  /** Validation rules string map – mirrors the controller's req.validate() rules */
  validationRules?: Record<string, string>;
  /** Whether this endpoint requires authentication */
  auth?: boolean;
  /** Required permissions (e.g. 'can:view_users') */
  permissions?: string[];
  /** Hide this route from documentation */
  hidden?: boolean;
}

// ─── Metadata keys ─────────────────────────────────────────────────────────────

const DOC_META_KEY = Symbol("doc:meta");

// ─── Global store for plain-object controllers ────────────────────────────────

const plainObjectDocs: Map<any, Map<string, DocMetadata>> = new Map();

// ─── Store keyed by function reference (for matching plain-object handlers) ───

const functionDocs: Map<Function, DocMetadata> = new Map();

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getMeta(target: any, propertyKey: string): DocMetadata {
  return Reflect.getMetadata(DOC_META_KEY, target, propertyKey) || {};
}

function setMeta(target: any, propertyKey: string, meta: DocMetadata): void {
  Reflect.defineMetadata(DOC_META_KEY, meta, target, propertyKey);
}

// ─── Main @Doc decorator (method decorator for classes) ────────────────────────

/**
 * Method decorator that attaches documentation metadata.
 *
 * @example
 * class UserController {
 *   @Doc({ summary: 'List users', tags: ['Users'] })
 *   async index(req, res) { ... }
 * }
 */
export function Doc(meta: DocMetadata): MethodDecorator {
  return (target: any, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    const key = String(propertyKey);
    const existing = getMeta(target, key);
    setMeta(target, key, { ...existing, ...meta });
  };
}

// ─── Sub-decorators for granular annotation ────────────────────────────────────

export namespace Doc {
  /**
   * Set the summary for a route.
   */
  export function summary(text: string): MethodDecorator {
    return Doc({ summary: text });
  }

  /**
   * Set the description for a route.
   */
  export function description(text: string): MethodDecorator {
    return Doc({ description: text });
  }

  /**
   * Set tag(s) / group(s) for a route.
   */
  export function group(...tags: string[]): MethodDecorator {
    return Doc({ tags });
  }

  /**
   * Mark a route as deprecated.
   */
  export function deprecated(): MethodDecorator {
    return Doc({ deprecated: true });
  }

  /**
   * Mark a route as hidden from docs.
   */
  export function hidden(): MethodDecorator {
    return Doc({ hidden: true });
  }

  /**
   * Define a path/query parameter.
   */
  export function param(meta: DocParamMeta): MethodDecorator {
    return (target: any, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
      const key = String(propertyKey);
      const existing = getMeta(target, key);
      const params = existing.params || [];
      params.push(meta);
      setMeta(target, key, { ...existing, params });
    };
  }

  /**
   * Define request body schema fields.
   */
  export function body(schema: Record<string, DocBodyFieldMeta | string>): MethodDecorator {
    return Doc({ body: schema });
  }

  /**
   * Define validation rules (same format as req.validate()).
   */
  export function validates(rules: Record<string, string>): MethodDecorator {
    return Doc({ validationRules: rules });
  }

  /**
   * Add a response definition.
   */
  export function response(meta: DocResponseMeta): MethodDecorator {
    return (target: any, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
      const key = String(propertyKey);
      const existing = getMeta(target, key);
      const responses = existing.responses || [];
      responses.push(meta);
      setMeta(target, key, { ...existing, responses });
    };
  }

  /**
   * Describe a method on a plain-object controller.
   *
   * @example
   * Doc.describe(AuthController, 'login', {
   *   summary: 'Login',
   *   tags: ['Auth'],
   *   body: { email: 'required|email', password: 'required|string|min:6' },
   * });
   */
  export function describe(controllerObj: any, methodName: string, meta: DocMetadata): void {
    if (!plainObjectDocs.has(controllerObj)) {
      plainObjectDocs.set(controllerObj, new Map());
    }
    const methodMap = plainObjectDocs.get(controllerObj)!;
    const existing = methodMap.get(methodName) || {};
    const merged = { ...existing, ...meta };
    methodMap.set(methodName, merged);

    // Also store keyed by the function reference itself so the scanner
    // can match plain-object handlers (e.g. AuthController.register)
    if (controllerObj && typeof controllerObj[methodName] === "function") {
      functionDocs.set(controllerObj[methodName], merged);
    }
  }

  /**
   * Retrieve metadata for a method – works for both class and plain-object controllers.
   */
  export function getMetadata(controller: any, methodName: string): DocMetadata | undefined {
    // 1. Class prototype (decorator-based)
    if (controller && controller.prototype) {
      const meta = Reflect.getMetadata(DOC_META_KEY, controller.prototype, methodName);
      if (meta) return meta;
    }

    // 2. Plain-object by object + method name
    if (plainObjectDocs.has(controller)) {
      return plainObjectDocs.get(controller)!.get(methodName);
    }

    // 3. Direct function reference lookup (for plain-object handlers)
    if (typeof controller === "function" && functionDocs.has(controller)) {
      return functionDocs.get(controller);
    }

    return undefined;
  }

  /**
   * Retrieve all documented methods for a controller.
   */
  export function getAllMetadata(controller: any): Map<string, DocMetadata> {
    const result = new Map<string, DocMetadata>();

    // Class-based
    if (controller && controller.prototype) {
      const keys = Reflect.getMetadataKeys(controller.prototype) || [];
      // reflect-metadata returns keys for each property, iterate known methods
      const proto = controller.prototype;
      const methodNames = Object.getOwnPropertyNames(proto).filter(
        (k) => k !== "constructor" && typeof proto[k] === "function",
      );
      for (const name of methodNames) {
        const m = Reflect.getMetadata(DOC_META_KEY, proto, name);
        if (m) result.set(name, m);
      }
    }

    // Plain-object
    if (plainObjectDocs.has(controller)) {
      const map = plainObjectDocs.get(controller)!;
      for (const [k, v] of map) {
        result.set(k, { ...(result.get(k) || {}), ...v });
      }
    }

    return result;
  }
}

export default Doc;
