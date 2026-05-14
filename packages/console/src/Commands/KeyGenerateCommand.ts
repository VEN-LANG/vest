import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Command } from "../Command.js";
import { ArgumentsCamelCase } from "yargs";

export class KeyGenerateCommand extends Command {
  protected signature = "key:generate";
  protected description = "Generate a new application key";

  protected options = {
    write: {
      type: "boolean" as const,
      description: "Write/append APP_KEY to .env if not present",
      default: false,
    },
    force: {
      type: "boolean" as const,
      description: "Overwrite existing APP_KEY",
      default: false,
    },
    "display-only": {
      type: "boolean" as const,
      description: "Only display generated key; do not write",
      default: false,
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const newKey = this.makeAppKey();

    if (args.displayOnly) {
      this.line(newKey);
      return;
    }

    if (args.write || args.force) {
      const envPath = path.resolve(process.cwd(), ".env");
      const result = this.updateEnvFile(envPath, newKey, Boolean(args.force));

      if (result.updated) {
        this.info(result.message);
      } else {
        this.warn(result.message);
      }
    } else {
      this.info(`Generated APP_KEY: ${newKey}`);
      this.line("");
      this.line("Use --write to append to .env, or --force to overwrite existing.");
    }
  }

  private makeAppKey(): string {
    const raw = crypto.randomBytes(32).toString("base64");
    return "base64:" + raw;
  }

  private updateEnvFile(
    envPath: string,
    newKey: string,
    force: boolean,
  ): { updated: boolean; message: string } {
    let content = "";
    const exists = fs.existsSync(envPath);
    if (exists) content = fs.readFileSync(envPath, "utf8");
    const hasKey = /^APP_KEY=.+/m.test(content);

    if (hasKey && !force) {
      return { updated: false, message: "APP_KEY already exists. Use --force to overwrite." };
    }

    if (hasKey) {
      content = content.replace(/^APP_KEY=.+/m, `APP_KEY=${newKey}`);
    } else {
      if (content && !content.endsWith("\n")) content += "\n";
      content += `APP_KEY=${newKey}\n`;
    }
    fs.writeFileSync(envPath, content, "utf8");
    return { updated: true, message: `APP_KEY written to ${envPath}` };
  }
}
