import { Command, CommandArguments, CommandOptions } from "../Command.js";
import path from "path";
import fs from "fs";
import { ArgumentsCamelCase } from "yargs";

/*
|--------------------------------------------------------------------------
| Make Model Command
|--------------------------------------------------------------------------
*/
export class MakeModelCommand extends Command {
  protected signature: string = "make:model";
  protected description: string = "Create a new model class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the model", required: true },
  };

  protected options: CommandOptions | undefined = {
    migration: { type: "boolean", description: "Create a migration for the model", alias: "m", default: false },
    factory: { type: "boolean", description: "Create a factory for the model", alias: "f", default: false },
    seeder: { type: "boolean", description: "Create a seeder for the model", alias: "s", default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("model")) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Models");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Model ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created model: ${fileName}`);

    if (args.migration) {
      this.info("Creating migration...");
    }

    if (args.factory) {
      this.info("Creating factory...");
    }

    if (args.seeder) {
      this.info("Creating seeder...");
    }
  }

  private getTemplate(name: string): string {
    return `import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';

@use(SoftDeletes, Timestamps)
export class ${name} extends Model {
  static fillable: string[] = [];
  static hidden: string[] = [];
  static casts: Record<string, string> = {
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  };
}

export default ${name};
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Middleware Command
|--------------------------------------------------------------------------
*/
export class MakeMiddlewareCommand extends Command {
  protected signature: string = "make:middleware";
  protected description: string = "Create a new middleware class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the middleware", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("middleware")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Middleware";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Http/Middleware");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Middleware ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created middleware: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import { Request, Response, NextFunction } from 'express';

export class ${name} {
  handle(req: Request, res: Response, next: NextFunction): void {
    next();
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Provider Command
|--------------------------------------------------------------------------
*/
export class MakeProviderCommand extends Command {
  protected signature: string = "make:provider";
  protected description: string = "Create a new service provider class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the provider", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("provider")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "ServiceProvider";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Providers");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Provider ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created provider: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import { ServiceProvider } from '@lara-node/core';

export class ${name} extends ServiceProvider {
  register(): void {
    // Register container bindings here
  }

  boot(): void | Promise<void> {
    // Bootstrap services here
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Policy Command
|--------------------------------------------------------------------------
*/
export class MakePolicyCommand extends Command {
  protected signature: string = "make:policy";
  protected description: string = "Create a new policy class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the policy", required: true },
  };

  protected options: CommandOptions | undefined = {
    model: { type: "string", description: "The model to create the policy for", alias: "m" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("policy")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Policy";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Policies");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Policy ${fileName} already exists!`);
      process.exit(1);
    }

    const modelArg = args.model ? String(args.model) : undefined;
    const template = this.getTemplate(name, modelArg);
    fs.writeFileSync(filePath, template);
    this.success(`Created policy: ${fileName}`);
  }

  private getTemplate(name: string, model?: string): string {
    const modelName = model ?? 'Model';
    const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    return `import type { AuthUser } from '@lara-node/auth';

export class ${name} {
  viewAny(_user: AuthUser): boolean {
    return true;
  }

  view(_user: AuthUser, _${modelVar}: unknown): boolean {
    return true;
  }

  create(_user: AuthUser): boolean {
    return true;
  }

  update(_user: AuthUser, _${modelVar}: unknown): boolean {
    return true;
  }

  delete(_user: AuthUser, _${modelVar}: unknown): boolean {
    return true;
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Request Command
|--------------------------------------------------------------------------
*/
export class MakeRequestCommand extends Command {
  protected signature: string = "make:request";
  protected description: string = "Create a new form request class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the request", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("request")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Request";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Http/Requests");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Request ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created request: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import { FormRequest } from '@lara-node/core';

export class ${name} extends FormRequest<Record<string, unknown>> {
  authorize(): boolean {
    return true;
  }

  rules(): Record<string, string> {
    return {
      // Add your validation rules here
    };
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Job Command
|--------------------------------------------------------------------------
*/
export class MakeJobCommand extends Command {
  protected signature: string = "make:job";
  protected description: string = "Create a new queued job class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the job", required: true },
  };

  protected options: CommandOptions | undefined = {
    sync: { type: "boolean", description: "Indicate the job should be run synchronously", alias: "s", default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("job")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Job";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Jobs");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Job ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created job: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import { Job } from '@lara-node/queue';

export class ${name} extends Job {
  async handle(): Promise<void> {
    // Job logic here
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Event Command
|--------------------------------------------------------------------------
*/
export class MakeEventCommand extends Command {
  protected signature: string = "make:event";
  protected description: string = "Create a new event class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the event", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("event")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Event";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Events");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Event ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created event: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import { Event } from '@lara-node/events';

export class ${name} extends Event {
  constructor(public readonly payload: Record<string, unknown>) {
    super();
  }

  eventName(): string {
    return '${name.replace(/Event$/, '').toLowerCase()}';
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Listener Command
|--------------------------------------------------------------------------
*/
export class MakeListenerCommand extends Command {
  protected signature: string = "make:listener";
  protected description: string = "Create a new event listener class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the listener", required: true },
  };

  protected options: CommandOptions | undefined = {
    event: { type: "string", description: "The event class to listen for", alias: "e" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("listener")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Listener";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Listeners");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Listener ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created listener: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import { Listener } from '@lara-node/events';

export class ${name} extends Listener<Record<string, unknown>> {
  async handle(payload: Record<string, unknown>): Promise<void> {
    // Listener logic here
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Notification Command
|--------------------------------------------------------------------------
*/
export class MakeNotificationCommand extends Command {
  protected signature: string = "make:notification";
  protected description: string = "Create a new notification class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the notification", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("notification")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Notification";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Notifications");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Notification ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created notification: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import { Notification } from '@lara-node/notifications';

export class ${name} extends Notification {
  via(_notifiable: unknown): string[] {
    return ['mail'];
  }

  toMail(_notifiable: unknown): Record<string, unknown> {
    return {
      subject: 'Notification',
      body: 'Hello!',
    };
  }

  toArray(_notifiable: unknown): Record<string, unknown> {
    return {};
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Mail Command
|--------------------------------------------------------------------------
*/
export class MakeMailCommand extends Command {
  protected signature: string = "make:mail";
  protected description: string = "Create a new email class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the mail class", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("email") && !name.toLowerCase().endsWith("mail")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Email";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Mail");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Mail ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created mail: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import { Mailable } from '@lara-node/mail';

export class ${name} extends Mailable {
  constructor(private readonly recipientEmail: string) {
    super();
  }

  build(): this {
    return this
      .to(this.recipientEmail)
      .subject('${name}')
      .html('<p>Hello!</p>');
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Rule Command
|--------------------------------------------------------------------------
*/
export class MakeRuleCommand extends Command {
  protected signature: string = "make:rule";
  protected description: string = "Create a new validation rule class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the rule", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("rule")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Rule";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Rules");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Rule ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created rule: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `export class ${name} {
  passes(_attribute: string, _value: unknown): boolean {
    // Validation logic here
    return true;
  }

  message(): string {
    return 'The :attribute is invalid.';
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Resource Command
|--------------------------------------------------------------------------
*/
export class MakeResourceCommand extends Command {
  protected signature: string = "make:resource";
  protected description: string = "Create a new API resource class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the resource", required: true },
  };

  protected options: CommandOptions | undefined = {
    collection: { type: "boolean", description: "Create a resource collection class", alias: "c", default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("resource")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Resource";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Http/Resources");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Resource ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created resource: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `export class ${name} {
  constructor(private readonly resource: Record<string, unknown>) {}

  toArray(): Record<string, unknown> {
    return {
      ...this.resource,
    };
  }

  toJSON(): Record<string, unknown> {
    return this.toArray();
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Factory Command
|--------------------------------------------------------------------------
*/
export class MakeFactoryCommand extends Command {
  protected signature: string = "make:factory";
  protected description: string = "Create a new model factory class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the factory", required: true },
  };

  protected options: CommandOptions | undefined = {
    model: { type: "string", description: "The model class to create factory for", alias: "m" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("factory")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Factory";
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "database/factories");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Factory ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created factory: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `export class ${name} {
  definition(): Record<string, unknown> {
    return {
      // Define factory attributes here
    };
  }

  make(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { ...this.definition(), ...overrides };
  }
}
`;
  }
}

/*
|--------------------------------------------------------------------------
| Make Test Command
|--------------------------------------------------------------------------
*/
export class MakeTestCommand extends Command {
  protected signature: string = "make:test";
  protected description: string = "Create a new test class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the test", required: true },
  };

  protected options: CommandOptions | undefined = {
    unit: { type: "boolean", description: "Create a unit test", alias: "u", default: false },
    feature: { type: "boolean", description: "Create a feature test", alias: "f", default: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("test")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Test";
    }

    const isUnit = args.unit === true;
    const dir = path.resolve(process.cwd(), isUnit ? "tests/Unit" : "tests/Feature");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = `${name}.ts`;
    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Test ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name, isUnit);
    fs.writeFileSync(filePath, template);
    this.success(`Created test: ${fileName}`);
  }

  private getTemplate(name: string, isUnit: boolean): string {
    return `import { describe, it, expect } from 'vitest';

describe('${name}', () => {
  it('${isUnit ? "unit test" : "feature test"} example', () => {
    expect(true).toBe(true);
  });
});
`;
  }
}
