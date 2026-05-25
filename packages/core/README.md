# @lara-node/core

IoC container, application bootstrap, service providers, `FormRequest`, middleware stack, and config system for [Lara-Node](https://github.com/venomous-maker/vest).

## Installation

```sh
pnpm add @lara-node/core
```

## Quick Start

```ts
import "reflect-metadata";
import { Application, container } from "@lara-node/core";
import { AppServiceProvider }    from "./app/Providers/AppServiceProvider";
import { RouteServiceProvider }  from "./app/Providers/RouteServiceProvider";

const app = new Application(container);

app.register(AppServiceProvider);
app.register(RouteServiceProvider);

await app.boot();
app.listen(3000, () => console.log("Listening on :3000"));
```

---

## Application

The main application class. Wraps an Express instance, a service provider registry, and the IoC container.

```ts
import { Application, container } from "@lara-node/core";

const app = new Application(container);

// Register service providers manually (in order)
app.register(AppServiceProvider);
app.register(DatabaseServiceProvider);
app.register(RouteServiceProvider);

// OR auto-discover all @Provider()-decorated classes
app.discoverProviders();

// Boot all registered providers (calls each provider's boot() method)
await app.boot();

// Mount a router at a path prefix
app.mountRoutes("/api", apiRouter.build());
app.mountRoutes("/",    webRouter.build());

// Get the underlying Express app
const express = app.getExpressApp();

// Get the http.Server (available after listen())
const server = app.getHttpServer();

// Listen
app.listen(3000);
app.listen(3000, () => console.log("Ready"));
```

---

## Container

Lightweight IoC container with automatic constructor injection via `reflect-metadata`.

```ts
import { container } from "@lara-node/core";

// Bind a factory (new instance on every resolve)
container.bind("mailer", () => new MailService());

// Bind a singleton (same instance every time)
container.singleton("db",       () => new DatabaseService());
container.singleton(AuthService);               // resolves constructor params automatically
container.singleton(IUserRepository, UserRepository); // interface → implementation

// Resolve
const db   = container.make<DatabaseService>("db");
const auth = container.make(AuthService);

// Alias one binding to another key
container.alias("cache", "CacheManager");

// Check if a binding exists
container.has("mailer"); // boolean
```

### `@Injectable()`

Marks a class for automatic constructor injection. Requires `emitDecoratorMetadata: true` in `tsconfig.json` and `import "reflect-metadata"` at the entry point.

```ts
import { Injectable } from "@lara-node/core";

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly cache:    CacheService,
  ) {}

  async login(email: string, password: string) { /* ... */ }
}
```

### `@Inject(token)`

Manually specify a resolution token when the inferred type is not enough.

```ts
import { Injectable, Inject } from "@lara-node/core";

@Injectable()
export class MailService {
  constructor(@Inject("smtp-config") private readonly config: SmtpConfig) {}
}
```

---

## ServiceProvider

Base class for all service providers. Override `register()` to bind things into the container and `boot()` to run logic after all providers are registered.

```ts
import { ServiceProvider } from "@lara-node/core";

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    // Bind services into the container
    this.singleton(UserRepository);
    this.singleton(AuthService);
    this.app.container.bind("stripe", () => new StripeClient(process.env.STRIPE_KEY!));

    // Register config namespaces
    this.setConfig("app", {
      name:  process.env.APP_NAME  ?? "Lara-Node",
      env:   process.env.NODE_ENV  ?? "production",
      debug: process.env.APP_DEBUG === "true",
    });
  }

  async boot(): Promise<void> {
    // Safe to resolve bindings here — all providers are registered
    const auth = this.app.container.make(AuthService);
    await auth.initialize();
  }
}
```

### Lifecycle hooks

```ts
export class DatabaseServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton("db", () => new Database());

    // Run before boot()
    this.booting(() => console.log("About to boot database..."));

    // Run after boot()
    this.booted(() => console.log("Database booted."));
  }

  async boot(): Promise<void> {
    await this.app.container.make<Database>("db").connect();
  }
}
```

### Middleware registration (in ServiceProvider)

```ts
export class MiddlewareServiceProvider extends ServiceProvider {
  register(): void {}

  boot(): void {
    // Register individual aliases
    this.middlewareAliases({
      auth:    AuthMiddleware,
      can:     CanMiddleware,
      role:    RoleMiddleware,
      throttle: ThrottleMiddleware,
    });

    // Define middleware groups
    this.middlewareGroup("api", ["throttle:120,1", "auth"]);
    this.middlewareGroup("web", ["session", "csrf"]);

    // Prepend / append to an existing group
    this.appendMiddlewareToGroup("api", "log");
    this.prependMiddlewareToGroup("web", "cors");

    // Execution priority for named middleware
    this.middlewarePriority(["auth", "can", "role"]);

    // Treat a middleware class as a singleton (instantiated once)
    this.singletonMiddleware(AuthMiddleware);
  }
}
```

### `@Provider(name?)`

Auto-discovery decorator. Classes decorated with `@Provider()` are picked up by `app.discoverProviders()`.

```ts
import { ServiceProvider, Provider } from "@lara-node/core";

@Provider()
export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton(UserRepository);
  }
}
```

Import providers in the desired registration order before calling `discoverProviders()`:

```ts
import "./app/Providers/AppServiceProvider";
import "./app/Providers/DatabaseServiceProvider";
import "./app/Providers/RouteServiceProvider";

app.discoverProviders();
```

### Deferred providers

A provider is deferred if `provides()` returns a non-empty array. It will only be booted when one of those services is first resolved.

```ts
export class MailServiceProvider extends ServiceProvider {
  provides(): string[] {
    return ["mailer"];
  }

  register(): void {
    this.singleton("mailer", () => new MailService());
  }
}
```

---

## FormRequest

Typed, validated HTTP request. Extend it, declare `rules()`, and type your controller's first parameter — the router resolves, validates, and injects the instance automatically.

> **Raw Express `req`:** The same input-helper methods (`req.all()`, `req.input()`, `req.isSecure()`, `req.bearerToken()`, etc.) are also available directly on the Express `Request` object when `RequestExtenderMiddleware` from `@lara-node/middlewares` is in the global middleware stack. `FormRequest` and the raw `req` share the same `FormRequest` interface — the difference is that `FormRequest` also runs `authorize()` and `validated()` automatically.

```ts
import { FormRequest } from "@lara-node/core";

class CreateUserRequest extends FormRequest<{ name: string; email: string; password: string }> {
  rules() {
    return {
      name:     "required|string|min:2|max:100",
      email:    "required|email|unique:users,email",
      password: "required|password|confirmed",
    };
  }

  messages(): Record<string, string> {
    return {
      "email.unique":    "This email address is already taken.",
      "password.confirmed": "Passwords do not match.",
    };
  }

  authorize(): boolean {
    return !!this.user();   // reject unauthenticated requests
  }
}

// In your controller:
async store(req: CreateUserRequest, res: Response) {
  const { name, email, password } = req.validated();
  const user = await User.create({ name, email, password: await hash(password) });
  return res.status(201).json({ data: user });
}
```

If `authorize()` returns `false` a 422/401 response is sent automatically.
If validation fails a 422 response with the error map is sent automatically.

### Direct property access

`FormRequest` uses a `Proxy` so you can access input fields directly as properties:

```ts
async store(req: CreateUserRequest, res: Response) {
  console.log(req.name);   // same as req.input("name")
  console.log(req.email);  // same as req.input("email")
}
```

---

### Input retrieval

| Method | Description |
|---|---|
| `all()` | All merged input — body + query + params + any merged data |
| `input(key?, default?)` | Single value or all input when called without a key |
| `post(key?, default?)` | Body-only input |
| `json(key?, default?)` | Alias for `post()` |
| `only(...keys)` | Subset of input — only the specified keys |
| `except(...keys)` | Input minus the specified keys |
| `keys()` | Array of all input key names |
| `intersect(...keys)` | Keys present in both the input and the given list |

```ts
const all   = req.all();
const email = req.input<string>("email");
const body  = req.post();
const name  = req.input("name", "Anonymous");

const safe  = req.only("name", "email");
const rest  = req.except("password", "password_confirmation");
```

### Type-cast helpers

| Method | Returns | Notes |
|---|---|---|
| `string(key, default?)` | `string` | `String(value)` |
| `integer(key, default?)` | `number` | `parseInt` — returns default on NaN |
| `float(key, default?)` | `number` | `parseFloat` — returns default on NaN |
| `boolean(key, default?)` | `boolean` | Truthy: `"true"/"1"/"yes"/"on"` |
| `date(key)` | `Date \| null` | Returns `null` on invalid dates |
| `collect(key?)` | `T[]` | Wraps scalar in array; returns arrays as-is |

```ts
const age     = req.integer("age", 0);
const price   = req.float("price", 0.0);
const active  = req.boolean("active");
const created = req.date("created_at");
const tags    = req.collect<string>("tags");
```

### Presence checks

| Method | Description |
|---|---|
| `has(...keys)` | All specified keys exist in the input |
| `hasAny(...keys)` | At least one of the specified keys exists |
| `filled(...keys)` | All specified keys exist and are non-empty (trims strings) |
| `isNotFilled(...keys)` | Inverse of `filled()` |
| `missing(...keys)` | All specified keys are absent from the input |

```ts
if (req.has("role"))          assignRole(req.input("role"));
if (req.hasAny("bio", "about")) updateProfile();
if (req.filled("phone"))      validatePhone(req.string("phone"));
if (req.missing("referral"))  skipReferralStep();
```

### Conditional helpers

```ts
// whenHas(key, found, notFound?)
req.whenHas("role",   (role) => assignRole(role));
req.whenHas("plan",   (plan) => applyPlan(plan), () => applyFreePlan());

// whenFilled(key, filled, empty?)
req.whenFilled("bio",    (bio) => updateBio(bio), () => clearBio());

// whenMissing(key, missing, present?)
req.whenMissing("otp",   ()    => sendOtp(),       (otp) => verifyOtp(otp));
```

### Mutation

```ts
// Add or overwrite keys
req.merge({ tenant_id: 42, processed_by: "system" });

// Add only when the key is absent
req.mergeIfMissing({ locale: "en", currency: "USD" });

// Replace all input entirely
req.replace({ id: 1, name: "Alice" });
```

### Files

```ts
const avatar  = req.file("avatar");            // UploadedFile | null
const hasFile = req.hasFile("document");        // boolean
const files   = req.allFiles();                 // Record<string, UploadedFile | UploadedFile[]>

// UploadedFile shape:
// { fieldname, originalname, encoding, mimetype, size, buffer?, path?, filename? }
```

### Headers & cookies

```ts
const apiKey = req.header("x-api-key");           // string | undefined
const hasAuth = req.hasHeader("authorization");    // boolean
const token   = req.bearerToken();                 // string | null — extracts Bearer token

const session = req.cookie("session_id");          // string | undefined
const hasCookie = req.hasCookie("session_id");     // boolean
const allCookies = req.cookies();                  // Record<string, string>
```

### Request type / content negotiation

```ts
req.isMethod("POST")    // boolean — case-insensitive
req.isJson()            // Content-Type: application/json
req.wantsJson()         // Accept: application/json
req.expectsJson()       // isJson() || wantsJson()
req.ajax()              // X-Requested-With: XMLHttpRequest
req.isPjax()            // PJAX request (ajax + X-PJAX header)
req.isPrefetch()        // sec-purpose: prefetch
req.isSecure()          // HTTPS or x-forwarded-proto: https
```

### URL helpers

```ts
req.fullUrl()                                // "https://api.example.com/users?page=2"
req.fullUrlWithQuery({ sort: "name" })       // appends / overwrites query params
req.fullUrlWithoutQuery("page", "sort")      // removes specified query params

req.root()                                   // "https://api.example.com"
req.host()                                   // "api.example.com"
req.httpHost()                               // "api.example.com:8080" (includes port)
req.scheme()                                 // "https" | "http"
req.schemeAndHttpHost()                      // "https://api.example.com"

req.decodedPath()                            // URL-decoded path
req.segments()                               // ["api", "users", "42"]
req.segment(1)                               // "api"  (1-indexed)
req.segment(3, "default")                    // "42"

req.pathIs("/api/*")                         // wildcard path matching
req.routeIs("/api/users/*")                  // alias of pathIs()
```

### Client info

```ts
req.ip                          // string | undefined (getter)
req.ips()                       // string[] — x-forwarded-for chain, newest first
req.userAgent()                 // string | undefined
req.fingerprint()               // SHA-256 of method + url + ip + user-agent

req.server("request_method")   // "GET" | "POST" | ...
req.server("remote_addr")       // client IP
req.server("query_string")      // raw query string
req.server("request_uri")       // full URI
```

### Authenticated user

```ts
req.user()              // unknown | undefined — value set by auth middleware
req.user<UserModel>()   // typed overload
```

### Passthrough getters

```ts
req.body            // req body object
req.query           // query string object
req.params          // route params
req.headers         // headers map
req.method          // "GET" | "POST" | ...
req.path            // "/api/users"
req.url             // "/api/users?page=2"
req.originalUrl     // "/api/users?page=2" (unchanged by middleware)
req.getRequest()    // underlying Express Request
```

---

## Config

Dot-notation key-value store. Namespaces are typically registered in service providers.

```ts
import { config, setConfig, hasConfig, allConfig } from "@lara-node/core";

// Register a namespace
setConfig("app", {
  name:     process.env.APP_NAME  ?? "My API",
  env:      process.env.NODE_ENV  ?? "production",
  debug:    process.env.APP_DEBUG === "true",
  url:      process.env.APP_URL   ?? "http://localhost:3000",
  key:      process.env.APP_KEY,
  timezone: "UTC",
});

// Read values
const name   = config("app.name");
const debug  = config<boolean>("app.debug", false);
const driver = config("db.default", "mysql");

// Check existence
if (hasConfig("mail.host")) { /* ... */ }

// Dump everything
const all = allConfig();
```

### Config file pattern

`config/app.ts`:

```ts
import { setConfig } from "@lara-node/core";

setConfig("app", {
  name:  process.env.APP_NAME  ?? "My API",
  env:   process.env.NODE_ENV  ?? "production",
  debug: process.env.APP_DEBUG === "true",
});
```

Load before `app.boot()`:

```ts
import "./config/app";
import "./config/database";
import "./config/mail";
```

---

## Middleware registration

```ts
import { registerMiddleware, resolveMiddleware,
         getRegisteredMiddleware, hasMiddleware } from "@lara-node/core";

// Register
registerMiddleware("auth",     JwtMiddleware);
registerMiddleware("throttle", ThrottleMiddleware);

// Resolve (returns the handler or an array of handlers)
const handler = resolveMiddleware("auth");

// Inspect
hasMiddleware("auth");           // boolean
getRegisteredMiddleware();       // Map<string, ...>
```

---

## Helpers

### `dd(...values)`

Dump-and-die. Pretty-prints every argument then terminates the process. Useful for quick debugging.

```ts
import { dd } from "@lara-node/core";

dd(user);
dd("label", req.body, result);
```

### `clone(value)`

Deep clone any value. Handles plain objects, class instances, functions, arrays, `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`, `TypedArray`, symbol-keyed properties, and circular references.

```ts
import { clone } from "@lara-node/core";

const copy = clone(original);

// Class instances — prototype chain preserved
class Point { constructor(public x: number, public y: number) {} }
const p  = new Point(1, 2);
const p2 = clone(p);
p2.x = 99;
console.log(p.x);            // 1 — original untouched
console.log(p2 instanceof Point); // true
```

| Input | Behaviour |
|---|---|
| Primitives | Returned as-is |
| Plain objects | Deep copy of all own properties |
| Class instances | `Object.create(proto)` — `instanceof` preserved |
| Functions | New wrapper; own properties deep-cloned |
| `Date` / `RegExp` | New instance with same value |
| `Map` / `Set` | New instance with deep-cloned entries |
| `ArrayBuffer` / `TypedArray` / `DataView` | Buffer copy |
| Circular references | Handled — no infinite loop |
| Getters / setters | Preserved as descriptors, not invoked |

---

## Notes

- `reflect-metadata` must be imported once, as early as possible in your entry file, before any decorator-annotated class is loaded.
- `container.singleton(SomeClass)` uses TypeScript's emitted constructor metadata to resolve parameters automatically — no manual factory needed.
- `discoverProviders()` is optional — use `app.register()` for explicit control over registration order.
- `FormRequest.authorize()` defaults to `true`. Override it to reject unauthorized requests before validation runs.
- `FormRequest` merges body, query, and route params in that priority order. Use `merge()` / `mergeIfMissing()` to inject server-side values (e.g. authenticated user id) before validation.
