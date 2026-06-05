#!/usr/bin/env node
/**
 * create-lara-node
 *
 * Usage:
 *   pnpm create lara-node
 *   pnpm create lara-node my-api
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve, dirname } from "path";
import pc from "picocolors";
import prompts from "prompts";

const VERSIONS: Record<string, string> = {
  "@lara-node/core": "0.1.18",
  "@lara-node/router": "0.2.18",
  "@lara-node/db": "0.1.23",
  "@lara-node/auth": "0.1.12",
  "@lara-node/console": "0.1.23",
  "@lara-node/validator": "0.1.21",
  "@lara-node/middlewares": "0.1.20",
  "@lara-node/events": "0.1.16",
  "@lara-node/queue": "0.1.23",
  "@lara-node/mail": "0.1.14",
  "@lara-node/horizon": "0.1.27",
  "@lara-node/telescope": "0.1.25",
  "@lara-node/cache": "0.1.17",
};

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
          {
            title: "@lara-node/validator   (validation engine) [core]",
            value: "validator",
            selected: true,
          },
          {
            title: "@lara-node/middlewares (class-based middleware) [core]",
            value: "middlewares",
            selected: true,
          },
          {
            title: "@lara-node/events      (events + broadcasting)",
            value: "events",
            selected: true,
          },
          {
            title: "@lara-node/queue       (job queue + scheduler)",
            value: "queue",
            selected: true,
          },
          { title: "@lara-node/mail        (mail drivers)", value: "mail", selected: true },
          { title: "@lara-node/horizon     (queue dashboard)", value: "horizon", selected: false },
          {
            title: "@lara-node/telescope   (debug dashboard)",
            value: "telescope",
            selected: false,
          },
        ],
      },
      {
        type: "multiselect",
        name: "dev tools",
        message: "select linter and formatter",
        choices: [
          {
            title: "oxlint",
            value: "oxlint",
            selected: false,
          },
          {
            title: "oxfmt",
            value: "oxfmt",
            selected: false,
          },
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

const w = (dir: string, file: string, content: string) => {
  const full = join(dir, file);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
};
const d = (dir: string, path: string) => mkdirSync(join(dir, path), { recursive: true });

function scaffold(dir: string, name: string, opts: { database: string; packages: string[] }): void {
  mkdirSync(dir, { recursive: true });

  const hasEvents = opts.packages.includes("events");
  const hasQueue = opts.packages.includes("queue");
  const hasMail = opts.packages.includes("mail");
  const hasHorizon = opts.packages.includes("horizon");
  const hasTelescope = opts.packages.includes("telescope");
  const hasOxlint = opts.packages.includes("oxlint");
  const hasOxfmt = opts.packages.includes("oxfmt");

  // ── Directories (must come first so all file writes succeed) ──────────────────
  for (const dd of [
    "src/app/Console/Commands",
    "src/app/Events",
    "src/app/Http/Controllers/User",
    "src/app/Http/Controllers/File",
    "src/app/Jobs",
    "src/app/Listeners",
    "src/app/Mail",
    "src/app/Middleware",
    "src/app/Models/User",
    "src/app/Models/File",
    "src/app/Exports",
    "src/app/Observers",
    "src/app/Policies",
    "src/app/Providers",
    "src/app/Traits",
    "src/app/Services",
    "src/app/Helpers",
    "src/app/Http/Requests",
    "src/app/Subscribers",
    "src/bootstrap",
    "src/config",
    "src/database/migrations",
    "src/database/seeders",
    "src/routes",
    "src/types",
    "uploads/files",
  ])
    d(dir, dd);

  const coreDeps = new Set(["core", "db", "router", "auth", "console", "validator", "middlewares", "cache"]);

  const laraNodeDeps: string[] = [
    "@lara-node/core",
    "@lara-node/db",
    "@lara-node/router",
    "@lara-node/auth",
    "@lara-node/console",
    "@lara-node/validator",
    "@lara-node/middlewares",
    "@lara-node/cache",
  ];

  for (const pkg of opts.packages) {
    if (!coreDeps.has(pkg)) laraNodeDeps.push(`@lara-node/${pkg}`);
  }

  // ── package.json ─────────────────────────────────────────────────────────────
  const REG = "--expose-gc -r @swc-node/register -r tsconfig-paths/register -r ./src/register.ts";
  const packageJson = {
    name,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: `node ${REG} src/server.ts`,
      start: "node dist/server.js",
      build: "tsdown src/server.ts src/artisan.ts --format cjs --out-dir dist",
      artisan: `node ${REG} src/artisan.ts`,
      migrate: `node ${REG} src/artisan.ts migrate`,
      "migrate:fresh": `node ${REG} src/artisan.ts migrate:fresh`,
      "db:seed": `node ${REG} src/artisan.ts db:seed`,
      test: "vitest run",
      typecheck: "tsc --noEmit",
      ...(hasOxlint ? { lint: "oxlint src", "lint:fix": "oxlint src --fix" } : {}),
      ...(hasOxfmt ? { fmt: "oxfmt", "fmt:check": "oxfmt --check" } : {}),
    },
    dependencies: {
      ...Object.fromEntries(laraNodeDeps.map((p) => [p, `>=${VERSIONS[p] ?? "0.1.0"}`])),
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
      "@types/cors": "^2.8.17",
      "@types/multer": "^1.4.12",
      "@types/yargs": "^17.0.33",
      "@swc-node/register": "^1.10.9",
      "@swc/core": "^1.11.0",
      "tsconfig-paths": "^4.2.0",
      tsdown: "^0.12.9",
      typescript: "^5.9.3",
      vitest: "^3.2.3",
      ...(hasOxlint ? { oxlint: "1.66" } : {}),
      ...(hasOxfmt ? { oxfmt: "0.51" } : {}),
    },
  };

  w(dir, "package.json", JSON.stringify(packageJson, null, 2));

  // oxlint & oxfmt configs
  if (hasOxlint) {
    w(
      dir,
      ".oxlintrc.json",
      JSON.stringify({
        $schema: "./node_modules/oxlint/configuration_schema.json",
        plugins: ["react", "unicorn", "typescript", "oxc"],
        categories: {},
        rules: {
          "for-direction": "warn",
          "no-async-promise-executor": "warn",
          "no-caller": "warn",
          "no-class-assign": "warn",
          "no-compare-neg-zero": "warn",
          "no-cond-assign": "warn",
          "no-const-assign": "warn",
          "no-constant-binary-expression": "warn",
          "no-constant-condition": "warn",
          "no-control-regex": "warn",
          "no-debugger": "warn",
          "no-delete-var": "warn",
          "no-dupe-class-members": "warn",
          "no-dupe-else-if": "warn",
          "no-dupe-keys": "warn",
          "no-duplicate-case": "warn",
          "no-empty-character-class": "warn",
          "no-empty-pattern": "warn",
          "no-empty-static-block": "warn",
          "no-eval": "warn",
          "no-ex-assign": "warn",
          "no-extra-boolean-cast": "warn",
          "no-func-assign": "warn",
          "no-global-assign": "warn",
          "no-import-assign": "warn",
          "no-invalid-regexp": "warn",
          "no-irregular-whitespace": "warn",
          "no-loss-of-precision": "warn",
          "no-new-native-nonconstructor": "warn",
          "no-nonoctal-decimal-escape": "warn",
          "no-obj-calls": "warn",
          "no-self-assign": "warn",
          "no-setter-return": "warn",
          "no-shadow-restricted-names": "warn",
          "no-sparse-arrays": "warn",
          "no-this-before-super": "warn",
          "no-unsafe-finally": "warn",
          "no-unsafe-negation": "warn",
          "no-unsafe-optional-chaining": "warn",
          "no-unused-labels": "warn",
          "no-unused-private-class-members": "warn",
          "no-unused-vars": "warn",
          "no-useless-backreference": "warn",
          "no-useless-catch": "warn",
          "no-useless-escape": "warn",
          "no-useless-rename": "warn",
          "no-with": "warn",
          "require-yield": "warn",
          "use-isnan": "warn",
          "valid-typeof": "warn",
          "oxc/bad-array-method-on-arguments": "warn",
          "oxc/bad-char-at-comparison": "warn",
          "oxc/bad-comparison-sequence": "warn",
          "oxc/bad-min-max-func": "warn",
          "oxc/bad-object-literal-comparison": "warn",
          "oxc/bad-replace-all-arg": "warn",
          "oxc/const-comparisons": "warn",
          "oxc/double-comparisons": "warn",
          "oxc/erasing-op": "warn",
          "oxc/missing-throw": "warn",
          "oxc/number-arg-out-of-range": "warn",
          "oxc/only-used-in-recursion": "warn",
          "oxc/uninvoked-array-callback": "warn",
          "react/forward-ref-uses-ref": "warn",
          "react/jsx-key": "warn",
          "react/jsx-no-duplicate-props": "warn",
          "react/jsx-no-target-blank": "warn",
          "react/jsx-no-undef": "warn",
          "react/jsx-props-no-spread-multi": "warn",
          "react/no-children-prop": "warn",
          "react/no-danger-with-children": "warn",
          "react/no-direct-mutation-state": "warn",
          "react/no-find-dom-node": "warn",
          "react/no-is-mounted": "warn",
          "react/no-render-return-value": "warn",
          "react/no-string-refs": "warn",
          "react/void-dom-elements-no-children": "warn",
          "typescript/no-duplicate-enum-values": "warn",
          "typescript/no-extra-non-null-assertion": "warn",
          "typescript/no-misused-new": "warn",
          "typescript/no-non-null-asserted-optional-chain": "warn",
          "typescript/no-this-alias": "warn",
          "typescript/no-unnecessary-parameter-property-assignment": "warn",
          "typescript/no-unsafe-declaration-merging": "warn",
          "typescript/no-useless-empty-export": "warn",
          "typescript/no-wrapper-object-types": "warn",
          "typescript/prefer-as-const": "warn",
          "typescript/triple-slash-reference": "warn",
          "unicorn/no-await-in-promise-methods": "warn",
          "unicorn/no-empty-file": "warn",
          "unicorn/no-invalid-fetch-options": "warn",
          "unicorn/no-invalid-remove-event-listener": "warn",
          "unicorn/no-new-array": "warn",
          "unicorn/no-single-promise-in-promise-methods": "warn",
          "unicorn/no-thenable": "warn",
          "unicorn/no-unnecessary-await": "warn",
          "unicorn/no-useless-fallback-in-spread": "warn",
          "unicorn/no-useless-length-check": "warn",
          "unicorn/no-useless-spread": "warn",
          "unicorn/prefer-set-size": "warn",
          "unicorn/prefer-string-starts-ends-with": "warn",
        },
        settings: {
          "jsx-a11y": {
            polymorphicPropName: null,
            components: {},
          },
          next: {
            rootDir: [],
          },
          react: {
            formComponents: [],
            linkComponents: [],
          },
          jsdoc: {
            ignorePrivate: false,
            ignoreInternal: false,
            ignoreReplacesDocs: true,
            overrideReplacesDocs: true,
            augmentsExtendsReplacesDocs: false,
            implementsReplacesDocs: false,
            exemptDestructuredRootsFromChecks: false,
            tagNamePreference: {},
          },
        },
        env: {
          builtin: true,
        },
        globals: {},
        ignorePatterns: [],
      }),
    );
  }

  if (hasOxfmt) {
    w(
      dir,
      ".oxfmtrc.json",
      JSON.stringify({
        $schema: "./node_modules/oxfmt/configuration_schema.json",
        ignorePatterns: [],
      }),
    );
  }

  // ── tsconfig.json ─────────────────────────────────────────────────────────────
  w(
    dir,
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "CommonJS",
          moduleResolution: "node",
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
        module: { type: "commonjs" },
        sourceMaps: true,
      },
      null,
      2,
    ),
  );

  // ── src/register.ts ───────────────────────────────────────────────────────────
  w(dir, "src/register.ts", `import 'reflect-metadata';\nimport 'dotenv/config';\nimport '@lara-node/auth';\n`);

  // ── .env.example ─────────────────────────────────────────────────────────────
  const dbName = name.replace(/-/g, "_");
  const envLines: string[] = [
    "APP_NAME=" + name,
    "APP_ENV=local",
    "APP_KEY=",
    "APP_DEBUG=true",
    "PORT=3000",
    "",
    "# ── Database ──────────────────────────────────────────────────",
    `DB_CONNECTION=${opts.database}`,
    "DB_NAME=" + dbName,
  ];

  if (opts.database === "mysql") {
    envLines.push(
      "DB_HOST=127.0.0.1",
      "DB_PORT=3306",
      "DB_USER=root",
      "DB_PASSWORD=",
      "DB_POOL_LIMIT=10",
      "# DB_SOCKET_PATH=/var/run/mysqld/mysqld.sock  # use instead of host/port on Linux",
    );
  } else {
    envLines.push(
      "# MONGO_URI=mongodb://user:pass@localhost:27017/" + dbName + "?authSource=admin",
      "DB_HOST=127.0.0.1",
      "DB_PORT=27017",
      "# MONGO_REPLICA_SET=rs0",
      "# MONGO_DIRECT_CONNECTION=true",
      "# MONGO_RETRY_WRITES=false",
      "# MONGO_SERVER_SELECTION_TIMEOUT_MS=10000",
    );
  }

  envLines.push(
    "# SKIP_DB=1  # set to skip DB init in test/CI",
    "",
    "# ── Auth ─────────────────────────────────────────────────────",
    "JWT_SECRET=change-this-in-production",
    "JWT_EXPIRES_IN=7d",
    "",
    "# ── Cache / Queue / Mail / Broadcast ─────────────────────────",
    "CACHE_DRIVER=file",
    "QUEUE_CONNECTION=sync",
    "MAIL_DRIVER=log",
    "MAIL_FROM_ADDRESS=hello@example.com",
    "MAIL_FROM_NAME=" + name,
    "BROADCAST_DRIVER=null",
  );

  w(dir, ".env.example", envLines.join("\n"));

  w(dir, ".gitignore", "node_modules\ndist\n.env\n*.log\nuploads/\n");

  // ── src/types/express.d.ts ────────────────────────────────────────────────────
  w(
    dir,
    "src/types/express.d.ts",
    `import type { FormRequest } from '@lara-node/middlewares';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request extends FormRequest {}
  }
}

export {};
`,
  );

  // ── src/types/global.d.ts ─────────────────────────────────────────────────────
  w(
    dir,
    "src/types/global.d.ts",
    `import type { AuthGuard } from '@lara-node/auth';

declare global {
  /** Returns the auth guard for the current request context. */
  function auth<U = Record<string, unknown>>(): AuthGuard<U>;

  /** Set the authenticated user for the current request context. */
  function setUser<U = unknown>(user: U): void;

  /** Remove the authenticated user from the current request context. */
  function clearUser(): void;

  /** Get the raw user value from the current request context. */
  function getUser<U = unknown>(): U | undefined;
}

export {};
`,
  );

  // ── src/app/Helpers/auth.ts ──────────────────────────────────────────────────
  w(
    dir,
    "src/app/Helpers/auth.ts",
    `export { auth, setUser, clearUser, getUser } from '@lara-node/auth';
export type { AuthGuard } from '@lara-node/auth';
`,
  );

  // ── src/app/Models/ModelRegistry.ts is gone — models are auto-discovered ──

  // ── src/server.ts ─────────────────────────────────────────────────────────────
  w(
    dir,
    "src/server.ts",
    `import 'dotenv/config';
import { startApplication } from './bootstrap/app';
import { closeDatabase } from '@lara-node/db';

startApplication();

async function shutdown(signal: string): Promise<void> {
  console.log(\`\\n[server] \${signal} received — shutting down gracefully\`);
  try {
    await closeDatabase();
    console.log('[server] Database connections closed');
  } catch (err) {
    console.error('[server] Error during shutdown:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));
`,
  );

  // ── src/app/Console/Kernel.ts ─────────────────────────────────────────────────
  w(
    dir,
    "src/app/Console/Kernel.ts",
    `import path from 'path';
import { Kernel as BaseKernel } from '@lara-node/console';

export class ConsoleKernel extends BaseKernel {
  async boot(): Promise<void> {
    // Discover app commands from src/app/Console/Commands/
    this.discoverCommands(path.join(__dirname, 'Commands'));

    // Collect commands declared by all registered service providers
    if (this._app) {
      this.setProviders(this._app.getBootedProviders());
    }

    await super.boot();
  }
}
`,
  );

  // ── src/artisan.ts ────────────────────────────────────────────────────────────
  w(
    dir,
    "src/artisan.ts",
    `import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ConsoleKernel } from './app/Console/Kernel';
import { app, bootForConsole } from './bootstrap/app';

async function main() {
  await bootForConsole();

  const kernel = new ConsoleKernel(app);
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
  w(
    dir,
    "src/bootstrap/app.ts",
    `import '../register';
import fs from 'fs';
import path from 'path';
import { container, Application } from '@lara-node/core';
import type { ServiceProviderClass } from '@lara-node/core';
import { modelRegistryMiddleware } from '@lara-node/router';
import { Kernel } from '../app/Http/Kernel';
import { AppServiceProvider } from '../app/Providers/AppServiceProvider';

export const app = new Application(container);

/*
|--------------------------------------------------------------------------
| Package Auto-discovery
|--------------------------------------------------------------------------
|
| Scans node_modules for packages that declare \`laraNode.providers\` in
| their package.json, then auto-registers those service providers.
|
| Example — in a third-party package's package.json:
|   "laraNode": {
|     "providers": ["./dist/MyServiceProvider.js"]
|   }
|
*/
function autoloadProviders(): void {
  const nodeModules = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModules)) return;

  const scanDir = (dir: string, pkgName: string): void => {
    const pkgJson = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgJson)) return;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf-8')) as {
        laraNode?: { providers?: string[] };
      };
      for (const rel of pkg.laraNode?.providers ?? []) {
        try {
          const providerPath = path.join(dir, rel);
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mod = require(providerPath) as Record<string, unknown>;
          for (const exported of Object.values(mod)) {
            if (typeof exported === 'function') {
              app.register(exported as ServiceProviderClass);
            }
          }
        } catch {
          console.warn(\`[autoload] Failed to load provider from \${pkgName}: \${rel}\`);
        }
      }
    } catch { /* skip malformed package.json */ }
  };

  try {
    for (const entry of fs.readdirSync(nodeModules)) {
      if (entry.startsWith('.')) continue;
      const entryPath = path.join(nodeModules, entry);
      if (!fs.statSync(entryPath).isDirectory()) continue;
      if (entry.startsWith('@')) {
        for (const scoped of fs.readdirSync(entryPath)) {
          scanDir(path.join(entryPath, scoped), \`\${entry}/\${scoped}\`);
        }
      } else {
        scanDir(entryPath, entry);
      }
    }
  } catch { /* ignore */ }
}

/*
|--------------------------------------------------------------------------
| Boot sequence (console — no HTTP kernel needed)
|--------------------------------------------------------------------------
*/
export async function bootForConsole(): Promise<void> {
  try {
    autoloadProviders();
    app.register(AppServiceProvider);
    await app.boot();
  } catch (err) {
    console.error('Failed to boot application:', err);
    process.exit(1);
  }
}

/*
|--------------------------------------------------------------------------
| Boot sequence (HTTP server)
|
| Order matters:
|   1. autoloadProviders() — registers providers from installed packages
|   2. Register AppServiceProvider (cascades to all additionalProviders)
|   3. Boot HTTP Kernel — registers global middleware + named route aliases
|   4. configureBaseMiddleware (cors, json, urlencoded)
|   5. modelRegistryMiddleware — scans Models/ for route-model binding
|   6. app.boot() — boots all providers (RouteServiceProvider mounts routes)
|   7. configureErrorHandling — must come after routes are mounted
|--------------------------------------------------------------------------
*/
export async function startApplication(): Promise<void> {
  const port = process.env.PORT ?? 3000;

  autoloadProviders();
  app.register(AppServiceProvider);

  const kernel = new Kernel(app);
  kernel.boot();

  app.configureBaseMiddleware();

  app.useMiddleware(modelRegistryMiddleware(path.join(__dirname, '../app/Models')));

  // Create the HTTP server BEFORE booting providers so broadcasting can attach
  // its WebSocket upgrade handler to it (otherwise /ws falls through to a 404).
  app.createHttpServer();

  await app.boot();

  kernel.configureErrorHandling(kernel.errorHandler);

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
    `import { RequestHandler, ErrorRequestHandler } from 'express';
import { HttpKernel as BaseKernel, middlewareStack } from '@lara-node/router';
import type { Middleware } from '@lara-node/core';
import {
  AsyncContextMiddleware,
  RequestLoggerMiddleware,
  RequestExtenderMiddleware,
  ValidatorMiddleware,
  ResponseExtenderMiddleware,
  ErrorHandlerMiddleware,
} from '@lara-node/middlewares';

/*
|--------------------------------------------------------------------------
| HTTP Kernel
|--------------------------------------------------------------------------
|
| Extends the base HttpKernel from @lara-node/router.
|
| - \`middleware\`  — global middleware applied to every request
|
| Named middleware aliases (auth, can, role, must-be-active) are registered
| in MiddlewareServiceProvider, NOT here, so they are available before
| route files are loaded in RouteServiceProvider.boot().
|
*/
export class Kernel extends BaseKernel {
  protected override middleware: RequestHandler[] = middlewareStack.resolveMiddlewareStack([
    AsyncContextMiddleware,
    RequestLoggerMiddleware,
    RequestExtenderMiddleware,
    ValidatorMiddleware,
    ResponseExtenderMiddleware,
  ] as Middleware[]);

  readonly errorHandler: ErrorRequestHandler = (err, req, res, next) =>
    new ErrorHandlerMiddleware().handle(err, req, res, next);
}
`,
  );

  // ── MiddlewareServiceProvider ─────────────────────────────────────────────────
  w(
    dir,
    "src/app/Providers/MiddlewareServiceProvider.ts",
    `import { MiddlewareServiceProvider as BaseProvider } from '@lara-node/core';
import {
  AuthMiddleware,
  AuthorizeByStatusMiddleware,
  authorizeRoles,
  authorizePermissions,
} from '@lara-node/middlewares';
import User from '../Models/User/User';
import { multerUpload } from '../Http/Controllers/File/FileController';

type UserWithRelations = User & {
  roles: Array<{ slug: string; permissions: Array<{ slug: string }> }>;
};

/*
|--------------------------------------------------------------------------
| MiddlewareServiceProvider
|--------------------------------------------------------------------------
|
| Register named middleware aliases, groups, and priority here.
| This provider runs before RouteServiceProvider so all aliases are
| available when route files are lazily loaded in boot().
|
| Aliases are used in RouterBuilder route definitions and @Route decorators:
|   g.get('/', 'can:view_users', [UserController, 'index'])
|   g.post('/', multerUpload.single('file'), 'can:upload_files', [FileController, 'store'])
|   @Route.get('/', 'can:view_permissions')  // decorator style (PermissionController)
|
*/
export class MiddlewareServiceProvider extends BaseProvider {
  protected registerMiddleware(): void {
    this.middlewareAliases({
      auth: new AuthMiddleware({
        userLoader: async (uid) => {
          const user = await User.with(['profile', 'roles', 'roles.permissions']).find(uid) as UserWithRelations | null;
          if (!user) return null;
          await user.update({ last_seen_at: new Date() });
          const roles = user.roles ?? [];
          const perms = roles.flatMap((r) => r.permissions ?? []);
          return {
            id: user.id,
            roles: roles.map((r) => r.slug),
            permissions: perms.map((p) => p.slug),
            model: user,
          };
        },
      }).toHandler(),
      'must-be-active': AuthorizeByStatusMiddleware,
      can: (...perms: string[]) => authorizePermissions(...perms),
      role: (...roles: string[]) => authorizeRoles(...roles),
    });

    // File upload middleware — use 'file-upload' alias on any route that accepts multipart
    this.middlewareAlias('file-upload', multerUpload.single('file'));

    this.middlewareGroup('web', []);

    this.middlewareGroup('api', [
      // 'throttle:120,1',
    ]);

    this.middlewarePriority(['auth', 'must-be-active', 'can', 'role']);
  }
}
`,
  );

  // ── ConfigServiceProvider ─────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Providers/ConfigServiceProvider.ts",
    `import { ServiceProvider } from '@lara-node/core';
import path from 'path';

/*
|--------------------------------------------------------------------------
| ConfigServiceProvider
|--------------------------------------------------------------------------
|
| Crawls src/config and registers every *.config.{ts,js} file with the global
| config() system (the filename minus '.config' becomes the namespace, e.g.
| queue.config.ts → config('queue')). App values override package defaults.
|
| This provider must run FIRST so every other provider and module can call
| config('mail.default') and get app-level overrides instead of package
| defaults. The resolved snapshot is also persisted to the cache backend for
| faster cross-process retrieval (see the config:cache / config:clear commands).
|
| After \`pnpm artisan vendor:publish --tag=config\`, new config files in
| src/config/ are picked up automatically — no edits needed here.
|
*/
export class ConfigServiceProvider extends ServiceProvider {
  register(): void {
    this.loadConfigDir(path.join(__dirname, '../../config'));
  }
}
`,
  );

  // ── Sample Middleware ─────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Middleware/ThrottleMiddleware.ts",
    `import { Request, Response, NextFunction } from 'express';
import { Middleware } from '@lara-node/router';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

/*
|--------------------------------------------------------------------------
| ThrottleMiddleware — rate limiting per IP
|--------------------------------------------------------------------------
|
| @Middleware('throttle') registers this class under the 'throttle' alias
| automatically — no manual registration in MiddlewareServiceProvider.
|
| Usage on route:
|   g.post('/login', 'throttle:10', [AuthController, 'login']);
|
*/
@Middleware('throttle')
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
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';
import { Injectable } from '@lara-node/core';
import { Bind } from '@lara-node/router';
import { WithExportable } from '@app/Traits/WithExportable';
import Role from './Role';
import UserProfile from './UserProfile';
import { RolesUsers } from './RolesUsers';

@Bind()            // registers 'user' for route-model binding — :user param auto-resolves
@Injectable()
@use(WithExportable, SoftDeletes, Timestamps)
export class User extends Model {
  static primaryKey = 'id';
  static fillable: string[] = [
    'name', 'email', 'email_verified_at', 'password', 'status',
    'last_login', 'last_seen_at', 'last_login_ip', 'default_role_id',
    'remember_token', 'avatar', 'phone_number', 'created_at', 'updated_at', 'deleted_at',
  ];
  static hidden: string[] = ['password', 'remember_token'];
  static casts: Record<string, string> = {
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
    last_login: 'datetime', last_seen_at: 'datetime',
  };

  // Export configuration (used by @use(WithExportable))
  static exportFields  = ['id', 'name', 'email', 'phone_number', 'status', 'created_at'];
  static exportHeadings = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Created At'];

  roles() {
    return this.belongsToMany(Role, RolesUsers.getTable(), 'users_id', 'roles_id');
  }

  profile() {
    return this.hasOne(UserProfile, 'user_id', 'id');
  }

  isActive(): boolean {
    const status = this.status;
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
import { Bind } from '@lara-node/router';
import Permission from './Permission';

@Bind()            // registers 'role' for route-model binding
@use(SoftDeletes)
export class Role extends Model {
  static fillable: string[] = ['name', 'slug', 'description', 'created_at', 'updated_at', 'deleted_at'];
  static casts: Record<string, string> = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' };

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
import { Bind } from '@lara-node/router';

@Bind()            // registers 'permission' for route-model binding
@use(SoftDeletes)
export class Permission extends Model {
  static table = 'permissions';
  static fillable: string[] = ['name', 'slug', 'description', 'created_at', 'updated_at', 'deleted_at'];
  static casts: Record<string, string> = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' };
}

export default Permission;
`,
  );

  w(
    dir,
    "src/app/Models/User/UserProfile.ts",
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';

@use(SoftDeletes, Timestamps)
export class UserProfile extends Model {
  static table = 'user_profiles';
  static fillable: string[] = [
    'user_id',
    // ── Common ─────────────────────────────────────────────────────────────────
    'type',          // admin | user | staff
    'gender', 'date_of_birth', 'id_number', 'phone', 'nationality',
    'city', 'country', 'address', 'zip_code', 'bio', 'avatar_url',
    // ── Extended profile fields (leave populated as the app grows) ─────────────
    'headline', 'skills', 'experience_level', 'availability',
    'preferred_job_type', 'resume_url',
    'company_name', 'company_size', 'industry', 'company_type',
    'company_email', 'company_phone', 'company_description', 'company_logo',
    // ── Extra ──────────────────────────────────────────────────────────────────
    'metadata',
    'created_at', 'updated_at', 'deleted_at',
  ];
  static casts: Record<string, string> = {
    date_of_birth: 'datetime',
    skills: 'json',
    metadata: 'json',
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  };
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
  static fillable: string[] = ['roles_id', 'users_id', 'created_at', 'updated_at', 'deleted_at'];
  static casts: Record<string, string> = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' };
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
  static fillable: string[] = ['permissions_id', 'roles_id', 'created_at', 'updated_at', 'deleted_at'];
  static casts: Record<string, string> = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' };
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
import { Bind } from '@lara-node/router';

@Bind()            // registers 'file' for route-model binding
@use(SoftDeletes, Timestamps)
export class File extends Model {
  static table = 'files';
  static fillable: string[] = [
    'original_name', 'filename', 'mime_type', 'size', 'disk_path',
    'user_id', 'created_at', 'updated_at', 'deleted_at',
  ];
  static casts: Record<string, string> = {
    size: 'int',
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  };
}

export default File;
`,
  );

  // ── Traits ───────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Traits/WithExportable.ts",
    `import { trait } from '@lara-node/db';
import type { Model } from '@lara-node/db';

/**
 * WithExportable trait
 *
 * Adds CSV / Excel / PDF / XML export support to any Model.
 * Apply with @use(WithExportable) and configure exportFields / exportHeadings:
 *
 * @example
 * @use(WithExportable, SoftDeletes, Timestamps)
 * export class User extends Model {
 *   static exportFields  = ['id', 'name', 'email', 'status', 'created_at'];
 *   static exportHeadings = ['ID', 'Name', 'Email', 'Status', 'Created At'];
 * }
 *
 * // In a controller:
 * const exp = User.toExportable();            // implements CsvExportable + Exportable
 * await CSV.download(exp, 'users.csv', res);
 * await Excel.download(exp, 'users.xlsx', res);
 *
 * // With a scope (filter / order the export set):
 * const exp = User.toExportable((q) => q.where('status', 'active').orderBy('name'));
 */
@trait('WithExportable')
export class WithExportable {
  static exportFields: string[] = [];
  static exportHeadings: string[] = [];

  static toExportable(
    scope?: (q: ReturnType<typeof Model.query>) => ReturnType<typeof Model.query>,
  ) {
    const ModelClass = this as unknown as typeof Model & {
      exportFields: string[];
      exportHeadings: string[];
      fillable?: string[];
      hidden?: string[];
    };

    return {
      async collection(): Promise<Record<string, unknown>[]> {
        const fields = resolveFields(ModelClass);
        let q = ModelClass.query();
        if (scope) q = scope(q);
        const records = (await q.get()) as Model[];
        return records.map((record) => {
          const row: Record<string, unknown> = {};
          for (const f of fields)
            row[f] = record.getAttribute ? record.getAttribute(f) : (record as Record<string, unknown>)[f];
          return row;
        });
      },

      headings(): string[] {
        if (ModelClass.exportHeadings?.length) return ModelClass.exportHeadings;
        return resolveFields(ModelClass).map((f) =>
          f.replace(/_/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase()),
        );
      },

      map(row: Record<string, unknown>): unknown[] {
        return Object.values(row);
      },
    };
  }
}

function resolveFields(ModelClass: { exportFields?: string[]; fillable?: string[]; hidden?: string[] }): string[] {
  if (ModelClass.exportFields?.length) return ModelClass.exportFields;
  return (ModelClass.fillable ?? []).filter((f) => !(ModelClass.hidden ?? []).includes(f));
}
`,
  );

  // ── Policies ──────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Policies/UserPolicy.ts",
    `import type { AuthGuard } from '@lara-node/auth';
import User from '../Models/User/User';

type AuthUser = AuthGuard<{ id: number; roles: string[]; permissions: string[] }>['model'];

/*
|--------------------------------------------------------------------------
| UserPolicy
|--------------------------------------------------------------------------
|
| Register in a ServiceProvider (e.g. AppServiceProvider or a dedicated
| AuthServiceProvider):
|
|   import { Gate } from '../Auth/Gate';
|   import { UserPolicy } from '../Policies/UserPolicy';
|   import User from '../Models/User/User';
|
|   Gate.policy(User, UserPolicy);
|
| Then in a controller:
|
|   async update(req: Request, res: Response, user: User): Promise<void> {
|     this.authorize('update', user);  // calls UserPolicy.update(authUser, user)
|     ...
|   }
|
*/
export class UserPolicy {
  viewAny(_user: AuthUser): boolean {
    return true;
  }

  view(_user: AuthUser, _subject: User): boolean {
    return true;
  }

  create(_user: AuthUser): boolean {
    return (_user.permissions as string[]).includes('create_users');
  }

  update(user: AuthUser, subject: User): boolean {
    // Users can update themselves; admins can update anyone
    return (user.id as number) === (subject.id)
      || (user.roles as string[]).includes('admin');
  }

  delete(_user: AuthUser, _subject: User): boolean {
    return (_user.roles as string[]).includes('admin');
  }
}
`,
  );

  // ── Observers ─────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Observers/UserObserver.ts",
    `import { Observer, Observe } from '@lara-node/db';
import User from '../Models/User/User';

/*
|--------------------------------------------------------------------------
| UserObserver
|--------------------------------------------------------------------------
|
| Intercepts lifecycle events on the User model. @Observe(User) wires
| this class automatically — no manual User.observe(UserObserver) needed.
|
*/
@Observe(User)
export class UserObserver extends Observer<User> {
  creating(user: User): void {
    if (!user.status) user.setAttribute('status', 'active');
  }

  created(user: User): void {
    console.log(\`[UserObserver] User created: \${user.email}\`);
  }

  updating(user: User): void {
    user.setAttribute('updated_at', new Date());
  }

  deleting(user: User): void {
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
import UserProfile from '../Models/User/UserProfile';

@Injectable()
export class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    profile?: Record<string, unknown>;
  }) {
    const existing = await User.where('email', data.email).first();
    if (existing) throw Object.assign(new Error('Email already registered'), { status: 422 });

    const { profile: profileData, ...userData } = data;
    const password = await bcrypt.hash(userData.password, 12);
    const user = await User.create({
      ...userData,
      password,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    }) as User;

    if (profileData && Object.keys(profileData).length > 0) {
      await UserProfile.create({
        user_id: user.id,
        ...profileData,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return User.with(['profile', 'roles', 'roles.permissions']).find(user.id);
  }

  async login(email: string, password: string) {
    const user = await User.where('email', email).first() as User | null;
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const secret = process.env.JWT_SECRET ?? 'dev-secret-change';
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];
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

  async create(data: Record<string, unknown>) {
    return User.create({ ...data, created_at: new Date(), updated_at: new Date() });
  }

  async update(id: number | string, data: Record<string, unknown>) {
    const user = await User.find(id) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.update({ ...data, updated_at: new Date() });
    return user;
  }

  async destroy(id: number | string) {
    const user = await User.find(id) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.delete();
  }

  async addRole(userId: number | string, roleId: number | string) {
    const user = await User.with(['roles']).find(userId) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.roles().attach([roleId]);
    return user;
  }

  async removeRole(userId: number | string, roleId: number | string) {
    const user = await User.find(userId) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.roles().detach([roleId]);
  }

  async toggleStatus(userId: number | string) {
    const user = await User.find(userId) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    const current = user.status;
    const newStatus = current === 'active' ? 'inactive' : 'active';
    await user.update({ status: newStatus, updated_at: new Date() });
    return user;
  }

  async updateProfile(userId: number | string, data: Record<string, unknown>) {
    let profile = await UserProfile.where('user_id', userId).first() as UserProfile | null;
    if (profile) {
      await profile.update({ ...data, updated_at: new Date() });
    } else {
      profile = await UserProfile.create({ user_id: userId, ...data, created_at: new Date(), updated_at: new Date() }) as UserProfile;
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

  async update(id: number | string, data: Record<string, unknown>) {
    const role = await Role.find(id) as Role | null;
    if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
    await role.update({ ...data, updated_at: new Date() });
    return role;
  }

  async destroy(id: number | string) {
    const role = await Role.find(id) as Role | null;
    if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
    await role.delete();
  }

  async syncPermissions(roleId: number | string, permissionIds: number[]) {
    const role = await Role.find(roleId) as Role | null;
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
    const file = await File.find(id) as File | null;
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

  // ── Requests ──────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Http/Requests/RegisterRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class RegisterRequest extends FormRequest<{
  name: string;
  email: string;
  password: string;
  profile?: Record<string, unknown>;
}> {
  authorize(): boolean { return true; }

  rules() {
    return {
      name: 'required|string|min:2|max:100',
      email: 'required|email|unique:users,email',
      password: 'required|string|min:8',
      profile: 'nullable|json',
      'profile.type': 'sometimes|string|in:admin,user,staff',
      'profile.gender': 'nullable|string|in:male,female,other',
      'profile.phone': 'nullable|string|max:32',
      'profile.bio': 'nullable|string|max:2000',
      'profile.avatar_url': 'nullable|string|max:500',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/LoginRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class LoginRequest extends FormRequest<{ email: string; password: string }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      email: 'required|email|exists:users,email',
      password: 'required|string|min:6',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/StoreUserRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class StoreUserRequest extends FormRequest<{
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  status?: string;
  profile?: Record<string, unknown>;
}> {
  authorize(): boolean { return true; }

  rules() {
    return {
      name: 'required|string|min:2|max:100',
      email: 'required|email|unique:users,email',
      password: 'required|string|min:8',
      phone_number: 'nullable|string|max:32',
      status: 'nullable|string|in:active,inactive',
      profile: 'nullable|json',
      'profile.type': 'sometimes|string|in:admin,user,staff',
      'profile.gender': 'sometimes|string|in:male,female,other',
      'profile.date_of_birth': 'sometimes|date',
      'profile.id_number': 'sometimes|string|max:64',
      'profile.phone': 'sometimes|string|max:32',
      'profile.nationality': 'sometimes|string|max:100',
      'profile.city': 'sometimes|string|max:191',
      'profile.country': 'sometimes|string|max:191',
      'profile.address': 'sometimes|string|max:500',
      'profile.zip_code': 'sometimes|string|max:32',
      'profile.bio': 'sometimes|string|max:2000',
      'profile.avatar_url': 'sometimes|string|max:500',
      'profile.metadata': 'sometimes|nullable',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/UpdateUserRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class UpdateUserRequest extends FormRequest<{
  name?: string;
  email?: string;
  phone_number?: string;
  status?: string;
}> {
  authorize(): boolean { return true; }

  rules() {
    return {
      name: 'sometimes|string|min:2|max:100',
      email: 'sometimes|email|unique:users,email,' + this.input('user'),
      phone_number: 'sometimes|string|max:32',
      status: 'sometimes|string|in:active,inactive',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/UpdateProfileRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class UpdateProfileRequest extends FormRequest<{
  type?: string;
  gender?: string;
  date_of_birth?: string;
  id_number?: string;
  phone?: string;
  nationality?: string;
  city?: string;
  country?: string;
  address?: string;
  zip_code?: string;
  bio?: string;
  avatar_url?: string;
  headline?: string;
  skills?: string[];
  experience_level?: string;
  availability?: string;
  preferred_job_type?: string;
  resume_url?: string;
  company_name?: string;
  company_size?: string;
  industry?: string;
  company_type?: string;
  company_email?: string;
  company_phone?: string;
  company_description?: string;
  company_logo?: string;
  metadata?: unknown;
}> {
  authorize(): boolean { return true; }

  rules() {
    return {
      type: 'sometimes|string|in:admin,user,staff',
      gender: 'sometimes|string|in:male,female,other',
      date_of_birth: 'sometimes|date',
      id_number: 'sometimes|string|max:64',
      phone: 'sometimes|string|max:32',
      nationality: 'sometimes|string|max:100',
      city: 'sometimes|string|max:191',
      country: 'sometimes|string|max:191',
      address: 'sometimes|string|max:500',
      zip_code: 'sometimes|string|max:32',
      bio: 'sometimes|string|max:2000',
      avatar_url: 'sometimes|string|max:500',
      headline: 'sometimes|string|max:255',
      skills: 'sometimes|array',
      experience_level: 'sometimes|string|in:entry,mid,senior,executive',
      availability: 'sometimes|string',
      preferred_job_type: 'sometimes|string',
      resume_url: 'sometimes|string|max:500',
      company_name: 'sometimes|string|max:191',
      company_size: 'sometimes|string',
      industry: 'sometimes|string|max:191',
      company_type: 'sometimes|string',
      company_email: 'sometimes|email|max:191',
      company_phone: 'sometimes|string|max:32',
      company_description: 'sometimes|string|max:5000',
      company_logo: 'sometimes|string|max:500',
      metadata: 'sometimes|nullable',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/SetPasswordRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class SetPasswordRequest extends FormRequest<{ password: string; password_confirmation: string }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      password: 'required|string|min:8|confirmed',
      password_confirmation: 'required|string',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/AddRoleRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class AddRoleRequest extends FormRequest<{ role_id: string | number }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      role_id: 'required|exists:roles,id',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/StoreRoleRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class StoreRoleRequest extends FormRequest<{ name: string; slug: string; description?: string }> {
  rules() {
    return {
      name: 'required|string|min:2|max:100',
      slug: 'required|string|min:2|max:100',
      description: 'nullable|string',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/UpdateRoleRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class UpdateRoleRequest extends FormRequest<{ name?: string; slug?: string; description?: string }> {
  rules() {
    return {
      name: 'sometimes|string|min:2|max:100',
      slug: 'sometimes|string|min:2|max:100|unique:roles,slug,' + this.input('role'),
      description: 'nullable|string',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/SyncPermissionsRequest.ts",
    `import { FormRequest } from '@lara-node/core';

export class SyncPermissionsRequest extends FormRequest<{ permission_ids: string[] }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      permission_ids: 'required|array',
      'permission_ids.*': 'required|string|exists:permissions,id',
    };
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Requests/index.ts",
    `export { RegisterRequest } from './RegisterRequest';
export { LoginRequest } from './LoginRequest';
export { StoreUserRequest } from './StoreUserRequest';
export { UpdateUserRequest } from './UpdateUserRequest';
export { UpdateProfileRequest } from './UpdateProfileRequest';
export { SetPasswordRequest } from './SetPasswordRequest';
export { AddRoleRequest } from './AddRoleRequest';
export { StoreRoleRequest } from './StoreRoleRequest';
export { UpdateRoleRequest } from './UpdateRoleRequest';
export { SyncPermissionsRequest } from './SyncPermissionsRequest';
`,
  );

  // ── Controllers ───────────────────────────────────────────────────────────────
  // Add base Controller before controllers
  w(
    dir,
    "src/app/Http/Controllers/Controller.ts",
    `import { getUser } from '@lara-node/auth';
import type { AuthGuard } from '@lara-node/auth';
import { Gate } from '../../Auth/Gate';

type AuthUser = AuthGuard<{ id: number; roles: string[]; permissions: string[] }>;

/*
|--------------------------------------------------------------------------
| Base Controller
|--------------------------------------------------------------------------
|
| All application controllers should extend this class to gain access to
| the authorize() helper, which checks policies registered with the Gate.
|
| Usage in a controller method:
|
|   async show(_req: Request, res: Response, user: User): Promise<void> {
|     this.authorize('view', user);   // throws 403 if denied
|     res.json({ success: true, data: user });
|   }
|
|   async destroy(_req: Request, res: Response, user: User): Promise<void> {
|     this.authorize('delete', user);
|     await user.delete();
|     res.json({ success: true });
|   }
|
*/
export abstract class Controller {
  /**
   * Authorize the current request against a Gate ability/policy.
   * Throws HTTP 401 if unauthenticated, 403 if unauthorized.
   *
   * @param ability  - Gate ability name (e.g. 'update', 'delete') or permission slug.
   * @param subject  - Optional model instance to pass to the policy method.
   */
  protected authorize(ability: string, subject?: unknown): void {
    const user = getUser<AuthUser['model']>();
    if (!user) {
      throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    }
    const allowed = Gate.allows(ability, user as AuthUser['model'], subject);
    if (!allowed) {
      throw Object.assign(new Error('This action is unauthorized'), { status: 403 });
    }
  }
}
`,
  );

  // Gate service
  w(
    dir,
    "src/app/Auth/Gate.ts",
    `/*
|--------------------------------------------------------------------------
| Gate — Policy & Ability Registry
|--------------------------------------------------------------------------
|
| Register abilities (raw callbacks) or bind Model classes to Policy classes.
| Controllers call this.authorize(ability, subject) which delegates here.
|
| Register in a ServiceProvider (e.g. AuthServiceProvider):
|
|   Gate.define('update-profile', (user, subject) => {
|     return (user as { id: number }).id === (subject as { id: number }).id;
|   });
|
|   Gate.policy(User, UserPolicy);
|
*/

type AuthUser = Record<string, unknown> & { id?: unknown; permissions?: string[]; roles?: string[] };
type AbilityCallback = (user: AuthUser, subject?: unknown) => boolean;

const abilities = new Map<string, AbilityCallback>();
const policies = new Map<new (...args: unknown[]) => unknown, new () => Record<string, unknown>>();

export const Gate = {
  /**
   * Register a raw ability callback.
   *
   * @example
   * Gate.define('manage-settings', (user) => (user.roles as string[]).includes('admin'));
   */
  define(ability: string, callback: AbilityCallback): void {
    abilities.set(ability, callback);
  },

  /**
   * Bind a Model class to a Policy class.
   * Policy methods are called with (user, modelInstance).
   *
   * @example
   * Gate.policy(User, UserPolicy);
   * // Then: this.authorize('update', userInstance) calls UserPolicy.update(user, userInstance)
   */
  policy<T>(model: new (...args: unknown[]) => T, policyClass: new () => Record<string, AbilityCallback>): void {
    policies.set(model as new (...args: unknown[]) => unknown, policyClass as new () => Record<string, unknown>);
  },

  /**
   * Check whether the user is allowed to perform \`ability\` on \`subject\`.
   * Resolution order:
   *   1. Explicit ability definition (Gate.define)
   *   2. Policy bound to subject's constructor
   *   3. User permission slug match (fallback)
   */
  allows(ability: string, user: AuthUser, subject?: unknown): boolean {
    // 1. Explicit ability
    if (abilities.has(ability)) {
      return abilities.get(ability)!(user, subject);
    }

    // 2. Policy lookup
    if (subject != null) {
      const PolicyClass = policies.get((subject as object).constructor as new (...args: unknown[]) => unknown);
      if (PolicyClass) {
        const policy = new PolicyClass() as Record<string, unknown>;
        if (typeof policy[ability] === 'function') {
          return (policy[ability] as AbilityCallback)(user, subject);
        }
      }
    }

    // 3. Fallback: check user.permissions array (RBAC)
    const perms = user.permissions ?? [];
    return (perms as string[]).includes(ability);
  },

  denies(ability: string, user: AuthUser, subject?: unknown): boolean {
    return !this.allows(ability, user, subject);
  },
};
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/User/AuthController.ts",
    `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { AuthService } from '@app/Services/index';
import { RegisterRequest, LoginRequest } from '@app/Http/Requests/index';
import { Controller } from '../Controller';

@Injectable()
export class AuthController extends Controller {
  constructor(private readonly authService: AuthService) { super(); }

  @Doc({
    summary: 'Register a new user',
    description: 'Creates a new user account. Optionally accepts a profile object with type (admin|user|staff) and additional profile fields.',
    tags: ['Auth'],
    body: {
      name: { type: 'string', required: true, description: 'Full name (min 2, max 100 chars)' },
      email: { type: 'string', required: true, description: 'Unique email address' },
      password: { type: 'string', required: true, description: 'Password (min 8 chars)' },
      profile: { type: 'object', required: false, description: 'Optional profile data (type, gender, phone, bio, avatar_url, etc.)' },
    },
    responses: [
      { status: 201, description: 'User created — returns user with profile, roles and permissions' },
      { status: 422, description: 'Validation error or email already registered' },
    ],
  })
  async register(req: RegisterRequest, res: Response): Promise<void> {
    const user = await this.authService.register(req.validated());
    res.status(201).json({ success: true, data: user });
  }

  @Doc({
    summary: 'Login and receive a JWT token',
    description: 'Authenticates the user and returns a Bearer token. Pass the token as Authorization: Bearer <token> on subsequent requests.',
    tags: ['Auth'],
    body: {
      email: { type: 'string', required: true, description: 'Email address' },
      password: { type: 'string', required: true, description: 'Password (min 6 chars)' },
    },
    responses: [
      { status: 200, description: 'Returns { token, user }' },
      { status: 401, description: 'Invalid credentials' },
    ],
  })
  async login(req: LoginRequest, res: Response): Promise<void> {
    const { email, password } = req.validated();
    const result = await this.authService.login(email, password);
    res.json({ success: true, data: result });
  }

  @Doc({
    summary: 'Get the authenticated user',
    description: 'Returns the currently authenticated user with their profile, roles and all permissions.',
    tags: ['Auth'],
    auth: true,
    responses: [
      { status: 200, description: 'Current user with profile, roles and permissions' },
      { status: 401, description: 'Unauthenticated' },
    ],
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
import bcrypt from 'bcryptjs';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { UserService } from '@app/Services/index';
import User from '@app/Models/User/User';
import Role from '@app/Models/User/Role';
import {
  StoreUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
  SetPasswordRequest,
  AddRoleRequest,
} from '@app/Http/Requests/index';
import { Controller } from '../Controller';

@Injectable()
export class UserController extends Controller {
  constructor(private readonly userService: UserService) { super(); }

  @Doc({ summary: 'List all users (paginated)', tags: ['Users'], auth: true, params: [{ name: 'page', in: 'query', type: 'integer', description: 'Page number' }] })
  async index(req: Request, res: Response): Promise<void> {
    const data = await this.userService.index(Number(req.query.page) || 1);
    res.json({ success: true, data });
  }

  @Doc({ summary: 'Get a user by ID (route-model binding)', tags: ['Users'], auth: true, params: [{ name: 'user', in: 'path', type: 'integer', description: 'User ID' }], responses: [{ status: 200, description: 'User with profile and roles' }, { status: 404, description: 'Not found' }] })
  async show(_req: Request, res: Response, user: User): Promise<void> {
    res.json({ success: true, data: user });
  }

  @Doc({ summary: "Get a user's profile", tags: ['Users'], auth: true })
  async showProfile(_req: Request, res: Response, user: User): Promise<void> {
    const full = await this.userService.find(user.id) as (User & { profile?: unknown }) | null;
    res.json({ success: true, data: full?.profile ?? null });
  }

  @Doc({ summary: 'Create a new user', tags: ['Users'], auth: true, body: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } } })
  async store(req: StoreUserRequest, res: Response): Promise<void> {
    const user = await this.userService.create(req.validated());
    res.status(201).json({ success: true, data: user });
  }

  @Doc({ summary: 'Update a user', tags: ['Users'], auth: true })
  async update(req: UpdateUserRequest, res: Response, user: User): Promise<void> {
    await user.update({ ...req.validated(), updated_at: new Date() });
    res.json({ success: true, data: user });
  }

  @Doc({ summary: "Update a user's profile", tags: ['Users'], auth: true })
  async updateProfile(req: UpdateProfileRequest, res: Response, user: User): Promise<void> {
    const profile = await this.userService.updateProfile(user.id, req.validated());
    res.json({ success: true, data: profile });
  }

  @Doc({ summary: 'Change user password', tags: ['Users'], auth: true })
  async setPassword(req: SetPasswordRequest, res: Response, user: User): Promise<void> {
    const { password } = req.validated();
    await user.update({ password: await bcrypt.hash(password, 12), updated_at: new Date() });
    res.json({ success: true, message: 'Password updated' });
  }

  @Doc({ summary: 'Send password reset email', tags: ['Users'], auth: true })
  async resetPassword(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Password reset email sent' });
  }

  @Doc({ summary: 'Assign a role to a user', tags: ['Users'], auth: true, body: { role_id: { type: 'integer', description: 'Role ID to assign' } } })
  async addRole(req: AddRoleRequest, res: Response, user: User): Promise<void> {
    const { role_id } = req.validated();
    await user.roles().attach([role_id]);
    res.json({ success: true, data: user });
  }

  @Doc({ summary: 'Remove a role from a user', tags: ['Users'], auth: true })
  async removeRole(_req: Request, res: Response, user: User, role: Role): Promise<void> {
    await user.roles().detach([role.id]);
    res.json({ success: true, message: 'Role removed' });
  }

  @Doc({ summary: 'Delete a user (soft delete)', tags: ['Users'], auth: true })
  async destroy(_req: Request, res: Response, user: User): Promise<void> {
    await user.delete();
    res.json({ success: true, message: 'User deleted' });
  }

  @Doc({ summary: 'Toggle user active/inactive status', tags: ['Users'], auth: true })
  async toggleStatus(_req: Request, res: Response, user: User): Promise<void> {
    const current = user.status;
    await user.update({ status: current === 'active' ? 'inactive' : 'active', updated_at: new Date() });
    res.json({ success: true, data: user });
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/User/ExportController.ts",
    `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { CSV } from '@lara-node/csv';
import { Excel } from '@lara-node/excel';
import { Pdf } from '@lara-node/pdf';
import { Xml } from '@lara-node/xml';
import User from '@app/Models/User/User';
import { WithExportable } from '@app/Traits/WithExportable';
import { Controller } from '../Controller';

/*
|--------------------------------------------------------------------------
| ExportController
|--------------------------------------------------------------------------
|
| Exports users in CSV, Excel, PDF and XML formats.
| Delegates data retrieval to User.toExportable() (WithExportable trait).
|
*/
@Injectable()
export class ExportController extends Controller {
  @Doc({ summary: 'Export users as CSV', tags: ['Exports'], auth: true })
  async csv(_req: Request, res: Response): Promise<void> {
    const exp = (User as unknown as typeof WithExportable).toExportable();
    await CSV.download(exp, 'users.csv', res);
  }

  @Doc({ summary: 'Export users as Excel (.xlsx)', tags: ['Exports'], auth: true })
  async excel(_req: Request, res: Response): Promise<void> {
    const exp = (User as unknown as typeof WithExportable).toExportable();
    await Excel.download(exp, 'users.xlsx', res);
  }

  @Doc({ summary: 'Export users as PDF', tags: ['Exports'], auth: true })
  async pdf(_req: Request, res: Response): Promise<void> {
    const exp = (User as unknown as typeof WithExportable).toExportable();
    const rows = await exp.collection();
    const headings = exp.headings();

    const headerCells = headings.map((h) => \`<th>\${h}</th>\`).join('');
    const bodyRows = rows.map((row) =>
      \`<tr>\${exp.map(row).map((v) => \`<td>\${String(v ?? '')}</td>\`).join('')}</tr>\`,
    ).join('');

    const html = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Users Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #4f46e5; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #4f46e5; color: #fff; padding: 10px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Users Report</h1>
  <p>Generated: \${new Date().toISOString().slice(0, 10)}</p>
  <table>
    <thead><tr>\${headerCells}</tr></thead>
    <tbody>\${bodyRows}</tbody>
  </table>
  <p class="footer">Total: \${rows.length} user(s)</p>
</body>
</html>\`;

    await Pdf.loadHTML(html).download(res, 'users.pdf');
  }

  @Doc({ summary: 'Export users as XML', tags: ['Exports'], auth: true })
  async xml(_req: Request, res: Response): Promise<void> {
    const exp = (User as unknown as typeof WithExportable).toExportable();
    const rows = await exp.collection();
    const headings = exp.headings();

    const builder = Xml.create('users')
      .att('count', String(rows.length))
      .att('generated', new Date().toISOString());

    for (const row of rows) {
      const values = exp.map(row);
      builder.ele('user');
      headings.forEach((heading, i) => {
        const key = heading.toLowerCase().replace(/\\s+/g, '_');
        builder.ele(key).txt(String(values[i] ?? '')).up();
      });
      builder.up();
    }

    Xml.download(res, builder.end({ prettyPrint: true }), 'users.xml');
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/User/RoleController.ts",
    `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { RoleService } from '@app/Services/index';
import Role from '@app/Models/User/Role';
import { StoreRoleRequest, UpdateRoleRequest, SyncPermissionsRequest } from '@app/Http/Requests/index';
import { Controller } from '../Controller';

@Injectable()
export class RoleController extends Controller {
  constructor(private readonly roleService: RoleService) { super(); }

  @Doc({ summary: 'List all roles with permissions', tags: ['Roles'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.roleService.index() });
  }

  @Doc({ summary: 'Get a role by ID (route-model binding)', tags: ['Roles'], auth: true, params: [{ name: 'role', in: 'path', type: 'integer', description: 'Role ID' }], responses: [{ status: 200, description: 'Role with permissions' }, { status: 404, description: 'Not found' }] })
  async show(_req: Request, res: Response, role: Role): Promise<void> {
    res.json({ success: true, data: role });
  }

  @Doc({ summary: 'Create a new role', tags: ['Roles'], auth: true, body: { name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string', required: false } } })
  async store(req: StoreRoleRequest, res: Response): Promise<void> {
    res.status(201).json({ success: true, data: await this.roleService.create(req.validated()) });
  }

  @Doc({ summary: 'Update a role', tags: ['Roles'], auth: true })
  async update(req: UpdateRoleRequest, res: Response, role: Role): Promise<void> {
    await role.update({ ...req.validated(), updated_at: new Date() });
    res.json({ success: true, data: role });
  }

  @Doc({ summary: 'Delete a role (soft delete)', tags: ['Roles'], auth: true })
  async destroy(_req: Request, res: Response, role: Role): Promise<void> {
    await role.delete();
    res.json({ success: true, message: 'Role deleted' });
  }

  @Doc({ summary: 'Sync permissions to a role', tags: ['Roles'], auth: true, body: { permission_ids: { type: 'array', description: 'Array of permission IDs' } } })
  async syncPermissions(req: SyncPermissionsRequest, res: Response, role: Role): Promise<void> {
    const { permission_ids } = req.validated();
    await role.permissions().sync(permission_ids);
    res.json({ success: true, data: role });
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/User/PermissionController.ts",
    `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Route, Doc } from '@lara-node/router';
import { PermissionService } from '@app/Services/index';
import Permission from '@app/Models/User/Permission';
import { Controller } from '../Controller';

@Route('/api/permissions', 'auth', 'must-be-active')
@Injectable()
export class PermissionController extends Controller {
  constructor(private readonly permissionService: PermissionService) { super(); }

  @Route.get('/', 'can:view_permissions')
  @Doc({ summary: 'List all permissions', tags: ['Permissions'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.permissionService.index() });
  }

  @Route.get('/:permission', 'can:view_permissions')
  @Doc({ summary: 'Get a permission by ID (route-model binding)', tags: ['Permissions'], auth: true, params: [{ name: 'permission', in: 'path', type: 'integer', description: 'Permission ID' }], responses: [{ status: 200, description: 'Permission' }, { status: 404, description: 'Not found' }] })
  async show(_req: Request, res: Response, permission: Permission): Promise<void> {
    res.json({ success: true, data: permission });
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
import { Doc } from '@lara-node/router';
import { FileService } from '@app/Services/index';
import FileModel from '@app/Models/File/File';
import { Controller } from '../Controller';

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
export class FileController extends Controller {
  constructor(private readonly fileService: FileService) { super(); }

  @Doc({ summary: 'List all uploaded files', tags: ['Files'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.fileService.index() });
  }

  @Doc({ summary: 'Get file metadata by ID (route-model binding)', tags: ['Files'], auth: true, params: [{ name: 'file', in: 'path', type: 'integer', description: 'File ID' }], responses: [{ status: 200, description: 'File metadata' }, { status: 404, description: 'Not found' }] })
  async show(_req: Request, res: Response, file: FileModel): Promise<void> {
    res.json({ success: true, data: file });
  }

  @Doc({ summary: 'Upload a file (multipart/form-data, field: file)', tags: ['Files'], auth: true, responses: [{ status: 201, description: 'File uploaded' }] })
  async store(req: Request, res: Response): Promise<void> {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
    res.status(201).json({ success: true, data: await this.fileService.store(req.file, req.user!.id) });
  }

  @Doc({ summary: 'Download a file by ID', tags: ['Files'], auth: true })
  async download(_req: Request, res: Response, file: FileModel): Promise<void> {
    res.download(
      file.disk_path,
      file.original_name,
    );
  }

  @Doc({ summary: 'Delete a file (soft delete + remove from disk)', tags: ['Files'], auth: true })
  async destroy(_req: Request, res: Response, file: FileModel): Promise<void> {
    await this.fileService.destroy(file.id);
    res.json({ success: true, message: 'File deleted' });
  }
}
`,
  );

  // ── AppServiceProvider ────────────────────────────────────────────────────────
  const additionalProviders: string[] = [
    `ConfigServiceProvider`,
    `DatabaseServiceProvider`,
    `CacheServiceProvider`,
    `MiddlewareServiceProvider`,
    `RouteServiceProvider`,
    `DocServiceProvider`,
  ];
  if (hasEvents) {
    additionalProviders.push(`EventServiceProvider`);
    additionalProviders.push(`BroadcastServiceProvider`);
  }
  if (hasQueue) additionalProviders.push(`QueueServiceProvider`);
  if (hasMail) additionalProviders.push(`MailServiceProvider`);
  if (hasHorizon) additionalProviders.push(`HorizonServiceProvider`);
  if (hasTelescope) additionalProviders.push(`TelescopeServiceProvider`);

  const appProviderImports: string[] = [
    `import { ServiceProvider, ServiceProviderClass } from '@lara-node/core';`,
    `import { AuthService, UserService, RoleService, PermissionService, FileService } from '@app/Services/index';`,
    `import { ConfigServiceProvider } from './ConfigServiceProvider';`,
    `import { DatabaseServiceProvider } from '@lara-node/db';`,
    `import { CacheServiceProvider } from '@lara-node/cache';`,
    `import { MiddlewareServiceProvider } from './MiddlewareServiceProvider';`,
    `import { RouteServiceProvider } from './RouteServiceProvider';`,
    `import { DocServiceProvider } from '@lara-node/router';`,
  ];
  if (hasEvents) {
    appProviderImports.push(`import { EventServiceProvider } from './EventServiceProvider';`);
    appProviderImports.push(
      `import { BroadcastServiceProvider } from './BroadcastServiceProvider';`,
    );
  }
  if (hasQueue)
    appProviderImports.push(`import { QueueServiceProvider } from './QueueServiceProvider';`);
  if (hasMail)
    appProviderImports.push(`import { MailServiceProvider } from '@lara-node/mail';`);
  if (hasHorizon)
    appProviderImports.push(`import { HorizonServiceProvider } from '@lara-node/horizon';`);
  if (hasTelescope)
    appProviderImports.push(`import { TelescopeServiceProvider } from '@lara-node/telescope';`);

  w(
    dir,
    "src/app/Providers/AppServiceProvider.ts",
    `${appProviderImports.join("\n")}

export class AppServiceProvider extends ServiceProvider {
  /*
  |--------------------------------------------------------------------------
  | Additional Providers
  |--------------------------------------------------------------------------
  |
  | Order matters:
  |   1. ConfigServiceProvider — loads app config files, overrides package defaults
  |   2. MiddlewareServiceProvider — registers aliases ('auth', 'can', 'role')
  |   3. RouteServiceProvider — boots route files (needs middleware aliases ready)
  |
  */
  protected additionalProviders: ServiceProviderClass[] = [
    ${additionalProviders.map((p) => `    ${p},`).join("\n")}
  ];

  register(): void {
    this.registerProviders(this.additionalProviders);

    this.singleton(AuthService);
    this.singleton(UserService);
    this.singleton(RoleService);
    this.singleton(PermissionService);
    this.singleton(FileService);
  }

  boot(): void {}
}
`,
  );

  // ── RouteServiceProvider ──────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Providers/RouteServiceProvider.ts",
    `import { ServiceProvider } from '@lara-node/core';
import RouterBuilder, { registerRouteBuilder } from '@lara-node/router';

/*
|--------------------------------------------------------------------------
| RouteServiceProvider
|--------------------------------------------------------------------------
|
| Two routing styles are supported and both are mounted here:
|
| 1. RouterBuilder (routes/api.ts) — explicit prefix/group route definitions
|    used by most controllers (AuthController, UserController, etc.).
|
| 2. @Route decorators — PermissionController declares its own routes via
|    class/method decorators. Importing the file in routes/api.ts fires the
|    decorators; RouterBuilder.fromControllers() picks them up here.
|
| Web routes (routes/web.ts) are mounted separately on '/'.
|
| registerRouteBuilder() registers each builder with RouteScanner so that
| route:list and docs:generate commands can read all routes.
|
| Route-model binding is handled automatically by modelRegistryMiddleware
| in bootstrap/app.ts — every Model decorated with @Bind() is registered
| when src/app/Models/ is first scanned on the initial request.
|
| To register additional models manually (e.g. from outside Models/):
|   RouterBuilder.registerModel('product', Product);
|
*/
export class RouteServiceProvider extends ServiceProvider {
  register(): void {}

  boot(): void {
    // Load routes/api.ts — builds RouterBuilder routes and fires @Route
    // decorators on PermissionController via its side-effect import.
    const { routesBuilder } = require('../../routes/api') as { routesBuilder: RouterBuilder };

    // registerRouteBuilder: registers with RouteScanner (route:list / docs:generate)
    // AND mounts on the app in one call.
    registerRouteBuilder(routesBuilder, 'api', '/api', this.app);

    // Register @Route-decorated controller routes (PermissionController)
    const controllerRouter = RouterBuilder.fromControllers();
    registerRouteBuilder(controllerRouter, 'api', '/api', this.app);

    // Register and mount web routes
    const { webRoutesBuilder } = require('../../routes/web') as { webRoutesBuilder: RouterBuilder };
    registerRouteBuilder(webRoutesBuilder, 'web', '/', this.app);
    ${hasEvents ? `this.mountChannelRoutes();` : ""}
  }
  ${
    hasEvents
      ? `
  protected mountChannelRoutes(): void {
    const { channelRouter } = require('../../routes/channels');
    this.app.mountRoutes('/broadcasting', channelRouter);
  }`
      : ""
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

    w(
      dir,
      "src/app/Events/index.ts",
      `export * from './UserEvents';\nexport * from './BroadcastEvents';\n`,
    );

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

    // No Listeners/index.ts barrel needed — EventServiceProvider auto-discovers
    // all files in the Listeners/ directory via their @ListensTo decorators.

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

  async handleUserRegistered(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User registered:', payload['email']);
  }

  async handleUserLoggedIn(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User logged in:', payload['email']);
  }

  async handleUserLoggedOut(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User logged out:', payload['userId']);
  }

  async handleAnyUserEvent(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User event:', payload);
  }
}
`,
    );

    // No Subscribers/index.ts barrel needed — EventServiceProvider auto-discovers
    // all files in the Subscribers/ directory via their @Subscriber decorators.

    // ── EventServiceProvider ───────────────────────────────────────────────────
    w(
      dir,
      "src/app/Providers/EventServiceProvider.ts",
      `import path from 'path';
import fs from 'fs';
import { EventServiceProvider as BaseProvider } from '@lara-node/events';

/*
|--------------------------------------------------------------------------
| EventServiceProvider
|--------------------------------------------------------------------------
|
| Extends the framework EventServiceProvider which handles listener/subscriber
| registration and exposes event:list, event:dispatch, event:clear commands.
|
| Listeners/ and Subscribers/ directories are scanned via discoverListeners()
| and discoverSubscribers(). Any class decorated with @ListensTo() or
| @Subscriber() self-registers when its file is loaded — no barrel needed.
|
*/
export class EventServiceProvider extends BaseProvider {
  protected override async discoverListeners(): Promise<void> {
    this.loadDir(path.join(__dirname, '../Listeners'));
  }

  protected override async discoverSubscribers(): Promise<void> {
    this.loadDir(path.join(__dirname, '../Subscribers'));
  }

  private loadDir(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        try { require(path.join(dir, file)); } catch { /* skip */ }
      }
    }
  }
}
`,
    );

    // ── BroadcastServiceProvider ───────────────────────────────────────────────
    w(
      dir,
      "src/app/Providers/BroadcastServiceProvider.ts",
      `import { BroadcastServiceProvider as BaseProvider, Broadcast } from '@lara-node/events';

/*
|--------------------------------------------------------------------------
| BroadcastServiceProvider
|--------------------------------------------------------------------------
|
| Extends the framework BroadcastServiceProvider which registers the
| BroadcastManager and exposes broadcast:* commands.
|
| Define channel authorization rules in channels().
|
*/
export class BroadcastServiceProvider extends BaseProvider {
  protected override channels(): void {
    Broadcast.private('notifications.{userId}', (user: Record<string, unknown> | null, userId: string) => {
      return !!user && String(user['id']) === userId;
    });
    Broadcast.private('user.{userId}', (user: Record<string, unknown> | null, userId: string) => {
      return !!user && String(user['id']) === userId;
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
      "src/app/Jobs/ExampleEmailJob.ts",
      `import { Job, Queueable } from '@lara-node/queue';

/*
|--------------------------------------------------------------------------
| ExampleEmailJob
|--------------------------------------------------------------------------
|
| An example custom queue job. To send mail you usually do NOT need this —
| @lara-node/mail ships its own SendMailJob (registered by MailServiceProvider),
| so 'Mail().to(...).queue(mailable)' just works. Use a job like this only
| when you want custom background work around an email.
|
| @Queueable sets the default queue and retry count for every dispatch.
| Override per-dispatch with fluent methods:
|   ExampleEmailJob.dispatch().onQueue('urgent').tries(5).dispatch();
|
| Conditional dispatch via shouldQueue():
|   shouldQueue() { return !this.payload.suppressEmail; }
|
*/
@Queueable({ queue: 'emails', tries: 3 })
export class ExampleEmailJob extends Job {
  constructor(
    private readonly payload: {
      to: string;
      subject: string;
      body: string;
      template?: string;
      data?: Record<string, unknown>;
    },
  ) { super(); }

  async handle(): Promise<void> {
    console.log(\`[ExampleEmailJob] Sending to \${this.payload.to}: \${this.payload.subject}\`);
    // Use @lara-node/mail directly:
    // const { Mail } = await import('@lara-node/mail');
    // await Mail().to(this.payload.to).send(new WelcomeEmail(this.payload));
  }

  async failed(error: Error): Promise<void> {
    console.error(\`[ExampleEmailJob] Failed for \${this.payload.to}: \${error.message}\`);
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
  // Override shouldQueue() to conditionally dispatch:
  // shouldQueue(): boolean { return someCondition; }
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
    //   await Mail().to(this.config.email).send(new ReportReadyEmail());
    // }

    console.log(\`[GenerateReportJob] \${period} \${type} report complete\`);
  }
}
`,
    );

    w(
      dir,
      "src/app/Jobs/index.ts",
      `export * from './ExampleEmailJob';
export * from './CleanupJob';
export * from './GenerateReportJob';
`,
    );

    w(
      dir,
      "src/app/Providers/QueueServiceProvider.ts",
      `import { QueueServiceProvider as BaseProvider } from '@lara-node/queue';
import { scheduler } from '@lara-node/queue';
import { CleanupJob } from '../Jobs/CleanupJob';
import { GenerateReportJob } from '../Jobs/GenerateReportJob';
import { PermissionsSyncCommand } from '../Console/Commands/PermissionCommands';

/*
|--------------------------------------------------------------------------
| QueueServiceProvider
|--------------------------------------------------------------------------
|
| Extends the framework QueueServiceProvider which registers QueueManager,
| scheduler, and all queue:* / schedule:* commands automatically.
|
| Use boot() to define app-specific scheduled tasks (call super.boot() first).
| Add app-specific commands via commands() (merges with super.commands()).
|
| Schedule API:
|   scheduler.command('permissions:sync').dailyAt('00:05');
|   scheduler.job(CleanupJob).dailyAt('02:00');
|   scheduler.call(() => {}).everyMinute();
|   scheduler.command('cache:clear').cron('0 * * * *');
|
*/
export class QueueServiceProvider extends BaseProvider {
  override commands() {
    return [...super.commands(), PermissionsSyncCommand];
  }

  override boot(): void {
    super.boot();

    scheduler.command('permissions:sync').dailyAt('00:05');
    scheduler.job(CleanupJob).dailyAt('02:00');
    // GenerateReportJob needs constructor args — use scheduler.call() to pass them
    scheduler.call(() => new GenerateReportJob({ type: 'users', period: 'weekly' }).handle()).weekly();
    scheduler.call(() => new GenerateReportJob({ type: 'activity', period: 'monthly' }).handle()).monthlyOn(1, '06:00');
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
      const Permission = require('../../Models/User/Permission').default;
      const Role = require('../../Models/User/Role').default;
      const now = new Date();
      let created = 0, updated = 0;
      const syncedPerms: Array<{ id?: number }> = [];

      for (const p of PERMISSIONS) {
        let perm = await Permission.where('slug', p.slug).first();
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

      let adminRole = await Role.where('slug', 'admin').first();
      if (!adminRole && !dryRun) {
        adminRole = await Role.create({ name: 'Admin', slug: 'admin', description: 'Administrator role', created_at: now, updated_at: now });
      }

      if (!dryRun && adminRole && syncedPerms.length) {
        const permIds = syncedPerms.map((p) => p?.id).filter(Boolean) as number[];
        try { await adminRole.permissions().sync(permIds); }
        catch { await adminRole.permissions().attach(permIds); }
      }

      this.info(\`Created: \${created}, Updated: \${updated}, Total: \${PERMISSIONS.length}\`);
    } catch (err) {
      this.error(\`Failed: \${(err as Error).message}\`); process.exit(1);
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
import { FileController, multerUpload } from '../app/Http/Controllers/File/FileController';
import { ExportController } from '../app/Http/Controllers/User/ExportController';
// PermissionController uses @Route decorators — import triggers auto-registration
import '../app/Http/Controllers/User/PermissionController';

export const routesBuilder = new RouterBuilder();
const rb = routesBuilder;

rb.prefix('/auth').group((g: RouterBuilder) => {
  g.post('/register', [AuthController, 'register']);
  g.post('/login', [AuthController, 'login']);
  g.get('/me', 'auth', [AuthController, 'me']);
});

// :user — route-model binding auto-resolves to User model instance
rb.prefix('/users').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_users', [UserController, 'index']);
  g.get('/:user', 'can:view_users', [UserController, 'show']);
  g.get('/:user/profile', [UserController, 'showProfile']);
  g.post('/', 'can:create_users', [UserController, 'store']);
  g.put('/:user', 'can:update_users', [UserController, 'update']);
  g.put('/:user/profile', [UserController, 'updateProfile']);
  g.post('/:user/password', 'can:update_users', [UserController, 'setPassword']);
  g.post('/:user/password/reset', [UserController, 'resetPassword']);
  g.post('/:user/roles', 'can:add_roles_to_users', [UserController, 'addRole']);
  g.delete('/:user/roles/:role', 'can:remove_roles_from_users', [UserController, 'removeRole']);
  g.delete('/:user', 'can:delete_users', [UserController, 'destroy']);
  g.patch('/:user/status', 'can:activate_and_deactivate_users', [UserController, 'toggleStatus']);
});

// :role — route-model binding auto-resolves to Role model instance
rb.prefix('/roles').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_roles', [RoleController, 'index']);
  g.get('/:role', 'can:view_roles', [RoleController, 'show']);
  g.post('/', 'can:create_roles', [RoleController, 'store']);
  g.put('/:role', 'can:update_roles', [RoleController, 'update']);
  g.delete('/:role', 'can:delete_roles', [RoleController, 'destroy']);
  g.post('/:role/permissions', 'can:add_permissions_to_roles', [RoleController, 'syncPermissions']);
});

// Exports — CSV, Excel, PDF, XML
rb.prefix('/users/export').middleware(['auth', 'must-be-active', 'can:view_users']).group((g: RouterBuilder) => {
  g.get('/csv',   [ExportController, 'csv']);
  g.get('/excel', [ExportController, 'excel']);
  g.get('/pdf',   [ExportController, 'pdf']);
  g.get('/xml',   [ExportController, 'xml']);
});

// :file — route-model binding auto-resolves to File model instance
rb.prefix('/files').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_files', [FileController, 'index']);
  g.get('/:file', 'can:view_files', [FileController, 'show']);
  g.get('/:file/download', 'can:view_files', [FileController, 'download']);
  g.post('/', multerUpload.single('file'), 'can:upload_files', [FileController, 'store']);
  g.delete('/:file', 'can:delete_files', [FileController, 'destroy']);
});

export default rb;
`,
  );

  w(
    dir,
    "src/routes/web.ts",
    `import { Request, Response } from 'express';
import RouterBuilder from '@lara-node/router';

export const webRoutesBuilder = new RouterBuilder();
const rb = webRoutesBuilder;

rb.get('/', (_req: Request, res: Response) => {
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
    `import type { MigrationSchema, TableBuilder } from '@lara-node/db';

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
    `import type { MigrationSchema, TableBuilder } from '@lara-node/db';

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
    `import type { MigrationSchema, TableBuilder } from '@lara-node/db';

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
    `import type { MigrationSchema, TableBuilder } from '@lara-node/db';

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
    `import type { MigrationSchema, TableBuilder } from '@lara-node/db';

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
    `import type { MigrationSchema, TableBuilder } from '@lara-node/db';

export class CreateUserProfilesTable {
  async up(schema: MigrationSchema): Promise<void> {
    await schema.createTable('user_profiles', (table: TableBuilder) => {
      table.increments('id');
      table.integer('user_id').notNullable();

      // ── Common ───────────────────────────────────────────────────────────────
      table.string('type', 32).nullable();         // admin | user | staff
      table.string('gender', 32).nullable();       // male | female | other
      table.datetime('date_of_birth').nullable();
      table.string('id_number', 64).nullable();
      table.string('phone', 32).nullable();
      table.string('nationality', 100).nullable();
      table.string('city', 191).nullable();
      table.string('country', 191).nullable();
      table.string('address', 500).nullable();
      table.string('zip_code', 32).nullable();
      table.text('bio').nullable();
      table.string('avatar_url', 500).nullable();

      // ── Extended — leave populated as the app grows ──────────────────────────
      table.string('headline', 255).nullable();
      table.text('skills').nullable();             // JSON array
      table.string('experience_level', 32).nullable();
      table.string('availability', 32).nullable();
      table.string('preferred_job_type', 64).nullable();
      table.string('resume_url', 500).nullable();

      table.string('company_name', 191).nullable();
      table.string('company_size', 32).nullable();
      table.string('industry', 191).nullable();
      table.string('company_type', 64).nullable();
      table.string('company_email', 191).nullable();
      table.string('company_phone', 32).nullable();
      table.text('company_description').nullable();
      table.string('company_logo', 500).nullable();

      // ── Extra ─────────────────────────────────────────────────────────────────
      table.text('metadata').nullable();           // JSON object for anything else

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
    `import type { MigrationSchema, TableBuilder } from '@lara-node/db';

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
  async run(): Promise<{ adminRole: Role; userRole: Role; staffRole: Role; permIds: number[] }> {
    const now = new Date();
    console.log('  Seeding roles...');

    const adminRole = (await Role.where('slug', 'admin').first() as Role | null)
      ?? await Role.create({ name: 'Admin', slug: 'admin', description: 'Administrator with full access', created_at: now, updated_at: now }) as Role;

    const userRole = (await Role.where('slug', 'user').first() as Role | null)
      ?? await Role.create({ name: 'User', slug: 'user', description: 'Regular user', created_at: now, updated_at: now }) as Role;

    const staffRole = (await Role.where('slug', 'staff').first() as Role | null)
      ?? await Role.create({ name: 'Staff', slug: 'staff', description: 'Staff member with elevated access', created_at: now, updated_at: now }) as Role;

    console.log('  Seeding permissions...');
    const permIds: number[] = [];
    for (const p of PERMISSIONS) {
      const perm = (await Permission.where('slug', p.slug).first() as Permission | null)
        ?? await Permission.create({ name: p.name, slug: p.slug, created_at: now, updated_at: now }) as Permission;
      const id = perm.id | undefined;
      if (id) permIds.push(id);
    }

    try { await adminRole.permissions().sync(permIds); }
    catch { await adminRole.permissions().attach(permIds); }

    console.log(\`  ✓ \${PERMISSIONS.length} permissions synced to admin role\`);
    return { adminRole, userRole, staffRole, permIds };
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

const syncRole = async (user: User, roleId: number): Promise<void> => {
  try { await user.roles().sync([roleId]); } catch { await user.roles().attach(roleId); }
};

export class UserSeeder {
  async run(adminRoleId: number, userRoleId: number, staffRoleId: number): Promise<void> {
    const now = new Date();
    console.log('  Seeding users...');

    const createUser = async (name: string, email: string, type: string): Promise<User> => {
      const existing = await User.where('email', email).first() as User | null;
      if (existing) return existing;
      const user = await User.create({
        name, email,
        password: await bcrypt.hash('password', 12),
        status: 'active',
        created_at: now, updated_at: now,
      }) as User;
      await UserProfile.create({ user_id: user.id, type, created_at: now, updated_at: now });
      return user;
    };

    const admin = await createUser('Admin', 'admin@example.com', 'admin');
    const staff = await createUser('Staff', 'staff@example.com', 'staff');
    const regularUser = await createUser('User', 'user@example.com', 'user');

    await syncRole(admin, adminRoleId);
    await syncRole(staff, staffRoleId);
    await syncRole(regularUser, userRoleId);

    console.log('  ✓ Users seeded:');
    console.log('    admin@example.com    (password: password) — Admin role');
    console.log('    staff@example.com    (password: password) — Staff role');
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

    const { adminRole, userRole, staffRole } = await new RolePermissionSeeder().run();
    await new UserSeeder().run(
      adminRole.id,
      userRole.id,
      staffRole.id,
    );

    console.log('DatabaseSeeder complete');
  }
}

// Allow running directly: node -r @swc-node/register -r tsconfig-paths/register src/database/seeders/DatabaseSeeder.ts
if (require.main === module) {
  new DatabaseSeeder().run().catch((err: Error) => {
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
    `export const APP_NAME = process.env.APP_NAME || '${name}';
export const APP_ENV = process.env.APP_ENV || 'local';
export const APP_KEY = process.env.APP_KEY || '';
export const APP_DEBUG = process.env.APP_DEBUG === 'true';
export const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export const CACHE_DRIVER = (process.env.CACHE_DRIVER || 'file').toLowerCase();
export const CACHE_PREFIX = process.env.CACHE_PREFIX || APP_NAME;

export const DOCS_ENABLED = (() => {
  const flag = process.env.DOCS_ENABLED;
  if (flag !== undefined) return flag.toLowerCase() === 'true' || flag === '1';
  return process.env.NODE_ENV !== 'production';
})();
export const DOCS_TITLE = process.env.DOCS_TITLE || '${name} API';
export const DOCS_VERSION = process.env.DOCS_VERSION || '1.0.0';
export const DOCS_PATH = process.env.DOCS_PATH || '/docs';
export const DOCS_THEME = process.env.DOCS_THEME || 'kepler';

export default {
  name: APP_NAME,
  env: APP_ENV,
  debug: APP_DEBUG,
  url: APP_URL,
  key: APP_KEY,
  cache: {
    driver: CACHE_DRIVER,
    prefix: CACHE_PREFIX,
  },
  docs: {
    enabled: DOCS_ENABLED,
    title: DOCS_TITLE,
    version: DOCS_VERSION,
    path: DOCS_PATH,
    theme: DOCS_THEME,
  },
};
`,
  );

  const dbConfigContent =
    opts.database === "mysql"
      ? `const dbName = '${name.replace(/-/g, "_")}';

export const dbConfig = {
  connection: process.env.DB_CONNECTION || 'mysql',
  // ── MySQL ──────────────────────────────────────────────────────────────────
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || dbName,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  pool: {
    limit: Number(process.env.DB_POOL_LIMIT) || 10,
  },
  // Set DB_SOCKET_PATH (or DB_SOCKET) to use a Unix socket instead of host/port.
  // Common paths: /var/run/mysqld/mysqld.sock  /tmp/mysql.sock
  socketPath: process.env.DB_SOCKET_PATH || process.env.DB_SOCKET || undefined,
};
`
      : `const dbName = '${name.replace(/-/g, "_")}';

export const dbConfig = {
  connection: process.env.DB_CONNECTION || 'mongodb',
  // ── MongoDB ────────────────────────────────────────────────────────────────
  // MONGO_URI takes precedence over host/port when set.
  uri:      process.env.MONGO_URI || process.env.MONGODB_URI
              || \`mongodb://\${process.env.DB_HOST || '127.0.0.1'}:\${process.env.DB_PORT || 27017}\`,
  database: process.env.DB_NAME || dbName,
  // Replica set: set MONGO_REPLICA_SET to the set name to enable replica-set mode.
  replicaSet:         process.env.MONGO_REPLICA_SET             || undefined,
  // directConnection: 'true' for standalone, 'false' for replica set (auto if unset).
  directConnection:   process.env.MONGO_DIRECT_CONNECTION       || undefined,
  // retryWrites: 'true' for replica set, 'false' for standalone (auto if unset).
  retryWrites:        process.env.MONGO_RETRY_WRITES            || undefined,
  serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
};
`;

  w(
    dir,
    "src/config/db.config.ts",
    dbConfigContent +
      `
export async function initDatabase() {
  const { initDatabase: init } = await import('@lara-node/db');
  return init();
}

export default dbConfig;
`,
  );

  w(
    dir,
    "src/config/mail.config.ts",
    `export interface MailerConfig {
  transport: 'smtp' | 'log' | 'array';
  host?: string;
  port?: number;
  encryption?: 'tls' | 'ssl' | null;
  username?: string;
  password?: string;
  timeout?: number;
}

export interface MailConfig {
  default: string;
  mailers: Record<string, MailerConfig>;
  from: { address: string; name: string };
}

const mailConfig: MailConfig = {
  default: process.env.MAIL_MAILER || 'smtp',

  mailers: {
    smtp: {
      transport: 'smtp',
      host: process.env.MAIL_HOST || 'smtp.mailgun.org',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      encryption: (process.env.MAIL_ENCRYPTION as 'tls' | 'ssl' | null) || 'tls',
      username: process.env.MAIL_USERNAME || '',
      password: process.env.MAIL_PASSWORD || '',
      timeout: parseInt(process.env.MAIL_TIMEOUT || '30', 10),
    },
    log: {
      transport: 'log',
    },
    array: {
      transport: 'array',
    },
  },

  from: {
    address: process.env.MAIL_FROM_ADDRESS || 'hello@example.com',
    name: process.env.MAIL_FROM_NAME || '${name}',
  },
};

export default mailConfig;
`,
  );

  w(
    dir,
    "src/config/queue.config.ts",
    `export interface QueueConfig {
  default: string;
  connections: Record<string, { driver: string; table?: string; queue?: string; retry_after?: number }>;
  failed: { driver: string; table: string };
}

const queueConfig: QueueConfig = {
  default: process.env.QUEUE_CONNECTION || 'sync',

  connections: {
    sync: { driver: 'sync' },
    database: { driver: 'database', table: 'jobs', queue: 'default', retry_after: 90 },
    redis: {
      driver: 'redis',
      queue: process.env.REDIS_QUEUE || 'default',
      retry_after: 90,
    },
  },

  failed: { driver: 'database', table: 'failed_jobs' },
};

export const QUEUE_CONNECTION = queueConfig.default;
export default queueConfig;
`,
  );

  if (hasEvents) {
    w(
      dir,
      "src/config/broadcasting.config.ts",
      `export interface BroadcastingConfig {
  default: string;
  connections: {
    websocket: { driver: 'websocket'; path: string; pingInterval: number; pingTimeout: number };
    redis: { driver: 'redis'; connection: string };
    log: { driver: 'log' };
    null: { driver: 'null' };
  };
  auth: { endpoint: string; headerName: string };
}

export const broadcastingConfig: BroadcastingConfig = {
  default: process.env.BROADCAST_DRIVER || 'websocket',
  connections: {
    websocket: {
      driver: 'websocket',
      path: process.env.BROADCAST_WEBSOCKET_PATH || '/ws',
      pingInterval: parseInt(process.env.BROADCAST_PING_INTERVAL || '25000', 10),
      pingTimeout: parseInt(process.env.BROADCAST_PING_TIMEOUT || '20000', 10),
    },
    redis: { driver: 'redis', connection: process.env.BROADCAST_REDIS_CONNECTION || 'default' },
    log: { driver: 'log' },
    null: { driver: 'null' },
  },
  auth: {
    endpoint: process.env.BROADCAST_AUTH_ENDPOINT || '/broadcasting/auth',
    headerName: process.env.BROADCAST_AUTH_HEADER || 'Authorization',
  },
};

export default broadcastingConfig;
`,
    );
  }

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
│   ├── Auth/
│   │   └── Gate.ts             # Policy & ability registry (Gate.define / Gate.policy)
│   ├── Console/
│   │   ├── Commands/           # Artisan commands (auto-discovered + provider-declared)
│   │   └── Kernel.ts           # ConsoleKernel — collects commands from service providers
│   ├── Events/                 # Event classes
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.ts   # Base controller with authorize() helper
│   │   │   ├── User/           # Auth, User, Role, Permission controllers (@Route decorated)
│   │   │   └── File/           # File upload controller
│   │   ├── Kernel.ts           # Global middleware stack
│   │   └── Requests/           # FormRequest validation classes
│   ├── Jobs/                   # Queueable jobs
│   ├── Listeners/              # @ListensTo decorated listeners (auto-discovered)
│   ├── Mail/                   # Mailable classes
│   ├── Middleware/             # Custom middleware classes
│   ├── Models/                 # Eloquent-style ORM models
│   │   ├── User/               # User, Role, Permission, UserProfile, pivot models
│   │   └── File/               # File model
│   ├── Observers/              # Model observers (@Observe decorated)
│   ├── Policies/               # Policy classes (Gate.policy(Model, PolicyClass))
│   │   └── UserPolicy.ts       # Example policy
│   ├── Providers/              # Service providers
│   │   ├── AppServiceProvider.ts       # Root provider — registers all sub-providers
│   │   ├── ConfigServiceProvider.ts    # Loads config files first
│   │   ├── MiddlewareServiceProvider.ts # Named middleware aliases (auth, can, role)
│   │   ├── RouteServiceProvider.ts     # RouterBuilder.fromControllers() + mountRoutes
│   │   ├── EventServiceProvider.ts     # Auto-discovers Listeners/ + Subscribers/
│   │   ├── BroadcastServiceProvider.ts # Broadcasting channel auth
│   │   └── QueueServiceProvider.ts     # Schedule definitions + app commands
│   ├── Services/               # Business logic layer
│   └── Subscribers/            # @Subscriber decorated subscribers (auto-discovered)
├── bootstrap/
│   └── app.ts                  # Boot sequence + package auto-discovery (laraNode.providers)
├── config/                     # App and DB configuration
├── database/
│   ├── migrations/             # Class-based migrations (001–007)
│   └── seeders/                # RolePermission, User, Database seeders
├── routes/
│   ├── api.ts                  # Imports controllers so @Route decorators register
│   ├── web.ts                  # Web routes (/)
│   └── channels.ts             # Broadcasting channel auth
├── types/
│   └── express.d.ts            # Express type augmentations
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
| staff@example.com | password | Staff |
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
import { ExampleEmailJob } from '@app/Jobs/ExampleEmailJob';

// Dispatch a job
await Queue.push(new ExampleEmailJob({ to: 'user@example.com', subject: 'Hello', body: 'World' }));

// Dispatch with delay (seconds)
await Queue.later(300, new ExampleEmailJob({ to: 'user@example.com', subject: 'Hello', body: 'World' }));
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

## Routing with @Route Decorators

Routes are declared directly on controller classes:

\`\`\`typescript
import { Route, Doc } from '@lara-node/router';
import { Injectable } from '@lara-node/core';
import { Controller } from './Controller';

@Route('/api/products', 'auth', 'must-be-active') // class-level middleware
@Injectable()
export class ProductController extends Controller {
  @Route.get('/', 'can:view_products')
  async index(_req: Request, res: Response): Promise<void> { ... }

  @Route.post('/', 'can:create_products')
  async store(req: Request, res: Response): Promise<void> { ... }

  @Route.put('/:product')          // :product auto-resolves via @Bind() on Product model
  async update(_req: Request, res: Response, product: Product): Promise<void> {
    this.authorize('update', product);  // checks UserPolicy.update(authUser, product)
    ...
  }
}
\`\`\`

Add the controller import to \`src/routes/api.ts\` for auto-registration:
\`\`\`typescript
import '../app/Http/Controllers/ProductController';
\`\`\`

## Authorization — Gate & Policies

\`\`\`typescript
// src/app/Policies/ProductPolicy.ts
export class ProductPolicy {
  update(user: AuthUser, product: Product): boolean {
    return user.id === product.user_id || user.roles.includes('admin');
  }
}

// Register in a ServiceProvider:
Gate.policy(Product, ProductPolicy);

// In a controller method:
this.authorize('update', product);  // throws 403 if denied
\`\`\`

## Custom Middleware

\`\`\`typescript
// src/app/Middleware/ThrottleMiddleware.ts
export class ThrottleMiddleware {
  handle(req, res, next): void { /* ... */ }
  toHandler() { return (req, res, next) => this.handle(req, res, next); }
}

// Register in MiddlewareServiceProvider:
this.middlewareAlias('throttle', (...args) => new ThrottleMiddleware(Number(args[0]) || 60).toHandler());

// Use on route decorator:
@Route.post('/login', 'throttle:10')
\`\`\`

## Package Auto-discovery

Third-party packages can auto-register their service providers by adding a \`laraNode\` key to their \`package.json\`:

\`\`\`json
{
  "laraNode": {
    "providers": ["./dist/MyServiceProvider.js"],
    "publish": [
      { "tag": "config", "from": "config/my.config.ts", "to": "config/my.config.ts" }
    ]
  }
}
\`\`\`

Providers are discovered at boot time — no manual registration needed. Run \`pnpm artisan vendor:publish\` to copy their publishable files.

## Environment Variables

### App

| Variable | Default | Description |
|---|---|---|
| \`APP_ENV\` | \`local\` | Application environment |
| \`PORT\` | \`3000\` | HTTP server port |
| \`JWT_SECRET\` | — | **Required in production** |
| \`JWT_EXPIRES_IN\` | \`7d\` | Token expiry |

### Database — common

| Variable | Default | Description |
|---|---|---|
| \`DB_CONNECTION\` | \`${opts.database}\` | Driver: \`mysql\` or \`mongodb\` |
| \`DB_NAME\` | \`${name.replace(/-/g, "_")}\` | Database / schema name |
| \`SKIP_DB\` | — | Set to \`1\` to skip DB init in CI/test |

${
  opts.database === "mysql"
    ? `### Database — MySQL

| Variable | Default | Description |
|---|---|---|
| \`DB_HOST\` | \`127.0.0.1\` | Host |
| \`DB_PORT\` | \`3306\` | Port |
| \`DB_USER\` | \`root\` | Username |
| \`DB_PASSWORD\` | _(empty)_ | Password |
| \`DB_POOL_LIMIT\` | \`10\` | Connection pool size |
| \`DB_SOCKET_PATH\` | — | Unix socket path (overrides host/port) |`
    : `### Database — MongoDB

| Variable | Default | Description |
|---|---|---|
| \`MONGO_URI\` | — | Full connection string (preferred) |
| \`DB_HOST\` | \`127.0.0.1\` | Used to build default URI |
| \`DB_PORT\` | \`27017\` | Used to build default URI |
| \`MONGO_REPLICA_SET\` | — | Replica set name |
| \`MONGO_DIRECT_CONNECTION\` | auto | \`true\` / \`false\` |
| \`MONGO_RETRY_WRITES\` | auto | \`true\` / \`false\` |
| \`MONGO_SERVER_SELECTION_TIMEOUT_MS\` | \`10000\` | Timeout in ms |`
}

### Mail / Queue / Broadcast

| Variable | Default | Description |
|---|---|---|
| \`MAIL_DRIVER\` | \`log\` | Mail driver (log, smtp) |
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

  console.log(
    `  ${pc.dim("Scaffolded:")} models, services, controllers, kernel, routes, migrations, seeders, observers, events, listeners, subscribers, commands, mail, jobs, scheduler, README`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
