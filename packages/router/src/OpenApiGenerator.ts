/*
|--------------------------------------------------------------------------
| OpenAPI 3.0 Generator
|--------------------------------------------------------------------------
|
| Converts ScannedRoute[] into a valid OpenAPI 3.0.x document.
| Supports auto-detection of parameters, request bodies from validation
| rules, security schemes, and tag grouping.
|
*/

import { ScannedRoute } from "./RouteScanner.js";
import { DocBodyFieldMeta } from "./Doc.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    description?: string;
    version: string;
    contact?: { name?: string; email?: string; url?: string };
  };
  servers?: Array<{ url: string; description?: string }>;
  tags: Array<{ name: string; description?: string }>;
  paths: Record<string, Record<string, any>>;
  components: {
    securitySchemes?: Record<string, any>;
    schemas?: Record<string, any>;
  };
}

export interface OpenApiGeneratorOptions {
  title?: string;
  description?: string;
  version?: string;
  serverUrl?: string;
  contact?: { name?: string; email?: string; url?: string };
}

// ─── Validation Rule → JSON Schema Mapper ──────────────────────────────────────

function validationRuleToSchema(ruleString: string): {
  type: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  items?: any;
  required: boolean;
  description?: string;
} {
  const parts = ruleString
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  let type = "string";
  let format: string | undefined;
  let minimum: number | undefined;
  let maximum: number | undefined;
  let minLength: number | undefined;
  let maxLength: number | undefined;
  let enumValues: string[] | undefined;
  let items: any = undefined;
  let required = false;
  const descParts: string[] = [];

  for (const part of parts) {
    switch (true) {
      case part === "required":
        required = true;
        break;
      case part === "nullable":
        // Not required
        break;
      case part === "sometimes":
        // Only validated when present — not unconditionally required
        break;
      case part === "present":
        descParts.push("Field must be present (may be null)");
        break;

      // ── Conditional required rules ────────────────────────────────
      case part.startsWith("required_if:"):
        // conditionally required — not marked as globally required
        ((): void => {
          const [condField, ...values] = part
            .slice("required_if:".length)
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Required when \`${condField}\` is ${values.join(" or ")}`);
        })();
        break;
      case part.startsWith("required_unless:"):
        ((): void => {
          const [condField, ...values] = part
            .slice("required_unless:".length)
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Required unless \`${condField}\` is ${values.join(" or ")}`);
        })();
        break;
      case part.startsWith("required_with:"):
        ((): void => {
          const fields = part
            .slice("required_with:".length)
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Required when any of [${fields.join(", ")}] is present`);
        })();
        break;
      case part.startsWith("required_with_all:"):
        ((): void => {
          const fields = part
            .slice("required_with_all:".length)
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Required when all of [${fields.join(", ")}] are present`);
        })();
        break;
      case part.startsWith("required_without:"):
        ((): void => {
          const fields = part
            .slice("required_without:".length)
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Required when any of [${fields.join(", ")}] is absent`);
        })();
        break;
      case part.startsWith("required_without_all:"):
        ((): void => {
          const fields = part
            .slice("required_without_all:".length)
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Required when all of [${fields.join(", ")}] are absent`);
        })();
        break;
      case part === "string":
        type = "string";
        break;
      case part === "int" || part === "integer":
        type = "integer";
        break;
      case part === "numeric" || part === "float" || part === "double":
        type = "number";
        break;
      case part === "boolean":
        type = "boolean";
        break;
      case part === "array":
        type = "array";
        items = { type: "string" };
        break;
      case part === "json":
        type = "object";
        break;
      case part === "object":
        type = "object";
        break;
      case part === "email":
        type = "string";
        format = "email";
        break;
      case part === "date":
        type = "string";
        format = "date-time";
        break;
      case part === "url":
        type = "string";
        format = "uri";
        break;
      case part === "uuid":
        type = "string";
        format = "uuid";
        break;
      case part === "phone":
        type = "string";
        format = "phone";
        break;
      case part === "confirmed":
        descParts.push("Must match confirmation field");
        break;
      case part.startsWith("min:"):
        const minVal = Number(part.split(":")[1]);
        if (type === "integer" || type === "number") minimum = minVal;
        else minLength = minVal;
        break;
      case part.startsWith("max:"):
        const maxVal = Number(part.split(":")[1]);
        if (type === "integer" || type === "number") maximum = maxVal;
        else maxLength = maxVal;
        break;
      case part.startsWith("in:"):
        enumValues = part
          .split(":")[1]
          .split(",")
          .map((s) => s.trim());
        break;
      case part.startsWith("exists:"):
        const existsParts = part.split(":")[1].split(",");
        descParts.push(`Must exist in ${existsParts[0]}.${existsParts[1] || "id"}`);
        break;
      case part.startsWith("unique:"):
        const uniqueParts = part.split(":")[1].split(",");
        descParts.push(`Must be unique in ${uniqueParts[0]}.${uniqueParts[1] || "id"}`);
        break;
      case part.startsWith("regex:"):
        descParts.push(`Must match pattern: ${part.split(":")[1]}`);
        break;
      case part.startsWith("size:"):
        const sizeVal = Number(part.split(":")[1]);
        if (type === "integer" || type === "number") {
          minimum = sizeVal;
          maximum = sizeVal;
        } else {
          minLength = sizeVal;
          maxLength = sizeVal;
        }
        break;
      case part.startsWith("between:"):
        const [bMin, bMax] = part.split(":")[1].split(",").map(Number);
        if (type === "integer" || type === "number") {
          minimum = bMin;
          maximum = bMax;
        } else {
          minLength = bMin;
          maxLength = bMax;
        }
        break;

      // ── Cross-field comparison rules ──────────────────────────────
      case part.startsWith("gt:"):
        ((): void => {
          const otherField = part.slice("gt:".length).trim();
          descParts.push(`Must be greater than \`${otherField}\``);
        })();
        break;
      case part.startsWith("gte:"):
        ((): void => {
          const otherField = part.slice("gte:".length).trim();
          descParts.push(`Must be greater than or equal to \`${otherField}\``);
        })();
        break;
      case part.startsWith("lt:"):
        ((): void => {
          const otherField = part.slice("lt:".length).trim();
          descParts.push(`Must be less than \`${otherField}\``);
        })();
        break;
      case part.startsWith("lte:"):
        ((): void => {
          const otherField = part.slice("lte:".length).trim();
          descParts.push(`Must be less than or equal to \`${otherField}\``);
        })();
        break;
      case part.startsWith("same:"):
        ((): void => {
          const otherField = part.slice("same:".length).trim();
          descParts.push(`Must match \`${otherField}\``);
        })();
        break;
      case part.startsWith("different:"):
        ((): void => {
          const otherField = part.slice("different:".length).trim();
          descParts.push(`Must differ from \`${otherField}\``);
        })();
        break;

      // ── Date / time rules ─────────────────────────────────────────
      case part === "time":
        type = "string";
        format = "time";
        descParts.push("Valid time string (HH:MM or HH:MM:SS)");
        break;
      case part === "datetime":
        type = "string";
        format = "date-time";
        break;
      case part === "timezone":
        type = "string";
        descParts.push(
          "Valid IANA timezone identifier (e.g. Africa/Nairobi, UTC, America/New_York)",
        );
        break;
      case part.startsWith("date_format:"):
        ((): void => {
          const fmt = part.slice("date_format:".length).trim();
          type = "string";
          // Map common format tokens to an OpenAPI format hint
          if (fmt.includes("HH") || fmt.includes("mm") || fmt.includes("ss")) {
            format = fmt.includes("YYYY") || fmt.includes("DD") ? "date-time" : "time";
          } else {
            format = "date";
          }
          // Provide format token reference and concrete example
          const example = fmt
            .replace(/YYYY/g, "2026")
            .replace(/YY/g, "26")
            .replace(/MM/g, "04")
            .replace(/DD/g, "16")
            .replace(/HH/g, "09")
            .replace(/mm/g, "05")
            .replace(/ss/g, "30")
            .replace(/SSS/g, "123")
            .replace(/Z/g, "+03:00");
          descParts.push(`Format: \`${fmt}\` — e.g. \`${example}\``);
        })();
        break;
      case part.startsWith("before:"):
        ((): void => {
          const ref = part.slice("before:".length).trim();
          type = "string";
          format = format || "date";
          descParts.push(`Must be a date **before** \`${ref}\``);
        })();
        break;
      case part.startsWith("before_or_equal:"):
        ((): void => {
          const ref = part.slice("before_or_equal:".length).trim();
          type = "string";
          format = format || "date";
          descParts.push(`Must be a date **before or equal to** \`${ref}\``);
        })();
        break;
      case part.startsWith("after:"):
        ((): void => {
          const ref = part.slice("after:".length).trim();
          type = "string";
          format = format || "date";
          descParts.push(`Must be a date **after** \`${ref}\``);
        })();
        break;
      case part.startsWith("after_or_equal:"):
        ((): void => {
          const ref = part.slice("after_or_equal:".length).trim();
          type = "string";
          format = format || "date";
          descParts.push(`Must be a date **after or equal to** \`${ref}\``);
        })();
        break;
      case part.startsWith("date_equals:"):
        ((): void => {
          const ref = part.slice("date_equals:".length).trim();
          type = "string";
          format = format || "date";
          descParts.push(`Must be the **same date as** \`${ref}\``);
        })();
        break;

      // ── String content rules ──────────────────────────────────────
      case part.startsWith("not_in:"):
        ((): void => {
          const vals = part
            .split(":")[1]
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Must NOT be one of: ${vals.map((v) => `\`${v}\``).join(", ")}`);
        })();
        break;
      case part.startsWith("starts_with:"):
        ((): void => {
          const prefixes = part
            .slice("starts_with:".length)
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Must start with one of: ${prefixes.map((v) => `\`${v}\``).join(", ")}`);
        })();
        break;
      case part.startsWith("ends_with:"):
        ((): void => {
          const suffixes = part
            .slice("ends_with:".length)
            .split(",")
            .map((s) => s.trim());
          descParts.push(`Must end with one of: ${suffixes.map((v) => `\`${v}\``).join(", ")}`);
        })();
        break;
      case part.startsWith("contains:"):
        ((): void => {
          const sub = part.slice("contains:".length).trim();
          descParts.push(`Must contain \`${sub}\``);
        })();
        break;
      case part === "accepted":
        descParts.push('Must be accepted (true, 1, "yes", "on")');
        break;
      case part === "declined":
        descParts.push('Must be declined (false, 0, "no", "off")');
        break;
    }
  }

  const schema: any = { type, required };
  if (format) schema.format = format;
  if (minimum !== undefined) schema.minimum = minimum;
  if (maximum !== undefined) schema.maximum = maximum;
  if (minLength !== undefined) schema.minLength = minLength;
  if (maxLength !== undefined) schema.maxLength = maxLength;
  if (enumValues) schema.enum = enumValues;
  if (items) schema.items = items;
  if (descParts.length > 0) schema.description = descParts.join(". ");

  return schema;
}

// ─── Generator ─────────────────────────────────────────────────────────────────

export class OpenApiGenerator {
  /*
  |--------------------------------------------------------------------------
  | Extension registry
  |--------------------------------------------------------------------------
  |
  | Service providers (Horizon, Telescope, etc.) can contribute extra paths
  | and tags that are merged into the final spec without touching the router.
  |
  */

  private static _extraPaths: Record<string, Record<string, any>> = {};
  private static _extraTags: Array<{ name: string; description?: string }> = [];

  /**
   * Register additional OpenAPI paths from outside the router (e.g. Horizon, Telescope).
   * Paths are merged into the generated spec. Existing paths are NOT overwritten.
   */
  static registerPaths(
    paths: Record<string, Record<string, any>>,
    tags: Array<{ name: string; description?: string }> = [],
  ): void {
    for (const [p, ops] of Object.entries(paths)) {
      if (!this._extraPaths[p]) this._extraPaths[p] = {};
      Object.assign(this._extraPaths[p], ops);
    }
    for (const tag of tags) {
      if (!this._extraTags.find((t) => t.name === tag.name)) {
        this._extraTags.push(tag);
      }
    }
  }

  /** Clear registered extensions (useful in tests). */
  static clearExtensions(): void {
    this._extraPaths = {};
    this._extraTags = [];
  }

  /**
   * Generate an OpenAPI 3.0 document from scanned routes.
   */
  static generate(routes: ScannedRoute[], options: OpenApiGeneratorOptions = {}): OpenApiDocument {
    const doc: OpenApiDocument = {
      openapi: "3.0.3",
      info: {
        title: options.title || process.env.DOCS_TITLE || "API Documentation",
        description:
          options.description || process.env.DOCS_DESCRIPTION || "Auto-generated API documentation",
        version: options.version || process.env.DOCS_VERSION || "1.0.0",
      },
      servers: [],
      tags: [],
      paths: {},
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter your JWT token",
          },
        },
        schemas: {},
      },
    };

    if (options.contact) {
      doc.info.contact = options.contact;
    }

    const serverUrl =
      options.serverUrl ||
      process.env.DOCS_SERVER_URL ||
      process.env.APP_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    doc.servers!.push({ url: serverUrl, description: "Default Server" });

    // Collect unique tags
    const tagSet = new Set<string>();

    // Build paths
    for (const route of routes) {
      const openApiPath = this.expressToOpenApiPath(route.path);
      const method = route.method.toLowerCase();

      if (!doc.paths[openApiPath]) {
        doc.paths[openApiPath] = {};
      }

      // Skip duplicate methods on same path (e.g. PUT + PATCH for update)
      if (doc.paths[openApiPath][method]) continue;

      // Tags
      for (const tag of route.tags) tagSet.add(tag);

      // Build operation
      const operation: any = {
        summary: route.doc.summary || "",
        description: route.doc.description || "",
        tags: route.tags,
        operationId: this.buildOperationId(method, route.path, route.name),
        parameters: [],
        responses: {},
      };

      if (route.doc.deprecated) {
        operation.deprecated = true;
      }

      // Security
      if (route.requiresAuth) {
        operation.security = [{ bearerAuth: [] }];
      }

      // Add permission info to description
      if (route.permissions.length > 0) {
        const permDesc = `\n\n**Required permissions:** \`${route.permissions.join("`, `")}\``;
        operation.description = (operation.description || "") + permDesc;
      }

      // Add middleware info
      if (route.middleware.length > 0) {
        const mwDesc = `\n\n**Middleware:** ${route.middleware.map((m: string) => `\`${m}\``).join(", ")}`;
        operation.description = (operation.description || "") + mwDesc;
      }

      // Path parameters
      for (const param of route.pathParams) {
        const docParam = route.doc.params?.find((p) => p.name === param);
        operation.parameters.push({
          name: param,
          in: "path",
          required: true,
          description: docParam?.description || `The ${param} parameter`,
          schema: {
            type: docParam?.type || "string",
            ...(docParam?.enum ? { enum: docParam.enum } : {}),
          },
          ...(docParam?.example !== undefined ? { example: docParam.example } : {}),
        });
      }

      // Query parameters (from @Doc.param with in: 'query')
      if (route.doc.params) {
        for (const p of route.doc.params) {
          if (p.in === "query" || p.in === "header" || p.in === "cookie") {
            operation.parameters.push({
              name: p.name,
              in: p.in,
              required: p.required || false,
              description: p.description || "",
              schema: {
                type: p.type || "string",
                ...(p.enum ? { enum: p.enum } : {}),
              },
              ...(p.example !== undefined ? { example: p.example } : {}),
            });
          }
        }
      }

      // Request body (from validation rules or @Doc.body)
      if (["post", "put", "patch"].includes(method)) {
        const bodySchema = this.buildRequestBodySchema(route);
        if (bodySchema) {
          operation.requestBody = {
            required: true,
            content: {
              "application/json": {
                schema: bodySchema,
              },
            },
          };
        }
      }

      // Responses
      operation.responses = this.buildResponses(route);

      doc.paths[openApiPath][method] = operation;
    }

    // Merge extension paths contributed by Horizon, Telescope, etc.
    for (const [p, ops] of Object.entries(OpenApiGenerator._extraPaths)) {
      if (!doc.paths[p]) doc.paths[p] = {};
      Object.assign(doc.paths[p], ops);
    }

    // Build tags array (route tags + extension tags)
    doc.tags = [
      ...Array.from(tagSet)
        .sort()
        .map((name) => ({ name })),
      ...OpenApiGenerator._extraTags,
    ];

    return doc;
  }

  /**
   * Convert Express-style path (:param) to OpenAPI style ({param}).
   */
  private static expressToOpenApiPath(path: string): string {
    return path.replace(/:(\w+)(\([^)]*\))?/g, "{$1}");
  }

  /**
   * Build a unique operation ID.
   */
  private static buildOperationId(method: string, path: string, name: string | null): string {
    if (name) {
      return name.replace(/\./g, "_");
    }
    // Fallback: method + path segments
    const segments = path
      .replace(/^\/api/, "")
      .split("/")
      .filter(Boolean)
      .map((s) => s.replace(/[:{}\(\)]/g, "").replace(/^\w/, (c) => c.toUpperCase()));
    return method.toLowerCase() + segments.join("");
  }

  /**
   * Build request body JSON schema from @Doc.body, @Doc.validates, or validation rules.
   *
   * Supports:
   *  - Flat fields: `email`, `name`
   *  - Nested dot-notation fields: `cover.start_date`, `user.profile.id_number`
   *    → rendered as nested `object` schemas
   *  - Explicit `DocBodyFieldMeta` objects (override rule-derived schema)
   *  - All date/time validation rules: `date_format`, `before`, `after`, `before_or_equal`,
   *    `after_or_equal`, `date_equals`, `time`, `datetime`, `timezone`
   */
  private static buildRequestBodySchema(route: ScannedRoute): any | null {
    const body = route.doc.body;
    const validationRules = route.doc.validationRules;

    // Merge body overrides on top of validation rules (body wins per field)
    const rules: Record<string, string | null> = {};
    const bodyOverrides: Record<string, any> = {}; // field → explicit DocBodyFieldMeta schema

    if (validationRules) {
      Object.assign(rules, validationRules);
    }

    if (body) {
      for (const [field, spec] of Object.entries(body)) {
        if (typeof spec === "string") {
          rules[field] = spec;
        } else {
          // Explicit DocBodyFieldMeta — store separately so we use it verbatim
          const meta = spec as DocBodyFieldMeta;
          const schemaOverride: any = {};
          if (meta.type) schemaOverride.type = meta.type;
          if (meta.format) schemaOverride.format = meta.format;
          if (meta.description) schemaOverride.description = meta.description;
          if (meta.example !== undefined) schemaOverride.example = meta.example;
          if (meta.enum) schemaOverride.enum = meta.enum;
          if (meta.items) schemaOverride.items = meta.items;
          bodyOverrides[field] = schemaOverride;
          rules[field] = meta.required ? "required" : "nullable";
        }
      }
    }

    if (Object.keys(rules).length === 0 && Object.keys(bodyOverrides).length === 0) return null;

    // Helper: set a value at a dot-notation path inside a nested object tree
    function setNestedSchema(root: Record<string, any>, path: string, schema: any): void {
      const parts = path.split(".");
      let cur = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!cur[key]) {
          cur[key] = { type: "object", properties: {} };
        }
        if (!cur[key].properties) cur[key].properties = {};
        cur = cur[key].properties;
      }
      const leaf = parts[parts.length - 1];
      // Merge if the leaf already exists (e.g. a body override on top of a rule-derived entry)
      cur[leaf] = { ...(cur[leaf] || {}), ...schema };
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Process validation rules (skip wildcards)
    for (const [field, ruleString] of Object.entries(rules)) {
      if (!ruleString || field.includes("*")) continue;

      // Use body override schema if present; otherwise derive from rule string
      const override = bodyOverrides[field];
      if (override) {
        const isRequired = ruleString.includes("required");
        setNestedSchema(properties, field, override);
        if (isRequired && !field.includes(".")) required.push(field);
        continue;
      }

      const schema = validationRuleToSchema(ruleString);
      const { required: isRequired, ...schemaProps } = schema;

      if (field.includes(".")) {
        setNestedSchema(properties, field, schemaProps);
      } else {
        properties[field] = { ...(properties[field] || {}), ...schemaProps };
        if (isRequired) required.push(field);
      }
    }

    // Any body overrides whose field wasn't in validationRules
    for (const [field, schema] of Object.entries(bodyOverrides)) {
      if (!(field in rules)) {
        setNestedSchema(properties, field, schema);
      }
    }

    if (Object.keys(properties).length === 0) return null;

    const result: any = { type: "object", properties };
    if (required.length > 0) result.required = required;

    return result;
  }

  /**
   * Build responses map.
   */
  private static buildResponses(route: ScannedRoute): Record<string, any> {
    const responses: Record<string, any> = {};

    // Use explicit responses if provided
    if (route.doc.responses && route.doc.responses.length > 0) {
      for (const resp of route.doc.responses) {
        const statusStr = String(resp.status);
        responses[statusStr] = {
          description: resp.description || this.defaultStatusDescription(resp.status),
        };
        if (resp.schema) {
          responses[statusStr].content = {
            "application/json": { schema: resp.schema },
          };
        }
        if (resp.example) {
          if (!responses[statusStr].content) {
            responses[statusStr].content = { "application/json": {} };
          }
          responses[statusStr].content["application/json"].example = resp.example;
        }
      }
      return responses;
    }

    // Auto-generate sensible defaults
    const method = route.method.toUpperCase();

    if (method === "POST") {
      responses["201"] = { description: "Created successfully" };
    } else {
      responses["200"] = { description: "Successful response" };
    }

    if (route.requiresAuth) {
      responses["401"] = { description: "Unauthorized – authentication required" };
    }

    if (route.permissions.length > 0) {
      responses["403"] = { description: "Forbidden – insufficient permissions" };
    }

    if (route.pathParams.length > 0) {
      responses["404"] = { description: "Resource not found" };
    }

    // If route has body validation, add 422
    if (["POST", "PUT", "PATCH"].includes(method)) {
      responses["422"] = {
        description: "Validation error",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                errors: {
                  type: "object",
                  description: "Field-level error codes",
                  additionalProperties: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                messages: {
                  type: "object",
                  description: "Human-readable error messages",
                  additionalProperties: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
      };
    }

    return responses;
  }

  /**
   * Default HTTP status description.
   */
  private static defaultStatusDescription(status: number): string {
    const map: Record<number, string> = {
      200: "OK",
      201: "Created",
      204: "No Content",
      301: "Moved Permanently",
      302: "Found",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      409: "Conflict",
      422: "Unprocessable Entity",
      429: "Too Many Requests",
      500: "Internal Server Error",
    };
    return map[status] || "Response";
  }
}

export default OpenApiGenerator;
