/*
|--------------------------------------------------------------------------
| Documentation UI
|--------------------------------------------------------------------------
|
| Serves a self-contained HTML page with the Scalar API reference UI.
| No npm dependency required – Scalar is loaded from CDN.
|
| Exposes two routes:
|   GET /docs          → HTML documentation page
|   GET /docs/openapi.json → Raw OpenAPI 3.0 specification
|
*/

import { Request, Response } from "express";
import { RouteScanner } from "./RouteScanner.js";
import { OpenApiGenerator, OpenApiGeneratorOptions } from "./OpenApiGenerator.js";

// Cached spec (generated once per process lifetime, cleared on demand)
let cachedSpec: any = null;

export class DocsUI {
  /**
   * Get or generate the OpenAPI spec.
   */
  static getSpec(options?: OpenApiGeneratorOptions): any {
    if (!cachedSpec) {
      const routes = RouteScanner.scan();
      cachedSpec = OpenApiGenerator.generate(routes, options);
    }
    return cachedSpec;
  }

  /**
   * Invalidate cached spec (call after routes change).
   */
  static invalidateCache(): void {
    cachedSpec = null;
  }

  /**
   * Express handler: serve OpenAPI JSON.
   */
  static specHandler(options?: OpenApiGeneratorOptions) {
    return (_req: Request, res: Response) => {
      try {
        const spec = DocsUI.getSpec(options);
        res.json(spec);
      } catch (error: any) {
        console.error("Failed to generate OpenAPI spec:", error.message);
        res.status(500).json({
          error: "Failed to generate OpenAPI specification",
          message: error.message,
        });
      }
    };
  }

  /**
   * Express handler: serve the documentation HTML page.
   */
  static uiHandler(options?: {
    specUrl?: string;
    title?: string;
    theme?:
      | "default"
      | "alternate"
      | "moon"
      | "purple"
      | "solarized"
      | "bluePlanet"
      | "saturn"
      | "kepler"
      | "mars"
      | "deepSpace"
      | "none";
  }) {
    const title = options?.title || process.env.DOCS_TITLE || "API Documentation";
    const theme = options?.theme || "kepler";

    return (req: Request, res: Response) => {
      // Detect reverse-proxy prefix (e.g. Nginx proxying /backend → localhost:3000)
      // Priority: X-Forwarded-Prefix header → APP_BASE_PATH env → empty
      const proxyPrefix = (
        (req.headers["x-forwarded-prefix"] as string) ||
        process.env.APP_BASE_PATH ||
        ""
      ).replace(/\/+$/, "");
      const requestPath = req.originalUrl.replace(/[?#].*$/, "").replace(/\/+$/, "");
      const autoSpecUrl =
        (process.env.APP_URL || `${proxyPrefix}`).replace(/\/+$/, "") +
        `${requestPath}/openapi.json`;
      const specUrl = options?.specUrl || autoSpecUrl;
      const html = DocsUI.generateHTML(specUrl, title, theme);
      res.type("html").send(html);
    };
  }

  /**
   * Generate the self-contained HTML page.
   */
  private static generateHTML(specUrl: string, title: string, theme: string): string {
    const configuration = JSON.stringify({
      theme,
      layout: "modern",
      defaultHttpClient: {
        targetKey: "node",
        clientKey: "fetch",
      },
      hiddenClients: [],
      searchHotKey: "k",
      metaData: {
        title,
      },
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(title)}</title>
    <style>
        body { margin: 0; padding: 0; }
    </style>
</head>
<body>
    <script
        id="api-reference"
        data-url="${specUrl}"
        data-configuration='${configuration}'>
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
  }

  /**
   * Simple HTML escape.
   */
  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export default DocsUI;
