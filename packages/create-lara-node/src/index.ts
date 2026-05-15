#!/usr/bin/env node
/**
 * create-lara-node
 *
 * Usage:
 *   pnpm create lara-node
 *   pnpm create lara-node my-api
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import pc from "picocolors";
import prompts from "prompts";

const LARA_NODE_VERSION = "0.1.1";

async function main() {
  console.log(
    `\n${pc.bold(pc.cyan("  Lara-Node"))} ${pc.dim("— Laravel-inspired Node.js framework")}\n`,
  );

  const argName = process.argv[2];

  const answers = await prompts(
    [
      {
        type: argName ? null : "text",
        name: "projectName",
        message: "Project name:",
        initial: "my-lara-node-app",
      },
      {
        type: "select",
        name: "database",
        message: "Database driver:",
        choices: [
          { title: "MySQL", value: "mysql" },
          { title: "MongoDB", value: "mongodb" },
        ],
      },
      {
        type: "multiselect",
        name: "packages",
        message: "Select packages to include:",
        choices: [
          { title: "@lara-node/validator   (validation engine) [core]", value: "validator", selected: true },
          { title: "@lara-node/middlewares (class-based middleware) [core]", value: "middlewares", selected: true },
          { title: "@lara-node/events      (events + broadcasting)", value: "events", selected: true },
          { title: "@lara-node/queue       (job queue + scheduler)", value: "queue", selected: true },
          { title: "@lara-node/mail        (mail drivers)", value: "mail", selected: true },
          { title: "@lara-node/horizon     (queue dashboard)", value: "horizon", selected: false },
          { title: "@lara-node/telescope   (debug dashboard)", value: "telescope", selected: false },
        ],
      },
    ],
    {
      onCancel: () => {
        console.log(pc.red("  Cancelled."));
        process.exit(0);
      },
    },
  );

  const projectName = argName ?? answers.projectName;
  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(pc.red(`\n  Directory "${projectName}" already exists.\n`));
    process.exit(1);
  }

  console.log(`\n  Scaffolding ${pc.bold(projectName)}…\n`);

  scaffold(targetDir, projectName, answers);

  console.log(`  ${pc.green("✓")} Done!\n`);
  console.log(`  Next steps:\n`);
  console.log(`    ${pc.cyan(`cd ${projectName}`)}`);
  console.log(`    ${pc.cyan("pnpm install")}`);
  console.log(`    ${pc.cyan("cp .env.example .env")}`);
  console.log(`    ${pc.cyan("# Edit .env with your DB credentials")}`);
  console.log(`    ${pc.cyan("pnpm artisan migrate")}`);
  console.log(`    ${pc.cyan("pnpm artisan db:seed")}`);
  console.log(`    ${pc.cyan("pnpm dev")}\n`);
}

const w = (dir: string, file: string, content: string) => writeFileSync(join(dir, file), content);
const d = (dir: string, path: string) => mkdirSync(join(dir, path), { recursive: true });

function scaffold(dir: string, name: string, opts: { database: string; packages: string[] }): void {
  mkdirSync(dir, { recursive: true });

  const hasEvents = opts.packages.includes("events");
  const hasQueue = opts.packages.includes("queue");
  const hasMail = opts.packages.includes("mail");
  const hasHorizon = opts.packages.includes("horizon");
  const hasTelescope = opts.packages.includes("telescope");

  const coreDeps = new Set(["core", "db", "router", "auth", "console", "validator", "middlewares"]);

  const laraNodeDeps: string[] = [
    "@lara-node/core",
    "@lara-node/db",
    "@lara-node/router",
    "@lara-node/auth",
    "@lara-node/console",
    "@lara-node/validator",
    "@lara-node/middlewares",
  ];

  for (const pkg of opts.packages) {
    if (!coreDeps.has(pkg)) laraNodeDeps.push(`@lara-node/${pkg}`);
  }

  // ── package.json ─────────────────────────────────────────────────────────────
  const packageJson = {
    name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "node --import @swc-node/register/esm --import ./src/register.ts src/server.ts",
      start: "node dist/server.js",
      build: "tsdown src/server.ts src/artisan.ts --format esm --out-dir dist",
      artisan: "node --import @swc-node/register/esm --import ./src/register.ts src/artisan.ts",
      migrate: "node --import @swc-node/register/esm --import ./src/register.ts src/artisan.ts migrate",
      "migrate:fresh": "node --import @swc-node/register/esm --import ./src/register.ts src/artisan.ts migrate:fresh",
      "db:seed": "node --import @swc-node/register/esm --import ./src/register.ts src/artisan.ts db:seed",
      test: "vitest run",
      lint: "oxlint src",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      ...Object.fromEntries(laraNodeDeps.map((p) => [p, `^${LARA_NODE_VERSION}`])),
      "reflect-metadata": "^0.2.2",
      dotenv: "^17.2.3",
      express: "^5.2.1",
      cors: "^2.8.5",
      jsonwebtoken: "^9.0.2",
      bcryptjs: "^3.0.2",
      multer: "^2.0.1",
      yargs: "^18.0.0",
      ...(opts.database === "mysql" ? { mysql2: "^3.16.0" } : { mongodb: "^7.0.0" }),
    },
    devDependencies: {
      "@types/node": "^24.12.2",
      "@types/express": "^5.0.6",
      "@types/jsonwebtoken": "^9.0.9",
      "@types/bcryptjs": "^2.4.6",
      "@types/multer": "^1.4.12",
      "@types/yargs": "^17.0.33",
      "@swc-node/register": "^1.10.9",
      "@swc/core": "^1.11.0",
      oxlint: "^0.16.6",
      tsdown: "^0.12.9",
      typescript: "^5.9.3",
      vitest: "^3.2.3",
    },
  };

  w(dir, "package.json", JSON.stringify(packageJson, null, 2));

  // ── tsconfig.json ─────────────────────────────────────────────────────────────
  w(
    dir,
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          useDefineForClassFields: false,
          resolveJsonModule: true,
          outDir: "./dist",
          rootDir: "./src",
          baseUrl: "./src",
          paths: {
            "@app/*": ["app/*"],
            "@config/*": ["config/*"],
            "@database/*": ["database/*"],
            "@routes/*": ["routes/*"],
          },
        },
        include: ["src"],
        exclude: ["dist", "node_modules"],
      },
      null,
      2,
    ),
  );

  // ── .swcrc ────────────────────────────────────────────────────────────────────
  w(
    dir,
    ".swcrc",
    JSON.stringify(
      {
        jsc: {
          parser: { syntax: "typescript", tsx: false, decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: "es2022",
        },
        module: { type: "es6" },
        sourceMaps: true,
      },
      null,
      2,
    ),
  );

  // ── src/register.ts ───────────────────────────────────────────────────────────
  w(dir, "src/register.ts", `import 'reflect-metadata';\nimport 'dotenv/config';\n`);

  // ── .env.example ─────────────────────────────────────────────────────────────
  w(
    dir,
    ".env.example",
    [
      "APP_NAME=" + name,
      "APP_ENV=local",
      "APP_KEY=",
      "APP_DEBUG=true",
      "PORT=3000",
      "",
      `DB_CONNECTION=${opts.database}`,
      "DB_HOST=127.0.0.1",
      "DB_PORT=3306",
      "DB_NAME=" + name.replace(/-/g, "_"),
      "DB_USER=root",
      "DB_PASSWORD=",
      "",
      "JWT_SECRET=change-this-in-production",
      "JWT_EXPIRES_IN=7d",
      "",
      "CACHE_DRIVER=file",
      "QUEUE_CONNECTION=sync",
      "MAIL_DRIVER=log",
      "MAIL_FROM_ADDRESS=hello@example.com",
      "MAIL_FROM_NAME=" + name,
      "BROADCAST_DRIVER=null",
    ].join("\n"),
  );

  w(dir, ".gitignore", "node_modules\ndist\n.env\n*.log\nuploads/\n");

  // ── Directories ───────────────────────────────────────────────────────────────
  for (const dd of [
    "src/app/Console/Commands",
    "src/app/Events",
    "src/app/Http/Controllers/User",
    "src/app/Http/Controllers/File",
    "src/app/Http/Docs",
    "src/app/Jobs",
    "src/app/Listeners",
    "src/app/Mail",
    "src/app/Middleware",
    "src/app/Models/User",
    "src/app/Models/File",
    "src/app/Observers",
    "src/app/Providers",
    "src/app/Services",
    "src/app/Subscribers",
    "src/bootstrap",
    "src/config",
    "src/database/migrations",
    "src/database/seeders",
    "src/routes",
    "src/types",
    "uploads/files",
  ]) d(dir, dd);

  // ── src/types/express.d.ts ────────────────────────────────────────────────────
  w(
    dir,
    "src/types/express.d.ts",
    `import type { RuleSpec, RuleFn } from '@lara-node/validator';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        email?: string;
        name?: string;
        roles?: string[];
        permissions?: string[];
        [key: string]: any;
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

export {};
`,
  );

  // ── src/app/Http/Docs/decorators.ts ──────────────────────────────────────────
  w(
    dir,
    "src/app/Http/Docs/decorators.ts",
    `import 'reflect-metadata';

export const DOC_META = 'lara:doc:method';

export interface DocMethodOptions {
  summary: string;
  description?: string;
  tags?: string[];
  auth?: boolean;
  deprecated?: boolean;
  body?: Record<string, { type: string; required?: boolean; description?: string }>;
  params?: Record<string, { type?: string; description?: string }>;
  query?: Record<string, { type?: string; description?: string }>;
  responses?: Record<number, { description: string }>;
}

/*
|--------------------------------------------------------------------------
| @Doc — OpenAPI metadata decorator
|--------------------------------------------------------------------------
|
| Place on controller methods to describe them in the Swagger UI (/docs).
|
| @Doc({
|   summary: 'List all users',
|   tags: ['Users'],
|   auth: true,
|   query: { page: { type: 'integer', description: 'Page number' } },
|   responses: { 200: { description: 'Paginated list' }, 404: { description: 'Not found' } },
| })
|
*/
export function Doc(options: DocMethodOptions): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(DOC_META, options, target, propertyKey as string);
    return descriptor;
  };
}
`,
  );

  // ── src/app/Models/ModelRegistry.ts ──────────────────────────────────────────
  w(
    dir,
    "src/app/Models/ModelRegistry.ts",
    `import User from './User/User';
import Role from './User/Role';
import Permission from './User/Permission';
import File from './File/File';
import { Model } from '@lara-node/db';

/*
|--------------------------------------------------------------------------
| ModelRegistry
|--------------------------------------------------------------------------
|
| Maps Express route parameter names to their Eloquent models.
| Used by RouteServiceProvider for automatic route-model binding:
|
|   // Route: /api/roles/:role
|   // => Role is auto-loaded from DB and injected as req.params.role
|
| Extending:
|   ModelRegistry.set('post', Post);
|
*/
export const ModelRegistry = new Map<string, typeof Model>([
  ['user', User as unknown as typeof Model],
  ['role', Role as unknown as typeof Model],
  ['permission', Permission as unknown as typeof Model],
  ['file', File as unknown as typeof Model],
]);
`,
  );

  // ── src/app/Providers/DocServiceProvider.ts ───────────────────────────────────
  w(
    dir,
    "src/app/Providers/DocServiceProvider.ts",
    `import { ServiceProvider } from '@lara-node/core';
import { Router } from 'express';
import { DOC_META } from '../Http/Docs/decorators';
import { AuthController } from '../Http/Controllers/User/AuthController';
import { UserController } from '../Http/Controllers/User/UserController';
import { RoleController } from '../Http/Controllers/User/RoleController';
import { PermissionController } from '../Http/Controllers/User/PermissionController';
import { FileController } from '../Http/Controllers/File/FileController';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface RouteEntry { method: HttpMethod; path: string; ctor: any; action: string; middleware?: string[] }

/*
|--------------------------------------------------------------------------
| DocServiceProvider
|--------------------------------------------------------------------------
|
| Serves:
|   GET /docs      → Swagger UI (disabled in production unless ENABLE_DOCS=true)
|   GET /docs.json → OpenAPI 3.0 JSON spec
|
| Add new controllers here to auto-document their @Doc-decorated methods.
|
*/
const ROUTE_REGISTRY: RouteEntry[] = [
  { method: 'post', path: '/api/auth/register', ctor: AuthController, action: 'register' },
  { method: 'post', path: '/api/auth/login', ctor: AuthController, action: 'login' },
  { method: 'get', path: '/api/auth/me', ctor: AuthController, action: 'me', middleware: ['auth'] },

  { method: 'get', path: '/api/users', ctor: UserController, action: 'index', middleware: ['auth', 'can:view_users'] },
  { method: 'get', path: '/api/users/{id}', ctor: UserController, action: 'show', middleware: ['auth'] },
  { method: 'post', path: '/api/users', ctor: UserController, action: 'store', middleware: ['auth', 'can:create_users'] },
  { method: 'put', path: '/api/users/{id}', ctor: UserController, action: 'update', middleware: ['auth', 'can:update_users'] },
  { method: 'delete', path: '/api/users/{id}', ctor: UserController, action: 'destroy', middleware: ['auth', 'can:delete_users'] },
  { method: 'patch', path: '/api/users/{id}/status', ctor: UserController, action: 'toggleStatus', middleware: ['auth'] },
  { method: 'post', path: '/api/users/{id}/roles', ctor: UserController, action: 'addRole', middleware: ['auth'] },
  { method: 'delete', path: '/api/users/{id}/roles/{roleId}', ctor: UserController, action: 'removeRole', middleware: ['auth'] },

  { method: 'get', path: '/api/roles', ctor: RoleController, action: 'index', middleware: ['auth'] },
  { method: 'get', path: '/api/roles/{role}', ctor: RoleController, action: 'show', middleware: ['auth'] },
  { method: 'post', path: '/api/roles', ctor: RoleController, action: 'store', middleware: ['auth'] },
  { method: 'put', path: '/api/roles/{id}', ctor: RoleController, action: 'update', middleware: ['auth'] },
  { method: 'delete', path: '/api/roles/{id}', ctor: RoleController, action: 'destroy', middleware: ['auth'] },
  { method: 'post', path: '/api/roles/{id}/permissions', ctor: RoleController, action: 'syncPermissions', middleware: ['auth'] },

  { method: 'get', path: '/api/permissions', ctor: PermissionController, action: 'index', middleware: ['auth'] },
  { method: 'get', path: '/api/permissions/{id}', ctor: PermissionController, action: 'show', middleware: ['auth'] },

  { method: 'get', path: '/api/files', ctor: FileController, action: 'index', middleware: ['auth'] },
  { method: 'get', path: '/api/files/{id}', ctor: FileController, action: 'show', middleware: ['auth'] },
  { method: 'get', path: '/api/files/{id}/download', ctor: FileController, action: 'download', middleware: ['auth'] },
  { method: 'post', path: '/api/files', ctor: FileController, action: 'store', middleware: ['auth'] },
  { method: 'delete', path: '/api/files/{id}', ctor: FileController, action: 'destroy', middleware: ['auth'] },
];

export class DocServiceProvider extends ServiceProvider {
  register(): void {}

  boot(): void {
    if (process.env.APP_ENV === 'production' && process.env.ENABLE_DOCS !== 'true') return;

    const router = Router();
    const spec = this.buildSpec();

    router.get('/docs.json', (_req: any, res: any) => res.json(spec));
    router.get('/docs', (_req: any, res: any) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(this.swaggerHtml(spec.info.title));
    });

    this.app.mountRoutes('/', router);
    console.log('[DocServiceProvider] Swagger UI → /docs  |  OpenAPI JSON → /docs.json');
  }

  private buildSpec() {
    const paths: Record<string, any> = {};

    for (const route of ROUTE_REGISTRY) {
      const meta = Reflect.getMetadata(DOC_META, route.ctor.prototype, route.action);
      if (!paths[route.path]) paths[route.path] = {};
      const hasAuth = (route.middleware || []).some((m) => m === 'auth' || m.startsWith('can:'));

      const operation: any = {
        summary: meta?.summary || route.action,
        tags: meta?.tags || [route.ctor.name.replace('Controller', '')],
        ...(meta?.description ? { description: meta.description } : {}),
        ...(meta?.deprecated ? { deprecated: true } : {}),
        ...(hasAuth ? { security: [{ bearerAuth: [] }] } : {}),
        responses: {
          200: { description: 'Success' },
          ...(hasAuth ? { 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' } } : {}),
          ...(meta?.responses || {}),
        },
      };

      if (meta?.body) {
        const properties: Record<string, any> = {};
        const required: string[] = [];
        for (const [k, v] of Object.entries(meta.body) as [string, any][]) {
          properties[k] = { type: v.type, ...(v.description ? { description: v.description } : {}) };
          if (v.required !== false) required.push(k);
        }
        operation.requestBody = {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties, ...(required.length ? { required } : {}) } } },
        };
      }

      const parameters: any[] = [];
      for (const [name, cfg] of Object.entries(meta?.params || {}) as [string, any][]) {
        parameters.push({ name, in: 'path', required: true, schema: { type: cfg.type || 'string' }, ...(cfg.description ? { description: cfg.description } : {}) });
      }
      for (const [name, cfg] of Object.entries(meta?.query || {}) as [string, any][]) {
        parameters.push({ name, in: 'query', required: false, schema: { type: cfg.type || 'string' }, ...(cfg.description ? { description: cfg.description } : {}) });
      }
      if (parameters.length) operation.parameters = parameters;

      paths[route.path][route.method] = operation;
    }

    return {
      openapi: '3.0.0',
      info: {
        title: (process.env.APP_NAME || '${name}') + ' API',
        version: '1.0.0',
        description: 'REST API — auto-generated by DocServiceProvider',
      },
      servers: [{ url: process.env.APP_URL || 'http://localhost:3000', description: 'Server' }],
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
      paths,
    };
  }

  private swaggerHtml(title: string): string {
    const cdn = 'https://unpkg.com/swagger-ui-dist@5/';
    return '<!DOCTYPE html>' +
      '<html lang="en"><head>' +
      '<meta charset="UTF-8" />' +
      '<title>' + title + ' — Docs</title>' +
      '<link rel="stylesheet" href="' + cdn + 'swagger-ui.css" />' +
      '<style>body{margin:0}</style>' +
      '</head><body>' +
      '<div id="swagger-ui"></div>' +
      '<script src="' + cdn + 'swagger-ui-bundle.js"></script>' +
      '<script>' +
      'SwaggerUIBundle({url:"/docs.json",dom_id:"#swagger-ui",' +
      'presets:[SwaggerUIBundle.presets.apis,SwaggerUIBundle.SwaggerUIStandalonePreset],' +
      'layout:"StandaloneLayout"});' +
      '</script></body></html>';
  }
}
`,
  );

  // ── src/server.ts ─────────────────────────────────────────────────────────────
  w(
    dir,
    "src/server.ts",
    `import { startApplication } from './bootstrap/app';

startApplication();
`,
  );

  // ── src/artisan.ts ────────────────────────────────────────────────────────────
  w(
    dir,
    "src/artisan.ts",
    `import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Kernel } from '@lara-node/console';
import { app, bootForConsole } from './bootstrap/app';

async function main() {
  await bootForConsole();

  const kernel = new Kernel(app);
  await kernel.boot();

  let cli = yargs(hideBin(process.argv))
    .scriptName('artisan')
    .usage('$0 <command> [options]');

  cli = kernel.registerCommands(cli);

  await cli
    .demandCommand(1, 'Please specify a command.')
    .strict()
    .help()
    .version(false)
    .parseAsync();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
  );

  // ── src/bootstrap/app.ts ──────────────────────────────────────────────────────
  const providerImports: string[] = [
    `import { AppServiceProvider } from '../app/Providers/AppServiceProvider';`,
    `import { RouteServiceProvider } from '../app/Providers/RouteServiceProvider';`,
  ];
  const bootProviders: string[] = [`  app.register(AppServiceProvider);`];
  const startProviders: string[] = [
    `  app.register(AppServiceProvider);`,
    `  app.register(RouteServiceProvider);`,
  ];

  if (hasEvents) {
    providerImports.push(`import { EventServiceProvider } from '../app/Providers/EventServiceProvider';`);
    providerImports.push(`import { BroadcastServiceProvider } from '../app/Providers/BroadcastServiceProvider';`);
    bootProviders.push(`  app.register(EventServiceProvider);`);
    startProviders.push(`  app.register(EventServiceProvider);`);
    startProviders.push(`  app.register(BroadcastServiceProvider);`);
  }
  if (hasQueue) {
    providerImports.push(`import { QueueServiceProvider } from '../app/Providers/QueueServiceProvider';`);
    bootProviders.push(`  app.register(QueueServiceProvider);`);
    startProviders.push(`  app.register(QueueServiceProvider);`);
  }
  if (hasHorizon) {
    providerImports.push(`import { HorizonServiceProvider } from '@lara-node/horizon';`);
    startProviders.push(`  app.register(HorizonServiceProvider);`);
  }
  if (hasTelescope) {
    providerImports.push(`import { TelescopeServiceProvider } from '@lara-node/telescope';`);
    startProviders.push(`  app.register(TelescopeServiceProvider);`);
  }

  w(
    dir,
    "src/bootstrap/app.ts",
    `import { container, Application } from '@lara-node/core';
${providerImports.join("\n")}

export const app = new Application(container);

export async function bootForConsole(): Promise<void> {
  try {
${bootProviders.join("\n")}
    await app.boot();
  } catch (err) {
    console.error('Failed to boot application:', err);
    process.exit(1);
  }
}

export async function startApplication(): Promise<void> {
  const port = process.env.PORT ?? 3000;

${startProviders.join("\n")}

  app.configureBaseMiddleware();
  await app.boot();

  app.configure404Handler();

  app.listen(port, () => {
    console.log(\`Server running on http://localhost:\${port}\`);
    console.log(\`Environment: \${process.env.APP_ENV ?? 'local'}\`);
  });
}

export default app;
`,
  );

  // ── Http/Kernel.ts ────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Http/Kernel.ts",
    `import { RequestHandler } from 'express';
import {
  AsyncContextMiddleware,
  RequestLoggerMiddleware,
  ValidatorMiddleware,
  ResponseExtenderMiddleware,
  AuthMiddleware,
  AuthorizeByStatusMiddleware,
  ErrorHandlerMiddleware,
  authorizeRoles,
  authorizePermissions,
} from '@lara-node/middlewares';
import User from '../Models/User/User';

/*
|--------------------------------------------------------------------------
| HTTP Kernel
|--------------------------------------------------------------------------
*/
export class HttpKernel {
  protected middleware: RequestHandler[] = [
    (req, res, next) => new AsyncContextMiddleware().handle(req, res, next),
    (req, res, next) => new RequestLoggerMiddleware().handle(req, res, next),
    (req, res, next) => new ValidatorMiddleware().handle(req as any, res, next),
    (req, res, next) => new ResponseExtenderMiddleware().handle(req, res, next),
  ];

  protected namedMiddleware: Record<string, RequestHandler | ((...args: string[]) => RequestHandler)> = {
    auth: new AuthMiddleware({
      userLoader: async (uid) => {
        const user = await User.with(['profile', 'roles', 'roles.permissions']).find(uid) as any;
        if (!user) return null;
        await user.update({ last_seen_at: new Date() });
        const roles = user.roles ?? [];
        const perms = roles.flatMap((r: any) => r.permissions ?? []);
        return {
          id: user.id,
          roles: roles.map((r: any) => r.slug),
          permissions: perms.map((p: any) => p.slug),
          model: user,
        };
      },
    }).toHandler(),
    'must-be-active': (req, res, next) => new AuthorizeByStatusMiddleware().handle(req, res, next),
    can: (...perms: string[]) => authorizePermissions(...perms),
    role: (...roles: string[]) => authorizeRoles(...roles),
  };

  readonly errorHandler = (err: any, req: any, res: any, next: any) =>
    new ErrorHandlerMiddleware().handle(err, req, res, next);

  getMiddleware(): RequestHandler[] { return this.middleware; }
  getNamedMiddleware() { return this.namedMiddleware; }
}

export const httpKernel = new HttpKernel();
`,
  );

  // ── Sample Middleware ─────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Middleware/ThrottleMiddleware.ts",
    `import { Request, Response, NextFunction } from 'express';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

/*
|--------------------------------------------------------------------------
| ThrottleMiddleware — rate limiting per IP
|--------------------------------------------------------------------------
|
| Usage in Kernel:
|   protected namedMiddleware = {
|     throttle: (...args) => new ThrottleMiddleware(Number(args[0]) || 60).toHandler(),
|   };
|
| Usage on route:
|   g.post('/login', 'throttle:10', [AuthController, 'login']);
|
*/
export class ThrottleMiddleware {
  constructor(
    private readonly maxRequests: number = 60,
    private readonly windowMs: number = 60_000,
  ) {}

  handle(req: Request, res: Response, next: NextFunction): void {
    const key = (req.ip || 'unknown') + ':' + req.path;
    const now = Date.now();
    const entry = requestCounts.get(key);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + this.windowMs });
      next();
      return;
    }

    if (entry.count >= this.maxRequests) {
      res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
      return;
    }

    entry.count++;
    next();
  }

  toHandler() {
    return (req: Request, res: Response, next: NextFunction) => this.handle(req, res, next);
  }
}
`,
  );

  // ── Models ────────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Models/User/User.ts",
    `import { Model, use, Observer } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';
import { Injectable } from '@lara-node/core';
import Role from './Role';
import UserProfile from './UserProfile';
import { RolesUsers } from './RolesUsers';
import { UserObserver } from '../../Observers/UserObserver';

@Injectable()
@use(SoftDeletes, Timestamps)
export class User extends Model {
  static primaryKey = 'id';
  static fillable = [
    'name', 'email', 'email_verified_at', 'password', 'status',
    'last_login', 'last_seen_at', 'last_login_ip', 'default_role_id',
    'remember_token', 'avatar', 'phone_number', 'created_at', 'updated_at', 'deleted_at',
  ];
  static hidden = ['password', 'remember_token'];
  static casts = {
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
    last_login: 'datetime', last_seen_at: 'datetime',
  } as any;
  static observer = UserObserver;

  roles() {
    return this.belongsToMany(Role, RolesUsers.getTable(), 'users_id', 'roles_id');
  }

  profile() {
    return this.hasOne(UserProfile, 'user_id', 'id');
  }

  isActive(): boolean {
    const status = this.getAttribute('status');
    return status === undefined || status === null || status === 'active';
  }
}

export default User;
`,
  );

  w(
    dir,
    "src/app/Models/User/Role.ts",
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';
import Permission from './Permission';

@use(SoftDeletes)
export class Role extends Model {
  static fillable = ['name', 'slug', 'description', 'created_at', 'updated_at', 'deleted_at'];
  static casts = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' } as any;

  permissions() {
    return this.belongsToMany(Permission, 'permissions_roles', 'roles_id', 'permissions_id');
  }
}

export default Role;
`,
  );

  w(
    dir,
    "src/app/Models/User/Permission.ts",
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';

@use(SoftDeletes)
export class Permission extends Model {
  static table = 'permissions';
  static fillable = ['name', 'slug', 'description', 'created_at', 'updated_at', 'deleted_at'];
  static casts = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' } as any;
}

export default Permission;
`,
  );

  w(
    dir,
    "src/app/Models/User/UserProfile.ts",
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';

@use(SoftDeletes)
export class UserProfile extends Model {
  static table = 'user_profiles';
  static fillable = [
    'user_id', 'gender', 'id_number', 'city', 'country',
    'address', 'zip_code', 'date_of_birth', 'metadata',
    'created_at', 'updated_at', 'deleted_at',
  ];
  static casts = {
    date_of_birth: 'datetime', metadata: 'json',
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  } as any;
}

export default UserProfile;
`,
  );

  w(
    dir,
    "src/app/Models/User/RolesUsers.ts",
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';

@use(SoftDeletes)
export class RolesUsers extends Model {
  static table = 'roles_users';
  static fillable = ['roles_id', 'users_id', 'created_at', 'updated_at', 'deleted_at'];
  static casts = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' } as any;
}
`,
  );

  w(
    dir,
    "src/app/Models/User/PermissionsRoles.ts",
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';

@use(SoftDeletes)
export class PermissionsRoles extends Model {
  static table = 'permissions_roles';
  static fillable = ['permissions_id', 'roles_id', 'created_at', 'updated_at', 'deleted_at'];
  static casts = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' } as any;
}

export default PermissionsRoles;
`,
  );

  w(
    dir,
    "src/app/Models/User/index.ts",
    `export { User } from './User';
export { Role } from './Role';
export { Permission } from './Permission';
export { UserProfile } from './UserProfile';
export { RolesUsers } from './RolesUsers';
export { PermissionsRoles } from './PermissionsRoles';
`,
  );

  w(
    dir,
    "src/app/Models/File/File.ts",
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';

@use(SoftDeletes, Timestamps)
export class File extends Model {
  static table = 'files';
  static fillable = [
    'original_name', 'filename', 'mime_type', 'size', 'disk_path',
    'user_id', 'created_at', 'updated_at', 'deleted_at',
  ];
  static casts = {
    size: 'int',
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  } as any;
}

export default File;
`,
  );

  // ── Observers ─────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Observers/UserObserver.ts",
    `import { Observer } from '@lara-node/db';

/*
|--------------------------------------------------------------------------
| UserObserver
|--------------------------------------------------------------------------
|
| Intercepts lifecycle events on the User model.
| Register via: static observer = UserObserver; on the model.
|
*/
export class UserObserver extends Observer<any> {
  creating(user: any): void {
    if (!user.status) user.status = 'active';
  }

  created(user: any): void {
    console.log(\`[UserObserver] User created: \${user.email}\`);
  }

  updating(user: any): void {
    user.updated_at = new Date();
  }

  deleting(user: any): void {
    console.log(\`[UserObserver] User soft-deleted: \${user.id}\`);
  }
}
`,
  );

  // ── Services ──────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Services/AuthService.ts",
    `import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Injectable } from '@lara-node/core';
import User from '../Models/User/User';

@Injectable()
export class AuthService {
  async register(data: { name: string; email: string; password: string }) {
    const existing = await User.where('email', data.email).first();
    if (existing) throw Object.assign(new Error('Email already registered'), { status: 422 });

    const password = await bcrypt.hash(data.password, 12);
    return User.create({ ...data, password, status: 'active', created_at: new Date(), updated_at: new Date() });
  }

  async login(email: string, password: string) {
    const user = await User.where('email', email).first() as any;
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const secret = process.env.JWT_SECRET || 'dev-secret-change';
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
    const token = jwt.sign({ sub: user.id }, secret, { expiresIn });

    await user.update({ last_login: new Date(), last_seen_at: new Date() });
    return { token, user };
  }

  async me(userId: number | string) {
    return User.with(['profile', 'roles', 'roles.permissions']).find(userId);
  }
}
`,
  );

  w(
    dir,
    "src/app/Services/UserService.ts",
    `import { Injectable } from '@lara-node/core';
import User from '../Models/User/User';
import UserProfile from '../Models/User/UserProfile';

@Injectable()
export class UserService {
  async index(page = 1, perPage = 15) {
    return User.with(['profile', 'roles']).paginate(perPage, page);
  }

  async find(id: number | string) {
    return User.with(['profile', 'roles', 'roles.permissions']).find(id);
  }

  async create(data: Record<string, any>) {
    return User.create({ ...data, created_at: new Date(), updated_at: new Date() });
  }

  async update(id: number | string, data: Record<string, any>) {
    const user = await User.find(id) as any;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.update({ ...data, updated_at: new Date() });
    return user;
  }

  async destroy(id: number | string) {
    const user = await User.find(id) as any;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.delete();
  }

  async addRole(userId: number | string, roleId: number | string) {
    const user = await User.with(['roles']).find(userId) as any;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.roles().attach([roleId]);
    return user;
  }

  async removeRole(userId: number | string, roleId: number | string) {
    const user = await User.find(userId) as any;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.roles().detach([roleId]);
  }

  async toggleStatus(userId: number | string) {
    const user = await User.find(userId) as any;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    const newStatus = (user.status === 'active') ? 'inactive' : 'active';
    await user.update({ status: newStatus, updated_at: new Date() });
    return user;
  }

  async updateProfile(userId: number | string, data: Record<string, any>) {
    let profile = await UserProfile.where('user_id', userId).first() as any;
    if (profile) {
      await profile.update({ ...data, updated_at: new Date() });
    } else {
      profile = await UserProfile.create({ user_id: userId, ...data, created_at: new Date(), updated_at: new Date() });
    }
    return profile;
  }
}
`,
  );

  w(
    dir,
    "src/app/Services/RoleService.ts",
    `import { Injectable } from '@lara-node/core';
import Role from '../Models/User/Role';

@Injectable()
export class RoleService {
  async index() { return Role.with(['permissions']).all(); }
  async find(id: number | string) { return Role.with(['permissions']).find(id); }

  async create(data: { name: string; slug: string; description?: string }) {
    return Role.create({ ...data, created_at: new Date(), updated_at: new Date() });
  }

  async update(id: number | string, data: Record<string, any>) {
    const role = await Role.find(id) as any;
    if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
    await role.update({ ...data, updated_at: new Date() });
    return role;
  }

  async destroy(id: number | string) {
    const role = await Role.find(id) as any;
    if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
    await role.delete();
  }

  async syncPermissions(roleId: number | string, permissionIds: number[]) {
    const role = await Role.find(roleId) as any;
    if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
    await role.permissions().sync(permissionIds);
    return Role.with(['permissions']).find(roleId);
  }
}
`,
  );

  w(
    dir,
    "src/app/Services/PermissionService.ts",
    `import { Injectable } from '@lara-node/core';
import Permission from '../Models/User/Permission';

@Injectable()
export class PermissionService {
  async index() { return Permission.all(); }
  async find(id: number | string) { return Permission.find(id); }
}
`,
  );

  w(
    dir,
    "src/app/Services/FileService.ts",
    `import { promises as fs } from 'fs';
import { Injectable } from '@lara-node/core';
import File from '../Models/File/File';

@Injectable()
export class FileService {
  async index() { return File.query().get(); }
  async find(id: number | string) { return File.find(id); }

  async store(file: Express.Multer.File, userId: number | string) {
    return File.create({
      original_name: file.originalname,
      filename: file.filename,
      mime_type: file.mimetype,
      size: file.size,
      disk_path: file.path,
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async destroy(id: number | string) {
    const file = await File.find(id) as any;
    if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
    try { await fs.unlink(file.disk_path); } catch { /* file missing on disk */ }
    await file.delete();
  }
}
`,
  );

  w(
    dir,
    "src/app/Services/index.ts",
    `export { AuthService } from './AuthService';
export { UserService } from './UserService';
export { RoleService } from './RoleService';
export { PermissionService } from './PermissionService';
export { FileService } from './FileService';
`,
  );

  // ── Controllers ───────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Http/Controllers/User/AuthController.ts",
    `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '../Docs/decorators';
import { AuthService } from '@app/Services/index';
import { UserService } from '@app/Services/index';

@Injectable()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Doc({
    summary: 'Register a new user',
    tags: ['Auth'],
    body: {
      name: { type: 'string', description: 'Full name' },
      email: { type: 'string', description: 'Email address' },
      password: { type: 'string', description: 'Password (min 8 chars)' },
    },
    responses: { 201: { description: 'User created' }, 422: { description: 'Validation error' } },
  })
  async register(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'required|string|min:2|max:100',
      email: 'required|email',
      password: 'required|string|min:8',
    });
    const user = await this.authService.register(data as any);
    res.status(201).json({ success: true, data: user });
  }

  @Doc({
    summary: 'Login and receive JWT token',
    tags: ['Auth'],
    body: {
      email: { type: 'string', description: 'Email address' },
      password: { type: 'string', description: 'Password' },
    },
    responses: { 200: { description: 'JWT token and user' }, 401: { description: 'Invalid credentials' } },
  })
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = await req.validate({
      email: 'required|email',
      password: 'required|string',
    });
    const result = await this.authService.login(email, password);
    res.json({ success: true, data: result });
  }

  @Doc({
    summary: 'Get the authenticated user',
    tags: ['Auth'],
    auth: true,
    responses: { 200: { description: 'Current user with roles and permissions' } },
  })
  async me(req: Request, res: Response): Promise<void> {
    const user = await this.authService.me(req.user!.id);
    res.json({ success: true, data: user });
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/User/UserController.ts",
    `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '../Docs/decorators';
import { UserService } from '@app/Services/index';

@Injectable()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Doc({ summary: 'List all users (paginated)', tags: ['Users'], auth: true, query: { page: { type: 'integer', description: 'Page number' }, per_page: { type: 'integer', description: 'Items per page' } } })
  async index(req: Request, res: Response): Promise<void> {
    const data = await this.userService.index(Number(req.query.page) || 1);
    res.json({ success: true, data });
  }

  @Doc({ summary: 'Get a user by ID', tags: ['Users'], auth: true, params: { id: { type: 'integer', description: 'User ID' } } })
  async show(req: Request, res: Response): Promise<void> {
    const user = await this.userService.find(req.params.id);
    if (!user) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: user });
  }

  @Doc({ summary: "Get a user's profile", tags: ['Users'], auth: true })
  async showProfile(req: Request, res: Response): Promise<void> {
    const user = await this.userService.find(req.params.id) as any;
    if (!user) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: user.profile });
  }

  @Doc({ summary: 'Create a new user', tags: ['Users'], auth: true, body: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } } })
  async store(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'required|string|min:2|max:100',
      email: 'required|email',
      password: 'required|string|min:8',
    });
    const user = await this.userService.create(data as any);
    res.status(201).json({ success: true, data: user });
  }

  @Doc({ summary: 'Update a user', tags: ['Users'], auth: true })
  async update(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'sometimes|string|min:2|max:100',
      email: 'sometimes|email',
    });
    const user = await this.userService.update(req.params.id, data as any);
    res.json({ success: true, data: user });
  }

  @Doc({ summary: "Update a user's profile", tags: ['Users'], auth: true })
  async updateProfile(req: Request, res: Response): Promise<void> {
    const profile = await this.userService.updateProfile(req.params.id, req.body);
    res.json({ success: true, data: profile });
  }

  @Doc({ summary: 'Change user password', tags: ['Users'], auth: true, body: { password: { type: 'string', description: 'New password (min 8 chars)' } } })
  async setPassword(req: Request, res: Response): Promise<void> {
    const { password } = await req.validate({ password: 'required|string|min:8' });
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(password, 12);
    await this.userService.update(req.params.id, { password: hashed });
    res.json({ success: true, message: 'Password updated' });
  }

  @Doc({ summary: 'Send password reset email', tags: ['Users'], auth: true })
  async resetPassword(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Password reset email sent' });
  }

  @Doc({ summary: 'Assign a role to a user', tags: ['Users'], auth: true, body: { role_id: { type: 'integer', description: 'Role ID to assign' } } })
  async addRole(req: Request, res: Response): Promise<void> {
    const { role_id } = await req.validate({ role_id: 'required|integer' });
    const user = await this.userService.addRole(req.params.id, role_id);
    res.json({ success: true, data: user });
  }

  @Doc({ summary: 'Remove a role from a user', tags: ['Users'], auth: true })
  async removeRole(req: Request, res: Response): Promise<void> {
    await this.userService.removeRole(req.params.id, req.params.roleId);
    res.json({ success: true, message: 'Role removed' });
  }

  @Doc({ summary: 'Delete a user (soft delete)', tags: ['Users'], auth: true, responses: { 200: { description: 'User deleted' }, 404: { description: 'Not found' } } })
  async destroy(req: Request, res: Response): Promise<void> {
    await this.userService.destroy(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  }

  @Doc({ summary: 'Toggle user active/inactive status', tags: ['Users'], auth: true })
  async toggleStatus(req: Request, res: Response): Promise<void> {
    const user = await this.userService.toggleStatus(req.params.user);
    res.json({ success: true, data: user });
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/User/RoleController.ts",
    `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '../Docs/decorators';
import { RoleService } from '@app/Services/index';

@Injectable()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Doc({ summary: 'List all roles with permissions', tags: ['Roles'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.roleService.index() });
  }

  @Doc({
    summary: 'Get a role by ID (route-model binding)',
    description: 'The :role parameter is automatically resolved to a Role model instance via ModelRegistry.',
    tags: ['Roles'],
    auth: true,
    params: { role: { type: 'integer', description: 'Role ID — auto-bound to Role model' } },
    responses: { 200: { description: 'Role with permissions' }, 404: { description: 'Not found' } },
  })
  async show(req: Request, res: Response): Promise<void> {
    // req.params.role is already a loaded Role model instance (route-model binding via ModelRegistry)
    const role = req.params.role as any;
    res.json({ success: true, data: role });
  }

  @Doc({
    summary: 'Create a new role',
    tags: ['Roles'],
    auth: true,
    body: {
      name: { type: 'string', description: 'Display name' },
      slug: { type: 'string', description: 'Unique slug (e.g. editor)' },
      description: { type: 'string', required: false, description: 'Optional description' },
    },
  })
  async store(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'required|string|min:2|max:100',
      slug: 'required|string|min:2|max:100',
      description: 'nullable|string',
    });
    res.status(201).json({ success: true, data: await this.roleService.create(data as any) });
  }

  @Doc({ summary: 'Update a role', tags: ['Roles'], auth: true })
  async update(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'sometimes|string|min:2|max:100',
      slug: 'sometimes|string|min:2|max:100',
      description: 'nullable|string',
    });
    res.json({ success: true, data: await this.roleService.update(req.params.id, data as any) });
  }

  @Doc({ summary: 'Delete a role (soft delete)', tags: ['Roles'], auth: true })
  async destroy(req: Request, res: Response): Promise<void> {
    await this.roleService.destroy(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  }

  @Doc({
    summary: 'Sync permissions to a role',
    tags: ['Roles'],
    auth: true,
    body: { permission_ids: { type: 'array', description: 'Array of permission IDs' } },
  })
  async syncPermissions(req: Request, res: Response): Promise<void> {
    const { permission_ids } = await req.validate({ permission_ids: 'required|array' });
    res.json({ success: true, data: await this.roleService.syncPermissions(req.params.id, permission_ids as number[]) });
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/User/PermissionController.ts",
    `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '../Docs/decorators';
import { PermissionService } from '@app/Services/index';

@Injectable()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Doc({ summary: 'List all permissions', tags: ['Permissions'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.permissionService.index() });
  }

  @Doc({ summary: 'Get a permission by ID', tags: ['Permissions'], auth: true, params: { id: { type: 'integer' } } })
  async show(req: Request, res: Response): Promise<void> {
    const p = await this.permissionService.find(req.params.id);
    if (!p) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: p });
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/File/FileController.ts",
    `import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { Injectable } from '@lara-node/core';
import { Doc } from '../Docs/decorators';
import { FileService } from '@app/Services/index';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/files';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

export const multerUpload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

@Injectable()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Doc({ summary: 'List all uploaded files', tags: ['Files'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.fileService.index() });
  }

  @Doc({ summary: 'Get file metadata by ID', tags: ['Files'], auth: true, params: { id: { type: 'integer' } } })
  async show(req: Request, res: Response): Promise<void> {
    const file = await this.fileService.find(req.params.id);
    if (!file) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: file });
  }

  @Doc({ summary: 'Upload a file (multipart/form-data, field: file)', tags: ['Files'], auth: true, responses: { 201: { description: 'File uploaded' } } })
  async store(req: Request, res: Response): Promise<void> {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
    res.status(201).json({ success: true, data: await this.fileService.store(req.file, req.user!.id) });
  }

  @Doc({ summary: 'Download a file by ID', tags: ['Files'], auth: true })
  async download(req: Request, res: Response): Promise<void> {
    const file = await this.fileService.find(req.params.id) as any;
    if (!file) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.download(file.disk_path, file.original_name);
  }

  @Doc({ summary: 'Delete a file (soft delete + remove from disk)', tags: ['Files'], auth: true })
  async destroy(req: Request, res: Response): Promise<void> {
    await this.fileService.destroy(req.params.id);
    res.json({ success: true, message: 'File deleted' });
  }
}
`,
  );

  // ── AppServiceProvider ────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Providers/AppServiceProvider.ts",
    `import { ServiceProvider } from '@lara-node/core';
import { AuthService } from '@app/Services/index';
import { UserService } from '@app/Services/index';
import { RoleService } from '@app/Services/index';
import { PermissionService } from '@app/Services/index';
import { FileService } from '@app/Services/index';
import { AuthController } from '../Http/Controllers/User/AuthController';
import { UserController } from '../Http/Controllers/User/UserController';
import { RoleController } from '../Http/Controllers/User/RoleController';
import { PermissionController } from '../Http/Controllers/User/PermissionController';
import { FileController } from '../Http/Controllers/File/FileController';
import { PermissionsSyncCommand } from '../Console/Commands/PermissionCommands';
import { PermissionsListCommand } from '../Console/Commands/PermissionCommands';
import { DocServiceProvider } from './DocServiceProvider';

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton(AuthService);
    this.singleton(UserService);
    this.singleton(RoleService);
    this.singleton(PermissionService);
    this.singleton(FileService);
    this.singleton(AuthController);
    this.singleton(UserController);
    this.singleton(RoleController);
    this.singleton(PermissionController);
    this.singleton(FileController);
    this.singleton(PermissionsSyncCommand);
    this.singleton(PermissionsListCommand);
  }

  boot(): void {
    this.app.register(DocServiceProvider);
  }
}
`,
  );

  // ── RouteServiceProvider ──────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Providers/RouteServiceProvider.ts",
    `import { ServiceProvider } from '@lara-node/core';
import { ModelRegistry } from '../Models/ModelRegistry';

/*
|--------------------------------------------------------------------------
| RouteServiceProvider
|--------------------------------------------------------------------------
|
| Mounts route groups and registers route-model bindings so Express
| automatically resolves model params:
|
|   // Route defined as:
|   g.get('/:role', [RoleController, 'show']);
|
|   // Controller receives the loaded model instance:
|   async show(req: Request, res: Response) {
|     const role = req.params.role as any; // Role model instance
|     res.json({ success: true, data: role });
|   }
|
*/
export class RouteServiceProvider extends ServiceProvider {
  protected apiPrefix = '/api';

  register(): void {}

  boot(): void {
    this.bindRouteModels();
    this.mapApiRoutes();
    this.mapWebRoutes();
    if (${hasEvents}) this.mapChannelRoutes();
  }

  protected bindRouteModels(): void {
    for (const [param, ModelClass] of ModelRegistry.entries()) {
      this.app.express.param(param, async (req: any, res: any, next: any, id: string) => {
        try {
          const record = await (ModelClass as any).find(id);
          if (!record) {
            res.status(404).json({ success: false, message: \`\${param.charAt(0).toUpperCase() + param.slice(1)} not found\` });
            return;
          }
          req.params[param] = record;
          next();
        } catch (err) {
          next(err);
        }
      });
    }
  }

  protected mapApiRoutes(): void {
    const { routesBuilder } = require('@routes/api');
    this.app.mountRoutes(this.apiPrefix, routesBuilder.build());
  }

  protected mapWebRoutes(): void {
    const { webRoutesBuilder } = require('@routes/web');
    this.app.mountRoutes('/', webRoutesBuilder.build());
  }

  protected mapChannelRoutes(): void {
    try {
      const { channelRouter } = require('@routes/channels');
      this.app.mountRoutes('/broadcasting', channelRouter);
    } catch { /* channels optional */ }
  }
}
`,
  );

  if (hasEvents) {
    // ── Events ──────────────────────────────────────────────────────────────────
    w(
      dir,
      "src/app/Events/UserEvents.ts",
      `import { Event } from '@lara-node/events';

export class UserRegistered extends Event {
  constructor(public userId: string | number, public email: string, public name: string) { super(); }
  eventName() { return 'user.registered'; }
}

export class UserLoggedIn extends Event {
  constructor(public userId: string | number, public email: string, public ipAddress?: string) { super(); }
  eventName() { return 'user.logged_in'; }
}

export class UserLoggedOut extends Event {
  constructor(public userId: string | number) { super(); }
  eventName() { return 'user.logged_out'; }
}

export class PasswordResetRequested extends Event {
  constructor(public userId: string | number, public email: string, public token: string) { super(); }
  eventName() { return 'password.reset_requested'; }
}
`,
    );

    w(
      dir,
      "src/app/Events/BroadcastEvents.ts",
      `import { Event } from '@lara-node/events';

export class UserNotification extends Event {
  constructor(
    public userId: string | number,
    public message: string,
    public type: string = 'info',
  ) { super(); }
  eventName() { return 'user.notification'; }
  broadcastOn() { return [\`notifications.\${this.userId}\`]; }
}
`,
    );

    w(dir, "src/app/Events/index.ts", `export * from './UserEvents';\nexport * from './BroadcastEvents';\n`);

    // ── Listeners ────────────────────────────────────────────────────────────────
    w(
      dir,
      "src/app/Listeners/UserListeners.ts",
      `import { Listener, ListensTo } from '@lara-node/events';
import { UserRegistered, UserLoggedIn } from '../Events/UserEvents';

@ListensTo('user.registered')
export class SendWelcomeEmail extends Listener<UserRegistered> {
  async handle(payload: UserRegistered): Promise<void> {
    console.log(\`[SendWelcomeEmail] Sending welcome email to \${payload.email}\`);
    // TODO: inject MailService and send via @lara-node/mail
  }
}

@ListensTo('user.logged_in')
export class LogUserLogin extends Listener<UserLoggedIn> {
  async handle(payload: UserLoggedIn): Promise<void> {
    console.log(\`[LogUserLogin] User \${payload.userId} logged in\${payload.ipAddress ? \` from \${payload.ipAddress}\` : ''}\`);
  }
}
`,
    );

    w(dir, "src/app/Listeners/index.ts", `export * from './UserListeners';\n`);

    // ── Subscribers ───────────────────────────────────────────────────────────────
    w(
      dir,
      "src/app/Subscribers/UserEventSubscriber.ts",
      `import { EventDispatcher, EventSubscriber, Subscriber } from '@lara-node/events';

@Subscriber()
export class UserEventSubscriber implements EventSubscriber {
  subscribe(dispatcher: EventDispatcher): void {
    dispatcher.listen('user.registered', this.handleUserRegistered.bind(this));
    dispatcher.listen('user.logged_in', this.handleUserLoggedIn.bind(this));
    dispatcher.listen('user.logged_out', this.handleUserLoggedOut.bind(this));
    dispatcher.listen('user.*', this.handleAnyUserEvent.bind(this));
  }

  async handleUserRegistered(payload: any): Promise<void> {
    console.log('[UserEventSubscriber] User registered:', payload.email);
  }

  async handleUserLoggedIn(payload: any): Promise<void> {
    console.log('[UserEventSubscriber] User logged in:', payload.email);
  }

  async handleUserLoggedOut(payload: any): Promise<void> {
    console.log('[UserEventSubscriber] User logged out:', payload.userId);
  }

  async handleAnyUserEvent(payload: any): Promise<void> {
    console.log('[UserEventSubscriber] User event:', payload);
  }
}
`,
    );

    w(dir, "src/app/Subscribers/index.ts", `export * from './UserEventSubscriber';\n`);

    // ── EventServiceProvider ───────────────────────────────────────────────────
    w(
      dir,
      "src/app/Providers/EventServiceProvider.ts",
      `import { ServiceProvider } from '@lara-node/core';
import { getEventDispatcher, getRegisteredListeners, getRegisteredSubscribers } from '@lara-node/events';

export class EventServiceProvider extends ServiceProvider {
  protected shouldDiscoverEvents = true;

  register(): void {}

  async boot(): Promise<void> {
    const dispatcher = getEventDispatcher();

    if (this.shouldDiscoverEvents) {
      try { await import('../Listeners/index'); } catch { /* empty */ }
      try { await import('../Subscribers/index'); } catch { /* empty */ }
    }

    for (const [ListenerClass, metadata] of getRegisteredListeners()) {
      for (const eventName of metadata.events) {
        dispatcher.listen(eventName, async (payload) => {
          const listener = new ListenerClass();
          if (listener.shouldHandle && !listener.shouldHandle(payload)) return;
          await listener.handle(payload);
        });
      }
    }

    for (const SubscriberClass of getRegisteredSubscribers()) {
      dispatcher.subscribe(SubscriberClass);
    }

    console.log('[EventServiceProvider] Event listeners registered');
  }
}
`,
    );

    // ── BroadcastServiceProvider ───────────────────────────────────────────────
    w(
      dir,
      "src/app/Providers/BroadcastServiceProvider.ts",
      `import { ServiceProvider } from '@lara-node/core';
import { Broadcast } from '@lara-node/events';

export class BroadcastServiceProvider extends ServiceProvider {
  register(): void {}

  async boot(): Promise<void> {
    Broadcast.private('notifications.{userId}', (user: any, userId: string) => {
      return user && String(user.id) === userId;
    });
    Broadcast.private('user.{userId}', (user: any, userId: string) => {
      return user && String(user.id) === userId;
    });
    Broadcast.public('announcements');
  }
}
`,
    );
  } else {
    w(dir, "src/app/Events/index.ts", "// Install @lara-node/events to enable.\n");
    w(dir, "src/app/Listeners/index.ts", "// Install @lara-node/events to enable.\n");
    w(dir, "src/app/Subscribers/index.ts", "// Install @lara-node/events to enable.\n");
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────────
  if (hasQueue) {
    w(
      dir,
      "src/app/Jobs/SendMailJob.ts",
      `import { Job, Queueable } from '@lara-node/queue';

/*
|--------------------------------------------------------------------------
| SendMailJob
|--------------------------------------------------------------------------
|
| Dispatching:
|   import { Queue } from '@lara-node/queue';
|   await Queue.push(new SendMailJob({ to: 'user@example.com', subject: 'Hello', body: 'World' }));
|
| With delay:
|   await Queue.later(60, new SendMailJob({ ... }));
|
*/
@Queueable({ queue: 'emails', tries: 3, backoff: 60 })
export class SendMailJob extends Job {
  constructor(
    private readonly payload: {
      to: string;
      subject: string;
      body: string;
      template?: string;
      data?: Record<string, any>;
    },
  ) { super(); }

  async handle(): Promise<void> {
    console.log(\`[SendMailJob] Sending to \${this.payload.to}: \${this.payload.subject}\`);
    // Inject MailService or use @lara-node/mail directly:
    // const { Mail } = await import('@lara-node/mail');
    // await Mail.send(new WelcomeEmail(this.payload.to));
  }

  async failed(error: Error): Promise<void> {
    console.error(\`[SendMailJob] Failed for \${this.payload.to}: \${error.message}\`);
  }
}
`,
    );

    w(
      dir,
      "src/app/Jobs/CleanupJob.ts",
      `import { Job, Queueable } from '@lara-node/queue';

/*
|--------------------------------------------------------------------------
| CleanupJob
|--------------------------------------------------------------------------
|
| Scheduled via QueueServiceProvider:
|   scheduler.job(CleanupJob).daily();
|
*/
@Queueable({ queue: 'default', tries: 1 })
export class CleanupJob extends Job {
  async handle(): Promise<void> {
    console.log('[CleanupJob] Running cleanup tasks...');

    // Delete soft-deleted records older than 30 days
    // const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // await User.query().onlyTrashed().where('deleted_at', '<', cutoff).forceDelete();

    // Remove expired sessions / tokens
    // await Token.where('expires_at', '<', new Date()).delete();

    // Remove old upload files
    // await File.query().where('created_at', '<', cutoff).delete();

    console.log('[CleanupJob] Cleanup complete');
  }
}
`,
    );

    w(
      dir,
      "src/app/Jobs/GenerateReportJob.ts",
      `import { Job, Queueable } from '@lara-node/queue';

/*
|--------------------------------------------------------------------------
| GenerateReportJob
|--------------------------------------------------------------------------
|
| Dispatching with custom data:
|   await Queue.push(new GenerateReportJob({ type: 'users', period: 'monthly', userId: 1 }));
|
| Scheduled weekly via QueueServiceProvider:
|   scheduler.job(GenerateReportJob, { type: 'users', period: 'weekly' }).weekly();
|
*/
@Queueable({ queue: 'reports', tries: 2, timeout: 300 })
export class GenerateReportJob extends Job {
  constructor(
    private readonly config: {
      type: 'users' | 'files' | 'activity';
      period: 'daily' | 'weekly' | 'monthly';
      userId?: number | string;
      email?: string;
    } = { type: 'users', period: 'monthly' },
  ) { super(); }

  async handle(): Promise<void> {
    const { type, period } = this.config;
    console.log(\`[GenerateReportJob] Generating \${period} \${type} report...\`);

    // const data = await this.collectData();
    // await this.generatePdf(data);
    // if (this.config.email) {
    //   await Queue.push(new SendMailJob({ to: this.config.email, subject: 'Your report is ready', body: '...' }));
    // }

    console.log(\`[GenerateReportJob] \${period} \${type} report complete\`);
  }
}
`,
    );

    w(
      dir,
      "src/app/Jobs/index.ts",
      `export * from './SendMailJob';
export * from './CleanupJob';
export * from './GenerateReportJob';
`,
    );

    w(
      dir,
      "src/app/Providers/QueueServiceProvider.ts",
      `import { ServiceProvider } from '@lara-node/core';
import { Queue, QueueManager, scheduler, Schedule } from '@lara-node/queue';
import { CleanupJob } from '../Jobs/CleanupJob';
import { GenerateReportJob } from '../Jobs/GenerateReportJob';

/*
|--------------------------------------------------------------------------
| QueueServiceProvider
|--------------------------------------------------------------------------
|
| Registers the queue manager and scheduler, then defines recurring tasks.
|
| Schedule API:
|   scheduler.command('permissions:sync').daily();          // every day at midnight
|   scheduler.command('permissions:sync').hourly();         // every hour
|   scheduler.job(CleanupJob).dailyAt('02:00');             // daily at 2 AM
|   scheduler.job(GenerateReportJob).weekly();              // every Sunday at midnight
|   scheduler.job(GenerateReportJob).monthly();             // 1st of month at midnight
|   scheduler.call(() => console.log('tick')).everyMinute();
|   scheduler.command('cache:clear').cron('0 * * * *');     // raw cron expression
|
*/
export class QueueServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton(QueueManager, () => Queue);
    this.container.alias(QueueManager, 'queue');
    this.container.singleton(Schedule, () => scheduler);
    this.container.alias(Schedule, 'schedule');
  }

  boot(): void {
    // Sync permissions nightly
    scheduler.command('permissions:sync').dailyAt('00:05');

    // Purge soft-deleted records every night at 2 AM
    scheduler.job(CleanupJob).dailyAt('02:00');

    // Generate weekly usage report every Sunday at 8 AM
    scheduler.job(GenerateReportJob, { type: 'users', period: 'weekly' }).weekly();

    // Generate monthly report on the 1st at 6 AM
    scheduler.job(GenerateReportJob, { type: 'activity', period: 'monthly' }).monthlyOn(1, '06:00');
  }
}
`,
    );
  } else {
    w(dir, "src/app/Jobs/index.ts", "// Install @lara-node/queue to enable.\n");
  }

  // ── Mail ──────────────────────────────────────────────────────────────────────
  if (hasMail) {
    w(
      dir,
      "src/app/Mail/WelcomeEmail.ts",
      `import { Mailable } from '@lara-node/mail';

/*
|--------------------------------------------------------------------------
| WelcomeEmail
|--------------------------------------------------------------------------
|
| Sending:
|   import { Mail } from '@lara-node/mail';
|   await Mail.send(new WelcomeEmail('Jane', 'jane@example.com'));
|
| Via queue:
|   await Mail.queue(new WelcomeEmail('Jane', 'jane@example.com'));
|
*/
export class WelcomeEmail extends Mailable {
  constructor(
    private readonly userName: string,
    private readonly userEmail: string,
  ) { super(); }

  build() {
    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', process.env.MAIL_FROM_NAME || '${name}')
      .subject(\`Welcome to ${name}, \${this.userName}!\`)
      .html(\`
        <h1>Welcome, \${this.userName}!</h1>
        <p>We're excited to have you on board.</p>
        <p>Get started by exploring the app:</p>
        <a href="\${process.env.APP_URL || 'http://localhost:3000'}" style="
          display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
          text-decoration:none;border-radius:6px;font-weight:bold;
        ">Open App</a>
        <p style="margin-top:32px;color:#666;font-size:13px;">
          Best regards,<br>${name} Team
        </p>
      \`)
      .text(\`Hi \${this.userName},\\n\\nWelcome to ${name}!\\n\\nBest regards,\\nThe ${name} Team\`);
  }
}
`,
    );

    w(
      dir,
      "src/app/Mail/PasswordResetEmail.ts",
      `import { Mailable } from '@lara-node/mail';

/*
|--------------------------------------------------------------------------
| PasswordResetEmail
|--------------------------------------------------------------------------
|
| Sending:
|   await Mail.send(new PasswordResetEmail('Jane', 'jane@example.com', token));
|
*/
export class PasswordResetEmail extends Mailable {
  private resetUrl: string;

  constructor(
    private readonly userName: string,
    private readonly userEmail: string,
    private readonly token: string,
  ) {
    super();
    const base = process.env.APP_URL || 'http://localhost:3000';
    this.resetUrl = \`\${base}/reset-password?token=\${token}&email=\${encodeURIComponent(userEmail)}\`;
  }

  build() {
    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', process.env.MAIL_FROM_NAME || '${name}')
      .subject('Reset your password')
      .html(\`
        <h2>Password Reset Request</h2>
        <p>Hi \${this.userName},</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="\${this.resetUrl}" style="
          display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;
          text-decoration:none;border-radius:6px;font-weight:bold;
        ">Reset Password</a>
        <p style="margin-top:16px;color:#666;font-size:13px;">
          This link will expire in 60 minutes.<br>
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      \`)
      .text(\`Hi \${this.userName},\\n\\nReset your password: \${this.resetUrl}\\n\\nThis link expires in 60 minutes.\`);
  }
}
`,
    );

    w(
      dir,
      "src/app/Mail/AccountVerificationEmail.ts",
      `import { Mailable } from '@lara-node/mail';

/*
|--------------------------------------------------------------------------
| AccountVerificationEmail
|--------------------------------------------------------------------------
|
| Sending after registration:
|   await Mail.send(new AccountVerificationEmail('Jane', 'jane@example.com', verifyToken));
|
*/
export class AccountVerificationEmail extends Mailable {
  private verifyUrl: string;

  constructor(
    private readonly userName: string,
    private readonly userEmail: string,
    private readonly token: string,
  ) {
    super();
    const base = process.env.APP_URL || 'http://localhost:3000';
    this.verifyUrl = \`\${base}/verify-email?token=\${token}&email=\${encodeURIComponent(userEmail)}\`;
  }

  build() {
    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', process.env.MAIL_FROM_NAME || '${name}')
      .subject('Please verify your email address')
      .html(\`
        <h2>Verify Your Email</h2>
        <p>Hi \${this.userName},</p>
        <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
        <a href="\${this.verifyUrl}" style="
          display:inline-block;padding:12px 24px;background:#059669;color:#fff;
          text-decoration:none;border-radius:6px;font-weight:bold;
        ">Verify Email</a>
        <p style="margin-top:16px;color:#666;font-size:13px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      \`)
      .text(\`Hi \${this.userName},\\n\\nVerify your email: \${this.verifyUrl}\`);
  }
}
`,
    );

    w(
      dir,
      "src/app/Mail/InvoiceEmail.ts",
      `import { Mailable } from '@lara-node/mail';

interface InvoiceItem { description: string; quantity: number; unitPrice: number; }

/*
|--------------------------------------------------------------------------
| InvoiceEmail  — example of a structured transactional email
|--------------------------------------------------------------------------
*/
export class InvoiceEmail extends Mailable {
  constructor(
    private readonly userEmail: string,
    private readonly invoice: {
      number: string;
      date: Date;
      items: InvoiceItem[];
      currency?: string;
    },
  ) { super(); }

  private get total(): number {
    return this.invoice.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  }

  private fmt(amount: number): string {
    return (this.invoice.currency || 'USD') + ' ' + amount.toFixed(2);
  }

  build() {
    const rows = this.invoice.items
      .map((i) => \`<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">\${i.description}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">\${i.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">\${this.fmt(i.unitPrice)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">\${this.fmt(i.quantity * i.unitPrice)}</td>
      </tr>\`)
      .join('');

    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', process.env.MAIL_FROM_NAME || '${name}')
      .subject(\`Invoice #\${this.invoice.number}\`)
      .html(\`
        <h2>Invoice #\${this.invoice.number}</h2>
        <p>Date: \${this.invoice.date.toLocaleDateString()}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left">Description</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Unit Price</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>\${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:8px;text-align:right;font-weight:bold">Total</td>
              <td style="padding:8px;text-align:right;font-weight:bold">\${this.fmt(this.total)}</td>
            </tr>
          </tfoot>
        </table>
      \`)
      .text(\`Invoice #\${this.invoice.number}\\nTotal: \${this.fmt(this.total)}\`);
  }
}
`,
    );

    w(
      dir,
      "src/app/Mail/index.ts",
      `export * from './WelcomeEmail';
export * from './PasswordResetEmail';
export * from './AccountVerificationEmail';
export * from './InvoiceEmail';
`,
    );
  } else {
    w(dir, "src/app/Mail/index.ts", "// Install @lara-node/mail to enable.\n");
  }

  // ── Commands ──────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Console/Commands/PermissionCommands.ts",
    `import { Command } from '@lara-node/console';
import type { ArgumentsCamelCase } from 'yargs';

const PERMISSIONS = [
  { slug: 'view_users', name: 'View Users' },
  { slug: 'create_users', name: 'Create Users' },
  { slug: 'update_users', name: 'Update Users' },
  { slug: 'delete_users', name: 'Delete Users' },
  { slug: 'add_roles_to_users', name: 'Add Roles To Users' },
  { slug: 'remove_roles_from_users', name: 'Remove Roles From Users' },
  { slug: 'activate_and_deactivate_users', name: 'Activate and Deactivate Users' },
  { slug: 'view_roles', name: 'View Roles' },
  { slug: 'create_roles', name: 'Create Roles' },
  { slug: 'update_roles', name: 'Update Roles' },
  { slug: 'delete_roles', name: 'Delete Roles' },
  { slug: 'add_permissions_to_roles', name: 'Add Permissions To Roles' },
  { slug: 'view_permissions', name: 'View Permissions' },
  { slug: 'create_permissions', name: 'Create Permissions' },
  { slug: 'update_permissions', name: 'Update Permissions' },
  { slug: 'delete_permissions', name: 'Delete Permissions' },
  { slug: 'view_files', name: 'View Files' },
  { slug: 'upload_files', name: 'Upload Files' },
  { slug: 'delete_files', name: 'Delete Files' },
];

export class PermissionsSyncCommand extends Command {
  protected signature = 'permissions:sync';
  protected description = 'Sync permissions to database and attach all to admin role';
  protected options = {
    'dry-run': { type: 'boolean' as const, description: 'Show without making changes', default: false },
    force: { type: 'boolean' as const, description: 'Force in production', default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const dryRun = args.dryRun as boolean;
    if (process.env.NODE_ENV === 'production' && !args.force) {
      this.error('Use --force in production'); return;
    }
    if (dryRun) this.info('Dry run mode');
    this.info('Syncing permissions...');

    try {
      const { default: Permission } = await import('../../Models/User/Permission');
      const { default: Role } = await import('../../Models/User/Role');
      const now = new Date();
      let created = 0, updated = 0;
      const syncedPerms: any[] = [];

      for (const p of PERMISSIONS) {
        let perm = await Permission.where('slug', p.slug).first() as any;
        if (perm) {
          if (!dryRun) await perm.update({ name: p.name, updated_at: now });
          updated++;
        } else {
          if (!dryRun) perm = await Permission.create({ name: p.name, slug: p.slug, created_at: now, updated_at: now });
          created++;
        }
        if (perm) syncedPerms.push(perm);
        this.line(\`  \${perm ? 'UPDATE' : 'CREATE'} \${p.slug}\`);
      }

      let adminRole = await Role.where('slug', 'admin').first() as any;
      if (!adminRole && !dryRun) {
        adminRole = await Role.create({ name: 'Admin', slug: 'admin', description: 'Administrator role', created_at: now, updated_at: now });
      }

      if (!dryRun && adminRole && syncedPerms.length) {
        const permIds = syncedPerms.map((p: any) => p?.id).filter(Boolean);
        try { await adminRole.permissions().sync(permIds); }
        catch { await adminRole.permissions().attach(permIds); }
      }

      this.info(\`Created: \${created}, Updated: \${updated}, Total: \${PERMISSIONS.length}\`);
    } catch (err: any) {
      this.error(\`Failed: \${err.message}\`); process.exit(1);
    }
  }
}

export class PermissionsListCommand extends Command {
  protected signature = 'permissions:list';
  protected description = 'List all available permissions';

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    this.info('Available Permissions:');
    this.line(\`\${'SLUG'.padEnd(35)} NAME\`);
    this.line('-'.repeat(65));
    for (const p of PERMISSIONS) this.line(\`\${p.slug.padEnd(35)} \${p.name}\`);
    this.info(\`Total: \${PERMISSIONS.length}\`);
  }
}
`,
  );

  // ── Routes ────────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/routes/api.ts",
    `import RouterBuilder from '@lara-node/router';
import { AuthController } from '../app/Http/Controllers/User/AuthController';
import { UserController } from '../app/Http/Controllers/User/UserController';
import { RoleController } from '../app/Http/Controllers/User/RoleController';
import { PermissionController } from '../app/Http/Controllers/User/PermissionController';
import { FileController, multerUpload } from '../app/Http/Controllers/File/FileController';

export const routesBuilder = new RouterBuilder();
const rb = routesBuilder;

rb.prefix('/auth').group((g: RouterBuilder) => {
  g.post('/register', [AuthController, 'register']);
  g.post('/login', [AuthController, 'login']);
  g.get('/me', 'auth', [AuthController, 'me']);
});

rb.prefix('/users').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_users', [UserController, 'index']);
  g.get('/:id', 'can:view_users', [UserController, 'show']);
  g.get('/:id/profile', [UserController, 'showProfile']);
  g.post('/', 'can:create_users', [UserController, 'store']);
  g.put('/:id', 'can:update_users', [UserController, 'update']);
  g.put('/:id/profile', [UserController, 'updateProfile']);
  g.post('/:id/password', 'can:update_users', [UserController, 'setPassword']);
  g.post('/:id/password/reset', [UserController, 'resetPassword']);
  g.post('/:id/roles', 'can:add_roles_to_users', [UserController, 'addRole']);
  g.delete('/:id/roles/:roleId', 'can:remove_roles_from_users', [UserController, 'removeRole']);
  g.delete('/:id', 'can:delete_users', [UserController, 'destroy']);
  g.patch('/:user/status', 'can:activate_and_deactivate_users', [UserController, 'toggleStatus']);
});

rb.prefix('/roles').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_roles', [RoleController, 'index']);
  g.get('/:role', 'can:view_roles', [RoleController, 'show']);
  g.post('/', 'can:create_roles', [RoleController, 'store']);
  g.put('/:id', 'can:update_roles', [RoleController, 'update']);
  g.delete('/:id', 'can:delete_roles', [RoleController, 'destroy']);
  g.post('/:id/permissions', 'can:add_permissions_to_roles', [RoleController, 'syncPermissions']);
});

rb.prefix('/permissions').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_permissions', [PermissionController, 'index']);
  g.get('/:id', 'can:view_permissions', [PermissionController, 'show']);
});

rb.prefix('/files').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_files', [FileController, 'index']);
  g.get('/:id', 'can:view_files', [FileController, 'show']);
  g.get('/:id/download', 'can:view_files', [FileController, 'download']);
  g.post('/', multerUpload.single('file') as any, 'can:upload_files', [FileController, 'store']);
  g.delete('/:id', 'can:delete_files', [FileController, 'destroy']);
});

export default rb;
`,
  );

  w(
    dir,
    "src/routes/web.ts",
    `import RouterBuilder from '@lara-node/router';

export const webRoutesBuilder = new RouterBuilder();

webRoutesBuilder.get('/', (_req: any, res: any) => {
  res.json({ message: 'Welcome to ${name}', version: '1.0.0' });
});

export default webRoutesBuilder;
`,
  );

  w(
    dir,
    "src/routes/channels.ts",
    `import { Router } from 'express';

/*
|--------------------------------------------------------------------------
| Broadcasting Channel Authorization Routes
|--------------------------------------------------------------------------
|
| Define channel authorization endpoints for WebSocket channels.
| These are used by the @lara-node/events broadcasting system.
|
*/

export const channelRouter = Router();

channelRouter.post('/auth', (req, res) => {
  // Channel authorization endpoint
  // The @lara-node/events BroadcastServiceProvider handles this automatically
  // when configured. This route is a manual fallback.
  res.json({ authorized: false, message: 'Configure BroadcastServiceProvider' });
});
`,
  );

  // ── Migrations (class-based) ──────────────────────────────────────────────────
  w(
    dir,
    "src/database/migrations/001_create_users.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateUsersTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('users', (table: TableBuilder) => {
      table.increments('id');
      table.string('name', 191).notNullable();
      table.string('email', 191).notNullable();
      table.datetime('email_verified_at').nullable();
      table.string('password', 255).notNullable();
      table.string('status', 32).default('active');
      table.datetime('last_login').nullable();
      table.datetime('last_seen_at').nullable();
      table.string('last_login_ip', 64).nullable();
      table.integer('default_role_id').nullable();
      table.string('remember_token', 100).nullable();
      table.string('avatar', 191).nullable();
      table.string('phone_number', 32).nullable();
      table.timestamps();
      table.softDeletes();
      table.unique('email');
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('users');
  }
}
`,
  );

  w(
    dir,
    "src/database/migrations/002_create_roles.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateRolesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('roles', (table: TableBuilder) => {
      table.increments('id');
      table.string('name', 191).notNullable();
      table.string('slug', 191).notNullable();
      table.string('description', 500).nullable();
      table.timestamps();
      table.softDeletes();
      table.unique('slug');
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('roles');
  }
}
`,
  );

  w(
    dir,
    "src/database/migrations/003_create_permissions.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreatePermissionsTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('permissions', (table: TableBuilder) => {
      table.increments('id');
      table.string('name', 191).notNullable();
      table.string('slug', 191).notNullable();
      table.string('description', 500).nullable();
      table.timestamps();
      table.softDeletes();
      table.unique('slug');
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('permissions');
  }
}
`,
  );

  w(
    dir,
    "src/database/migrations/004_create_roles_users.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateRolesUsersTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('roles_users', (table: TableBuilder) => {
      table.increments('id');
      table.integer('roles_id').notNullable();
      table.integer('users_id').notNullable();
      table.timestamps();
      table.softDeletes();
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('roles_users');
  }
}
`,
  );

  w(
    dir,
    "src/database/migrations/005_create_permissions_roles.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreatePermissionsRolesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('permissions_roles', (table: TableBuilder) => {
      table.increments('id');
      table.integer('permissions_id').notNullable();
      table.integer('roles_id').notNullable();
      table.timestamps();
      table.softDeletes();
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('permissions_roles');
  }
}
`,
  );

  w(
    dir,
    "src/database/migrations/006_user_profiles.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateUserProfilesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('user_profiles', (table: TableBuilder) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.string('gender', 32).nullable();
      table.string('id_number', 64).nullable();
      table.string('city', 191).nullable();
      table.string('country', 191).nullable();
      table.string('address', 500).nullable();
      table.string('zip_code', 32).nullable();
      table.datetime('date_of_birth').nullable();
      table.text('metadata').nullable();
      table.timestamps();
      table.softDeletes();
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('user_profiles');
  }
}
`,
  );

  w(
    dir,
    "src/database/migrations/007_create_files.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateFilesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('files', (table: TableBuilder) => {
      table.increments('id');
      table.string('original_name', 500).notNullable();
      table.string('filename', 500).notNullable();
      table.string('mime_type', 191).nullable();
      table.bigInteger('size').nullable();
      table.string('disk_path', 1000).nullable();
      table.integer('user_id').nullable();
      table.timestamps();
      table.softDeletes();
    });
  }

  async down(schema: MigrationSchema): Promise<void> {
    await schema.dropTable('files');
  }
}
`,
  );

  // ── Seeders ───────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/database/seeders/RolePermissionSeeder.ts",
    `import Role from '../../app/Models/User/Role';
import Permission from '../../app/Models/User/Permission';

const PERMISSIONS = [
  { slug: 'view_users', name: 'View Users' },
  { slug: 'create_users', name: 'Create Users' },
  { slug: 'update_users', name: 'Update Users' },
  { slug: 'delete_users', name: 'Delete Users' },
  { slug: 'add_roles_to_users', name: 'Add Roles To Users' },
  { slug: 'remove_roles_from_users', name: 'Remove Roles From Users' },
  { slug: 'activate_and_deactivate_users', name: 'Activate and Deactivate Users' },
  { slug: 'view_roles', name: 'View Roles' },
  { slug: 'create_roles', name: 'Create Roles' },
  { slug: 'update_roles', name: 'Update Roles' },
  { slug: 'delete_roles', name: 'Delete Roles' },
  { slug: 'add_permissions_to_roles', name: 'Add Permissions To Roles' },
  { slug: 'view_permissions', name: 'View Permissions' },
  { slug: 'create_permissions', name: 'Create Permissions' },
  { slug: 'update_permissions', name: 'Update Permissions' },
  { slug: 'delete_permissions', name: 'Delete Permissions' },
  { slug: 'view_files', name: 'View Files' },
  { slug: 'upload_files', name: 'Upload Files' },
  { slug: 'delete_files', name: 'Delete Files' },
];

export class RolePermissionSeeder {
  async run(): Promise<{ adminRole: any; userRole: any; permIds: number[] }> {
    const now = new Date();
    console.log('  Seeding roles...');

    let adminRole = await Role.where('slug', 'admin').first() as any;
    if (!adminRole) {
      adminRole = await Role.create({ name: 'Admin', slug: 'admin', description: 'Administrator with full access', created_at: now, updated_at: now });
    }

    let userRole = await Role.where('slug', 'user').first() as any;
    if (!userRole) {
      userRole = await Role.create({ name: 'User', slug: 'user', description: 'Regular user', created_at: now, updated_at: now });
    }

    console.log('  Seeding permissions...');
    const permIds: number[] = [];
    for (const p of PERMISSIONS) {
      let perm = await Permission.where('slug', p.slug).first() as any;
      if (!perm) {
        perm = await Permission.create({ name: p.name, slug: p.slug, created_at: now, updated_at: now });
      }
      if (perm?.id) permIds.push(perm.id as number);
    }

    try { await adminRole.permissions().sync(permIds); }
    catch { await adminRole.permissions().attach(permIds); }

    console.log(\`  ✓ \${PERMISSIONS.length} permissions synced to admin role\`);
    return { adminRole, userRole, permIds };
  }
}
`,
  );

  w(
    dir,
    "src/database/seeders/UserSeeder.ts",
    `import bcrypt from 'bcryptjs';
import User from '../../app/Models/User/User';
import UserProfile from '../../app/Models/User/UserProfile';

export class UserSeeder {
  async run(adminRoleId: number, userRoleId: number): Promise<void> {
    const now = new Date();
    console.log('  Seeding users...');

    let admin = await User.where('email', 'admin@example.com').first() as any;
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: await bcrypt.hash('password', 12),
        status: 'active',
        created_at: now,
        updated_at: now,
      });
      await UserProfile.create({ user_id: admin.id, gender: 'other', created_at: now, updated_at: now });
    }

    let regularUser = await User.where('email', 'user@example.com').first() as any;
    if (!regularUser) {
      regularUser = await User.create({
        name: 'User',
        email: 'user@example.com',
        password: await bcrypt.hash('password', 12),
        status: 'active',
        created_at: now,
        updated_at: now,
      });
      await UserProfile.create({ user_id: regularUser.id, gender: 'other', created_at: now, updated_at: now });
    }

    try { await admin.roles().sync([adminRoleId]); } catch { await admin.roles().attach(adminRoleId); }
    try { await regularUser.roles().sync([userRoleId]); } catch { await regularUser.roles().attach(userRoleId); }

    console.log('  ✓ Users seeded:');
    console.log('    admin@example.com    (password: password) — Admin role');
    console.log('    user@example.com     (password: password) — User role');
  }
}
`,
  );

  w(
    dir,
    "src/database/seeders/DatabaseSeeder.ts",
    `import { RolePermissionSeeder } from './RolePermissionSeeder';
import { UserSeeder } from './UserSeeder';

export class DatabaseSeeder {
  async run(): Promise<void> {
    console.log('Running DatabaseSeeder...');

    const { adminRole, userRole } = await new RolePermissionSeeder().run();
    await new UserSeeder().run(adminRole.id, userRole.id);

    console.log('DatabaseSeeder complete');
  }
}

// Allow running directly: node --import @swc-node/register/esm src/database/seeders/DatabaseSeeder.ts
if (require.main === module) {
  new DatabaseSeeder().run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
`,
  );

  // ── Config ────────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/config/app.config.ts",
    `export default {
  name: process.env.APP_NAME || '${name}',
  env: process.env.APP_ENV || 'local',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL || 'http://localhost:3000',
};
`,
  );

  w(
    dir,
    "src/config/db.config.ts",
    `export const dbConfig = {
  connection: process.env.DB_CONNECTION || 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || '${name.replace(/-/g, "_")}',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

export async function initDatabase() {
  const { DB } = await import('@lara-node/db');
  return DB.connect(dbConfig);
}

export default dbConfig;
`,
  );

  // ── Vitest ────────────────────────────────────────────────────────────────────
  w(
    dir,
    "vite.config.ts",
    `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { globals: true, environment: 'node', include: ['src/**/*.{test,spec}.ts'] },
});
`,
  );

  // ── README.md ─────────────────────────────────────────────────────────────────
  const selectedPkgs = opts.packages.map((p) => `@lara-node/${p}`).join(", ");
  w(
    dir,
    "README.md",
    `# ${name}

A production-ready REST API built with [Lara-Node](https://github.com/venomous-maker/vest) — a Laravel-inspired Node.js framework.

## Stack

- **Runtime**: Node.js with TypeScript (via @swc-node/register — supports decorators + no .js extensions)
- **Framework**: Express 5 + @lara-node/core (IoC container, service providers)
- **Database**: ${opts.database === "mysql" ? "MySQL (mysql2)" : "MongoDB"}
- **Auth**: JWT (@lara-node/auth + jsonwebtoken)
- **Validation**: @lara-node/validator (Laravel-style rules)
- **Middleware**: @lara-node/middlewares (class-based)
- **Packages**: ${selectedPkgs || "core set"}

## Quick Start

\`\`\`bash
pnpm install
cp .env.example .env
# Edit .env with your database credentials

pnpm artisan migrate          # run all migrations
pnpm artisan db:seed          # seed roles, permissions, and users
pnpm dev                      # start dev server on http://localhost:3000
\`\`\`

## Scripts

| Command | Description |
|---------|-------------|
| \`pnpm dev\` | Start dev server with hot-reload |
| \`pnpm build\` | Compile to \`dist/\` |
| \`pnpm start\` | Run compiled output |
| \`pnpm artisan <cmd>\` | Run artisan CLI commands |
| \`pnpm artisan migrate\` | Run pending migrations |
| \`pnpm artisan migrate:fresh\` | Drop all tables and re-migrate |
| \`pnpm artisan db:seed\` | Run database seeders |
| \`pnpm artisan permissions:sync\` | Sync permissions to DB |
| \`pnpm artisan permissions:list\` | List all permissions |
| \`pnpm typecheck\` | TypeScript type check |
| \`pnpm test\` | Run tests with Vitest |

## Project Structure

\`\`\`
src/
├── app/
│   ├── Console/Commands/       # Artisan commands
│   ├── Events/                 # Event classes
│   ├── Http/
│   │   ├── Controllers/        # Request handlers (IoC auto-wired)
│   │   │   ├── User/           # Auth, User, Role, Permission controllers
│   │   │   └── File/           # File upload controller
│   │   └── Kernel.ts           # Global + named middleware registration
│   ├── Jobs/                   # Queueable jobs
│   ├── Listeners/              # Event listeners (@ListensTo decorator)
│   ├── Mail/                   # Mailable classes
│   │   ├── WelcomeEmail.ts
│   │   ├── PasswordResetEmail.ts
│   │   ├── AccountVerificationEmail.ts
│   │   └── InvoiceEmail.ts
│   ├── Middleware/             # Custom middleware classes
│   ├── Models/                 # Eloquent-style ORM models
│   │   ├── User/               # User, Role, Permission, UserProfile
│   │   └── File/               # File model
│   ├── Observers/              # Model observers
│   ├── Providers/              # Service providers
│   │   ├── AppServiceProvider.ts
│   │   ├── RouteServiceProvider.ts
│   │   ├── EventServiceProvider.ts
│   │   ├── BroadcastServiceProvider.ts
│   │   └── QueueServiceProvider.ts
│   ├── Services/               # Business logic layer
│   └── Subscribers/            # Event subscribers
├── bootstrap/
│   └── app.ts                  # Application boot sequence
├── config/                     # App and DB configuration
├── database/
│   ├── migrations/             # Class-based migrations (001–007)
│   └── seeders/                # RolePermission, User, Database seeders
├── routes/
│   ├── api.ts                  # API routes (/api/*)
│   ├── web.ts                  # Web routes (/)
│   └── channels.ts             # Broadcasting channel auth
├── types/
│   └── express.d.ts            # Express type augmentations (req.user, req.validate, res.jsonAsync)
├── artisan.ts                  # CLI entry point
├── register.ts                 # reflect-metadata + dotenv bootstrap
└── server.ts                   # HTTP server entry point
\`\`\`

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | \`/api/auth/register\` | — | Register a new user |
| POST | \`/api/auth/login\` | — | Login + receive JWT |
| GET | \`/api/auth/me\` | ✓ | Get authenticated user |

### Users
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | \`/api/users\` | view_users | List users (paginated) |
| GET | \`/api/users/:id\` | view_users | Get user |
| POST | \`/api/users\` | create_users | Create user |
| PUT | \`/api/users/:id\` | update_users | Update user |
| DELETE | \`/api/users/:id\` | delete_users | Soft-delete user |
| PATCH | \`/api/users/:id/status\` | activate_and_deactivate_users | Toggle active/inactive |
| POST | \`/api/users/:id/roles\` | add_roles_to_users | Assign role |
| DELETE | \`/api/users/:id/roles/:roleId\` | remove_roles_from_users | Remove role |

### Roles & Permissions
| Method | Path | Description |
|--------|------|-------------|
| GET | \`/api/roles\` | List roles |
| POST | \`/api/roles\` | Create role |
| POST | \`/api/roles/:id/permissions\` | Sync permissions to role |
| GET | \`/api/permissions\` | List permissions |

### Files
| Method | Path | Description |
|--------|------|-------------|
| POST | \`/api/files\` | Upload file (multipart/form-data, field: \`file\`) |
| GET | \`/api/files/:id/download\` | Download file |
| DELETE | \`/api/files/:id\` | Delete file |

## Default Credentials (after seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password | Admin (all permissions) |
| user@example.com | password | User |

## Validation

Use \`req.validate()\` in any controller action (attached by \`ValidatorMiddleware\`):

\`\`\`typescript
const data = await req.validate({
  name: 'required|string|min:2|max:100',
  email: 'required|email|unique:users,email',
  age:   'required|integer|min:18|max:120',
  role:  'required|in:admin,user,moderator',
});
\`\`\`

Available rules: \`required\`, \`email\`, \`string\`, \`integer\`, \`numeric\`, \`boolean\`, \`array\`, \`min\`, \`max\`, \`between\`, \`in\`, \`not_in\`, \`unique:table,col\`, \`exists:table,col\`, \`regex\`, \`url\`, \`uuid\`, \`date\`, \`before\`, \`after\`, \`confirmed\`, \`nullable\`, \`sometimes\`, and many more.

## Mail

\`\`\`typescript
import { Mail } from '@lara-node/mail';
import { WelcomeEmail } from '@app/Mail/WelcomeEmail';
import { PasswordResetEmail } from '@app/Mail/PasswordResetEmail';

// Send immediately
await Mail.send(new WelcomeEmail(user.name, user.email));

// Send via queue (non-blocking)
await Mail.queue(new PasswordResetEmail(user.name, user.email, token));
\`\`\`

Available mailables:
- \`WelcomeEmail\` — sent on registration
- \`PasswordResetEmail\` — password reset link
- \`AccountVerificationEmail\` — email verification
- \`InvoiceEmail\` — structured invoice with line items

## Jobs & Scheduler

\`\`\`typescript
import { Queue } from '@lara-node/queue';
import { SendMailJob } from '@app/Jobs/SendMailJob';

// Dispatch a job
await Queue.push(new SendMailJob({ to: 'user@example.com', subject: 'Hello', body: 'World' }));

// Dispatch with delay (seconds)
await Queue.later(300, new SendMailJob({ ... }));
\`\`\`

Scheduled jobs (configured in \`QueueServiceProvider\`):

| Job | Schedule |
|-----|----------|
| \`permissions:sync\` | Daily at 00:05 |
| \`CleanupJob\` | Daily at 02:00 |
| \`GenerateReportJob\` (weekly users) | Every Sunday midnight |
| \`GenerateReportJob\` (monthly activity) | 1st of month at 06:00 |

## Events

\`\`\`typescript
import { getEventDispatcher } from '@lara-node/events';
import { UserRegistered } from '@app/Events/UserEvents';

const dispatcher = getEventDispatcher();
await dispatcher.dispatch(new UserRegistered(user.id, user.email, user.name));
\`\`\`

## Custom Middleware

\`\`\`typescript
// src/app/Middleware/ThrottleMiddleware.ts
export class ThrottleMiddleware {
  handle(req, res, next): void { /* ... */ }
  toHandler() { return (req, res, next) => this.handle(req, res, next); }
}

// Register in Http/Kernel.ts namedMiddleware:
throttle: (...args) => new ThrottleMiddleware(Number(args[0]) || 60).toHandler(),

// Use on routes:
g.post('/login', 'throttle:10', [AuthController, 'login']);
\`\`\`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| \`APP_ENV\` | \`local\` | Application environment |
| \`PORT\` | \`3000\` | HTTP server port |
| \`DB_CONNECTION\` | \`${opts.database}\` | Database driver |
| \`DB_HOST\` | \`127.0.0.1\` | Database host |
| \`DB_NAME\` | \`${name.replace(/-/g, "_")}\` | Database name |
| \`JWT_SECRET\` | — | **Required in production** |
| \`JWT_EXPIRES_IN\` | \`7d\` | Token expiry |
| \`MAIL_DRIVER\` | \`log\` | Mail driver (log, smtp, ses) |
| \`MAIL_FROM_ADDRESS\` | — | From address |
| \`QUEUE_CONNECTION\` | \`sync\` | Queue driver |
| \`BROADCAST_DRIVER\` | \`null\` | Broadcasting driver |

## Decorator Support

This project uses \`@swc-node/register\` (not tsx/esbuild) to enable full decorator metadata:

- \`@Injectable()\` on services/controllers → IoC container auto-resolves constructor dependencies
- \`@use(SoftDeletes, Timestamps)\` on models → mixin traits
- \`@ListensTo('event.name')\` on listeners → auto-registered by EventServiceProvider
- \`@Queueable({ queue: 'emails' })\` on jobs → queue routing

No \`.js\` extensions needed in imports (\`moduleResolution: "bundler"\`).
`,
  );

  console.log(`  ${pc.dim("Scaffolded:")} models, services, controllers, kernel, routes, migrations, seeders, observers, events, listeners, subscribers, commands, mail, jobs, scheduler, README`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
