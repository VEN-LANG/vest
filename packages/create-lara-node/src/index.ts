#!/usr/bin/env node
/**
 * create-lara-node
 *
 * Usage:
 *   pnpm create lara-node
 *   pnpm create lara-node my-api
 *   node packages/create-lara-node/dist/index.js my-api
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
        message: "Optional packages:",
        choices: [
          { title: "@lara-node/events  (events + broadcasting)", value: "events", selected: true },
          { title: "@lara-node/queue   (job queue + scheduler)", value: "queue", selected: true },
          { title: "@lara-node/mail    (mail drivers)", value: "mail", selected: true },
          { title: "@lara-node/horizon (queue dashboard)", value: "horizon", selected: false },
          { title: "@lara-node/telescope (debug dashboard)", value: "telescope", selected: false },
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
  console.log(`    ${pc.cyan("pnpm artisan permissions:sync")}`);
  console.log(`    ${pc.cyan("pnpm dev")}\n`);
}

function w(dir: string, file: string, content: string): void {
  writeFileSync(join(dir, file), content);
}

function d(dir: string, path: string): void {
  mkdirSync(join(dir, path), { recursive: true });
}

function scaffold(dir: string, name: string, opts: { database: string; packages: string[] }): void {
  mkdirSync(dir, { recursive: true });

  const hasEvents = opts.packages.includes("events");
  const hasQueue = opts.packages.includes("queue");
  const hasMail = opts.packages.includes("mail");
  const hasHorizon = opts.packages.includes("horizon");
  const hasTelescope = opts.packages.includes("telescope");

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
    laraNodeDeps.push(`@lara-node/${pkg}`);
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
      ...Object.fromEntries(laraNodeDeps.map((p) => [p, `^${LARA_NODE_VERSION}`])),
      "reflect-metadata": "^0.2.2",
      dotenv: "^17.2.3",
      express: "^5.2.1",
      cors: "^2.8.5",
      jsonwebtoken: "^9.0.2",
      bcryptjs: "^3.0.2",
      multer: "^2.0.1",
      ...(opts.database === "mysql" ? { mysql2: "^3.16.0" } : { mongodb: "^7.0.0" }),
    },
    devDependencies: {
      "@types/node": "^24.12.2",
      "@types/express": "^5.0.6",
      "@types/jsonwebtoken": "^9.0.9",
      "@types/bcryptjs": "^2.4.6",
      "@types/multer": "^1.4.12",
      oxlint: "^0.16.6",
      tsdown: "^0.12.9",
      tsx: "^4.19.0",
      typescript: "^5.9.3",
      vitest: "^3.2.3",
    },
  };

  w(dir, "package.json", JSON.stringify(packageJson, null, 2));

  w(
    dir,
    "tsconfig.json",
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

  // ── Directory structure ──────────────────────────────────────────────────────
  const dirs = [
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
    "src/app/Providers",
    "src/app/Services",
    "src/app/Subscribers",
    "src/bootstrap",
    "src/config",
    "src/database/migrations",
    "src/database/seeders",
    "src/routes",
    "uploads/files",
  ];
  for (const dd of dirs) d(dir, dd);

  // ── server.ts ────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/server.ts",
    `import 'reflect-metadata';
import 'dotenv/config';
import { startApplication } from './bootstrap/app.js';

startApplication();
`,
  );

  // ── artisan.ts ───────────────────────────────────────────────────────────────
  w(
    dir,
    "src/artisan.ts",
    `#!/usr/bin/env node
import 'reflect-metadata';
import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Kernel } from '@lara-node/console';
import { app, bootForConsole } from './bootstrap/app.js';

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

  // ── bootstrap/app.ts ─────────────────────────────────────────────────────────
  const providerImports: string[] = [
    `import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js';`,
    `import { RouteServiceProvider } from '../app/Providers/RouteServiceProvider.js';`,
  ];
  const bootProviders: string[] = [
    `  app.register(AppServiceProvider);`,
  ];
  const startProviders: string[] = [
    `  app.register(AppServiceProvider);`,
    `  app.register(RouteServiceProvider);`,
  ];

  if (hasEvents) {
    providerImports.push(`import { EventServiceProvider } from '../app/Providers/EventServiceProvider.js';`);
    providerImports.push(`import { BroadcastServiceProvider } from '../app/Providers/BroadcastServiceProvider.js';`);
    bootProviders.push(`  app.register(EventServiceProvider);`);
    startProviders.push(`  app.register(EventServiceProvider);`);
    startProviders.push(`  app.register(BroadcastServiceProvider);`);
  }
  if (hasQueue) {
    providerImports.push(`import { QueueServiceProvider } from '../app/Providers/QueueServiceProvider.js';`);
    bootProviders.push(`  app.register(QueueServiceProvider);`);
    startProviders.push(`  app.register(QueueServiceProvider);`);
  }
  if (hasMail) {
    // mail is typically provided by @lara-node/mail package's provider
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

  // ── Http/Kernel.ts ───────────────────────────────────────────────────────────
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

/*
|--------------------------------------------------------------------------
| HTTP Kernel
|--------------------------------------------------------------------------
|
| Defines global middleware, named middleware aliases, and middleware groups.
| Boot this kernel before mounting routes.
|
*/

export class HttpKernel {
  /*
  |--------------------------------------------------------------------------
  | Global HTTP Middleware
  |--------------------------------------------------------------------------
  */
  protected middleware: RequestHandler[] = [
    (req, res, next) => new AsyncContextMiddleware().handle(req, res, next),
    (req, res, next) => new RequestLoggerMiddleware().handle(req, res, next),
    (req, res, next) => new ValidatorMiddleware().handle(req as any, res, next),
    (req, res, next) => new ResponseExtenderMiddleware().handle(req, res, next),
  ];

  /*
  |--------------------------------------------------------------------------
  | Named Route Middleware Aliases
  |--------------------------------------------------------------------------
  |
  | Uncomment and configure auth to enable JWT authentication.
  |
  */
  protected namedMiddleware: Record<string, RequestHandler | ((...args: string[]) => RequestHandler)> = {
    // 'auth': new AuthMiddleware({ userLoader: async (uid) => { /* load user from DB */ return null; } }).toHandler(),
    // 'must-be-active': (req, res, next) => new AuthorizeByStatusMiddleware().handle(req, res, next),
    // 'can': (...perms: string[]) => authorizePermissions(...perms),
    // 'role': (...roles: string[]) => authorizeRoles(...roles),
  };

  /*
  |--------------------------------------------------------------------------
  | Error Handler
  |--------------------------------------------------------------------------
  */
  readonly errorHandler = (err: any, req: any, res: any, next: any) =>
    new ErrorHandlerMiddleware().handle(err, req, res, next);

  getMiddleware(): RequestHandler[] {
    return this.middleware;
  }

  getNamedMiddleware() {
    return this.namedMiddleware;
  }
}

export const httpKernel = new HttpKernel();
`,
  );

  // ── Models ───────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Models/User/User.ts",
    `import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';
import Role from './Role.js';
import UserProfile from './UserProfile.js';
import { RolesUsers } from './RolesUsers.js';

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
import Permission from './Permission.js';

@use(SoftDeletes)
export class Role extends Model {
  static fillable = ['name', 'slug', 'description', 'created_at', 'updated_at', 'deleted_at'];
  static casts = {
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  } as any;

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
  static casts = {
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  } as any;
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
  static casts = {
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  } as any;
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
  static casts = {
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  } as any;
}

export default PermissionsRoles;
`,
  );

  w(
    dir,
    "src/app/Models/User/index.ts",
    `export { User } from './User.js';
export { Role } from './Role.js';
export { Permission } from './Permission.js';
export { UserProfile } from './UserProfile.js';
export { RolesUsers } from './RolesUsers.js';
export { PermissionsRoles } from './PermissionsRoles.js';
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

  // ── Services ─────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Services/AuthService.ts",
    `import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../Models/User/User.js';

export class AuthService {
  async register(data: { name: string; email: string; password: string }) {
    const existing = await User.where('email', data.email).first();
    if (existing) throw Object.assign(new Error('Email already registered'), { status: 422 });

    const password = await bcrypt.hash(data.password, 12);
    const user = await User.create({ ...data, password, status: 'active', created_at: new Date(), updated_at: new Date() });
    return user;
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
    `import User from '../Models/User/User.js';
import UserProfile from '../Models/User/UserProfile.js';
import Role from '../Models/User/Role.js';

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
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
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
    `import Role from '../Models/User/Role.js';

export class RoleService {
  async index() {
    return Role.with(['permissions']).all();
  }

  async find(id: number | string) {
    return Role.with(['permissions']).find(id);
  }

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
    `import Permission from '../Models/User/Permission.js';

export class PermissionService {
  async index() {
    return Permission.all();
  }

  async find(id: number | string) {
    return Permission.find(id);
  }

  async create(data: { name: string; slug: string; description?: string }) {
    return Permission.create({ ...data, created_at: new Date(), updated_at: new Date() });
  }

  async update(id: number | string, data: Record<string, any>) {
    const permission = await Permission.find(id) as any;
    if (!permission) throw Object.assign(new Error('Permission not found'), { status: 404 });
    await permission.update({ ...data, updated_at: new Date() });
    return permission;
  }

  async destroy(id: number | string) {
    const permission = await Permission.find(id) as any;
    if (!permission) throw Object.assign(new Error('Permission not found'), { status: 404 });
    await permission.delete();
  }
}
`,
  );

  w(
    dir,
    "src/app/Services/FileService.ts",
    `import { promises as fs } from 'fs';
import path from 'path';
import File from '../Models/File/File.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/files';

export class FileService {
  async index(userId?: number | string) {
    const query = File.query();
    if (userId) query.where('user_id', userId);
    return query.get();
  }

  async find(id: number | string) {
    return File.find(id);
  }

  async store(file: Express.Multer.File, userId: number | string) {
    const record = await File.create({
      original_name: file.originalname,
      filename: file.filename,
      mime_type: file.mimetype,
      size: file.size,
      disk_path: file.path,
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return record;
  }

  async destroy(id: number | string) {
    const file = await File.find(id) as any;
    if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
    try { await fs.unlink(file.disk_path); } catch { /* ignore if file missing on disk */ }
    await file.delete();
  }

  getFilePath(filename: string) {
    return path.join(UPLOAD_DIR, filename);
  }
}
`,
  );

  w(
    dir,
    "src/app/Services/index.ts",
    `export { AuthService } from './AuthService.js';
export { UserService } from './UserService.js';
export { RoleService } from './RoleService.js';
export { PermissionService } from './PermissionService.js';
export { FileService } from './FileService.js';
`,
  );

  // ── Controllers ──────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Http/Controllers/User/AuthController.ts",
    `import { Request, Response } from 'express';
import { AuthService } from '../../../Services/AuthService.js';
import { UserService } from '../../../Services/UserService.js';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'required|string|min:2|max:100',
      email: 'required|email',
      password: 'required|string|min:8',
    });
    const user = await this.authService.register(data as any);
    res.status(201).json({ success: true, data: user });
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = await req.validate({
      email: 'required|email',
      password: 'required|string',
    });
    const result = await this.authService.login(email, password);
    res.json({ success: true, data: result });
  }

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
import { UserService } from '../../../Services/UserService.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  async index(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page) || 1;
    const data = await this.userService.index(page);
    res.json({ success: true, data });
  }

  async show(req: Request, res: Response): Promise<void> {
    const user = await this.userService.find(req.params.id);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user });
  }

  async showProfile(req: Request, res: Response): Promise<void> {
    const user = await this.userService.find(req.params.id) as any;
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user.profile });
  }

  async store(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'required|string|min:2|max:100',
      email: 'required|email',
      password: 'required|string|min:8',
    });
    const user = await this.userService.create(data as any);
    res.status(201).json({ success: true, data: user });
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'sometimes|string|min:2|max:100',
      email: 'sometimes|email',
    });
    const user = await this.userService.update(req.params.id, data as any);
    res.json({ success: true, data: user });
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const profile = await this.userService.updateProfile(req.params.id, req.body);
    res.json({ success: true, data: profile });
  }

  async setPassword(req: Request, res: Response): Promise<void> {
    const { password } = await req.validate({ password: 'required|string|min:8' });
    import('bcryptjs').then(async ({ default: bcrypt }) => {
      const hashed = await bcrypt.hash(password, 12);
      await this.userService.update(req.params.id, { password: hashed });
      res.json({ success: true, message: 'Password updated' });
    });
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Password reset email sent' });
  }

  async addRole(req: Request, res: Response): Promise<void> {
    const { role_id } = await req.validate({ role_id: 'required|integer' });
    const user = await this.userService.addRole(req.params.id, role_id);
    res.json({ success: true, data: user });
  }

  async removeRole(req: Request, res: Response): Promise<void> {
    await this.userService.removeRole(req.params.id, req.params.roleId);
    res.json({ success: true, message: 'Role removed' });
  }

  async destroy(req: Request, res: Response): Promise<void> {
    await this.userService.destroy(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  }

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
import { RoleService } from '../../../Services/RoleService.js';

export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  async index(_req: Request, res: Response): Promise<void> {
    const data = await this.roleService.index();
    res.json({ success: true, data });
  }

  async show(req: Request, res: Response): Promise<void> {
    const role = await this.roleService.find(req.params.role);
    if (!role) { res.status(404).json({ success: false, message: 'Role not found' }); return; }
    res.json({ success: true, data: role });
  }

  async store(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'required|string|min:2|max:100',
      slug: 'required|string|min:2|max:100',
      description: 'nullable|string',
    });
    const role = await this.roleService.create(data as any);
    res.status(201).json({ success: true, data: role });
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'sometimes|string|min:2|max:100',
      slug: 'sometimes|string|min:2|max:100',
      description: 'nullable|string',
    });
    const role = await this.roleService.update(req.params.id, data as any);
    res.json({ success: true, data: role });
  }

  async destroy(req: Request, res: Response): Promise<void> {
    await this.roleService.destroy(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  }

  async syncPermissions(req: Request, res: Response): Promise<void> {
    const { permission_ids } = await req.validate({ permission_ids: 'required|array' });
    const role = await this.roleService.syncPermissions(req.params.id, permission_ids as number[]);
    res.json({ success: true, data: role });
  }
}
`,
  );

  w(
    dir,
    "src/app/Http/Controllers/User/PermissionController.ts",
    `import { Request, Response } from 'express';
import { PermissionService } from '../../../Services/PermissionService.js';

export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  async index(_req: Request, res: Response): Promise<void> {
    const data = await this.permissionService.index();
    res.json({ success: true, data });
  }

  async show(req: Request, res: Response): Promise<void> {
    const permission = await this.permissionService.find(req.params.id);
    if (!permission) { res.status(404).json({ success: false, message: 'Permission not found' }); return; }
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
import { FileService } from '../../../Services/FileService.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/files';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

export const multerUpload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

export class FileController {
  constructor(private readonly fileService: FileService) {}

  async index(req: Request, res: Response): Promise<void> {
    const data = await this.fileService.index();
    res.json({ success: true, data });
  }

  async show(req: Request, res: Response): Promise<void> {
    const file = await this.fileService.find(req.params.id);
    if (!file) { res.status(404).json({ success: false, message: 'File not found' }); return; }
    res.json({ success: true, data: file });
  }

  async store(req: Request, res: Response): Promise<void> {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
    const record = await this.fileService.store(req.file, req.user!.id);
    res.status(201).json({ success: true, data: record });
  }

  async download(req: Request, res: Response): Promise<void> {
    const file = await this.fileService.find(req.params.id) as any;
    if (!file) { res.status(404).json({ success: false, message: 'File not found' }); return; }
    res.download(file.disk_path, file.original_name);
  }

  async destroy(req: Request, res: Response): Promise<void> {
    await this.fileService.destroy(req.params.id);
    res.json({ success: true, message: 'File deleted' });
  }
}
`,
  );

  // ── Events ───────────────────────────────────────────────────────────────────
  if (hasEvents) {
    w(
      dir,
      "src/app/Events/UserEvents.ts",
      `import { Event } from '@lara-node/events';

export class UserRegistered extends Event {
  constructor(
    public userId: string | number,
    public email: string,
    public name: string,
  ) { super(); }
  eventName() { return 'user.registered'; }
}

export class UserLoggedIn extends Event {
  constructor(
    public userId: string | number,
    public email: string,
    public ipAddress?: string,
  ) { super(); }
  eventName() { return 'user.logged_in'; }
}

export class UserLoggedOut extends Event {
  constructor(public userId: string | number) { super(); }
  eventName() { return 'user.logged_out'; }
}

export class PasswordResetRequested extends Event {
  constructor(
    public userId: string | number,
    public email: string,
    public token: string,
  ) { super(); }
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
      `export * from './UserEvents.js';
export * from './BroadcastEvents.js';
`,
    );

    // ── Listeners ──────────────────────────────────────────────────────────────
    w(
      dir,
      "src/app/Listeners/UserListeners.ts",
      `import { Listener, ListensTo } from '@lara-node/events';
import { UserRegistered, UserLoggedIn } from '../Events/UserEvents.js';

@ListensTo('user.registered')
export class SendWelcomeEmail extends Listener<UserRegistered> {
  async handle(payload: UserRegistered): Promise<void> {
    console.log(\`[SendWelcomeEmail] Sending welcome email to \${payload.email}\`);
    // TODO: send welcome email via @lara-node/mail
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

    w(
      dir,
      "src/app/Listeners/index.ts",
      `export * from './UserListeners.js';
`,
    );

    // ── Subscribers ────────────────────────────────────────────────────────────
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

    w(
      dir,
      "src/app/Subscribers/index.ts",
      `export * from './UserEventSubscriber.js';
`,
    );
  } else {
    w(dir, "src/app/Events/index.ts", "// No events package selected. Install @lara-node/events to enable.\n");
    w(dir, "src/app/Listeners/index.ts", "// No events package selected.\n");
    w(dir, "src/app/Subscribers/index.ts", "// No events package selected.\n");
  }

  // ── Jobs ─────────────────────────────────────────────────────────────────────
  if (hasQueue) {
    w(
      dir,
      "src/app/Jobs/SendMailJob.ts",
      `import { Job, Queueable } from '@lara-node/queue';

@Queueable({ queue: 'emails' })
export class SendMailJob extends Job {
  constructor(private readonly payload: { to: string; subject: string; body: string }) {
    super();
  }

  async handle(): Promise<void> {
    console.log(\`[SendMailJob] Sending email to \${this.payload.to}: \${this.payload.subject}\`);
    // TODO: integrate with @lara-node/mail
  }
}
`,
    );

    w(dir, "src/app/Jobs/index.ts", `export * from './SendMailJob.js';\n`);
  } else {
    w(dir, "src/app/Jobs/index.ts", "// No queue package selected. Install @lara-node/queue to enable.\n");
  }

  // ── Mail ─────────────────────────────────────────────────────────────────────
  if (hasMail) {
    w(
      dir,
      "src/app/Mail/WelcomeEmail.ts",
      `import { Mailable } from '@lara-node/mail';

export class WelcomeEmail extends Mailable {
  constructor(private readonly name: string, private readonly email: string) {
    super();
  }

  build() {
    return this
      .to(this.email)
      .subject(\`Welcome to ${name}, \${this.name}!\`)
      .text(\`Hi \${this.name},\\n\\nWelcome aboard! Your account has been created.\\n\\nBest regards,\\nThe Team\`);
  }
}
`,
    );

    w(dir, "src/app/Mail/index.ts", `export * from './WelcomeEmail.js';\n`);
  } else {
    w(dir, "src/app/Mail/index.ts", "// No mail package selected. Install @lara-node/mail to enable.\n");
  }

  // ── Commands ─────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Console/Commands/PermissionCommands.ts",
    `import { Command } from '@lara-node/console';
import { ArgumentsCamelCase } from 'yargs';

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
    force: { type: 'boolean' as const, description: 'Force sync in production', default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const dryRun = args.dryRun as boolean;
    const force = args.force as boolean;

    if (process.env.NODE_ENV === 'production' && !force) {
      this.error('Cannot sync permissions in production without --force flag'); return;
    }

    if (dryRun) this.info('Dry run mode - no changes will be made');
    this.info('Syncing permissions...');

    try {
      const { default: Permission } = await import('../../Models/User/Permission.js');
      const { default: Role } = await import('../../Models/User/Role.js');
      const now = new Date();
      let created = 0, updated = 0;
      const syncedPerms: any[] = [];

      for (const p of PERMISSIONS) {
        let perm = await Permission.where('slug', p.slug).first() as any;
        if (perm) {
          if (!dryRun) await perm.update({ name: p.name, updated_at: now });
          updated++;
          syncedPerms.push(perm);
          this.line(\`  UPDATE \${p.slug}\`);
        } else {
          if (!dryRun) perm = await Permission.create({ name: p.name, slug: p.slug, created_at: now, updated_at: now });
          created++;
          if (perm) syncedPerms.push(perm);
          this.line(\`  CREATE \${p.slug}\`);
        }
      }

      let adminRole = await Role.where('slug', 'admin').first() as any;
      if (!adminRole && !dryRun) {
        adminRole = await Role.create({ name: 'Admin', slug: 'admin', description: 'Administrator role', created_at: now, updated_at: now });
        this.line('CREATE admin role');
      }

      if (!dryRun && adminRole && syncedPerms.length > 0) {
        const permIds = syncedPerms.map((p: any) => p?.id).filter(Boolean);
        if (permIds.length > 0) {
          try { await adminRole.permissions().sync(permIds); }
          catch { await adminRole.permissions().attach(permIds); }
        }
      }

      this.line('');
      this.info(\`Created: \${created}, Updated: \${updated}, Total: \${PERMISSIONS.length}\`);
      if (!dryRun) this.info(\`Synced \${PERMISSIONS.length} permissions to admin role\`);
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
    this.line('-'.repeat(70));
    for (const p of PERMISSIONS) this.line(\`\${p.slug.padEnd(35)} \${p.name}\`);
    this.info(\`Total: \${PERMISSIONS.length}\`);
  }
}
`,
  );

  // ── Providers ─────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/app/Providers/AppServiceProvider.ts",
    `import { ServiceProvider } from '@lara-node/core';
import { AuthService } from '../Services/AuthService.js';
import { UserService } from '../Services/UserService.js';
import { RoleService } from '../Services/RoleService.js';
import { PermissionService } from '../Services/PermissionService.js';
import { FileService } from '../Services/FileService.js';
import { AuthController } from '../Http/Controllers/User/AuthController.js';
import { UserController } from '../Http/Controllers/User/UserController.js';
import { RoleController } from '../Http/Controllers/User/RoleController.js';
import { PermissionController } from '../Http/Controllers/User/PermissionController.js';
import { FileController } from '../Http/Controllers/File/FileController.js';
import { PermissionsSyncCommand } from '../Console/Commands/PermissionCommands.js';
import { PermissionsListCommand } from '../Console/Commands/PermissionCommands.js';

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton(AuthService);
    this.singleton(UserService);
    this.singleton(RoleService);
    this.singleton(PermissionService);
    this.singleton(FileService);
  }

  boot(): void {
    const c = this.container;
    // Explicit controller wiring (tsx/esbuild doesn't emit decorator metadata)
    c.instance(AuthController, new AuthController(c.make(AuthService), c.make(UserService)));
    c.instance(UserController, new UserController(c.make(UserService)));
    c.instance(RoleController, new RoleController(c.make(RoleService)));
    c.instance(PermissionController, new PermissionController(c.make(PermissionService)));
    c.instance(FileController, new FileController(c.make(FileService)));

    // Register artisan commands
    c.instance(PermissionsSyncCommand, new PermissionsSyncCommand());
    c.instance(PermissionsListCommand, new PermissionsListCommand());
  }
}
`,
  );

  w(
    dir,
    "src/app/Providers/RouteServiceProvider.ts",
    `import { ServiceProvider } from '@lara-node/core';

export class RouteServiceProvider extends ServiceProvider {
  protected apiPrefix = '/api';

  register(): void {}

  boot(): void {
    this.mapApiRoutes();
  }

  protected mapApiRoutes(): void {
    const { routesBuilder } = require('../routes/api.js');
    this.app.mountRoutes(this.apiPrefix, routesBuilder.build());
  }
}
`,
  );

  if (hasEvents) {
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
      try { await import('../Listeners/index.js'); } catch { /* ok if empty */ }
      try { await import('../Subscribers/index.js'); } catch { /* ok if empty */ }
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

    w(
      dir,
      "src/app/Providers/BroadcastServiceProvider.ts",
      `import { ServiceProvider } from '@lara-node/core';
import { Broadcast } from '@lara-node/events';

export class BroadcastServiceProvider extends ServiceProvider {
  register(): void {}

  async boot(): Promise<void> {
    // Register channel authorizations
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
  }

  if (hasQueue) {
    w(
      dir,
      "src/app/Providers/QueueServiceProvider.ts",
      `import { ServiceProvider } from '@lara-node/core';
import { Queue, QueueManager, scheduler, Schedule } from '@lara-node/queue';

import '../Jobs/index.js';

export class QueueServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton(QueueManager, () => Queue);
    this.container.alias(QueueManager, 'queue');
    this.container.singleton(Schedule, () => scheduler);
    this.container.alias(Schedule, 'schedule');
  }

  boot(): void {
    this.registerScheduledTasks();
  }

  protected registerScheduledTasks(): void {
    // scheduler.command('permissions:sync').daily().name('sync-permissions');
  }
}
`,
    );
  }

  // ── Routes ───────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/routes/api.ts",
    `import RouterBuilder from '@lara-node/router';
import { AuthController } from '../app/Http/Controllers/User/AuthController.js';
import { UserController } from '../app/Http/Controllers/User/UserController.js';
import { RoleController } from '../app/Http/Controllers/User/RoleController.js';
import { PermissionController } from '../app/Http/Controllers/User/PermissionController.js';
import { FileController, multerUpload } from '../app/Http/Controllers/File/FileController.js';

export const routesBuilder = new RouterBuilder();
const rb = routesBuilder;

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/
rb.prefix('/auth').group((g: RouterBuilder) => {
  g.post('/register', [AuthController, 'register']);
  g.post('/login', [AuthController, 'login']);
  g.get('/me', 'auth', [AuthController, 'me']);
});

/*
|--------------------------------------------------------------------------
| User Routes
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| Role Routes
|--------------------------------------------------------------------------
*/
rb.prefix('/roles').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_roles', [RoleController, 'index']);
  g.get('/:role', 'can:view_roles', [RoleController, 'show']);
  g.post('/', 'can:create_roles', [RoleController, 'store']);
  g.put('/:id', 'can:update_roles', [RoleController, 'update']);
  g.delete('/:id', 'can:delete_roles', [RoleController, 'destroy']);
  g.post('/:id/permissions', 'can:add_permissions_to_roles', [RoleController, 'syncPermissions']);
});

/*
|--------------------------------------------------------------------------
| Permission Routes
|--------------------------------------------------------------------------
*/
rb.prefix('/permissions').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_permissions', [PermissionController, 'index']);
  g.get('/:id', 'can:view_permissions', [PermissionController, 'show']);
});

/*
|--------------------------------------------------------------------------
| File Routes
|--------------------------------------------------------------------------
*/
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
const rb = webRoutesBuilder;

rb.get('/', (_req: any, res: any) => {
  res.json({ message: 'Welcome to ${name}', version: '1.0.0' });
});

export default rb;
`,
  );

  // ── Migrations ───────────────────────────────────────────────────────────────
  w(
    dir,
    "src/database/migrations/001_create_users.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';
type Q = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: Q) {
  return schema.createTable('users', (table: TableBuilder) => {
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
};

module.exports.down = async function (schema: MigrationSchema, _query: Q) {
  return schema.dropTable('users');
};
`,
  );

  w(
    dir,
    "src/database/migrations/002_create_roles.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';
type Q = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: Q) {
  return schema.createTable('roles', (table: TableBuilder) => {
    table.increments('id');
    table.string('name', 191).notNullable();
    table.string('slug', 191).notNullable();
    table.string('description', 500).nullable();
    table.timestamps();
    table.softDeletes();
    table.unique('slug');
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: Q) {
  return schema.dropTable('roles');
};
`,
  );

  w(
    dir,
    "src/database/migrations/003_create_permissions.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';
type Q = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: Q) {
  return schema.createTable('permissions', (table: TableBuilder) => {
    table.increments('id');
    table.string('name', 191).notNullable();
    table.string('slug', 191).notNullable();
    table.string('description', 500).nullable();
    table.timestamps();
    table.softDeletes();
    table.unique('slug');
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: Q) {
  return schema.dropTable('permissions');
};
`,
  );

  w(
    dir,
    "src/database/migrations/004_create_roles_users.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';
type Q = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: Q) {
  return schema.createTable('roles_users', (table: TableBuilder) => {
    table.increments('id');
    table.integer('roles_id').notNullable();
    table.integer('users_id').notNullable();
    table.timestamps();
    table.softDeletes();
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: Q) {
  return schema.dropTable('roles_users');
};
`,
  );

  w(
    dir,
    "src/database/migrations/005_create_permissions_roles.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';
type Q = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: Q) {
  return schema.createTable('permissions_roles', (table: TableBuilder) => {
    table.increments('id');
    table.integer('permissions_id').notNullable();
    table.integer('roles_id').notNullable();
    table.timestamps();
    table.softDeletes();
  });
};

module.exports.down = async function (schema: MigrationSchema, _query: Q) {
  return schema.dropTable('permissions_roles');
};
`,
  );

  w(
    dir,
    "src/database/migrations/006_user_profiles.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';
type Q = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: Q) {
  return schema.createTable('user_profiles', (table: TableBuilder) => {
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
};

module.exports.down = async function (schema: MigrationSchema, _query: Q) {
  return schema.dropTable('user_profiles');
};
`,
  );

  w(
    dir,
    "src/database/migrations/007_create_files.ts",
    `import { MigrationSchema, TableBuilder } from '@lara-node/db';
type Q = (sql: string, params?: any[]) => Promise<any>;

module.exports.up = async function (schema: MigrationSchema, _query: Q) {
  return schema.createTable('files', (table: TableBuilder) => {
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
};

module.exports.down = async function (schema: MigrationSchema, _query: Q) {
  return schema.dropTable('files');
};
`,
  );

  // ── Seeders ───────────────────────────────────────────────────────────────────
  w(
    dir,
    "src/database/seeders/DatabaseSeeder.ts",
    `export class DatabaseSeeder {
  async run(): Promise<void> {
    console.log('Running database seeders...');
    // Add your seeder calls here
    // e.g. await new UserSeeder().run();
    console.log('Database seeded successfully');
  }
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

  // ── Vitest config ─────────────────────────────────────────────────────────────
  w(
    dir,
    "vite.config.ts",
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

  console.log(`  ${pc.dim("Scaffolded files:")}`);
  const summary = [
    ["src/server.ts", "App entry point"],
    ["src/artisan.ts", "CLI entry point"],
    ["src/bootstrap/app.ts", "Bootstrap & service providers"],
    ["src/app/Http/Kernel.ts", "HTTP middleware kernel"],
    ["src/routes/api.ts", "Auth/users/roles/permissions/files routes"],
    ["src/app/Models/*", "User, Role, Permission, UserProfile, File models"],
    ["src/app/Services/*", "Auth, User, Role, Permission, File services"],
    ["src/app/Http/Controllers/**", "All CRUD controllers"],
    ...(hasEvents ? [["src/app/Events/*", "UserEvents, BroadcastEvents"], ["src/app/Listeners/*", "User event listeners"], ["src/app/Subscribers/*", "UserEventSubscriber"]] : []),
    ...(hasQueue ? [["src/app/Jobs/*", "SendMailJob"]] : []),
    ...(hasMail ? [["src/app/Mail/*", "WelcomeEmail"]] : []),
    ["src/app/Console/Commands/*", "permissions:sync, permissions:list"],
    ["src/database/migrations/*", "7 migration files"],
    [".env.example", "Environment template"],
  ];
  for (const [f, d2] of summary) {
    console.log(`    ${pc.green(f)} ${pc.dim(d2)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
