import { Request as ExpressRequest } from "express";
import { validate, ValidationError } from "@lara-node/validator";
import type { RuleSpec } from "@lara-node/validator";
import crypto from "crypto";

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

export abstract class FormRequest<T = Record<string, unknown>> {
  private readonly _req: ExpressRequest;
  private _validatedData: Record<string, unknown> = {};
  private _errors: Record<string, string[]> = {};
  private _didValidate = false;
  private _mergedData: Record<string, unknown> = {};
  private _replacedData: Record<string, unknown> | null = null;

  constructor(req: ExpressRequest) {
    this._req = req;
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

  // ---------------------------------------------------------------------------
  // Input retrieval
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Type-cast helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Existence / presence checks
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Conditional helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Mutation
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Headers
  // ---------------------------------------------------------------------------

  header(key: string, defaultValue?: string): string | undefined {
    const val = this._req.headers[key.toLowerCase()];
    if (val === undefined) return defaultValue;
    return Array.isArray(val) ? val.join(", ") : val;
  }

  hasHeader(key: string): boolean {
    return key.toLowerCase() in this._req.headers;
  }

  // ---------------------------------------------------------------------------
  // Cookies
  // ---------------------------------------------------------------------------

  cookie(key: string, defaultValue?: string): string | undefined {
    const c = (this._req as ExpressRequest & { cookies?: Record<string, string> }).cookies ?? {};
    return key in c ? c[key] : defaultValue;
  }

  hasCookie(key: string): boolean {
    const c = (this._req as ExpressRequest & { cookies?: Record<string, string> }).cookies ?? {};
    return key in c;
  }

  cookies(): Record<string, string> {
    return { ...((this._req as ExpressRequest & { cookies?: Record<string, string> }).cookies ?? {}) };
  }

  // ---------------------------------------------------------------------------
  // Request type / content negotiation
  // ---------------------------------------------------------------------------

  isMethod(method: string): boolean {
    return this._req.method.toUpperCase() === method.toUpperCase();
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

  // ---------------------------------------------------------------------------
  // URL / path helpers
  // ---------------------------------------------------------------------------

  host(): string {
    return this._req.hostname;
  }

  httpHost(): string {
    const h = this._req.headers["host"];
    return typeof h === "string" ? h : this._req.hostname;
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

  routeIs(...patterns: string[]): boolean {
    return this.pathIs(...patterns);
  }

  // ---------------------------------------------------------------------------
  // Client info
  // ---------------------------------------------------------------------------

  userAgent(): string | undefined {
    return this._req.headers["user-agent"];
  }

  ips(): string[] {
    const forwarded = this._req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") return forwarded.split(",").map((s) => s.trim());
    return this._req.ip ? [this._req.ip] : [];
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

  // ---------------------------------------------------------------------------
  // Authenticated user
  // ---------------------------------------------------------------------------

  user<U = Record<string, unknown>>(): U | undefined {
    return (this._req as ExpressRequest & { user?: U }).user;
  }

  // ---------------------------------------------------------------------------
  // Passthrough property accessors
  // ---------------------------------------------------------------------------

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

  get headers(): Record<string, string | string[] | undefined> {
    return this._req.headers as Record<string, string | string[] | undefined>;
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

  bearerToken(): string | null {
    const auth = this._req.headers.authorization;
    if (!auth) return null;
    const parts = auth.split(" ");
    return parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : null;
  }
}
