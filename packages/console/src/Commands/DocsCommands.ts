import { Command } from "../Command.js";
import { ArgumentsCamelCase } from "yargs";
import { RouteScanner } from "@vest/router";
import { OpenApiGenerator } from "@vest/router";
import * as fs from "fs";
import * as path from "path";

export class DocsGenerateCommand extends Command {
  protected signature = "docs:generate";
  protected description = "Generate OpenAPI specification file";

  protected options = {
    output: {
      type: "string" as const,
      description: "Output file path",
      alias: "o",
      default: "docs/openapi.json",
    },
    title: {
      type: "string" as const,
      description: "API title",
      alias: "t",
    },
    version: {
      type: "string" as const,
      description: "API version",
      alias: "v",
    },
    pretty: {
      type: "boolean" as const,
      description: "Pretty-print JSON output",
      default: true,
    },
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

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const json = pretty ? JSON.stringify(spec, null, 2) : JSON.stringify(spec);

      fs.writeFileSync(outputPath, json, "utf-8");

      this.success(`OpenAPI spec written to ${outputPath}`);
      this.line(`  Paths: ${Object.keys(spec.paths).length}`);
      this.line(`  Tags: ${spec.tags.map((t: any) => t.name).join(", ")}`);
    } catch (error: any) {
      this.error(`Failed to generate docs: ${error.message}`);
    }
  }
}

export class DocsListCommand extends Command {
  protected signature = "docs:routes";
  protected description = "List all documented API routes";

  protected options = {
    tag: {
      type: "string" as const,
      description: "Filter by tag/group",
      alias: "t",
    },
    json: {
      type: "boolean" as const,
      description: "Output as JSON",
      default: false,
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const tagFilter = args.tag ? String(args.tag).toLowerCase() : null;
    const asJson = args.json as boolean;

    const routes = RouteScanner.scan();
    let filtered = routes;

    if (tagFilter) {
      filtered = routes.filter((r) => r.tags.some((t) => t.toLowerCase().includes(tagFilter)));
    }

    if (asJson) {
      this.line(JSON.stringify(filtered, null, 2));
      return;
    }

    if (filtered.length === 0) {
      this.warn("No documented routes found.");
      return;
    }

    this.info("Documented API Routes:");
    this.line("");
    this.line(
      `${"METHOD".padEnd(10)} ${"PATH".padEnd(50)} ${"TAGS".padEnd(20)} ${"SUMMARY".padEnd(40)} AUTH`,
    );
    this.line("-".repeat(130));

    for (const route of filtered) {
      const method = this.colorMethod(route.method);
      const tags = route.tags.join(", ");
      const summary = (route.doc.summary || "-").substring(0, 38);
      const auth = route.requiresAuth ? "🔒" : "  ";
      this.line(
        `${method.padEnd(19)} ${route.path.padEnd(50)} ${tags.padEnd(20)} ${summary.padEnd(40)} ${auth}`,
      );
    }

    this.line("");
    this.info(`Total: ${filtered.length} route(s)`);
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
    const color = colors[method.toUpperCase()] || "";
    return `${color}${method}${reset}`;
  }
}
