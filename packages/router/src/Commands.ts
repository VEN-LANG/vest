import { Command } from "@lara-node/console";
import { ArgumentsCamelCase } from "yargs";
import { RouteScanner } from "./RouteScanner.js";
import { OpenApiGenerator } from "./OpenApiGenerator.js";
import * as fs from "fs";
import * as path from "path";

export class DocsGenerateCommand extends Command {
  protected signature = "docs:generate";
  protected description = "Generate OpenAPI specification file";

  protected options = {
    output: { type: "string" as const, description: "Output file path", alias: "o", default: "docs/openapi.json" },
    title: { type: "string" as const, description: "API title", alias: "t" },
    version: { type: "string" as const, description: "API version", alias: "v" },
    pretty: { type: "boolean" as const, description: "Pretty-print JSON output", default: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const outputPath = String(args.output || "docs/openapi.json");
    const pretty = args.pretty !== false;

    this.info("Scanning routes...");

    try {
      const routes = RouteScanner.scan();
      this.line(`  Found ${routes.length} route(s)`);

      const spec = OpenApiGenerator.generate(routes, {
        title: args.title ? String(args.title) : undefined,
        version: args.version ? String(args.version) : undefined,
      });

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(outputPath, pretty ? JSON.stringify(spec, null, 2) : JSON.stringify(spec), "utf-8");

      this.success(`OpenAPI spec written to ${outputPath}`);
      this.line(`  Paths: ${Object.keys(spec.paths).length}`);
      this.line(`  Tags: ${spec.tags.map((t: Record<string, unknown>) => t.name).join(", ")}`);
    } catch (error: unknown) {
      this.error(`Failed to generate docs: ${(error as Error).message}`);
    }
  }
}

export class DocsListCommand extends Command {
  protected signature = "docs:routes";
  protected description = "List all documented API routes";

  protected options = {
    tag: { type: "string" as const, description: "Filter by tag/group", alias: "t" },
    json: { type: "boolean" as const, description: "Output as JSON", default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const tagFilter = args.tag ? String(args.tag).toLowerCase() : null;
    const asJson = args.json as boolean;

    let routes = RouteScanner.scan();
    if (tagFilter) routes = routes.filter((r) => r.tags.some((t) => t.toLowerCase().includes(tagFilter)));

    if (asJson) { this.line(JSON.stringify(routes, null, 2)); return; }

    if (routes.length === 0) { this.warn("No documented routes found."); return; }

    this.info("Documented API Routes:\n");
    this.line(`${"METHOD".padEnd(10)} ${"PATH".padEnd(50)} ${"TAGS".padEnd(20)} ${"SUMMARY".padEnd(40)} AUTH`);
    this.line("-".repeat(130));

    for (const route of routes) {
      const method = this.colorMethod(route.method);
      const summary = (route.doc.summary || "-").substring(0, 38);
      const auth = route.requiresAuth ? "🔒" : "  ";
      this.line(`${method.padEnd(19)} ${route.path.padEnd(50)} ${route.tags.join(", ").padEnd(20)} ${summary.padEnd(40)} ${auth}`);
    }

    this.line(`\nTotal: ${routes.length} route(s)`);
  }

  private colorMethod(method: string): string {
    const colors: Record<string, string> = { GET: "\x1b[32m", POST: "\x1b[33m", PUT: "\x1b[34m", PATCH: "\x1b[36m", DELETE: "\x1b[31m", OPTIONS: "\x1b[35m" };
    return `${colors[method.toUpperCase()] || ""}${method}\x1b[0m`;
  }
}

export class RouteListCommand extends Command {
  protected signature = "route:list";
  protected description = "List all registered routes";

  protected options = {
    method: { type: "string" as const, description: "Filter by HTTP method", alias: "m" },
    path: { type: "string" as const, description: "Filter by path pattern", alias: "p" },
    json: { type: "boolean" as const, description: "Output as JSON", default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const methodFilter = args.method ? String(args.method).toUpperCase() : null;
    const pathFilter = args.path ? String(args.path) : null;
    const asJson = args.json as boolean;

    let allRoutes = RouteScanner.scan();
    if (methodFilter) allRoutes = allRoutes.filter((r) => r.method.toUpperCase() === methodFilter);
    if (pathFilter) allRoutes = allRoutes.filter((r) => r.path.includes(pathFilter));
    allRoutes.sort((a, b) => a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path));

    if (asJson) { this.line(JSON.stringify(allRoutes, null, 2)); return; }

    if (allRoutes.length === 0) { this.warn("No routes found."); return; }

    this.info("Registered Routes:\n");
    this.line(`${"METHOD".padEnd(10)} ${"PATH".padEnd(55)} ${"NAME".padEnd(20)} MIDDLEWARE`);
    this.line("-".repeat(110));

    for (const route of allRoutes) {
      const method = this.colorMethod(route.method);
      const middlewareStr = route.middleware?.length ? route.middleware.join(", ") : "-";
      this.line(`${method.padEnd(19)} ${route.path.padEnd(55)} ${(route.name || "-").padEnd(20)} ${middlewareStr}`);
    }

    this.line(`\nTotal: ${allRoutes.length} route(s)`);
  }

  private colorMethod(method: string): string {
    const colors: Record<string, string> = { GET: "\x1b[32m", POST: "\x1b[33m", PUT: "\x1b[34m", PATCH: "\x1b[36m", DELETE: "\x1b[31m", OPTIONS: "\x1b[35m" };
    return `${colors[method.toUpperCase()] || ""}${method}\x1b[0m`;
  }
}
