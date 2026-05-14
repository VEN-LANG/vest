import yargs, { Argv, ArgumentsCamelCase } from "yargs";

export interface CommandSignature {
  name: string;
  description: string;
  arguments?: Record<
    string,
    {
      type: "string" | "number" | "boolean";
      description?: string;
      required?: boolean;
      default?: any;
    }
  >;
  options?: Record<
    string,
    {
      type: "string" | "number" | "boolean";
      description?: string;
      default?: any;
      alias?: string | string[];
    }
  >;
}

export abstract class Command {
  /*
    |--------------------------------------------------------------------------
    | The name and signature of the console command
    |--------------------------------------------------------------------------
    */
  protected abstract signature: string;

  /*
    |--------------------------------------------------------------------------
    | The console command description
    |--------------------------------------------------------------------------
    */
  protected abstract description: string;

  /*
    |--------------------------------------------------------------------------
    | Command Arguments
    |--------------------------------------------------------------------------
    */
  protected arguments: CommandSignature["arguments"] = {};

  /*
    |--------------------------------------------------------------------------
    | Command Options
    |--------------------------------------------------------------------------
    */
  protected options: CommandSignature["options"] = {};

  /*
    |--------------------------------------------------------------------------
    | Keep Alive
    |--------------------------------------------------------------------------
    |
    | If true, the process will NOT exit after the command finishes.
    | Set to true for daemon commands like queue:work, schedule:work.
    |
    */
  protected keepAlive: boolean = false;

  /*
    |--------------------------------------------------------------------------
    | Parsed arguments storage
    |--------------------------------------------------------------------------
    */
  protected parsedArgs: ArgumentsCamelCase = {} as ArgumentsCamelCase;

  /*
    |--------------------------------------------------------------------------
    | Execute the console command
    |--------------------------------------------------------------------------
    */
  abstract handle(args: ArgumentsCamelCase): Promise<void>;

  /*
    |--------------------------------------------------------------------------
    | Register the command with yargs
    |--------------------------------------------------------------------------
    */
  register(): void {
    // This will be called by the Kernel to register commands
  }

  /*
    |--------------------------------------------------------------------------
    | Build command for yargs
    |--------------------------------------------------------------------------
    */
  buildCommand(yargs: Argv): Argv {
    return yargs.command(
      this.signature,
      this.description,
      (y: Argv) => {
        // Add arguments (positional)
        if (this.arguments) {
          for (const [name, config] of Object.entries(this.arguments)) {
            y.positional(name, {
              type: config.type,
              describe: config.description,
              demandOption: config.required ?? false,
              default: config.default,
            });
          }
        }

        // Add options
        if (this.options) {
          for (const [name, config] of Object.entries(this.options)) {
            y.option(name, {
              type: config.type,
              describe: config.description,
              default: config.default,
              alias: config.alias,
            });
          }
        }

        return y;
      },
      async (args: ArgumentsCamelCase) => {
        this.parsedArgs = args;
        try {
          await this.handle(args);
          if (!this.keepAlive) {
            process.exit(0);
          }
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      },
    );
  }

  /*
    |--------------------------------------------------------------------------
    | Argument/Option Helpers
    |--------------------------------------------------------------------------
    */

  /**
   * Get an argument value by name
   */
  protected argument<T = string>(name: string, defaultValue?: T): T {
    const value = this.parsedArgs[name];
    if (value === undefined || value === null) {
      return defaultValue as T;
    }
    return value as T;
  }

  /**
   * Get an option value by name
   */
  protected option<T = any>(name: string, defaultValue?: T): T {
    // Handle both camelCase and kebab-case option names
    const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const kebabName = name.replace(/([A-Z])/g, "-$1").toLowerCase();

    let value = this.parsedArgs[name] ?? this.parsedArgs[camelName] ?? this.parsedArgs[kebabName];

    if (value === undefined || value === null) {
      return defaultValue as T;
    }
    return value as T;
  }

  /**
   * Check if an option was provided (even if false)
   */
  protected hasOption(name: string): boolean {
    const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const kebabName = name.replace(/([A-Z])/g, "-$1").toLowerCase();
    return name in this.parsedArgs || camelName in this.parsedArgs || kebabName in this.parsedArgs;
  }

  /**
   * Get all arguments as an object
   */
  protected allArguments(): Record<string, any> {
    const result: Record<string, any> = {};
    if (this.arguments) {
      for (const name of Object.keys(this.arguments)) {
        result[name] = this.parsedArgs[name];
      }
    }
    return result;
  }

  /**
   * Get all options as an object
   */
  protected allOptions(): Record<string, any> {
    const result: Record<string, any> = {};
    if (this.options) {
      for (const name of Object.keys(this.options)) {
        const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        result[name] = this.parsedArgs[name] ?? this.parsedArgs[camelName];
      }
    }
    return result;
  }

  /*
    |--------------------------------------------------------------------------
    | Output helpers
    |--------------------------------------------------------------------------
    */
  protected info(message: string): void {
    console.log(`\x1b[32m${message}\x1b[0m`);
  }

  protected error(message: string): void {
    console.error(`\x1b[31m${message}\x1b[0m`);
  }

  protected warn(message: string): void {
    console.warn(`\x1b[33m${message}\x1b[0m`);
  }

  protected line(message: string): void {
    console.log(message);
  }

  protected comment(message: string): void {
    console.log(`\x1b[90m${message}\x1b[0m`);
  }

  protected success(message: string): void {
    console.log(`\x1b[32m✔ ${message}\x1b[0m`);
  }

  protected fail(message: string): void {
    console.log(`\x1b[31m✘ ${message}\x1b[0m`);
  }

  protected newLine(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      console.log("");
    }
  }

  protected table(headers: string[], rows: string[][]): void {
    // Simple table output
    const colWidths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map((r) => (r[i] || "").length)),
    );

    const separator = colWidths.map((w) => "-".repeat(w + 2)).join("+");
    const formatRow = (row: string[]) =>
      row.map((cell, i) => ` ${(cell || "").padEnd(colWidths[i])} `).join("|");

    console.log(separator);
    console.log(formatRow(headers));
    console.log(separator);
    rows.forEach((row) => console.log(formatRow(row)));
    console.log(separator);
  }

  /**
   * Ask for user confirmation
   */
  protected async confirm(question: string, defaultAnswer: boolean = false): Promise<boolean> {
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const hint = defaultAnswer ? "[Y/n]" : "[y/N]";

    return new Promise((resolve) => {
      rl.question(`${question} ${hint} `, (answer: string) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        if (normalized === "") {
          resolve(defaultAnswer);
        } else {
          resolve(normalized === "y" || normalized === "yes");
        }
      });
    });
  }

  /**
   * Ask for user input
   */
  protected async ask(question: string, defaultValue?: string): Promise<string> {
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const hint = defaultValue ? ` [${defaultValue}]` : "";

    return new Promise((resolve) => {
      rl.question(`${question}${hint}: `, (answer: string) => {
        rl.close();
        resolve(answer.trim() || defaultValue || "");
      });
    });
  }

  /**
   * Display a choice menu and return selected value
   */
  protected async choice<T extends string>(
    question: string,
    choices: T[],
    defaultChoice?: T,
  ): Promise<T> {
    this.line(question);
    choices.forEach((choice, i) => {
      const marker = choice === defaultChoice ? " (default)" : "";
      this.line(`  [${i + 1}] ${choice}${marker}`);
    });

    const answer = await this.ask("Enter choice number");
    const index = parseInt(answer, 10) - 1;

    if (isNaN(index) || index < 0 || index >= choices.length) {
      return defaultChoice || choices[0];
    }
    return choices[index];
  }
}
