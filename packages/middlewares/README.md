# @lara-node/middlewares

Built-in Express middleware classes — async context, request logging, request helpers, validation, JWT auth, response helpers, and RBAC guards.

## Installation

```sh
pnpm add @lara-node/middlewares
```

## Quick Start

```ts
import express from "express";
import {
  asyncContext,
  requestLogger,
  requestExtender,
  validatorAttach,
  responseExtender,
  errorHandler,
} from "@lara-node/middlewares";

const app = express();

app.use(express.json());
app.use(asyncContext);     // async context per request
app.use(requestLogger);    // colorized request log
app.use(requestExtender);  // attaches all FormRequest helpers to req
app.use(validatorAttach);  // attaches req.validate()
app.use(responseExtender); // auto-serializes Model instances

// ... routes ...

app.use(errorHandler); // must be last — handles ValidationError and other errors
```

## Middleware Reference

All middleware classes implement `handle(req, res, next)` and expose a `toHandler()` method that returns a bound Express handler.

### `AsyncContextMiddleware`

Wraps each request in an `AsyncLocalStorage` context so the request and authenticated user are accessible anywhere in the call stack without prop-drilling.

```ts
import { asyncLocalStorage } from "@lara-node/middlewares";

// Anywhere in the request lifecycle (services, repositories, etc.)
const store = asyncLocalStorage.getStore(); // { req, user? }

function getCurrentUser() {
  return asyncLocalStorage.getStore()?.user ?? null;
}
```

### `RequestLoggerMiddleware`

Colorized output on response finish: `METHOD PATH STATUS TIME IP [user:id]`. Green for 2xx, yellow for 4xx, red for 5xx.

---

### `RequestExtenderMiddleware`

Attaches all Laravel-style `FormRequest` helper methods directly to the raw Express `req` object. Must run **before** your controllers.

```ts
import { requestExtender } from "@lara-node/middlewares";

app.use(requestExtender);
```

Once registered, every `req` in your controllers has the full helper API described below.

#### Input retrieval

| Method | Description |
|---|---|
| `req.all()` | All merged input — body + query + any merged data |
| `req.input(key?, default?)` | Single value or all input when called without a key |
| `req.post(key?, default?)` | Body-only input |
| `req.json(key?, default?)` | Alias for `post()` |
| `req.only(...keys)` | Subset of input — only the specified keys |
| `req.except(...keys)` | Input minus the specified keys |
| `req.keys()` | Array of all input key names |
| `req.intersect(...keys)` | Keys present in the input and non-null |

```ts
const all   = req.all();
const email = req.input<string>("email");
const body  = req.post();
const safe  = req.only("name", "email");
const rest  = req.except("password");
```

#### Type-cast helpers

| Method | Returns | Notes |
|---|---|---|
| `req.string(key, default?)` | `string` | `String(value)` |
| `req.integer(key, default?)` | `number` | `parseInt` — returns default on NaN |
| `req.float(key, default?)` | `number` | `parseFloat` — returns default on NaN |
| `req.boolean(key, default?)` | `boolean` | Truthy: `true / 1 / "1" / "true"` |
| `req.date(key)` | `Date \| null` | Returns `null` on invalid dates |
| `req.collect(key?)` | `T[]` | Wraps scalar in array; returns arrays as-is |

```ts
const age   = req.integer("age", 0);
const price = req.float("price", 0.0);
const flag  = req.boolean("active");
const tags  = req.collect<string>("tags");
```

#### Presence checks

| Method | Description |
|---|---|
| `req.has(...keys)` | All specified keys exist in the input |
| `req.hasAny(...keys)` | At least one key exists |
| `req.filled(...keys)` | All keys exist and are non-empty |
| `req.isNotFilled(...keys)` | All keys are absent or empty |
| `req.missing(...keys)` | All keys are absent |

```ts
if (req.has("role"))         assignRole(req.input("role"));
if (req.filled("phone"))     validatePhone(req.string("phone"));
if (req.missing("referral")) skipReferralStep();
```

#### Conditional helpers

```ts
req.whenHas("role",    (role) => assignRole(role));
req.whenFilled("bio",  (bio)  => updateBio(bio), () => clearBio());
req.whenMissing("otp", ()     => sendOtp(),       (otp) => verifyOtp(otp));
```

#### Mutation

```ts
req.merge({ tenant_id: 42 });               // add / overwrite keys
req.mergeIfMissing({ locale: "en" });       // add only when absent
req.replace({ id: 1, name: "Alice" });      // replace all input
```

#### Files (multer)

```ts
const avatar = req.file("avatar");           // UploadedFile | null
const ok     = req.hasFile("document");      // boolean
const all    = req.allFiles();               // Record<string, UploadedFile | UploadedFile[]>
```

#### Headers & cookies

```ts
const ok      = req.hasHeader("x-api-key");   // boolean
const token   = req.bearerToken();             // string | null
const session = req.cookie("session_id");      // string | undefined
const hasCk   = req.hasCookie("session_id");   // boolean
const cookies = req.allCookies();              // Record<string, string>
```

#### Request type / content negotiation

```ts
req.isMethod("POST")   // boolean — case-insensitive
req.isJson()           // Content-Type: application/json
req.wantsJson()        // Accept: application/json
req.expectsJson()      // isJson() || wantsJson()
req.ajax()             // X-Requested-With: XMLHttpRequest
req.isPjax()           // X-PJAX header present
req.isPrefetch()       // purpose: prefetch header
req.isSecure()         // req.secure || protocol === "https"
```

#### URL helpers

```ts
req.fullUrl()                            // "https://api.example.com/users?page=2"
req.fullUrlWithQuery({ sort: "name" })   // appends / overwrites query params
req.fullUrlWithoutQuery("page", "sort")  // removes specified query params
req.root()                               // "https://api.example.com"
req.httpHost()                           // "api.example.com"
req.scheme()                             // "https" | "http"
req.schemeAndHttpHost()                  // "https://api.example.com"
req.decodedPath()                        // URL-decoded path
req.segments()                           // ["api", "users", "42"]
req.segment(1)                           // "api"  (1-indexed)
req.pathIs("/api/*")                     // wildcard path matching
req.routeIs("users.*")                   // matches route name pattern
```

#### Client info

```ts
req.userAgent()               // string | undefined
req.fingerprint()             // base64 of ip | user-agent | host
req.server("x-forwarded-for") // any request header value
```

---

### `ValidatorMiddleware`

Attaches `req.validate(rules)` to every request. Throws `ValidationError` on failure (caught by `ErrorHandlerMiddleware` → HTTP 422).

```ts
// In a controller
const data = await req.validate({
  name: "required|string|min:2|max:100",
  email: "required|email",
  age: "required|integer|min:18",
});
```

### `ResponseExtenderMiddleware`

Adds `res.jsonAsync()` and overrides `res.json()` to automatically call `toJSONAsync()` on `@lara-node/db` Model instances, handling hidden fields, casts, and loaded relations.

Also adds convenience response helpers:

```ts
res.success(data, "Created", 201);       // { success: true, data, message }
res.created(data);                        // 201
res.noContent();                          // 204
res.badRequest("Invalid input");          // 400
res.unauthorized();                       // 401
res.forbidden();                          // 403
res.notFound("User not found");           // 404
res.unprocessableEntity(errors);          // 422
res.serverError();                        // 500
```

```ts
res.json(user);                     // Model auto-serialized
res.json([user1, user2]);            // array of Models
res.json(await User.paginate(15));   // paginated result
await res.jsonAsync(user);           // explicit async path
```

### `AuthMiddleware`

Verifies `Authorization: Bearer <token>` using JWT and optionally loads the full user from the database.

```ts
import { AuthMiddleware } from "@lara-node/middlewares";

const auth = new AuthMiddleware({
  userLoader: async (uid) => {
    const user = await User.with(["roles", "roles.permissions"]).find(uid);
    if (!user) return null;
    return {
      id: user.id,
      roles: user.roles.map((r) => r.slug),
      permissions: user.roles.flatMap((r) => r.permissions.map((p) => p.slug)),
    };
  },
  decryptToken: (token) => myDecrypt(token), // optional
}).toHandler();

app.use("/api", auth);
```

When `userLoader` is not provided, `req.user` is populated directly from the JWT payload.

### `AuthorizeByStatusMiddleware`

Rejects requests where the authenticated user's `status` is not `active`.

```ts
import { authorizeByStatus } from "@lara-node/middlewares";

app.use("/api/protected", auth, authorizeByStatus);
```

### `ErrorHandlerMiddleware`

Express 4-argument error handler. Handles:

- `ValidationError` — HTTP 422 with `{ success: false, errors, messages }`
- `err.status` present — responds with that status code
- All others — HTTP 500

Stack trace is included in non-production responses.

```ts
import { errorHandler } from "@lara-node/middlewares";

app.use(errorHandler); // must be registered after all routes
```

---

## RBAC helpers

```ts
import { authorizeRoles, authorizePermissions } from "@lara-node/middlewares";

router.get("/admin",        auth, authorizeRoles("admin", "moderator"), handler);
router.delete("/users/:id", auth, authorizePermissions("delete_users"),  handler);
```

---

## Registering middleware aliases

```ts
import { registerMiddleware } from "@lara-node/core";
import { AuthMiddleware } from "@lara-node/middlewares";

registerMiddleware("auth", AuthMiddleware);
```

Or use the `@Middleware('alias')` decorator on the class:

```ts
import { Middleware } from "@lara-node/router";

@Middleware("auth")
export class JwtMiddleware { ... }
```

---

## Writing custom middleware

```ts
import { Request, Response, NextFunction } from "express";

export class MaintenanceModeMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    if (process.env.MAINTENANCE === "true") {
      res.status(503).json({ message: "Service temporarily unavailable." });
      return;
    }
    next();
  }

  toHandler() {
    return (req: Request, res: Response, next: NextFunction) => this.handle(req, res, next);
  }
}
```

---

## Express type augmentation

This package augments the Express `Request` and `Response` interfaces globally via the `FormRequest` interface:

```ts
// Request helpers (available after RequestExtenderMiddleware runs)
req.all()
req.input("key")
req.isSecure()
req.bearerToken()
req.isJson()
// ...all FormRequest methods

// Auth (set by AuthMiddleware)
req.user?.id
req.user?.roles
req.user?.permissions

// Validation (set by ValidatorMiddleware)
const data = await req.validate<{ email: string }>(rules);

// Response helpers (set by ResponseExtenderMiddleware)
await res.jsonAsync(model);
res.success(data);
res.notFound("User not found");
```

The `create-lara-node` scaffold generates a `src/types/express.d.ts` that re-exports these augmentations automatically.

---

## Recommended middleware order

```
AsyncContextMiddleware     — AsyncLocalStorage per request
RequestLoggerMiddleware    — log method/path/status/time
RequestExtenderMiddleware  — attach all FormRequest helpers to req
ValidatorMiddleware        — attach req.validate()
ResponseExtenderMiddleware — auto-serialize Models, add res.success() etc.
```

Error handler must be **last**, after all routes:

```ts
app.use(errorHandler);
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | Secret key used by `AuthMiddleware` to verify JWTs |
