import { ServiceProvider } from "@vest/core";
import { DocsUI } from "./DocsUI.js";

/**
 * Serves the OpenAPI spec and Scalar/Swagger UI under /docs (dev only by default).
 *
 * Enabled when DOCS_ENABLED=true or when NODE_ENV is not production.
 * Override the path and metadata via env vars:
 *   DOCS_PATH, DOCS_TITLE, DOCS_DESCRIPTION, DOCS_VERSION, DOCS_SERVER_URL, DOCS_THEME
 */
export class DocServiceProvider extends ServiceProvider {
  register(): void {}

  boot(): void {
    if (!this.isEnabled()) return;

    const expressApp = this.app.getExpressApp();
    const basePath = process.env.DOCS_PATH ?? "/docs";

    const spec = {
      title: process.env.DOCS_TITLE ?? "API Documentation",
      description: process.env.DOCS_DESCRIPTION ?? "Auto-generated API documentation",
      version: process.env.DOCS_VERSION ?? "1.0.0",
      serverUrl: process.env.DOCS_SERVER_URL,
    };

    expressApp.get(`${basePath}/openapi.json`, DocsUI.specHandler(spec));
    expressApp.get(
      basePath,
      DocsUI.uiHandler({
        title: spec.title,
        theme: (process.env.DOCS_THEME as any) ?? "kepler",
      }),
    );

    console.log(`[Docs] API documentation available at ${basePath}`);
  }

  private isEnabled(): boolean {
    const flag = process.env.DOCS_ENABLED;
    if (flag !== undefined) return flag.toLowerCase() === "true" || flag === "1";
    return process.env.NODE_ENV !== "production";
  }
}
