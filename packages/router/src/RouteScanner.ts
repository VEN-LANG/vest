/*
|--------------------------------------------------------------------------
| Route Scanner
|--------------------------------------------------------------------------
|
| Consumes RouterBuilder.getRoutes() from both API and Web route builders,
| enriches each route with @Doc metadata, and produces a unified array
| of ScannedRoute objects for the OpenAPI generator.
|
*/

import { Doc, DocMetadata } from "./Doc.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScannedRoute {
  method: string;
  path: string;
  name: string | null;
  middleware: string[];
  /** Auto-inferred or explicit tag/group */
  tags: string[];
  /** Merged doc metadata (from @Doc decorator + auto-detection) */
  doc: DocMetadata;
  /** Whether route requires auth (detected from middleware) */
  requiresAuth: boolean;
  /** Permissions extracted from 'can:xxx' middleware */
  permissions: string[];
  /** Path parameters extracted from :param segments */
  pathParams: string[];
  /** Source: 'api' or 'web' */
  source: "api" | "web";
}

// ─── Scanner ───────────────────────────────────────────────────────────────────

type RouteBuilderEntry = {
  builder: { getRoutes(): any[] };
  prefix?: string;
  source: "api" | "web";
};

/** Minimal surface of Application that registerRouteBuilder needs for mounting. */
interface Mountable {
  mountRoutes(prefix: string, router: unknown): void;
}

const _BUILDERS_KEY = "__lara_node_route_builders__";
if (!(globalThis as Record<string, unknown>)[_BUILDERS_KEY]) {
  (globalThis as Record<string, unknown>)[_BUILDERS_KEY] = [];
}
/** Registry for route builders — populated by the app at boot time. */
const _routeBuilders: RouteBuilderEntry[] = (
  globalThis as Record<string, unknown>
)[_BUILDERS_KEY] as RouteBuilderEntry[];

/**
 * Register a RouterBuilder for OpenAPI scanning and — optionally — mount it
 * on the application in one call.
 *
 * Passing `app` eliminates the need for a separate `app.mountRoutes()` call:
 *
 * @example
 * // Old pattern (two calls — still works):
 * registerRouteBuilder(routesBuilder, 'api', this.apiPrefix);
 * this.app.mountRoutes(this.apiPrefix, routesBuilder.build());
 *
 * // New pattern (single call):
 * registerRouteBuilder(routesBuilder, 'api', this.apiPrefix, this.app);
 *
 * @param builder - The RouterBuilder instance for this route group.
 * @param source  - `'api'` or `'web'` — used for OpenAPI tag inference.
 * @param prefix  - URL prefix (e.g. `'/api'`). Defaults to `'/'` for web.
 * @param app     - Application instance. When provided, mounts the built router
 *                  via `app.mountRoutes(prefix, builder.build())` automatically.
 */
export function registerRouteBuilder(
  builder: { getRoutes(): any[]; build(): unknown },
  source: "api" | "web" = "api",
  prefix?: string,
  app?: Mountable,
): void {
  _routeBuilders.push({ builder, prefix, source });
  if (app) {
    app.mountRoutes(prefix ?? "/", builder.build());
  }
}

export class RouteScanner {
  /**
   * Scan all routes and produce enriched route objects.
   */
  static scan(): ScannedRoute[] {
    const allRawRoutes: Array<{ route: any; source: "api" | "web"; prefix?: string }> = [];

    for (const { builder, source, prefix } of _routeBuilders) {
      const routes = builder.getRoutes();
      for (const r of routes) {
        allRawRoutes.push({ route: r, source, prefix });
      }
    }

    const apiRoutes = allRawRoutes
      .filter(({ source }) => source === "api")
      .map(({ route, prefix }) => ({
        ...route,
        path: prefix
          ? route.path.startsWith(prefix)
            ? route.path
            : `${prefix}${route.path}`
          : route.path,
        source: "api" as const,
      }));

    const webRoutes = allRawRoutes
      .filter(({ source }) => source === "web")
      .map(({ route }) => ({ ...route, source: "web" as const }));

    const allRoutes = [...apiRoutes, ...webRoutes];
    const scanned: ScannedRoute[] = [];

    for (const route of allRoutes) {
      const enriched = this.enrichRoute(route);
      if (enriched.doc.hidden) continue;
      scanned.push(enriched);
    }

    // Sort by path then method
    scanned.sort((a, b) => {
      if (a.path === b.path) return a.method.localeCompare(b.method);
      return a.path.localeCompare(b.path);
    });

    return scanned;
  }

  /**
   * Enrich a single route with metadata.
   */
  private static enrichRoute(route: any): ScannedRoute {
    const { method, path, name, middleware = [], controllerRef, source } = route;

    // Extract @Doc metadata from controller
    let docMeta: DocMetadata = {};
    if (controllerRef) {
      const { controller, method: methodName } = controllerRef;
      if (controller) {
        const meta = Doc.getMetadata(controller, methodName || "");
        if (meta) docMeta = { ...meta };
      }
    }

    // Extract path parameters from :param segments
    const pathParams = (path.match(/:(\w+)/g) || []).map((m: string) => m.substring(1));

    // Detect auth requirement from middleware
    const allMiddleware = [...middleware];
    const requiresAuth = allMiddleware.some((m: string) => m === "auth" || m.startsWith("auth:"));

    // Extract permissions from 'can:xxx' middleware
    const permissions: string[] = [];
    for (const mw of allMiddleware) {
      if (mw.startsWith("can:")) {
        permissions.push(mw.substring(4));
      }
    }

    // Auto-infer tags from path prefix
    const tags =
      docMeta.tags && docMeta.tags.length > 0 ? docMeta.tags : this.inferTags(path, source);

    // Auto-generate summary if not provided
    if (!docMeta.summary) {
      docMeta.summary = this.inferSummary(method, path, name);
    }

    // Merge auth/permissions from middleware into doc
    if (requiresAuth && docMeta.auth === undefined) {
      docMeta.auth = true;
    }
    if (permissions.length > 0 && (!docMeta.permissions || docMeta.permissions.length === 0)) {
      docMeta.permissions = permissions;
    }

    return {
      method,
      path,
      name,
      middleware: allMiddleware,
      tags,
      doc: docMeta,
      requiresAuth,
      permissions,
      pathParams,
      source,
    };
  }

  /**
   * Infer tags from route path prefix.
   * e.g. /api/users/... → ['Users'], /api/auth/... → ['Auth']
   */
  private static inferTags(path: string, source: string): string[] {
    // Remove leading /api/ if present
    let cleaned = path.replace(/^\/api\//, "/").replace(/^\//, "");
    // Take first segment
    const firstSegment = cleaned.split("/")[0];
    if (!firstSegment) return [source === "api" ? "API" : "Web"];

    // Capitalize
    const tag = firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
    return [tag];
  }

  /**
   * Infer a human-readable summary from method, path and route name.
   */
  private static inferSummary(method: string, path: string, name: string | null): string {
    if (name) {
      // Convert 'users.store' → 'Store Users'
      const parts = name.split(".");
      const action = parts.pop() || "";
      const resource = parts.pop() || "";
      return `${this.capitalize(action)} ${this.capitalize(resource)}`.trim();
    }

    // Infer from path + method
    const segments = path
      .replace(/^\/api/, "")
      .split("/")
      .filter(Boolean);
    const resource = segments.find((s) => !s.startsWith(":")) || "";
    const hasParam = segments.some((s) => s.startsWith(":"));

    const methodMap: Record<string, string> = {
      GET: hasParam ? "Get" : "List",
      POST: "Create",
      PUT: "Update",
      PATCH: "Update",
      DELETE: "Delete",
    };

    const verb = methodMap[method] || method;
    return `${verb} ${this.capitalize(resource)}`.trim();
  }

  private static capitalize(str: string): string {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/[-_]/g, " ");
  }
}

export default RouteScanner;
