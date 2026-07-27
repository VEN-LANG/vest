import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ValidationError, validate, RuleFn, RuleSpec } from "@lara-node/validator";
import { Model, QueryResult } from "@lara-node/db";
import { asyncLocalStorage, Request as LaraRequest } from "@lara-node/core";
import type { BasicCredentials, RequestInstance } from "@lara-node/core";

// ─── Shared async context storage ──────────────────────────────────────────────

/**
 * Re-exported from @lara-node/core, which now owns the store so that
 * `request()` can resolve without a dependency on this package. Kept here
 * for backwards compatibility — importing it from either place is the same
 * globalThis-backed instance.
 */
export { asyncLocalStorage, request, requestOrFail } from "@lara-node/core";
export type { RequestInstance, HeaderBag, CookieBag, BasicCredentials } from "@lara-node/core";

// ─── FormRequest interface ──────────────────────────────────────────────────────

type InputData = Record<string, unknown>;
type ScalarValue = string | number | boolean | null | undefined;

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
  filename?: string;
  destination?: string;
}

export interface FormRequest {
  user?: {
    id: number | string;
    email?: string;
    name?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: unknown;
  };
  // Validation
  validate: <T extends Record<string, unknown>>(
    payloadOrRules?: unknown,
    rulesMaybe?: Record<string, RuleSpec> | Record<string, string | RuleFn>,
    customMessages?: Record<string, string>,
  ) => Promise<T>;
  // Input retrieval
  all: () => InputData;
  input: <V = unknown>(key?: string, defaultValue?: V) => V | InputData;
  post: <V = unknown>(key?: string, defaultValue?: V) => V | InputData;
  json: <V = unknown>(key?: string, defaultValue?: V) => V | InputData;
  only: (...keys: string[]) => InputData;
  except: (...keys: string[]) => InputData;
  keys: () => string[];
  intersect: (...keys: string[]) => InputData;
  // Type casts
  string: (key: string, defaultValue?: string) => string;
  integer: (key: string, defaultValue?: number) => number;
  float: (key: string, defaultValue?: number) => number;
  boolean: (key: string, defaultValue?: boolean) => boolean;
  date: (key: string) => Date | null;
  collect: <V = unknown>(key?: string) => V[];
  // Presence
  has: (...keys: string[]) => boolean;
  hasAny: (...keys: string[]) => boolean;
  filled: (...keys: string[]) => boolean;
  isNotFilled: (...keys: string[]) => boolean;
  missing: (...keys: string[]) => boolean;
  // Conditionals
  whenHas: <V>(key: string, callback: (value: unknown) => V, fallback?: () => V) => V | undefined;
  whenFilled: <V>(key: string, callback: (value: unknown) => V, fallback?: () => V) => V | undefined;
  whenMissing: <V>(key: string, callback: () => V, fallback?: (value: unknown) => V) => V | undefined;
  // Mutation
  merge: (data: InputData) => void;
  mergeIfMissing: (data: InputData) => void;
  replace: (data: InputData) => void;
  // Files
  file: (key: string) => UploadedFile | null;
  hasFile: (key: string) => boolean;
  allFiles: () => Record<string, UploadedFile | UploadedFile[]>;
  // Headers & cookies
  hasHeader: (key: string) => boolean;
  cookie: (key: string, defaultValue?: string) => string | undefined;
  hasCookie: (key: string) => boolean;
  allCookies: () => Record<string, string>;
  // Referrer / origin
  referrer: (defaultValue?: string) => string | undefined;
  referer: (defaultValue?: string) => string | undefined;
  referrerHost: () => string | undefined;
  origin: (defaultValue?: string) => string | undefined;
  isCrossOrigin: () => boolean;
  // Content metadata
  contentType: () => string | undefined;
  charset: () => string | undefined;
  contentLength: () => number;
  requestId: () => string;
  // Content negotiation
  accept: () => string | undefined;
  acceptableContentTypes: () => string[];
  acceptsAnyContentType: () => boolean;
  acceptsJson: () => boolean;
  acceptsHtml: () => boolean;
  languages: () => string[];
  language: () => string | undefined;
  preferredLanguage: (available: string[], defaultValue?: string) => string | undefined;
  encodings: () => string[];
  // Request type
  isMethod: (method: string) => boolean;
  isGet: () => boolean;
  isPost: () => boolean;
  isPut: () => boolean;
  isPatch: () => boolean;
  isDelete: () => boolean;
  isHead: () => boolean;
  isOptions: () => boolean;
  isMethodSafe: () => boolean;
  isMethodIdempotent: () => boolean;
  isJson: () => boolean;
  wantsJson: () => boolean;
  expectsJson: () => boolean;
  ajax: () => boolean;
  isPjax: () => boolean;
  isPrefetch: () => boolean;
  isSecure: () => boolean;
  // URL helpers
  httpHost: () => string;
  port: () => number;
  scheme: () => string;
  schemeAndHttpHost: () => string;
  root: () => string;
  fullUrl: () => string;
  fullUrlWithQuery: (query: Record<string, ScalarValue>) => string;
  fullUrlWithoutQuery: (...keys: string[]) => string;
  queryString: () => string;
  decodedPath: () => string;
  segments: () => string[];
  segment: (index: number, defaultValue?: string) => string | undefined;
  pathIs: (...patterns: string[]) => boolean;
  fullUrlIs: (...patterns: string[]) => boolean;
  routeIs: (...patterns: string[]) => boolean;
  // Route parameters
  routeParam: <V = string>(key: string, defaultValue?: V) => V | undefined;
  // Client info
  userAgent: () => string | undefined;
  isBot: () => boolean;
  isMobile: () => boolean;
  clientIp: () => string | undefined;
  server: (key: string, defaultValue?: string) => string | undefined;
  fingerprint: () => string;
  bearerToken: () => string | null;
  basicAuth: () => BasicCredentials | null;
  // Timing
  startedAt: () => number;
  elapsed: () => number;
  // Async request context
  store: <V = unknown>(key?: string, value?: V) => V | Record<string, unknown> | undefined;
  /** The Request wrapper for this express request — same object as `request()`. */
  lara: () => RequestInstance;
}

// ─── Type augmentations ─────────────────────────────────────────────────────────

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request extends FormRequest {}
    interface Response {
      jsonAsync: <T>(data: T) => Promise<Response>;
      success: <T>(data?: T, message?: string, statusCode?: number) => Response;
      created: <T>(data?: T, message?: string) => Response;
      noContent: () => Response;
      badRequest: (message?: string, errors?: Record<string, string | string[]>) => Response;
      unauthorized: (message?: string) => Response;
      forbidden: (message?: string) => Response;
      notFound: (message?: string) => Response;
      unprocessableEntity: (errors?: Record<string, string | string[]>, message?: string) => Response;
      serverError: (message?: string) => Response;
    }
  }
}

// ─── AsyncContextMiddleware ─────────────────────────────────────────────────────

export class AsyncContextMiddleware {
  handle(req: Request, _res: Response, next: NextFunction): void {
    // Build the Request wrapper up front so startedAt() reflects when the
    // request entered the stack rather than first access, and so request()
    // resolves the same instance for the whole request.
    const lara = LaraRequest.from(req);
    lara.startedAt();
    asyncLocalStorage.run({ req }, () => next());
  }
}

// ─── RequestLoggerMiddleware ────────────────────────────────────────────────────

export class RequestLoggerMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime();
    const { method, originalUrl } = req;
    const ip = (req.ip ||
      req.headers["x-forwarded-for"] ||
      (req.socket && req.socket.remoteAddress)) as string | undefined;

    res.on("finish", () => {
      const [sec, nano] = process.hrtime(start);
      const ms = (sec * 1e3 + nano / 1e6).toFixed(2);
      const status = res.statusCode;
      const reset = "\x1b[0m";
      let color = "\x1b[32m";
      if (status >= 500) color = "\x1b[31m";
      else if (status >= 400) color = "\x1b[33m";
      const maybeUser = req.user;
      const userInfo = maybeUser
        ? ` - user:${maybeUser.id ?? maybeUser.email ?? JSON.stringify(maybeUser)}`
        : "";
      const query =
        req.query && Object.keys(req.query).length ? ` query=${JSON.stringify(req.query)}` : "";
      const params =
        req.params && Object.keys(req.params).length ? ` params=${JSON.stringify(req.params)}` : "";
      console.log(
        `${method} ${originalUrl} ${color}${status}${reset} - ${ms} ms - ${ip || "-"}${userInfo}${query}${params}`,
      );
    });

    next();
  }
}

// ─── ValidatorMiddleware ────────────────────────────────────────────────────────

export class ValidatorMiddleware {
  handle(req: Request, _res: Response, next: NextFunction): void {
    req.validate = async function <T extends Record<string, unknown>>(
      payloadOrRules?: unknown,
      maybeRules?: Record<string, RuleSpec> | Record<string, string | RuleFn>,
      customMessages?: Record<string, string>,
    ): Promise<T> {
      let payload: unknown;
      let rules: Record<string, RuleSpec> | undefined;

      const body = (req as Request & { body?: unknown }).body;
      const bodyPayload = (body as Record<string, unknown>)?.payload ?? body;

      if (
        maybeRules === undefined &&
        typeof payloadOrRules === "object" &&
        payloadOrRules !== null &&
        !Array.isArray(payloadOrRules) &&
        Object.keys(payloadOrRules).length > 0 &&
        Object.values(payloadOrRules).every(
          (v) =>
            typeof v === "string" ||
            typeof v === "function" ||
            (typeof v === "object" && v !== null && "rule" in v),
        )
      ) {
        rules = payloadOrRules as Record<string, RuleSpec>;
        payload = bodyPayload;
      } else if (maybeRules !== undefined) {
        payload = payloadOrRules;
        rules = maybeRules as Record<string, RuleSpec>;
      } else {
        payload = payloadOrRules ?? bodyPayload;
        rules = undefined;
      }

      if (!rules) throw new Error("No validation rules provided");
      return await validate<T>(payload, rules, customMessages);
    };

    next();
  }
}

// ─── RequestExtenderMiddleware ──────────────────────────────────────────────────

export class RequestExtenderMiddleware {
  handle(req: Request, _res: Response, next: NextFunction): void {
    const getBody = (): Record<string, unknown> =>
      (req as Request & { _replacedData?: Record<string, unknown> })._replacedData ??
      ({ ...(req.body as Record<string, unknown> | undefined) });

    const getExtra = (): Record<string, unknown> =>
      (req as Request & { _extraMerged?: Record<string, unknown> })._extraMerged ?? {};

    const getMerged = (): Record<string, unknown> => ({
      ...getBody(),
      ...(req.query as Record<string, unknown>),
      ...getExtra(),
    });

    req.all = () => getMerged();

    req.input = <V = unknown>(key?: string, defaultValue?: V): V | Record<string, unknown> => {
      if (!key) return getMerged();
      const data = getMerged();
      return (data[key] !== undefined ? data[key] : defaultValue) as V;
    };

    req.post = <V = unknown>(key?: string, defaultValue?: V): V | Record<string, unknown> => {
      if (!key) return getBody();
      const data = getBody();
      return (data[key] !== undefined ? data[key] : defaultValue) as V;
    };

    req.json = <V = unknown>(key?: string, defaultValue?: V): V | Record<string, unknown> => {
      if (!key) return getBody();
      const data = getBody();
      return (data[key] !== undefined ? data[key] : defaultValue) as V;
    };

    req.only = (...keys: string[]) => {
      const data = getMerged();
      return keys.reduce<Record<string, unknown>>((acc, k) => {
        if (k in data) acc[k] = data[k];
        return acc;
      }, {});
    };

    req.except = (...keys: string[]) => {
      const data = getMerged();
      const excluded = new Set(keys);
      return Object.fromEntries(Object.entries(data).filter(([k]) => !excluded.has(k)));
    };

    req.keys = () => Object.keys(getMerged());

    req.intersect = (...keys: string[]) =>
      keys.reduce<Record<string, unknown>>((acc, k) => {
        const v = getMerged()[k];
        if (v !== undefined && v !== null) acc[k] = v;
        return acc;
      }, {});

    req.string = (key: string, defaultValue = "") => {
      const v = getMerged()[key];
      return v !== undefined && v !== null ? String(v) : defaultValue;
    };

    req.integer = (key: string, defaultValue = 0) => {
      const n = parseInt(String(getMerged()[key]), 10);
      return isNaN(n) ? defaultValue : n;
    };

    req.float = (key: string, defaultValue = 0) => {
      const n = parseFloat(String(getMerged()[key]));
      return isNaN(n) ? defaultValue : n;
    };

    req.boolean = (key: string, defaultValue = false) => {
      const v = getMerged()[key];
      if (v === undefined || v === null) return defaultValue;
      if (v === true || v === 1 || v === "1" || v === "true") return true;
      if (v === false || v === 0 || v === "0" || v === "false") return false;
      return defaultValue;
    };

    req.date = (key: string) => {
      const v = getMerged()[key];
      if (!v) return null;
      const d = new Date(String(v));
      return isNaN(d.getTime()) ? null : d;
    };

    req.collect = <V = unknown>(key?: string): V[] => {
      if (!key) return Object.values(getMerged()) as V[];
      const v = getMerged()[key];
      if (Array.isArray(v)) return v as V[];
      return v !== undefined && v !== null ? ([v] as V[]) : [];
    };

    req.has = (...keys: string[]) => {
      const data = getMerged();
      return keys.every((k) => k in data);
    };

    req.hasAny = (...keys: string[]) => {
      const data = getMerged();
      return keys.some((k) => k in data);
    };

    req.filled = (...keys: string[]) => {
      const data = getMerged();
      return keys.every((k) => data[k] !== undefined && data[k] !== null && data[k] !== "");
    };

    req.isNotFilled = (...keys: string[]) => {
      const data = getMerged();
      return keys.every((k) => data[k] === undefined || data[k] === null || data[k] === "");
    };

    req.missing = (...keys: string[]) => {
      const data = getMerged();
      return keys.every((k) => !(k in data));
    };

    req.whenHas = <V>(key: string, callback: (value: unknown) => V, fallback?: () => V) => {
      const data = getMerged();
      if (key in data) return callback(data[key]);
      return fallback ? fallback() : undefined;
    };

    req.whenFilled = <V>(key: string, callback: (value: unknown) => V, fallback?: () => V) => {
      const v = getMerged()[key];
      if (v !== undefined && v !== null && v !== "") return callback(v);
      return fallback ? fallback() : undefined;
    };

    req.whenMissing = <V>(key: string, callback: () => V, fallback?: (value: unknown) => V) => {
      const data = getMerged();
      if (!(key in data)) return callback();
      return fallback ? fallback(data[key]) : undefined;
    };

    req.merge = (data: Record<string, unknown>) => {
      const r = req as Request & { _extraMerged?: Record<string, unknown> };
      r._extraMerged = { ...(r._extraMerged ?? {}), ...data };
    };

    req.mergeIfMissing = (data: Record<string, unknown>) => {
      const r = req as Request & { _extraMerged?: Record<string, unknown> };
      const current = getMerged();
      const extra = r._extraMerged ?? {};
      for (const [k, v] of Object.entries(data)) {
        if (!(k in current)) extra[k] = v;
      }
      r._extraMerged = extra;
    };

    req.replace = (data: Record<string, unknown>) => {
      const r = req as Request & { _replacedData?: Record<string, unknown>; _extraMerged?: Record<string, unknown> };
      r._replacedData = data;
      r._extraMerged = {};
    };

    req.file = (key: string) => {
      const files = (req as Request & { files?: unknown }).files;
      if (!files) return null;
      if (Array.isArray(files)) {
        return (files as UploadedFile[]).find((f) => f.fieldname === key) ?? null;
      }
      const v = (files as Record<string, UploadedFile | UploadedFile[]>)[key];
      if (!v) return null;
      return Array.isArray(v) ? v[0] : v;
    };

    req.hasFile = (key: string) => req.file(key) !== null;

    req.allFiles = () => {
      const files = (req as Request & { files?: unknown }).files;
      if (!files) return {};
      if (Array.isArray(files)) {
        return (files as UploadedFile[]).reduce<Record<string, UploadedFile | UploadedFile[]>>(
          (acc, f) => {
            const existing = acc[f.fieldname];
            if (existing) {
              acc[f.fieldname] = [...(Array.isArray(existing) ? existing : [existing]), f];
            } else {
              acc[f.fieldname] = f;
            }
            return acc;
          },
          {},
        );
      }
      return files as Record<string, UploadedFile | UploadedFile[]>;
    };

    req.hasHeader = (key: string) => key.toLowerCase() in req.headers;

    req.cookie = (key: string, defaultValue?: string) => {
      const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
      return cookies?.[key] ?? defaultValue;
    };

    req.hasCookie = (key: string) => {
      const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
      return !!cookies?.[key];
    };

    req.allCookies = () =>
      ((req as Request & { cookies?: Record<string, string> }).cookies) ?? {};

    req.isMethod = (method: string) => req.method.toUpperCase() === method.toUpperCase();

    req.isJson = () => !!(req.headers["content-type"]?.includes("application/json"));

    req.wantsJson = () => !!(req.headers["accept"]?.includes("application/json"));

    req.expectsJson = () => req.isJson() || req.wantsJson();

    req.ajax = () => req.headers["x-requested-with"] === "XMLHttpRequest";

    req.isPjax = () => !!req.headers["x-pjax"];

    req.isPrefetch = () =>
      req.headers["x-moz"] === "prefetch" || req.headers["purpose"] === "prefetch";

    req.isSecure = () => req.secure || req.protocol === "https";

    req.httpHost = () => req.hostname;

    req.scheme = () => req.protocol;

    req.schemeAndHttpHost = () => `${req.protocol}://${req.hostname}`;

    req.root = () => `${req.protocol}://${req.get("host")}`;

    req.fullUrl = () => `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    req.fullUrlWithQuery = (query: Record<string, ScalarValue>) => {
      const base = `${req.protocol}://${req.get("host")}${req.path}`;
      const url = new URL(base);
      for (const [k, v] of Object.entries({ ...(req.query as Record<string, ScalarValue>), ...query })) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
      return url.toString();
    };

    req.fullUrlWithoutQuery = (...keys: string[]) => {
      const base = `${req.protocol}://${req.get("host")}${req.path}`;
      const url = new URL(base);
      const excluded = new Set(keys);
      for (const [k, v] of Object.entries(req.query)) {
        if (excluded.has(k)) continue;
        if (Array.isArray(v)) v.forEach((val) => url.searchParams.append(k, String(val)));
        else if (v !== undefined) url.searchParams.set(k, String(v));
      }
      return url.toString();
    };

    req.decodedPath = () => decodeURIComponent(req.path);

    req.segments = () => req.path.split("/").filter(Boolean);

    req.segment = (index: number, defaultValue?: string) =>
      req.path.split("/").filter(Boolean)[index - 1] ?? defaultValue;

    req.pathIs = (...patterns: string[]) =>
      patterns.some((p) =>
        new RegExp(`^${p.replace(/\*/g, ".*").replace(/\?/g, ".")}$`).test(req.path),
      );

    req.routeIs = (...patterns: string[]) => {
      const routePath = (req as Request & { route?: { path?: string } }).route?.path ?? req.path;
      return patterns.some((p) =>
        new RegExp(`^${p.replace(/\*/g, ".*").replace(/\?/g, ".")}$`).test(routePath),
      );
    };

    req.userAgent = () => req.headers["user-agent"];

    req.server = (key: string, defaultValue?: string) => {
      const v = req.headers[key.toLowerCase()];
      return (Array.isArray(v) ? v[0] : v) ?? defaultValue;
    };

    req.fingerprint = () => {
      const parts = [req.ip, req.headers["user-agent"], req.get("host")].filter(Boolean);
      return Buffer.from(parts.join("|")).toString("base64");
    };

    req.bearerToken = () => {
      const header = req.headers["authorization"] ?? "";
      return header.startsWith("Bearer ") ? header.slice(7) : null;
    };

    /*
    |------------------------------------------------------------------------
    | Delegated accessors
    |------------------------------------------------------------------------
    |
    | Everything below is backed by the Request wrapper from @lara-node/core,
    | so `req.referrer()` and `request()!.referrer()` are the same code path.
    | The input helpers above keep their own implementation because their
    | merge semantics (body + query + merged, no route params) predate the
    | wrapper and changing them would alter existing behaviour.
    |
    | Note that `header()`, `accepts()`, `is()` and `ips` are NOT redefined —
    | express owns those names with different signatures. Reach the wrapper
    | versions through `req.lara()`.
    |
    */
    const lara = LaraRequest.from(req);

    req.lara = () => lara;

    // Referrer / origin
    req.referrer = (defaultValue?: string) => lara.referrer(defaultValue);
    req.referer = (defaultValue?: string) => lara.referrer(defaultValue);
    req.referrerHost = () => lara.referrerHost();
    req.origin = (defaultValue?: string) => lara.origin(defaultValue);
    req.isCrossOrigin = () => lara.isCrossOrigin();

    // Content metadata
    req.contentType = () => lara.contentType();
    req.charset = () => lara.charset();
    req.contentLength = () => lara.contentLength();
    req.requestId = () => lara.requestId();

    // Content negotiation
    req.accept = () => lara.accept();
    req.acceptableContentTypes = () => lara.acceptableContentTypes();
    req.acceptsAnyContentType = () => lara.acceptsAnyContentType();
    req.acceptsJson = () => lara.acceptsJson();
    req.acceptsHtml = () => lara.acceptsHtml();
    req.languages = () => lara.languages();
    req.language = () => lara.language();
    req.preferredLanguage = (available: string[], defaultValue?: string) =>
      lara.preferredLanguage(available, defaultValue);
    req.encodings = () => lara.encodings();

    // Method predicates
    req.isGet = () => lara.isGet();
    req.isPost = () => lara.isPost();
    req.isPut = () => lara.isPut();
    req.isPatch = () => lara.isPatch();
    req.isDelete = () => lara.isDelete();
    req.isHead = () => lara.isHead();
    req.isOptions = () => lara.isOptions();
    req.isMethodSafe = () => lara.isMethodSafe();
    req.isMethodIdempotent = () => lara.isMethodIdempotent();

    // URL
    req.port = () => lara.port();
    req.queryString = () => lara.queryString();
    req.fullUrlIs = (...patterns: string[]) => lara.fullUrlIs(...patterns);

    // Route parameters
    req.routeParam = <V = string>(key: string, defaultValue?: V) =>
      lara.routeParam<V>(key, defaultValue);

    // Client info
    req.isBot = () => lara.isBot();
    req.isMobile = () => lara.isMobile();
    req.clientIp = () => lara.clientIp();
    req.basicAuth = () => lara.basicAuth();

    // Timing
    req.startedAt = () => lara.startedAt();
    req.elapsed = () => lara.elapsed();

    // Async request context — named store() so it does not clobber an
    // application's own req.context object.
    req.store = <V = unknown>(key?: string, value?: V) => lara.store<V>(key, value);

    next();
  }
}

// ─── ResponseExtenderMiddleware ─────────────────────────────────────────────────

function isQueryResult(obj: unknown): obj is QueryResult<unknown> {
  return obj !== null && typeof obj === "object" && Array.isArray((obj as Record<string, unknown>).data);
}

async function serializeItem(item: unknown): Promise<unknown> {
  if (item !== null && typeof item === "object" && "toJSONAsync" in item && typeof (item as Record<string, unknown>).toJSONAsync === "function")
    return await (item as { toJSONAsync(): Promise<unknown> }).toJSONAsync();
  return item;
}

function containsModels(obj: unknown, visited = new WeakSet()): boolean {
  if (obj === null || obj === undefined) return false;
  const isObj = typeof obj === "object";
  if (isObj && visited.has(obj as object)) return false;
  if (isObj) visited.add(obj as object);
  if (obj instanceof Model) return true;
  if (Array.isArray(obj)) return obj.some((item) => containsModels(item, visited));
  if (isQueryResult(obj)) return obj.data.some((item) => containsModels(item, visited));
  if (isObj) return Object.values(obj as object).some((val) => containsModels(val, visited));
  return false;
}

export class ResponseExtenderMiddleware {
  handle(_req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json.bind(res);

    res.jsonAsync = async function <T>(data: T): Promise<Response> {
      if (data instanceof Model) return originalJson(await (data as unknown as { toJSONAsync(): Promise<unknown> }).toJSONAsync());
      if (Array.isArray(data)) {
        if (data.length === 0) return originalJson(data);
        return originalJson(await Promise.all(data.map(serializeItem)));
      }
      if (isQueryResult(data)) {
        if ((data as QueryResult<unknown>).data.length > 0) {
          const processed = await Promise.all((data as QueryResult<unknown>).data.map(serializeItem));
          return originalJson({ ...(data as QueryResult<unknown>), data: processed });
        }
        return originalJson(data);
      }
      return originalJson(data);
    };

    res.json = function <T>(this: Response, data?: T): Response {
      if (data instanceof Model) return res.jsonAsync(data) as unknown as Response;
      if (Array.isArray(data) && data.length > 0 && data.some((item: unknown) => item instanceof Model))
        return res.jsonAsync(data) as unknown as Response;
      if (isQueryResult(data)) return res.jsonAsync(data) as unknown as Response;
      if (containsModels(data)) return res.jsonAsync(data) as unknown as Response;
      return originalJson(data);
    }.bind(res);

    res.success = function <T>(data?: T, message?: string, statusCode = 200): Response {
      return res.status(statusCode).json({
        success: true,
        ...(data !== undefined ? { data } : {}),
        ...(message !== undefined ? { message } : {}),
      });
    };

    res.created = function <T>(data?: T, message?: string): Response {
      return res.status(201).json({
        success: true,
        ...(data !== undefined ? { data } : {}),
        ...(message !== undefined ? { message } : {}),
      });
    };

    res.noContent = function (): Response {
      res.status(204).end();
      return res;
    };

    res.badRequest = function (message = "Bad Request", errors?: Record<string, string | string[]>): Response {
      return res.status(400).json({ success: false, message, ...(errors ? { errors } : {}) });
    };

    res.unauthorized = function (message = "Unauthorized"): Response {
      return res.status(401).json({ success: false, message });
    };

    res.forbidden = function (message = "Forbidden"): Response {
      return res.status(403).json({ success: false, message });
    };

    res.notFound = function (message = "Not Found"): Response {
      return res.status(404).json({ success: false, message });
    };

    res.unprocessableEntity = function (errors?: Record<string, string | string[]>, message = "Unprocessable Entity"): Response {
      return res.status(422).json({ success: false, message, ...(errors ? { errors } : {}) });
    };

    res.serverError = function (message = "Internal Server Error"): Response {
      return res.status(500).json({ success: false, message });
    };

    next();
  }
}

// ─── AuthMiddleware ─────────────────────────────────────────────────────────────

export interface AuthMiddlewareOptions {
  userLoader?: (
    uid: string | number,
  ) => Promise<{
    id: number | string;
    roles?: string[];
    permissions?: string[];
    [key: string]: unknown;
  } | null>;
  decryptToken?: (token: string) => string;
}

export class AuthMiddleware {
  private userLoader?: (uid: string | number) => Promise<{ id: number | string; roles?: string[]; permissions?: string[]; [key: string]: unknown } | null>;
  private decryptFn?: (token: string) => string;

  constructor(options: AuthMiddlewareOptions = {}) {
    this.userLoader = options.userLoader;
    this.decryptFn = options.decryptToken;
  }

  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    const header = req.headers["authorization"] || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change";
      const rawToken = this.decryptFn ? this.decryptFn(token) : token;
      const decoded = jwt.verify(rawToken, JWT_SECRET) as { sub: string | number; roles?: string[]; permissions?: string[] };
      const uid = decoded.sub;

      if (this.userLoader) {
        const user = await this.userLoader(uid);
        if (!user) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
        req.user = { id: user.id, roles: user.roles, permissions: user.permissions };
        const store = asyncLocalStorage.getStore();
        if (store) store.user = user;
      } else {
        req.user = { id: uid, roles: decoded.roles, permissions: decoded.permissions };
      }

      next();
    } catch {
      res.status(401).json({ message: "Unauthorized" });
    }
  }

  toHandler(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return this.handle.bind(this);
  }
}

// ─── AuthorizeByStatusMiddleware ────────────────────────────────────────────────

export class AuthorizeByStatusMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (typeof (user as Record<string, unknown>).isActive === "function" && !(user as unknown as { isActive(): boolean }).isActive()) {
      res.status(401).json({ message: "Account Inactive" });
      return;
    }
    if ((user as Record<string, unknown>).status && (user as Record<string, unknown>).status !== "active") {
      res.status(401).json({ message: "Account Inactive" });
      return;
    }
    next();
  }
}

// ─── ErrorHandlerMiddleware ─────────────────────────────────────────────────────

export class ErrorHandlerMiddleware {
  handle(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (res.headersSent) return;

    if (err instanceof ValidationError) {
      res
        .status(422)
        .json({ success: false, errors: err.errors, messages: err.messages, message: err.message });
      return;
    }

    const e = err as Record<string, unknown>;
    const status = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 500;
    const message = typeof e.message === "string" ? e.message : "Internal Server Error";
    const payload: Record<string, unknown> = { success: false, message };
    if (e.code) payload.code = e.code;
    if (e.errors && typeof e.errors === "object") payload.errors = e.errors;
    if (process.env.NODE_ENV !== "production" && typeof e.stack === "string")
      payload.stack = e.stack.split("\n").map((l) => l.trim());

    res.status(status).json(payload);
  }

  toHandler(): (err: unknown, req: Request, res: Response, next: NextFunction) => void {
    return this.handle.bind(this);
  }
}

// ─── Authorization helpers ──────────────────────────────────────────────────────

export function authorizeRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRoles = req.user?.roles || [];
    if (!roles.some((r) => userRoles.includes(r))) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}

export function authorizePermissions(...perms: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userPerms = req.user?.permissions || [];
    if (!perms.some((p) => userPerms.includes(p))) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}

// ─── Singleton instances & function-form exports ────────────────────────────────

export const asyncContextMiddleware = new AsyncContextMiddleware();
export const requestLoggerMiddleware = new RequestLoggerMiddleware();
export const requestExtenderMiddleware = new RequestExtenderMiddleware();
export const validatorMiddleware = new ValidatorMiddleware();
export const responseExtenderMiddleware = new ResponseExtenderMiddleware();
export const authorizeByStatusMiddleware = new AuthorizeByStatusMiddleware();
export const errorHandlerMiddleware = new ErrorHandlerMiddleware();

export const asyncContext = (req: Request, res: Response, next: NextFunction) =>
  asyncContextMiddleware.handle(req, res, next);
export const requestLogger = (req: Request, res: Response, next: NextFunction) =>
  requestLoggerMiddleware.handle(req, res, next);
export const requestExtender = (req: Request, res: Response, next: NextFunction) =>
  requestExtenderMiddleware.handle(req, res, next);
export const validatorAttach = (req: Request, res: Response, next: NextFunction) =>
  validatorMiddleware.handle(req, res, next);
export const responseExtender = (req: Request, res: Response, next: NextFunction) =>
  responseExtenderMiddleware.handle(req, res, next);
export const authorizeByStatus = (req: Request, res: Response, next: NextFunction) =>
  authorizeByStatusMiddleware.handle(req, res, next);
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) =>
  errorHandlerMiddleware.handle(err, req, res, next);
