import { Command } from "../Command.js";
import { ArgumentsCamelCase } from "yargs";
import { runSeeders } from "@lara-node/db";
import fs from "fs";
import path from "path";

export class DbSeedCommand extends Command {
  protected signature = "db:seed";
  protected description = "Seed the database with records";

  protected options = {
    class: {
      type: "string" as const,
      description: "The class name of the seeder to run",
      alias: "c",
    },
    force: {
      type: "boolean" as const,
      description: "Force the operation to run in production",
      default: false,
      alias: "f",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    // Get options from both args and this.option for flexibility
    const seederClass = (args.class as string) || this.option<string>("class");
    const force = args.force === true || this.option<boolean>("force", false);

    if (process.env.NODE_ENV === "production" && !force) {
      this.error("Cannot run seeders in production without --force flag");
      process.exit(1);
    }

    this.info("Seeding database...");
    if (seederClass) {
      this.comment(`Running seeder: ${seederClass}`);
    }

    try {
      await runSeeders({ class: seederClass, force });
      this.success("Database seeding completed successfully.");
    } catch (error: any) {
      this.error(`Seeding failed: ${error.message}`);
      process.exit(1);
    }
  }
}

export class DbWipeCommand extends Command {
  protected signature = "db:wipe";
  protected description = "Drop all tables, views, and types";

  protected options = {
    force: {
      type: "boolean" as const,
      description: "Force the operation to run in production",
      default: false,
      alias: "f",
    },
  };

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const force = this.option<boolean>("force", false);

    if (!force) {
      this.warn("⚠️  This command will DROP ALL TABLES!");
      const confirmed = await this.confirm("Are you sure you want to continue?", false);
      if (!confirmed) {
        this.info("Operation cancelled.");
        return;
      }
    }

    this.warn("Dropping all tables...");
    // TODO: Implement db:wipe
    this.warn("Not yet implemented. Use migrate:fresh instead.");
  }
}

export class MakeSeederCommand extends Command {
  protected signature = "make:seeder <name>";
  protected description = "Create a new seeder class";

  protected arguments = {
    name: {
      type: "string" as const,
      description: "The name of the seeder class",
      required: true,
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    // Ensure name ends with 'Seeder'
    if (!name.toLowerCase().endsWith("seeder")) {
      name = name + "Seeder";
    }

    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/database/seeders");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Seeder ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created seeder: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `/**
 * ${name}
 * 
 * Run this seeder with:
 *   pnpm artisan db:seed --class=${name}
 */

// For MySQL, receives query function
// For MongoDB, receives { type: 'mongodb', db, collection }
type SeederContext = 
  | { type: 'mysql'; query: (sql: string, params?: any[]) => Promise<any> }
  | { type: 'mongodb'; db: any; collection: (name: string) => any };

export async function seed(ctx: SeederContext | ((sql: string, params?: any[]) => Promise<any>)) {
    // Handle both MySQL query function and SeederContext
    if (typeof ctx === 'function') {
        // MySQL: ctx is the query function
        const query = ctx;
        // Example: await query('INSERT INTO users (name) VALUES (?)', ['John']);
        console.log('${name}: Seeding with MySQL...');
    } else if (ctx.type === 'mongodb') {
        // MongoDB: use collection helper
        // Example: await ctx.collection('users').insertOne({ name: 'John' });
        console.log('${name}: Seeding with MongoDB...');
    } else if (ctx.type === 'mysql') {
        // MySQL via SeederContext
        // Example: await ctx.query('INSERT INTO users (name) VALUES (?)', ['John']);
        console.log('${name}: Seeding with MySQL...');
    }
    
    // Add your seeding logic here
    
    console.log('${name} complete');
}

export default seed;
`;
  }
}
