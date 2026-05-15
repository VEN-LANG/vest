import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ValidationError, validate, RuleFn, RuleSpec } from "@lara-node/validator";

// ─── Shared async context storage ──────────────────────────────────────────────

export const asyncLocalStorage = new AsyncLocalStorage<Record<string, any>>();

// ─── Type augmentations ─────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        roles?: string[];
        permissions?: string[];
      };
      validate: <T extends Record<string, any>>(
        payloadOrRules?: any,
        rulesMaybe?: Record<string, RuleSpec> | Record<string, string | RuleFn>,
        customMessages?: Record<string, string>,
      ) => Promise<T>;
    }
    interface Response {
      jsonAsync: <T>(data: T) => Promise<Response>;
    }
  }
}

// ─── AsyncContextMiddleware ─────────────────────────────────────────────────────

export class AsyncContextMiddleware {
  handle(req: Request, _res: Response, next: NextFunction): void {
    asyncLocalStorage.run({ req }, () => next());
  }
}

// ─── RequestLoggerMiddleware ────────────────────────────────────────────────────

export class RequestLoggerMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime();
    const { method, originalUrl } = req;
    const ip = (req.ip || req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress)) as string | undefined;

    res.on("finish", () => {
      const [sec, nano] = process.hrtime(start);
      const ms = (sec * 1e3 + nano / 1e6).toFixed(2);
      const status = res.statusCode;
      const reset = "\x1b[0m";
      let color = "\x1b[32m";
      if (status >= 500) color = "\x1b[31m";
      else if (status >= 400) color = "\x1b[33m";
      const maybeUser = (req as any).user;
      const userInfo = maybeUser ? ` - user:${maybeUser.id ?? maybeUser.email ?? JSON.stringify(maybeUser)}` : "";
      const query = req.query && Object.keys(req.query).length ? ` query=${JSON.stringify(req.query)}` : "";
      const params = req.params && Object.keys(req.params).length ? ` params=${JSON.stringify(req.params)}` : "";
      console.log(`${method} ${originalUrl} ${color}${status}${reset} - ${ms} ms - ${ip || "-"}${userInfo}${query}${params}`);
    });

    next();
  }
}

// ─── ValidatorMiddleware ────────────────────────────────────────────────────────

export class ValidatorMiddleware {
  handle(req: Request & { validate?: any }, _res: Response, next: NextFunction): void {
    req.validate = async function <T extends Record<string, any>>(
      payloadOrRules: any,
      maybeRules?: any,
      customMessages?: Record<string, string>,
    ): Promise<T> {
      let payload: any;
      let rules: any;

      if (
        maybeRules === undefined &&
        typeof payloadOrRules === "object" &&
        !Array.isArray(payloadOrRules) &&
        Object.keys(payloadOrRules || {}).length &&
        Object.values(payloadOrRules).every(
          (v) => typeof v === "string" || typeof v === "function" || (typeof v === "object" && v && "rule" in (v as any)),
        )
      ) {
        rules = payloadOrRules;
        payload = (req as any).body?.payload ?? (req as any).body;
      } else if (maybeRules !== undefined) {
        payload = payloadOrRules;
        rules = maybeRules;
      } else {
        payload = payloadOrRules ?? ((req as any).body?.payload ?? (req as any).body);
        rules = maybeRules;
      }

      if (!rules) throw new Error("No validation rules provided");
      return await validate<T>(payload, rules, customMessages);
    };

    next();
  }
}

// ─── ResponseExtenderMiddleware ─────────────────────────────────────────────────

function isQueryResult(obj: any): boolean {
  return obj && typeof obj === "object" && Array.isArray(obj.data);
}

async function serializeItem(item: any): Promise<any> {
  if (item && typeof item.toJSONAsync === "function") return await item.toJSONAsync();
  return item;
}

export class ResponseExtenderMiddleware {
  handle(_req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json.bind(res);

    res.jsonAsync = async function <T>(data: T): Promise<Response> {
      if (data && typeof (data as any).toJSONAsync === "function") {
        return originalJson(await (data as any).toJSONAsync());
      }
      if (Array.isArray(data)) {
        return originalJson(await Promise.all(data.map(serializeItem)));
      }
      if (isQueryResult(data)) {
        const processed = await Promise.all((data as any).data.map(serializeItem));
        return originalJson({ ...(data as any), data: processed });
      }
      return originalJson(data);
    };

    next();
  }
}

// ─── AuthMiddleware ─────────────────────────────────────────────────────────────

export interface AuthMiddlewareOptions {
  userLoader?: (uid: string | number) => Promise<{ id: number | string; roles?: string[]; permissions?: string[] } | null>;
  decryptToken?: (token: string) => string;
}

export class AuthMiddleware {
  private userLoader?: (uid: string | number) => Promise<any | null>;
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
      const decoded = jwt.verify(rawToken, JWT_SECRET) as any;
      const uid = decoded.sub;

      if (this.userLoader) {
        const user = await this.userLoader(uid);
        if (!user) { res.status(401).json({ message: "Unauthorized" }); return; }
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
    const user = req.user as any;
    if (!user) { res.status(401).json({ message: "Unauthorized" }); return; }
    if (typeof user.isActive === "function" && !user.isActive()) {
      res.status(401).json({ message: "Account Inactive" });
      return;
    }
    if (user.status && user.status !== "active") {
      res.status(401).json({ message: "Account Inactive" });
      return;
    }
    next();
  }
}

// ─── ErrorHandlerMiddleware ─────────────────────────────────────────────────────

export class ErrorHandlerMiddleware {
  handle(err: any, _req: Request, res: Response, _next: NextFunction): void {
    if (res.headersSent) return;

    if (err instanceof ValidationError) {
      res.status(422).json({ success: false, errors: err.errors, messages: err.messages, message: err.message });
      return;
    }

    const status =
      typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
    const message = err.message || "Internal Server Error";
    const payload: any = { success: false, message };
    if (err.code) payload.code = err.code;
    if (err.errors && typeof err.errors === "object") payload.errors = err.errors;
    if (process.env.NODE_ENV !== "production" && err.stack)
      payload.stack = err.stack.split("\n").map((l: string) => l.trim());

    res.status(status).json(payload);
  }

  toHandler(): (err: any, req: Request, res: Response, next: NextFunction) => void {
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
export const validatorMiddleware = new ValidatorMiddleware();
export const responseExtenderMiddleware = new ResponseExtenderMiddleware();
export const authorizeByStatusMiddleware = new AuthorizeByStatusMiddleware();
export const errorHandlerMiddleware = new ErrorHandlerMiddleware();

export const asyncContext = (req: Request, res: Response, next: NextFunction) =>
  asyncContextMiddleware.handle(req, res, next);
export const requestLogger = (req: Request, res: Response, next: NextFunction) =>
  requestLoggerMiddleware.handle(req, res, next);
export const validatorAttach = (req: Request, res: Response, next: NextFunction) =>
  validatorMiddleware.handle(req, res, next);
export const responseExtender = (req: Request, res: Response, next: NextFunction) =>
  responseExtenderMiddleware.handle(req, res, next);
export const authorizeByStatus = (req: Request, res: Response, next: NextFunction) =>
  authorizeByStatusMiddleware.handle(req, res, next);
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) =>
  errorHandlerMiddleware.handle(err, req, res, next);
