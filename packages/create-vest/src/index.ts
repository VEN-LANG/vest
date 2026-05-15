#!/usr/bin/env node
/**
 * create-vest
 *
 * Usage:
 *   pnpm create vest
 *   pnpm create vest my-api
 *   node packages/create-vest/dist/index.js my-api
 */

import { existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import pc from "picocolors";
import prompts from "prompts";

const VEST_VERSION = "0.1.0";

async function main() {
  console.log(
    `\n${pc.bold(pc.cyan("  Vest"))} ${pc.dim("— Laravel-inspired Node.js framework")}\n`,
  );

  const argName = process.argv[2];

  const answers = await prompts(
    [
      {
        type: argName ? null : "text",
        name: "projectName",
        message: "Project name:",
        initial: "my-vest-app",
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
        message: "Optional packages:",
        choices: [
          { title: "@vest-ts/events  (events + broadcasting)", value: "events", selected: true },
          { title: "@vest-ts/queue   (job queue + scheduler)", value: "queue", selected: true },
          { title: "@vest-ts/mail    (mail drivers)", value: "mail", selected: true },
          { title: "@vest-ts/horizon (queue dashboard)", value: "horizon", selected: false },
          { title: "@vest-ts/telescope (debug dashboard)", value: "telescope", selected: false },
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
  console.log(`    ${pc.cyan("pnpm artisan migrate")}`);
  console.log(`    ${pc.cyan("pnpm dev")}\n`);
}

function scaffold(dir: string, name: string, opts: { database: string; packages: string[] }): void {
  mkdirSync(dir, { recursive: true });

  const extraDeps: Record<string, string> = {};
  const vestDeps: string[] = [
    "@vest-ts/core",
    "@vest-ts/db",
    "@vest-ts/router",
    "@vest-ts/auth",
    "@vest-ts/console",
  ];

  for (const pkg of opts.packages) {
    vestDeps.push(`@vest-ts/${pkg}`);
  }

  const packageJson = {
    name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "tsx watch src/server.ts",
      start: "node dist/server.js",
      build: "tsdown src/server.ts src/artisan.ts --format esm --out-dir dist",
      artisan: "tsx src/artisan.ts",
      migrate: "tsx src/artisan.ts migrate",
      "migrate:fresh": "tsx src/artisan.ts migrate:fresh",
      test: "vitest run",
      lint: "oxlint src",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      ...Object.fromEntries(vestDeps.map((p) => [p, `^${VEST_VERSION}`])),
      "reflect-metadata": "^0.2.2",
      dotenv: "^17.2.3",
      express: "^5.2.1",
      cors: "^2.8.5",
      ...(opts.database === "mysql" ? { mysql2: "^3.16.0" } : { mongodb: "^7.0.0" }),
      ...extraDeps,
    },
    devDependencies: {
      "@types/node": "^24.12.2",
      "@types/express": "^5.0.6",
      oxlint: "^0.16.6",
      oxfmt: "^0.47.0",
      tsdown: "^0.12.9",
      tsx: "^4.19.0",
      typescript: "^5.9.3",
      vitest: "^3.2.3",
    },
  };

  writeFileSync(join(dir, "package.json"), JSON.stringify(packageJson, null, 2));

  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
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

  writeFileSync(
    join(dir, ".env.example"),
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
      "CACHE_DRIVER=file",
      "QUEUE_CONNECTION=sync",
      "MAIL_DRIVER=log",
      "BROADCAST_DRIVER=null",
    ].join("\n"),
  );

  writeFileSync(join(dir, ".gitignore"), "node_modules\ndist\n.env\n*.log\n");

  // Create src directory structure
  const dirs = [
    "src/app/Console/Commands",
    "src/app/Controllers",
    "src/app/Events",
    "src/app/Jobs",
    "src/app/Listeners",
    "src/app/Mail",
    "src/app/Middleware",
    "src/app/Models",
    "src/app/Providers",
    "src/app/Services",
    "src/bootstrap",
    "src/config",
    "src/database/migrations",
    "src/database/seeders",
    "src/routes",
  ];

  for (const d of dirs) mkdirSync(join(dir, d), { recursive: true });

  // server.ts
  writeFileSync(
    join(dir, "src/server.ts"),
    `import 'reflect-metadata';
import 'dotenv/config';
import { startApplication } from './bootstrap/app.js';

startApplication();
`,
  );

  // artisan.ts
  writeFileSync(
    join(dir, "src/artisan.ts"),
    `#!/usr/bin/env node
import 'reflect-metadata';
import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Kernel } from '@vest-ts/console';

async function main() {
  const kernel = new Kernel();
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

  // bootstrap/app.ts
  writeFileSync(
    join(dir, "src/bootstrap/app.ts"),
    `import { container, Application } from '@vest-ts/core';
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js';
import { RouteServiceProvider } from '../app/Providers/RouteServiceProvider.js';

export const app = new Application(container);

export async function startApplication(): Promise<void> {
  const port = process.env.PORT ?? 3000;

  app.register(AppServiceProvider);
  app.register(RouteServiceProvider);

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

  // AppServiceProvider
  writeFileSync(
    join(dir, "src/app/Providers/AppServiceProvider.ts"),
    `import { ServiceProvider } from '@vest-ts/core';

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    // Bind services into the container here
  }

  async boot(): Promise<void> {
    // Boot logic after all providers have registered
  }
}
`,
  );

  // RouteServiceProvider
  writeFileSync(
    join(dir, "src/app/Providers/RouteServiceProvider.ts"),
    `import { ServiceProvider } from '@vest-ts/core';
import { apiRouter } from '../routes/api.js';

export class RouteServiceProvider extends ServiceProvider {
  register(): void {}

  boot(): void {
    this.app.mountRoutes('/api', apiRouter());
  }
}
`,
  );

  // routes/api.ts
  writeFileSync(
    join(dir, "src/routes/api.ts"),
    `import { Router } from 'express';

export function apiRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ message: 'Welcome to ${name}' });
  });

  return router;
}
`,
  );

  // vite.config.ts (Vite+ for the app)
  writeFileSync(
    join(dir, "vite.config.ts"),
    `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
`,
  );

  console.log(
    `  ${pc.dim("Created:")} ${Object.entries({
      "src/server.ts": "Application entry point",
      "src/artisan.ts": "CLI entry point",
      "src/bootstrap/app.ts": "Bootstrap & service providers",
      "src/routes/api.ts": "API routes",
      ".env.example": "Environment template",
    })
      .map(([f, d]) => `\n    ${pc.green(f)} ${pc.dim(d)}`)
      .join("")}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
