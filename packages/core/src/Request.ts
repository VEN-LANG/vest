import { Request as ExpressRequest } from "express";
import { validate, ValidationError } from "@lara-node/validator";
import type { RuleSpec } from "@lara-node/validator";

export abstract class FormRequest<T = Record<string, any>> {
  private readonly _req: ExpressRequest;
  private _validatedData: Record<string, any> = {};
  private _errors: Record<string, string[]> = {};
  private _didValidate = false;

  constructor(req: ExpressRequest) {
    this._req = req;
  }
  /*
   * Object { email: "required|string|max:255" }
   * Array { email: ["required", "string"] }
   */
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

    const data = { ...this._req.body, ...this._req.query, ...this._req.params };
    let r = this.rules();
    let rules: Record<string, RuleSpec> = {};
    Object.keys(r).forEach((key) => {
      let value = r[key];
      if (Array.isArray(value)) {
        rules[key] = value.join("|");
      } else {
        rules[key] = value;
      }
    });
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

  safe(): Record<string, any> {
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

  input<T>(key?: string, defaultValue?: any): T {
    const data = { ...this._req.body, ...this._req.query, ...this._req.params };
    return key ? (key in data ? data[key] : defaultValue) : data;
  }

  only(...keys: string[]): Record<string, any> {
    const data = this.input<Record<string, any>>();
    const result: Record<string, any> = {};
    for (const key of keys) {
      if (key in data) result[key] = data[key];
    }
    return result;
  }

  except(...keys: string[]): Record<string, any> {
    const data = { ...this.input<Record<string, any>>() };
    for (const key of keys) {
      delete data[key];
    }
    return data;
  }

  getRequest(): ExpressRequest {
    return this._req;
  }

  get body(): any {
    return this._req.body;
  }
  get query(): any {
    return this._req.query;
  }
  get params(): any {
    return this._req.params;
  }
  get headers(): any {
    return this._req.headers;
  }
  get ip() {
    return this._req.ip;
  }
  get method() {
    return this._req.method;
  }
  get path() {
    return this._req.path;
  }
  get url() {
    return this._req.url;
  }
  get originalUrl() {
    return this._req.originalUrl;
  }

  bearerToken(): string | null {
    const auth = this._req.headers.authorization;
    if (!auth) return null;
    const parts = auth.split(" ");
    return parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : null;
  }
}
