import { Request as ExpressRequest } from "express";
import { validate, ValidationError } from "@lara-node/validator";
import type { RuleSpec } from "@lara-node/validator";
import crypto from "crypto";
import { asyncLocalStorage } from "./context.js";

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

type ScalarValue = string | number | boolean | null | undefined;
type InputData = Record<string, unknown>;

type RawHeaders = Record<string, string | string[] | undefined>;

/**
 * Header accessor that is both callable and indexable, so both styles work:
 *
 *   request().headers('referer')     // → string | undefined
 *   request().headers()              // → all headers
 *   request().headers['referer']     // → raw value
 */
export interface HeaderBag {
  (): RawHeaders;
  (key: string, defaultValue?: string): string | undefined;
  [name: string]: unknown;
}

/** Cookie accessor — callable and indexable, mirroring {@link HeaderBag}. */
export interface CookieBag {
  (): Record<string, string>;
  (key: string, defaultValue?: string): string | undefined;
  [name: string]: unknown;
}

/** Basic-auth credentials parsed from the Authorization header. */
export interface BasicCredentials {
  username: string;
  password: string;
}

// Wrapper instances are memoised on the express request so that request()
// returns the same object for the whole request — merges and context writes
// made in a middleware are visible in the controller.
const REQUEST_WRAPPER = Symbol.for("lara-node.request.wrapper");
const REQUEST_STARTED_AT = Symbol.for("lara-node.request.startedAt");
const REQUEST_ID = Symbol.for("lara-node.request.id");

const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegrambot|headlesschrome|lighthouse|curl|wget|python-requests|axios|go-http-client/i;

const MOBILE_PATTERN = /android|iphone|ipod|ipad|iemobile|blackberry|opera mini|mobile safari|windows phone/i;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE", "PUT", "DELETE"]);

/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
|
| A Laravel-style wrapper around the underlying express request. Provides
| input retrieval, type casting, header/cookie access, content negotiation,
| URL helpers and client info.
|
| Reach the current one anywhere with the global `request()` helper — it
| resolves from the async request context, so no plumbing through function
| signatures is needed:
|
|   const ref = request()?.referrer();
|   const ua  = request()?.headers('user-agent');
|
| `FormRequest` extends this class and adds validation.
|
*/
export class Request {
  protected readonly _req: ExpressRequest;
  protected _mergedData: Record<string, unknown> = {};
  protected _replacedData: Record<string, unknown> | null = null;

  private _headerBag?: HeaderBag;
  private _cookieBag?: CookieBag;

  constructor(req: ExpressRequest) {
    this._req = req;
  }

  /*
  |--------------------------------------------------------------------------
  | Resolution from the async request context
  |--------------------------------------------------------------------------
  */

  /**
   * The Request for the current async context, or null when called outside a
   * request (a queue worker, a console command, module top-level).
   *
   * The instance is cached on the underlying express request, so repeated
   * calls within one request return the same object.
   */
  static current(): Request | null {
    const req = asyncLocalStorage.getStore()?.req;
    if (!req) return null;
    return Request.from(req);
  }

  /** Wrap an express request, reusing the memoised wrapper when present. */
  static from(req: ExpressRequest): Request {
    const holder = req as ExpressRequest & { [REQUEST_WRAPPER]?: Request };
    if (holder[REQUEST_WRAPPER]) return holder[REQUEST_WRAPPER];
    const instance = new Request(req);
    Object.defineProperty(holder, REQUEST_WRAPPER, {
      value: instance,
      enumerable: false,
      configurable: true,
    });
    return instance;
  }

  /*
  |--------------------------------------------------------------------------
  | Input retrieval
  |--------------------------------------------------------------------------
  */

  _inputData(): InputData {
    if (this._replacedData !== null) {
      return { ...this._replacedData, ...this._mergedData };
    }
    return {
      ...(this._req.body as InputData),
      ...(this._req.query as InputData),
      ...(this._req.params as InputData),
      ...this._mergedData,
    };
  }

  all(): InputData {
    return this._inputData();
  }

  input<V = unknown>(key?: string, defaultValue?: V): V | InputData {
    const data = this._inputData();
    if (key === undefined) return data;
    return (key in data ? data[key] : defaultValue) as V;
  }

  post<V = unknown>(key?: string, defaultValue?: V): V | InputData {
    const data = (this._req.body ?? {}) as InputData;
    if (key === undefined) return data;
    return (key in data ? data[key] : defaultValue) as V;
  }

  json<V = unknown>(key?: string, defaultValue?: V): V | InputData {
    return this.post<V>(key, defaultValue);
  }

  only(...keys: string[]): InputData {
    const data = this._inputData();
    const result: InputData = {};
    for (const key of keys) {
      if (key in data) result[key] = data[key];
    }
    return result;
  }

  except(...keys: string[]): InputData {
    const data = { ...this._inputData() };
    for (const key of keys) delete data[key];
    return data;
  }

  keys(): string[] {
    return Object.keys(this._inputData());
  }

  intersect(...keys: string[]): InputData {
    return this.only(...keys);
  }

  /*
  |--------------------------------------------------------------------------
  | Type-cast helpers
  |--------------------------------------------------------------------------
  */

  string(key: string, defaultValue = ""): string {
    const value = this.input(key);
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  }

  integer(key: string, defaultValue = 0): number {
    const parsed = parseInt(String(this.input(key)), 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  float(key: string, defaultValue = 0): number {
    const parsed = parseFloat(String(this.input(key)));
    return isNaN(parsed) ? defaultValue : parsed;
  }

  boolean(key: string, defaultValue = false): boolean {
    const value = this.input(key);
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === "boolean") return value;
    const v = String(value).toLowerCase();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
    return defaultValue;
  }

  date(key: string): Date | null {
    const value = this.input(key);
    if (!value) return null;
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? null : d;
  }

  collect<V = unknown>(key?: string): V[] {
    if (key === undefined) return Object.values(this._inputData()) as V[];
    const value = this.input(key);
    if (value === null || value === undefined) return [];
    return Array.isArray(value) ? (value as V[]) : ([value] as V[]);
  }

  /** Parse a JSON-encoded input value, returning null when it is absent or malformed. */
  jsonInput<V = unknown>(key: string, defaultValue: V | null = null): V | null {
    const value = this.input(key);
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === "object") return value as V;
    try {
      return JSON.parse(String(value)) as V;
    } catch {
      return defaultValue;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Existence / presence checks
  |--------------------------------------------------------------------------
  */

  has(...keys: string[]): boolean {
    const data = this._inputData();
    return keys.every((k) => k in data);
  }

  hasAny(...keys: string[]): boolean {
    const data = this._inputData();
    return keys.some((k) => k in data);
  }

  filled(...keys: string[]): boolean {
    const data = this._inputData();
    return keys.every((k) => {
      const v = data[k];
      if (v === null || v === undefined) return false;
      if (typeof v === "string") return v.trim().length > 0;
      return true;
    });
  }

  isNotFilled(...keys: string[]): boolean {
    return !this.filled(...keys);
  }

  missing(...keys: string[]): boolean {
    const data = this._inputData();
    return keys.every((k) => !(k in data));
  }

  /*
  |--------------------------------------------------------------------------
  | Conditional helpers
  |--------------------------------------------------------------------------
  */

  whenHas<V>(key: string, callback: (value: unknown) => V, fallback?: () => V): V | undefined {
    if (this.has(key)) return callback(this.input(key));
    return fallback?.();
  }

  whenFilled<V>(key: string, callback: (value: unknown) => V, fallback?: () => V): V | undefined {
    if (this.filled(key)) return callback(this.input(key));
    return fallback?.();
  }

  whenMissing<V>(key: string, callback: () => V, fallback?: (value: unknown) => V): V | undefined {
    if (this.missing(key)) return callback();
    return fallback?.(this.input(key));
  }

  /*
  |--------------------------------------------------------------------------
  | Mutation
  |--------------------------------------------------------------------------
  */

  merge(data: InputData): this {
    Object.assign(this._mergedData, data);
    return this;
  }

  mergeIfMissing(data: InputData): this {
    const current = this._inputData();
    for (const [key, value] of Object.entries(data)) {
      if (!(key in current)) this._mergedData[key] = value;
    }
    return this;
  }

  replace(data: InputData): this {
    this._replacedData = { ...data };
    this._mergedData = {};
    return this;
  }

  /*
  |--------------------------------------------------------------------------
  | Files
  |--------------------------------------------------------------------------
  */

  file(key: string): UploadedFile | null {
    const r = this._req as ExpressRequest & {
      file?: UploadedFile;
      files?: Record<string, UploadedFile[]> | UploadedFile[];
    };
    if (r.file?.fieldname === key) return r.file;
    if (r.files) {
      if (Array.isArray(r.files)) return r.files.find((f) => f.fieldname === key) ?? null;
      return r.files[key]?.[0] ?? null;
    }
    return null;
  }

  hasFile(key: string): boolean {
    return this.file(key) !== null;
  }

  allFiles(): Record<string, UploadedFile | UploadedFile[]> {
    const r = this._req as ExpressRequest & {
      file?: UploadedFile;
      files?: Record<string, UploadedFile[]> | UploadedFile[];
    };
    const result: Record<string, UploadedFile | UploadedFile[]> = {};
    if (r.file) result[r.file.fieldname] = r.file;
    if (r.files) {
      if (Array.isArray(r.files)) {
        for (const f of r.files) result[f.fieldname] = f;
      } else {
        Object.assign(result, r.files);
      }
    }
    return result;
  }

  /*
  |--------------------------------------------------------------------------
  | Headers
  |--------------------------------------------------------------------------
  */

  header(key: string, defaultValue?: string): string | undefined {
    const val = this._req.headers[key.toLowerCase()];
    if (val === undefined) return defaultValue;
    return Array.isArray(val) ? val.join(", ") : val;
  }

  hasHeader(key: string): boolean {
    return key.toLowerCase() in this._req.headers;
  }

  /**
   * Callable + indexable header accessor.
   *
   *   request().headers('referer')
   *   request().headers('x-api-key', 'none')
   *   request().headers()
   */
  get headers(): HeaderBag {
    if (this._headerBag) return this._headerBag;

    const raw = this._req.headers as RawHeaders;
    const accessor = ((key?: string, defaultValue?: string) => {
      if (key === undefined) return raw;
      return this.header(key, defaultValue);
    }) as HeaderBag;

    // Copy raw values on so `headers['content-type']` keeps working.
    Object.assign(accessor, raw);
    this._headerBag = accessor;
    return accessor;
  }

  /** The Referer header (spelled correctly). Note the HTTP header is misspelled. */
  referrer(defaultValue?: string): string | undefined {
    return this.header("referer", this.header("referrer", defaultValue));
  }

  /** Alias of {@link referrer} matching the HTTP header spelling. */
  referer(defaultValue?: string): string | undefined {
    return this.referrer(defaultValue);
  }

  /** Host portion of the Referer header, or undefined when absent/unparseable. */
  referrerHost(): string | undefined {
    const ref = this.referrer();
    if (!ref) return undefined;
    try {
      return new URL(ref).host;
    } catch {
      return undefined;
    }
  }

  origin(defaultValue?: string): string | undefined {
    return this.header("origin", defaultValue);
  }

  /** True when Origin is present and does not match this request's own host. */
  isCrossOrigin(): boolean {
    const origin = this.origin();
    if (!origin) return false;
    try {
      return new URL(origin).host !== this.httpHost();
    } catch {
      return true;
    }
  }

  contentType(): string | undefined {
    return this.header("content-type")?.split(";")[0].trim();
  }

  charset(): string | undefined {
    const match = /charset=([^;]+)/i.exec(this.header("content-type") ?? "");
    return match?.[1].trim();
  }

  contentLength(): number {
    const len = parseInt(this.header("content-length") ?? "", 10);
    return isNaN(len) ? 0 : len;
  }

  /**
   * A stable per-request identifier. Reuses X-Request-Id / X-Correlation-Id
   * when the caller (or an upstream proxy) supplied one, otherwise generates
   * a UUID once and caches it for the life of the request.
   */
  requestId(): string {
    const holder = this._req as ExpressRequest & { [REQUEST_ID]?: string };
    if (holder[REQUEST_ID]) return holder[REQUEST_ID];
    const supplied =
      this.header("x-request-id") ?? this.header("x-correlation-id") ?? this.header("x-trace-id");
    const id = supplied ?? crypto.randomUUID();
    Object.defineProperty(holder, REQUEST_ID, {
      value: id,
      enumerable: false,
      configurable: true,
    });
    return id;
  }

  /*
  |--------------------------------------------------------------------------
  | Content negotiation
  |--------------------------------------------------------------------------
  */

  /** Raw Accept header value. */
  accept(): string | undefined {
    return this.header("accept");
  }

  /** Accepted content types, ordered by the client's q-value preference. */
  acceptableContentTypes(): string[] {
    return parseQualityList(this.header("accept"));
  }

  /** True when the client accepts any of the given content types. */
  accepts(...types: string[]): boolean {
    const accepted = this.acceptableContentTypes();
    if (accepted.length === 0) return true;
    if (accepted.includes("*/*")) return true;
    return types.some((type) => {
      const [group] = type.split("/");
      return accepted.includes(type) || accepted.includes(`${group}/*`);
    });
  }

  acceptsAnyContentType(): boolean {
    const accepted = this.acceptableContentTypes();
    return accepted.length === 0 || accepted.includes("*/*");
  }

  acceptsJson(): boolean {
    return this.accepts("application/json");
  }

  acceptsHtml(): boolean {
    return this.accepts("text/html");
  }

  /** Languages from Accept-Language, most preferred first. */
  languages(): string[] {
    return parseQualityList(this.header("accept-language"));
  }

  /** The client's most preferred language, or undefined. */
  language(): string | undefined {
    return this.languages()[0];
  }

  /**
   * The best match between what the client accepts and what the app offers.
   * Matches on the base tag, so `en-GB` satisfies an offered `en`.
   */
  preferredLanguage(available: string[], defaultValue?: string): string | undefined {
    const offered = available.map((l) => l.toLowerCase());
    for (const lang of this.languages()) {
      const lower = lang.toLowerCase();
      const exact = offered.indexOf(lower);
      if (exact !== -1) return available[exact];
      const base = lower.split("-")[0];
      const partial = offered.findIndex((l) => l.split("-")[0] === base);
      if (partial !== -1) return available[partial];
    }
    return defaultValue ?? available[0];
  }

  /** Content encodings the client accepts, most preferred first. */
  encodings(): string[] {
    return parseQualityList(this.header("accept-encoding"));
  }

  /*
  |--------------------------------------------------------------------------
  | Cookies
  |--------------------------------------------------------------------------
  */

  private rawCookies(): Record<string, string> {
    return (this._req as ExpressRequest & { cookies?: Record<string, string> }).cookies ?? {};
  }

  cookie(key: string, defaultValue?: string): string | undefined {
    const c = this.rawCookies();
    return key in c ? c[key] : defaultValue;
  }

  hasCookie(key: string): boolean {
    return key in this.rawCookies();
  }

  /**
   * Callable + indexable cookie accessor.
   *
   *   request().cookies('session_id')
   *   request().cookies()
   */
  get cookies(): CookieBag {
    if (this._cookieBag) return this._cookieBag;

    const accessor = ((key?: string, defaultValue?: string) => {
      if (key === undefined) return { ...this.rawCookies() };
      return this.cookie(key, defaultValue);
    }) as CookieBag;

    Object.assign(accessor, this.rawCookies());
    this._cookieBag = accessor;
    return accessor;
  }

  /*
  |--------------------------------------------------------------------------
  | Request type / content negotiation
  |--------------------------------------------------------------------------
  */

  isMethod(method: string): boolean {
    return this._req.method.toUpperCase() === method.toUpperCase();
  }

  isGet(): boolean {
    return this.isMethod("GET");
  }

  isPost(): boolean {
    return this.isMethod("POST");
  }

  isPut(): boolean {
    return this.isMethod("PUT");
  }

  isPatch(): boolean {
    return this.isMethod("PATCH");
  }

  isDelete(): boolean {
    return this.isMethod("DELETE");
  }

  isHead(): boolean {
    return this.isMethod("HEAD");
  }

  isOptions(): boolean {
    return this.isMethod("OPTIONS");
  }

  /** True for methods that must not change server state (GET/HEAD/OPTIONS/TRACE). */
  isMethodSafe(): boolean {
    return SAFE_METHODS.has(this._req.method.toUpperCase());
  }

  /** True for methods that may be safely retried (safe methods plus PUT/DELETE). */
  isMethodIdempotent(): boolean {
    return IDEMPOTENT_METHODS.has(this._req.method.toUpperCase());
  }

  isJson(): boolean {
    return String(this._req.headers["content-type"] ?? "").includes("application/json");
  }

  wantsJson(): boolean {
    return String(this._req.headers["accept"] ?? "").includes("application/json");
  }

  expectsJson(): boolean {
    return this.isJson() || this.wantsJson();
  }

  ajax(): boolean {
    return String(this._req.headers["x-requested-with"] ?? "").toLowerCase() === "xmlhttprequest";
  }

  isPjax(): boolean {
    return this.ajax() && !!this._req.headers["x-pjax"];
  }

  isPrefetch(): boolean {
    const purpose = String(
      this._req.headers["purpose"] ?? this._req.headers["sec-purpose"] ?? "",
    ).toLowerCase();
    return purpose === "prefetch";
  }

  isSecure(): boolean {
    return (
      !!(this._req as ExpressRequest & { secure?: boolean }).secure ||
      this._req.headers["x-forwarded-proto"] === "https"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | URL / path helpers
  |--------------------------------------------------------------------------
  */

  host(): string {
    return this._req.hostname;
  }

  httpHost(): string {
    const h = this._req.headers["host"];
    return typeof h === "string" ? h : this._req.hostname;
  }

  /** Port the request was made to, inferred from Host then scheme. */
  port(): number {
    const host = this.httpHost();
    const idx = host.lastIndexOf(":");
    if (idx !== -1) {
      const parsed = parseInt(host.slice(idx + 1), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return this.isSecure() ? 443 : 80;
  }

  scheme(): string {
    return this.isSecure() ? "https" : "http";
  }

  schemeAndHttpHost(): string {
    return `${this.scheme()}://${this.httpHost()}`;
  }

  root(): string {
    return this.schemeAndHttpHost();
  }

  fullUrl(): string {
    return `${this.schemeAndHttpHost()}${this._req.originalUrl}`;
  }

  fullUrlWithQuery(query: Record<string, ScalarValue>): string {
    const url = new URL(this.fullUrl());
    for (const [k, v] of Object.entries(query)) {
      if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  fullUrlWithoutQuery(...keys: string[]): string {
    const url = new URL(this.fullUrl());
    for (const k of keys) url.searchParams.delete(k);
    return url.toString();
  }

  /** Raw query string without the leading `?`. */
  queryString(): string {
    return this._req.originalUrl.split("?")[1] ?? "";
  }

  decodedPath(): string {
    return decodeURIComponent(this._req.path);
  }

  segments(): string[] {
    return this._req.path.split("/").filter(Boolean);
  }

  segment(index: number, defaultValue?: string): string | undefined {
    return this.segments()[index - 1] ?? defaultValue;
  }

  pathIs(...patterns: string[]): boolean {
    const path = this._req.path;
    return patterns.some((p) =>
      new RegExp(
        "^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
      ).test(path),
    );
  }

  /** Alias of {@link pathIs}, matching Laravel's `$request->is()`. */
  is(...patterns: string[]): boolean {
    return this.pathIs(...patterns);
  }

  /** Glob-match the full URL, including scheme and host. */
  fullUrlIs(...patterns: string[]): boolean {
    const url = this.fullUrl();
    return patterns.some((p) =>
      new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$").test(url),
    );
  }

  routeIs(...patterns: string[]): boolean {
    return this.pathIs(...patterns);
  }

  /*
  |--------------------------------------------------------------------------
  | Route parameters
  |--------------------------------------------------------------------------
  */

  /** All route parameters, or one by name. */
  route<V = string>(key?: string, defaultValue?: V): V | Record<string, string> | undefined {
    const params = (this._req.params ?? {}) as Record<string, string>;
    if (key === undefined) return params;
    return (key in params ? params[key] : defaultValue) as V;
  }

  routeParam<V = string>(key: string, defaultValue?: V): V | undefined {
    return this.route<V>(key, defaultValue) as V | undefined;
  }

  /*
  |--------------------------------------------------------------------------
  | Client info
  |--------------------------------------------------------------------------
  */

  userAgent(): string | undefined {
    return this._req.headers["user-agent"];
  }

  /** True when the User-Agent looks like a crawler, scraper, or HTTP client. */
  isBot(): boolean {
    return BOT_PATTERN.test(this.userAgent() ?? "");
  }

  /** True when the User-Agent looks like a mobile browser. */
  isMobile(): boolean {
    return MOBILE_PATTERN.test(this.userAgent() ?? "");
  }

  ips(): string[] {
    const forwarded = this._req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") return forwarded.split(",").map((s) => s.trim());
    return this._req.ip ? [this._req.ip] : [];
  }

  /**
   * The originating client IP — the left-most X-Forwarded-For entry when
   * behind a proxy, otherwise the socket address.
   */
  clientIp(): string | undefined {
    return this.ips()[0] ?? this._req.ip;
  }

  server(key: string, defaultValue?: string): string | undefined {
    const lower = key.toLowerCase();
    const builtins: Record<string, string | undefined> = {
      request_method: this._req.method,
      query_string: this._req.url.split("?")[1] ?? "",
      remote_addr: this._req.ip,
      request_uri: this._req.originalUrl,
    };
    if (lower in builtins) return builtins[lower];
    const h = this._req.headers[lower];
    if (h === undefined) return defaultValue;
    return Array.isArray(h) ? h[0] : h;
  }

  fingerprint(): string {
    const data = [
      this._req.method,
      this._req.originalUrl,
      this._req.ip ?? "",
      this._req.headers["user-agent"] ?? "",
    ].join("|");
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /*
  |--------------------------------------------------------------------------
  | Authentication
  |--------------------------------------------------------------------------
  */

  user<U = Record<string, unknown>>(): U | undefined {
    const fromReq = (this._req as ExpressRequest & { user?: U }).user;
    if (fromReq !== undefined) return fromReq;
    return asyncLocalStorage.getStore()?.user as U | undefined;
  }

  bearerToken(): string | null {
    const auth = this._req.headers.authorization;
    if (!auth) return null;
    const parts = auth.split(" ");
    return parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : null;
  }

  /** Decode HTTP Basic credentials from the Authorization header. */
  basicAuth(): BasicCredentials | null {
    const auth = this._req.headers.authorization;
    if (!auth?.toLowerCase().startsWith("basic ")) return null;
    try {
      const decoded = Buffer.from(auth.slice(6).trim(), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      if (idx === -1) return null;
      return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
    } catch {
      return null;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Timing
  |--------------------------------------------------------------------------
  */

  /** When this request was first wrapped, used as its start time. */
  startedAt(): number {
    const holder = this._req as ExpressRequest & { [REQUEST_STARTED_AT]?: number };
    if (holder[REQUEST_STARTED_AT] === undefined) {
      Object.defineProperty(holder, REQUEST_STARTED_AT, {
        value: Date.now(),
        enumerable: false,
        configurable: true,
      });
    }
    return holder[REQUEST_STARTED_AT] as number;
  }

  /** Milliseconds elapsed since the request started. */
  elapsed(): number {
    return Date.now() - this.startedAt();
  }

  /*
  |--------------------------------------------------------------------------
  | Async request context
  |--------------------------------------------------------------------------
  */

  /**
   * Read or write arbitrary values on the current request's async context.
   *
   *   request()?.store('tenant', tenant);   // write
   *   request()?.store<Tenant>('tenant');   // read
   *   request()?.store();                   // whole store
   *
   * Deliberately not named `context` — applications commonly set their own
   * `req.context` object, and a method of that name would shadow it through
   * the FormRequest proxy.
   */
  store<V = unknown>(key?: string, value?: V): V | Record<string, unknown> | undefined {
    const store = asyncLocalStorage.getStore();
    if (key === undefined) return (store ?? {}) as Record<string, unknown>;
    if (value !== undefined) {
      if (store) store[key] = value;
      return value;
    }
    return store?.[key] as V | undefined;
  }

  /*
  |--------------------------------------------------------------------------
  | Passthrough property accessors
  |--------------------------------------------------------------------------
  */

  getRequest(): ExpressRequest {
    return this._req;
  }

  get body(): InputData {
    return (this._req.body ?? {}) as InputData;
  }

  get query(): InputData {
    return this._req.query as InputData;
  }

  get params(): Record<string, string> {
    return this._req.params as Record<string, string>;
  }

  get ip(): string | undefined {
    return this._req.ip;
  }

  get method(): string {
    return this._req.method;
  }

  get path(): string {
    return this._req.path;
  }

  get url(): string {
    return this._req.url;
  }

  get originalUrl(): string {
    return this._req.originalUrl;
  }

  /** A plain-object summary, handy for logging and debugging. */
  toObject(): Record<string, unknown> {
    return {
      id: this.requestId(),
      method: this.method,
      url: this.fullUrl(),
      path: this.path,
      headers: { ...(this._req.headers as RawHeaders) },
      input: this._inputData(),
      ip: this.clientIp(),
      referrer: this.referrer(),
      userAgent: this.userAgent(),
    };
  }

  toJSON(): Record<string, unknown> {
    return this.toObject();
  }
}

/*
|--------------------------------------------------------------------------
| Quality-value header parsing
|--------------------------------------------------------------------------
|
| Shared by Accept, Accept-Language and Accept-Encoding. Returns values
| ordered by descending q, dropping entries with q=0.
|R
*/
function parseQualityList(header?: string): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [value, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
      return { value: value.trim(), q: isNaN(q) ? 0 : q };
    })
    .filter((entry) => entry.value.length > 0 && entry.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.value);
}

/*
|--------------------------------------------------------------------------
| FormRequest
|--------------------------------------------------------------------------
|
| A Request that validates itself. Subclasses declare `rules()` and
| optionally `authorize()` / `messages()`; the router resolves and validates
| them before the controller action runs.
|
*/
export abstract class FormRequest<T = Record<string, unknown>> extends Request {
  private _validatedData: Record<string, unknown> = {};
  private _errors: Record<string, string[]> = {};
  private _didValidate = false;

  constructor(req: ExpressRequest) {
    super(req);
    // Proxy enables direct property access: req.email, req.name, etc.
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
        const own = Reflect.get(target, prop, receiver);
        if (own !== undefined) return own;
        const all = target._inputData();
        if (prop in all) return all[prop as string];
        // Fall back to the underlying express request so a FormRequest also
        // behaves like the request it wraps (req.context, req.user, req.headers,
        // req.get(), …) — mirroring Laravel's FormRequest-extends-Request.
        const fromReq = (target._req as unknown as Record<string, unknown>)[prop as string];
        return typeof fromReq === "function" ? fromReq.bind(target._req) : fromReq;
      },
    }) as FormRequest<T>;
  }

  abstract rules(): Record<string, RuleSpec> | Record<string, string[]>;

  authorize(): boolean {
    return true;
  }

  messages(): Record<string, string> {
    return {};
  }

  async validate(): Promise<this> {
    if (this._didValidate) return this;
    this._didValidate = true;

    if (!this.authorize()) {
      throw new ValidationError(
        { authorization: ["This action is unauthorized."] },
        { authorization: ["This action is unauthorized."] },
      );
    }

    const data = this._inputData();
    const r = this.rules();
    const rules: Record<string, RuleSpec> = {};
    for (const key of Object.keys(r)) {
      const value = r[key];
      rules[key] = Array.isArray(value) ? value.join("|") : value;
    }

    try {
      this._validatedData = await validate(data, rules, this.messages());
    } catch (error) {
      if (error instanceof ValidationError) {
        this._errors = error.messages;
        throw error;
      }
      throw error;
    }

    return this;
  }

  validated(): T {
    return this._validatedData as T;
  }

  safe(): Record<string, unknown> {
    return { ...this._validatedData };
  }

  fails(): boolean {
    return Object.keys(this._errors).length > 0;
  }

  passed(): boolean {
    return !this.fails();
  }

  errors(): Record<string, string[]> {
    return { ...this._errors };
  }
}

/*
|--------------------------------------------------------------------------
| request() helper
|--------------------------------------------------------------------------
*/

/** The concrete type returned by {@link request}. */
export type RequestInstance = Request;

/**
 * The current request, or null when there is none.
 *
 * Resolves from the async context established by AsyncContextMiddleware, so
 * it works anywhere downstream of it — services, models, listeners — with no
 * plumbing. Outside a request (queue workers, console commands) it is null,
 * so always guard:
 *
 *   const ref = request()?.referrer();
 *   if (request()?.isBot()) return;
 */
export function request(): RequestInstance | null {
  return Request.current();
}

/**
 * The current request, throwing when there is none.
 * Use in code that is only ever reachable from an HTTP request.
 */
export function requestOrFail(): RequestInstance {
  const req = Request.current();
  if (!req) {
    throw new Error(
      "No request is bound to the current async context. " +
        "Ensure AsyncContextMiddleware is registered in the HTTP kernel, and " +
        "note that request() is null in queue workers and console commands.",
    );
  }
  return req;
}
