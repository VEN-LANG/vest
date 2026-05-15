import { Router, RequestHandler, Request, Response } from "express";
import { resolveMiddleware } from "./Middleware/middleware.js";
import { Model } from "@vest-ts/db";
import { EloquentBuilder } from "@vest-ts/db";
import { container } from "@vest-ts/core";

// Type for controller method with model injection
type ControllerMethod =
  | ((req: any, res: any, ...models: any[]) => any)
  | ((req: any, res: any, next: any, ...models: any[]) => any);
type ControllerConstructor<T = any> = new (...args: any[]) => T;

type ControllerMethodTuple<T extends ControllerConstructor> = [T, keyof InstanceType<T>];

export type HandlerOrAlias =
  | RequestHandler
  | ControllerMethod
  | string
  | ControllerConstructor
  | ControllerMethodTuple<ControllerConstructor>
  | Array<RequestHandler | ControllerMethod | string>;
export type GroupOptions = {
  prefix?: string;
  middleware?: RequestHandler | RequestHandler[] | string | string[];
  withoutMiddleware?: RequestHandler | RequestHandler[] | string | string[];
  name?: string;
  where?: Record<string, string | RegExp>;
};

// Fluent prefix return type for stronger typing
export type PrefixFluent = {
  middleware(
    mw: RequestHandler | RequestHandler[] | string | string[],
    cb?: (rb: RouterBuilder) => void,
  ):
    | RouterBuilder
    | {
        group(cb: (rb: RouterBuilder) => void): RouterBuilder;
        withoutMiddleware(mw: RequestHandler | RequestHandler[] | string | string[]): {
          group(cb: (rb: RouterBuilder) => void): RouterBuilder;
        };
      };
  withoutMiddleware(
    mw: RequestHandler | RequestHandler[] | string | string[],
    cb?: (rb: RouterBuilder) => void,
  ):
    | RouterBuilder
    | {
        group(cb: (rb: RouterBuilder) => void): RouterBuilder;
        middleware(mw: RequestHandler | RequestHandler[] | string | string[]): {
          group(cb: (rb: RouterBuilder) => void): RouterBuilder;
        };
      };
  group(cb: (rb: RouterBuilder) => void): RouterBuilder;
  name(name: string): PrefixFluent;
};

// Route parameter constraints
export interface RouteParameterConstraints {
  [key: string]: string | RegExp;
}

// Named routes storage
interface NamedRoute {
  name: string;
  path: string;
  method: string;
}

// Fallback handler type
type FallbackHandler = RequestHandler | RequestHandler[];

// Model registry for automatic resolution
interface ModelRegistry {
  getModelByName(name: string): typeof Model | undefined;
  registerModel(name: string, modelClass: typeof Model): void;
  getAllModels(): Map<string, typeof Model>;
}

// Create a global model registry
class GlobalModelRegistry implements ModelRegistry {
  private models: Map<string, typeof Model> = new Map();
  private singularToPlural: Map<string, string> = new Map();
  private pluralToSingular: Map<string, string> = new Map();

  registerModel(name: string, modelClass: typeof Model): void {
    const singular = name.toLowerCase();
    const plural = this.pluralize(singular);

    this.models.set(singular, modelClass);
    this.models.set(plural, modelClass);

    this.singularToPlural.set(singular, plural);
    this.pluralToSingular.set(plural, singular);
  }

  getModelByName(name: string): typeof Model | undefined {
    // Try exact match first
    const exactMatch = this.models.get(name.toLowerCase());
    if (exactMatch) return exactMatch;

    // Try removing "Id" suffix
    if (name.toLowerCase().endsWith("id")) {
      const baseName = name.slice(0, -2).toLowerCase();
      return this.models.get(baseName);
    }

    // Try singularizing if it looks plural
    if (name.toLowerCase().endsWith("s")) {
      const singular = this.singularize(name.toLowerCase());
      return this.models.get(singular);
    }

    return undefined;
  }

  getAllModels(): Map<string, typeof Model> {
    return new Map(this.models);
  }

  private pluralize(word: string): string {
    if (word.endsWith("y")) {
      return word.slice(0, -1) + "ies";
    } else if (
      word.endsWith("s") ||
      word.endsWith("x") ||
      word.endsWith("z") ||
      word.endsWith("ch") ||
      word.endsWith("sh")
    ) {
      return word + "es";
    }
    return word + "s";
  }

  private singularize(word: string): string {
    if (word.endsWith("ies")) {
      return word.slice(0, -3) + "y";
    } else if (
      word.endsWith("es") &&
      (word.endsWith("sses") ||
        word.endsWith("xes") ||
        word.endsWith("zes") ||
        word.endsWith("ches") ||
        word.endsWith("shes"))
    ) {
      return word.slice(0, -2);
    } else if (word.endsWith("s") && !word.endsWith("ss")) {
      return word.slice(0, -1);
    }
    return word;
  }
}

// Global registry instance
const globalModelRegistry = new GlobalModelRegistry();

export class RouterBuilder {
  private router: Router;
  private prefixStack: string[] = [""];
  private middlewareStack: RequestHandler[][] = [[]];
  private withoutMiddlewareStack: (string | RequestHandler)[][] = [[]];
  private nameStack: string[] = [""];
  private whereStack: RouteParameterConstraints[] = [{}];
  private namedRoutes: Map<string, NamedRoute> = new Map();
  private registeredRoutes: Array<{
    method: string;
    path: string;
    name: string | null;
    middleware: string[];
    controllerRef?: { controller: any; method?: string };
  }> = [];
  private currentRouteName: string = "";
  private explicitBinders: Map<string, (value: string, route: any) => Promise<any>> = new Map();
  private fallbackHandler: FallbackHandler | null = null;
  private autoBindEnabled: boolean = true;
  private modelRegistry: ModelRegistry;

  constructor(modelRegistry?: ModelRegistry) {
    this.router = Router();
    this.modelRegistry = modelRegistry || globalModelRegistry;
    this.setupBuiltInMiddleware();
  }

  // Static method to register models globally
  static registerModel(name: string, modelClass: typeof Model): void {
    globalModelRegistry.registerModel(name, modelClass);
  }

  // Static method to get all registered models
  static getRegisteredModels(): Map<string, typeof Model> {
    return globalModelRegistry.getAllModels();
  }

  private normalizePath(parts: string[]) {
    const full = parts
      .filter(Boolean)
      .map((p) => p.replace(/(^\/+|\/+$)/g, ""))
      .join("/");
    return "/" + full;
  }

  private applyRouteConstraints(path: string, constraints: RouteParameterConstraints): string {
    let result = path;
    for (const [param, constraint] of Object.entries(constraints)) {
      const regex = constraint instanceof RegExp ? constraint.source : constraint;
      result = result.replace(`:${param}`, `:${param}(${regex})`);
    }
    return result;
  }

  private currentPrefix() {
    return this.prefixStack.join("");
  }

  private currentName() {
    const names = this.nameStack.filter(Boolean);
    return names.length > 0 ? names.join(".") : "";
  }

  private currentConstraints(): RouteParameterConstraints {
    return Object.assign({}, ...this.whereStack);
  }

  private currentMiddlewares(): RequestHandler[] {
    const excluded = this.withoutMiddlewareStack.reduce<(string | RequestHandler)[]>(
      (acc, cur) => acc.concat(cur || []),
      [],
    );
    const all = this.middlewareStack.reduce<RequestHandler[]>(
      (acc, cur) => acc.concat(cur || []),
      [],
    );

    if (excluded.length === 0) {
      return all;
    }

    return all.filter((mw) => {
      // Check if this middleware should be excluded
      return !excluded.some((ex) => {
        if (typeof ex === "string") {
          // Compare by name/alias - need to resolve the string first
          try {
            const resolved = resolveMiddleware(ex);
            if (Array.isArray(resolved)) {
              return resolved.includes(mw);
            }
            return resolved === mw;
          } catch {
            return false;
          }
        }
        return ex === mw;
      });
    });
  }

  /**
   * Get the current excluded middleware stack.
   */
  private currentExcludedMiddlewares(): (string | RequestHandler)[] {
    return this.withoutMiddlewareStack.reduce<(string | RequestHandler)[]>(
      (acc, cur) => acc.concat(cur || []),
      [],
    );
  }

  // Helper to detect ES6 class constructors vs plain functions
  // We need to avoid treating normal middleware functions (e.g. multer handlers)
  // as controller classes; testing the Function#toString for a leading "class"
  // is a reliable heuristic across transpiled and native code.
  private isClassConstructor(fn: any): boolean {
    try {
      if (typeof fn !== "function") return false;
      const str = Function.prototype.toString.call(fn);
      return /^class\s/.test(str);
    } catch (e) {
      return false;
    }
  }

  // Setup built-in middleware
  private setupBuiltInMiddleware(): void {
    // You can add Express middleware initialization here
  }

  // Enable or disable automatic model binding
  enableAutoModelBinding(enabled: boolean = true): this {
    this.autoBindEnabled = enabled;
    return this;
  }

  // Register a model for automatic binding
  model(
    paramName: string,
    binderOrModel: ((value: string, route: any) => Promise<any>) | typeof Model,
  ): this {
    let binder: (value: string, route: any) => Promise<any>;

    if (typeof binderOrModel === "function" && (binderOrModel as any).prototype instanceof Model) {
      // It's a Model class
      const ModelClass = binderOrModel as typeof Model;
      binder = async (value: string) => {
        const pk = ModelClass.primaryKey || "id";
        const builder = new EloquentBuilder(ModelClass);
        return builder.findOrFail
          ? await builder.findOrFail(value)
          : await builder.where(pk, value).first();
      };
      // Also register in global registry
      this.modelRegistry.registerModel(paramName, ModelClass);
    } else {
      // Custom binder function
      binder = binderOrModel as (value: string, route: any) => Promise<any>;
    }

    this.explicitBinders.set(paramName, binder);
    return this;
  }

  // Group method
  group(
    optionsOrCb: GroupOptions | ((rb: RouterBuilder) => void),
    cb?: (rb: RouterBuilder) => void,
  ): void {
    let options: GroupOptions = {};
    let callback: (rb: RouterBuilder) => void;

    if (typeof optionsOrCb === "function") {
      callback = optionsOrCb;
    } else {
      options = optionsOrCb || {};
      if (!cb) throw new Error("group(options, cb) requires a callback");
      callback = cb;
    }

    const prefix = options.prefix || "";
    const raw = options.middleware
      ? Array.isArray(options.middleware)
        ? options.middleware
        : [options.middleware]
      : [];

    // Handle withoutMiddleware
    const excluded = options.withoutMiddleware
      ? Array.isArray(options.withoutMiddleware)
        ? options.withoutMiddleware
        : [options.withoutMiddleware]
      : [];

    // resolve middleware strings to request handlers
    const mw: RequestHandler[] = [];
    for (const r of raw) {
      const resolved = resolveMiddleware(r as any);
      if (Array.isArray(resolved)) mw.push(...resolved);
      else mw.push(resolved);
    }

    // Handle name stacking
    const name = options.name || "";
    const names = this.nameStack.filter(Boolean);
    const newName = names.length > 0 && name ? `${names.join(".")}.${name}` : name;

    // Handle parameter constraints stacking
    const constraints = options.where || {};

    this.prefixStack.push(prefix);
    this.middlewareStack.push(mw);
    this.withoutMiddlewareStack.push(excluded as (string | RequestHandler)[]);
    this.nameStack.push(newName);
    this.whereStack.push(constraints);

    try {
      callback(this);
    } finally {
      this.prefixStack.pop();
      this.middlewareStack.pop();
      this.withoutMiddlewareStack.pop();
      this.nameStack.pop();
      this.whereStack.pop();
    }
  }

  private async resolveParameterBinding(paramName: string, value: string, req: any): Promise<any> {
    // First try explicit binder
    if (this.explicitBinders.has(paramName)) {
      return await this.explicitBinders.get(paramName)!(value, req);
    }

    // Then try automatic model resolution
    if (this.autoBindEnabled) {
      const modelClass = this.modelRegistry.getModelByName(paramName);
      if (modelClass) {
        const pk = modelClass.primaryKey || "id";
        const builder = new EloquentBuilder(modelClass);
        return builder.findOrFail
          ? await builder.findOrFail(value)
          : await builder.where(pk, value).first();
      }
    }

    // Return raw value if no binding found
    return value;
  }

  private async resolveAllBindings(path: string, req: any): Promise<Record<string, any>> {
    const paramMatches = path.match(/:(\w+)/g) || [];
    const params = paramMatches.map((match) => match.substring(1));
    const results: Record<string, any> = {};

    for (const param of params) {
      if (req.params[param]) {
        results[param] = await this.resolveParameterBinding(param, req.params[param], req);
      }
    }

    return results;
  }

  private register(
    method: "get" | "post" | "put" | "patch" | "delete" | "all" | "options" | "head",
    path: string,
    ...handlers: HandlerOrAlias[]
  ) {
    const prefix = this.currentPrefix();
    let fullPath = this.normalizePath([prefix, path]);

    // Apply parameter constraints
    const constraints = this.currentConstraints();
    fullPath = this.applyRouteConstraints(fullPath, constraints);

    const middlewares = this.currentMiddlewares();
    const resolvedHandlers: Array<RequestHandler | ControllerMethod> = [];
    let controllerRef: { controller: any; method?: string } | undefined;

    for (let h of handlers as any[]) {
      // Handle [ControllerClass, 'method'] or ControllerClass (if it has a handle method or similar)
      if (Array.isArray(h) && h.length === 2 && typeof h[0] === "function") {
        const [ControllerClass, methodName] = h;
        controllerRef = { controller: ControllerClass, method: String(methodName) };
        // Use a wrapper whose declared arity matches the "arity === 3" branch in
        // wrapHandlersWithModelInjection. We declare a neutral third parameter
        // ("_firstBound") and collect additional bound models via rest so that
        // when the wrapper is invoked with (req, res, ...values) the values map
        // correctly to the controller method arguments.
        h = async (req: any, res: any, _firstBound?: any, ...models: any[]) => {
          const controllerInstance = container.make<any>(ControllerClass);
          if (!controllerInstance[methodName]) {
            const className = ControllerClass?.name ?? "UnknownController";

            throw new Error(
              `Route resolution failed: "${className}.${String(methodName)}()" does not exist. ` +
                `Ensure the method is defined and publicly accessible on the controller.`,
            );
          }

          const allModels = [_firstBound, ...models].filter((v) => v !== undefined);
          return controllerInstance[methodName](req, res, ...allModels);
        };
      } else if (this.isClassConstructor(h)) {
        const ControllerClass = h;
        controllerRef = { controller: ControllerClass, method: "handle" };
        // Same strategy as above for class-style controller invocations.
        h = async (req: any, res: any, _firstBound?: any, ...models: any[]) => {
          const controllerInstance = container.make<any>(ControllerClass);
          const method =
            controllerInstance.handle || controllerInstance.__invoke || controllerInstance;
          if (typeof method === "function") {
            const allModels = [_firstBound, ...models].filter((v) => v !== undefined);
            return method.call(controllerInstance, req, res, ...allModels);
          }
          return method;
        };
      }

      const r = resolveMiddleware(h as any);
      if (Array.isArray(r)) resolvedHandlers.push(...(r as any));
      else resolvedHandlers.push(r as any);
    }

    // If no controller ref was captured, store the last handler function ref
    if (!controllerRef) {
      const lastHandler = handlers[handlers.length - 1];
      if (typeof lastHandler === "function" && !this.isClassConstructor(lastHandler)) {
        controllerRef = { controller: lastHandler };
      }
    }

    // Wrap the final handler to inject models
    const wrappedHandlers = this.wrapHandlersWithModelInjection(fullPath, resolvedHandlers as any);

    (this.router as any)[method](fullPath, ...middlewares, ...wrappedHandlers);

    // Get middleware names for route listing
    const middlewareNames = handlers.filter((h) => typeof h === "string").map((h) => String(h));

    // Store route name if provided
    let routeName: string | null = null;
    if (this.currentRouteName) {
      routeName = this.currentName()
        ? `${this.currentName()}.${this.currentRouteName}`
        : this.currentRouteName;
      this.namedRoutes.set(routeName, {
        name: routeName,
        path: fullPath,
        method: method.toUpperCase(),
      });
      this.currentRouteName = "";
    }

    // Store ALL routes for route:list command
    this.registeredRoutes.push({
      method: method.toUpperCase(),
      path: fullPath,
      name: routeName,
      middleware: middlewareNames,
      controllerRef,
    });
  }

  private wrapHandlersWithModelInjection(
    path: string,
    handlers: Array<RequestHandler | ControllerMethod>,
  ): RequestHandler[] {
    if (!handlers.length) return handlers as RequestHandler[];

    // Only wrap the final handler (controller action)
    const leading = handlers.slice(0, -1) as RequestHandler[];
    const last = handlers[handlers.length - 1] as ControllerMethod | RequestHandler;

    const wrappedHandler: RequestHandler = async (req, res, next) => {
      try {
        const boundModels = await this.resolveAllBindings(path, req);
        const orderedParamMatches = path.match(/:(\w+)/g) || [];
        const orderedParams = orderedParamMatches.map((m) => m.substring(1));
        const values = orderedParams.map((p) => boundModels[p]).filter((v) => v !== undefined);

        const arity = (last as any).length;

        if (arity === 2) {
          return (last as any)(req, res);
        } else if (arity === 3) {
          if (values.length > 0) {
            return (last as any)(req, res, ...values);
          }
          // treat as (req, res) when no models to inject
          return (last as any)(req, res);
        } else if (arity >= 4) {
          if (values.length > 0) {
            return (last as any)(req, res, next, ...values);
          }
          return (last as any)(req, res, next);
        } else {
          return (last as any)(req, res, next);
        }
      } catch (error) {
        next(error);
      }
    };

    return [...leading, wrappedHandler];
  }

  // HTTP methods that return this for chaining
  get(path: string, ...handlers: HandlerOrAlias[]): this {
    this.register("get", path, ...handlers);
    return this;
  }

  post(path: string, ...handlers: HandlerOrAlias[]): this {
    this.register("post", path, ...handlers);
    return this;
  }

  put(path: string, ...handlers: HandlerOrAlias[]): this {
    this.register("put", path, ...handlers);
    return this;
  }

  patch(path: string, ...handlers: HandlerOrAlias[]): this {
    this.register("patch", path, ...handlers);
    return this;
  }

  delete(path: string, ...handlers: HandlerOrAlias[]): this {
    this.register("delete", path, ...handlers);
    return this;
  }

  all(path: string, ...handlers: HandlerOrAlias[]): this {
    this.register("all", path, ...handlers);
    return this;
  }

  options(path: string, ...handlers: HandlerOrAlias[]): this {
    this.register("options", path, ...handlers);
    return this;
  }

  head(path: string, ...handlers: HandlerOrAlias[]): this {
    this.register("head", path, ...handlers);
    return this;
  }

  // Route naming
  name(name: string): this {
    this.currentRouteName = name;
    return this;
  }

  // Parameter constraints
  where(parameter: string | Record<string, string | RegExp>, constraint?: string | RegExp): this {
    if (typeof parameter === "object") {
      Object.assign(this.whereStack[this.whereStack.length - 1], parameter);
    } else if (constraint !== undefined) {
      this.whereStack[this.whereStack.length - 1][parameter] = constraint;
    }
    return this;
  }

  // Enhanced resource routing with automatic model binding
  resource(
    name: string,
    controller: any,
    options: {
      only?: string[];
      except?: string[];
      names?: Record<string, string>;
      parameters?: Record<string, string> | string;
      middleware?: Record<string, HandlerOrAlias[]>;
      where?: Record<string, string | RegExp>;
      scoped?: boolean | string[];
    } = {},
  ) {
    const routes = {
      index: { method: "get", path: `/${name}` },
      create: { method: "get", path: `/${name}/create` },
      store: { method: "post", path: `/${name}` },
      show: { method: "get", path: `/${name}/:${name}` },
      edit: { method: "get", path: `/${name}/:${name}/edit` },
      update: { method: "put", path: `/${name}/:${name}` },
      destroy: { method: "delete", path: `/${name}/:${name}` },
    };

    const only = options.only || Object.keys(routes);
    const except = options.except || [];
    const routesToRegister = only.filter((route) => !except.includes(route));

    // Parameter customization
    let parameters = options.parameters || {};
    if (typeof parameters === "string") {
      parameters = { [name]: parameters };
    }
    const idParam = (parameters as Record<string, string>)[name] || name;

    // Auto-bind the model for this resource if enabled
    if (this.autoBindEnabled) {
      // Try to find the model class from controller if available
      const modelClass = controller.model;
      if (modelClass && modelClass.prototype instanceof Model) {
        this.modelRegistry.registerModel(name, modelClass);
      }
    }

    for (const routeName of routesToRegister) {
      const route = routes[routeName as keyof typeof routes];
      if (controller[routeName]) {
        let routePath = route.path;

        // Replace parameter if customized
        if ((parameters as Record<string, string>)[routeName]) {
          routePath = routePath.replace(
            `:${name}`,
            `:${(parameters as Record<string, string>)[routeName]}`,
          );
        } else if (routePath.includes(`:${name}`)) {
          routePath = routePath.replace(`:${name}`, `:${idParam}`);
        }

        // Apply route-specific middleware
        const routeMiddleware = options.middleware?.[routeName];
        const handlers = routeMiddleware
          ? [
              ...(Array.isArray(routeMiddleware) ? routeMiddleware : [routeMiddleware]),
              controller[routeName],
            ]
          : [controller[routeName]];

        // Apply route name
        const finalRouteName = options.names?.[routeName] || `${name}.${routeName}`;

        // Apply where constraints if specified
        const resourceConstraints = options.where || {};
        if (Object.keys(resourceConstraints).length > 0) {
          this.whereStack.push(resourceConstraints);
        }

        // Register the route
        this.name(finalRouteName);

        if (routeName === "update") {
          // Support both PUT and PATCH for update
          this.put(routePath, ...handlers);
          this.patch(routePath, ...handlers);
        } else {
          (this as any)[route.method](routePath, ...handlers);
        }

        // Clean up constraints
        if (Object.keys(resourceConstraints).length > 0) {
          this.whereStack.pop();
        }
      }
    }
  }

  // API resource
  apiResource(name: string, controller: any, options?: any): void {
    this.resource(name, controller, {
      ...options,
      except: ["create", "edit"],
    });
  }

  // Route URL generation
  route(name: string, parameters: Record<string, any> = {}, query?: Record<string, any>): string {
    const route = this.namedRoutes.get(name);
    if (!route) {
      throw new Error(`Route [${name}] not found.`);
    }

    let path = route.path;
    for (const [key, value] of Object.entries(parameters)) {
      path = path.replace(`:${key}`, encodeURIComponent(String(value)));
    }

    // Check for missing parameters
    const missingParams = (path.match(/:\w+/g) || []).map((m) => m.substring(1));
    if (missingParams.length > 0) {
      throw new Error(
        `Missing required parameters for route [${name}]: ${missingParams.join(", ")}`,
      );
    }

    // Append query string
    if (query && Object.keys(query).length > 0) {
      const usp = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        usp.append(k, String(v));
      }
      const qs = usp.toString();
      if (qs) path += `?${qs}`;
    }

    return path;
  }

  // Fallback route
  fallback(...handlers: HandlerOrAlias[]): this {
    this.fallbackHandler = handlers as RequestHandler[];
    return this;
  }

  // Apply fallback route when building
  private applyFallbackRoute(): void {
    if (this.fallbackHandler) {
      const resolvedHandlers: RequestHandler[] = [];
      for (const h of this.fallbackHandler as any[]) {
        const r = resolveMiddleware(h as any);
        if (Array.isArray(r)) resolvedHandlers.push(...r);
        else resolvedHandlers.push(r);
      }
      this.router.all("*", ...resolvedHandlers);
    }
  }

  // Fluent prefix
  prefix(prefix: string): PrefixFluent {
    const self = this;
    return {
      middleware(
        mw: RequestHandler | RequestHandler[] | string | string[],
        cb?: (rb: RouterBuilder) => void,
      ) {
        if (cb) {
          self.group({ prefix, middleware: mw as any }, cb);
          return self;
        }
        return {
          group(cb2: (rb: RouterBuilder) => void) {
            self.group({ prefix, middleware: mw as any }, cb2);
            return self;
          },
          name(name: string) {
            return self.prefix(prefix).name(name);
          },
          withoutMiddleware(excluded: RequestHandler | RequestHandler[] | string | string[]) {
            return {
              group(cb2: (rb: RouterBuilder) => void) {
                self.group(
                  { prefix, middleware: mw as any, withoutMiddleware: excluded as any },
                  cb2,
                );
                return self;
              },
            };
          },
        } as any;
      },
      withoutMiddleware(
        mw: RequestHandler | RequestHandler[] | string | string[],
        cb?: (rb: RouterBuilder) => void,
      ) {
        if (cb) {
          self.group({ prefix, withoutMiddleware: mw as any }, cb);
          return self;
        }
        return {
          group(cb2: (rb: RouterBuilder) => void) {
            self.group({ prefix, withoutMiddleware: mw as any }, cb2);
            return self;
          },
          middleware(included: RequestHandler | RequestHandler[] | string | string[]) {
            return {
              group(cb2: (rb: RouterBuilder) => void) {
                self.group(
                  { prefix, middleware: included as any, withoutMiddleware: mw as any },
                  cb2,
                );
                return self;
              },
            };
          },
        } as any;
      },
      group(cb: (rb: RouterBuilder) => void) {
        self.group({ prefix }, cb);
        return self;
      },
      name(name: string) {
        return self.prefix(prefix).name(name);
      },
    };
  }

  // Middleware chaining
  middleware(
    mw: RequestHandler | RequestHandler[] | string | string[],
    cb?: (rb: RouterBuilder) => void,
  ): any {
    if (cb) {
      this.group({ middleware: mw as any }, cb);
      return this;
    }
    const self = this;
    return {
      group(cb2: (rb: RouterBuilder) => void) {
        self.group({ middleware: mw as any }, cb2);
        return self;
      },
      name(name: string) {
        self.currentRouteName = name;
        return self;
      },
      withoutMiddleware(excluded: RequestHandler | RequestHandler[] | string | string[]) {
        return {
          group(cb2: (rb: RouterBuilder) => void) {
            self.group({ middleware: mw as any, withoutMiddleware: excluded as any }, cb2);
            return self;
          },
        };
      },
    };
  }

  /**
   * Exclude middleware for a route group.
   *
   * @example
   * rb.middleware('auth').withoutMiddleware('csrf').group((r) => {
   *   r.post('/webhook', WebhookController.handle);
   * });
   *
   * rb.withoutMiddleware(['auth', 'csrf']).group((r) => {
   *   r.get('/health', HealthController.check);
   * });
   */
  withoutMiddleware(
    mw: RequestHandler | RequestHandler[] | string | string[],
    cb?: (rb: RouterBuilder) => void,
  ): any {
    if (cb) {
      this.group({ withoutMiddleware: mw as any }, cb);
      return this;
    }
    const self = this;
    return {
      group(cb2: (rb: RouterBuilder) => void) {
        self.group({ withoutMiddleware: mw as any }, cb2);
        return self;
      },
      middleware(included: RequestHandler | RequestHandler[] | string | string[]) {
        return {
          group(cb2: (rb: RouterBuilder) => void) {
            self.group({ middleware: included as any, withoutMiddleware: mw as any }, cb2);
            return self;
          },
        };
      },
    };
  }

  // Match multiple methods
  match(methods: string[], path: string, ...handlers: HandlerOrAlias[]): this {
    methods.forEach((method) => {
      if (
        ["get", "post", "put", "patch", "delete", "options", "head"].includes(method.toLowerCase())
      ) {
        this.register(method.toLowerCase() as any, path, ...handlers);
      }
    });
    return this;
  }

  // Any method
  any(path: string, ...handlers: HandlerOrAlias[]): this {
    const methods = ["get", "post", "put", "patch", "delete", "options", "head"];
    methods.forEach((method) => {
      this.register(method as any, path, ...handlers);
    });
    return this;
  }

  // Redirect
  redirect(from: string, to: string, statusCode: number = 302): this {
    this.get(from, (req: Request, res: Response) => {
      res.redirect(statusCode, to);
    });
    return this;
  }

  // Permanent redirect
  permanentRedirect(from: string, to: string): this {
    return this.redirect(from, to, 301);
  }

  // View route
  view(path: string, viewName: string, data?: Record<string, any>): this {
    this.get(path, (req: Request, res: Response) => {
      res.render(viewName, { ...data, ...(req as any).query });
    });
    return this;
  }

  // Get all routes (including unnamed)
  getRoutes(): Array<{
    method: string;
    path: string;
    name: string | null;
    middleware: string[];
    controllerRef?: { controller: any; method?: string };
  }> {
    return this.registeredRoutes;
  }

  // Get only named routes
  getNamedRoutes(): NamedRoute[] {
    return Array.from(this.namedRoutes.values());
  }

  // Build router
  build(): Router {
    this.applyFallbackRoute();
    return this.router;
  }
}

// Export the static methods
RouterBuilder.registerModel = globalModelRegistry.registerModel.bind(globalModelRegistry);
RouterBuilder.getRegisteredModels = globalModelRegistry.getAllModels.bind(globalModelRegistry);

export default RouterBuilder;
