import { Command } from "../Command.js";
import { ArgumentsCamelCase } from "yargs";
import { RouteScanner } from "@vest-ts/router";

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
    allRoutes.sort((a, b) =>
      a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
    );

    if (asJson) {
      this.line(JSON.stringify(allRoutes, null, 2));
      return;
    }

    if (allRoutes.length === 0) {
      this.warn("No routes found.");
      return;
    }

    this.info("Registered Routes:");
    this.line("");
    this.line(`${"METHOD".padEnd(10)} ${"PATH".padEnd(55)} ${"NAME".padEnd(20)} MIDDLEWARE`);
    this.line("-".repeat(110));

    for (const route of allRoutes) {
      const method = this.colorMethod(route.method);
      const middlewareStr = route.middleware?.length ? route.middleware.join(", ") : "-";
      this.line(
        `${method.padEnd(19)} ${route.path.padEnd(55)} ${(route.name || "-").padEnd(20)} ${middlewareStr}`,
      );
    }

    this.line("");
    this.info(`Total: ${allRoutes.length} route(s)`);
  }

  private colorMethod(method: string): string {
    const colors: Record<string, string> = {
      GET: "\x1b[32m",
      POST: "\x1b[33m",
      PUT: "\x1b[34m",
      PATCH: "\x1b[36m",
      DELETE: "\x1b[31m",
      OPTIONS: "\x1b[35m",
    };
    const reset = "\x1b[0m";
    return `${colors[method.toUpperCase()] || ""}${method}${reset}`;
  }
}
