import fs from "fs";
import path from "path";
import { Command } from "../Command.js";
import type { ArgumentsCamelCase } from "yargs";

interface PublishItem {
  tag: string;
  from: string;
  to: string;
}

interface LaraNodeManifest {
  publish?: PublishItem[];
}

interface PackageJson {
  name?: string;
  laraNode?: LaraNodeManifest;
}

export class VendorPublishCommand extends Command {
  protected signature = "vendor:publish";
  protected description = "Publish config files from @lara-node/* packages into src/config/";

  protected options = {
    tag: {
      type: "string" as const,
      description: "Only publish items matching this tag (e.g. config)",
      alias: "t",
    },
    provider: {
      type: "string" as const,
      description: "Only publish from a specific package name (e.g. mail)",
      alias: "p",
    },
    force: {
      type: "boolean" as const,
      description: "Overwrite files that already exist",
      alias: "f",
      default: false,
    },
    list: {
      type: "boolean" as const,
      description: "List all publishable files without copying",
      alias: "l",
      default: false,
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const tag = this.option<string | undefined>("tag");
    const provider = this.option<string | undefined>("provider");
    const force = this.option<boolean>("force", false);
    const listOnly = this.option<boolean>("list", false);

    const cwd = process.cwd();
    const laraNodeModulesPath = path.join(cwd, "node_modules", "@lara-node");

    if (!fs.existsSync(laraNodeModulesPath)) {
      this.error("No @lara-node packages found in node_modules.");
      return;
    }

    const packageNames = fs.readdirSync(laraNodeModulesPath).filter((name) => {
      if (provider) return name === provider || name.includes(provider);
      return true;
    });

    if (packageNames.length === 0) {
      this.warn("No matching @lara-node packages found.");
      return;
    }

    let published = 0;
    let skipped = 0;

    for (const pkgName of packageNames) {
      const pkgPath = path.join(laraNodeModulesPath, pkgName);
      const pkgJsonPath = path.join(pkgPath, "package.json");

      if (!fs.existsSync(pkgJsonPath)) continue;

      const pkgJson: PackageJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      const publishItems: PublishItem[] = pkgJson.laraNode?.publish ?? [];

      if (publishItems.length === 0) continue;

      for (const item of publishItems) {
        if (tag && item.tag !== tag) continue;

        const fromPath = path.join(pkgPath, item.from);
        const toPath = path.join(cwd, "src", item.to);

        if (!fs.existsSync(fromPath)) {
          this.warn(`  [@lara-node/${pkgName}] Source not found: ${item.from}`);
          continue;
        }

        if (listOnly) {
          this.line(`  @lara-node/${pkgName}  ${item.tag}  src/${item.to}`);
          continue;
        }

        if (fs.existsSync(toPath) && !force) {
          this.warn(`  Skipped: src/${item.to} (already exists — use --force to overwrite)`);
          skipped++;
          continue;
        }

        fs.mkdirSync(path.dirname(toPath), { recursive: true });
        fs.copyFileSync(fromPath, toPath);
        this.success(`  Copied:  src/${item.to}`);
        published++;
      }
    }

    if (!listOnly) {
      this.newLine();
      if (published > 0) {
        this.info(`Published ${published} file(s).`);
      }
      if (skipped > 0) {
        this.comment(`Skipped ${skipped} file(s) that already exist. Run with --force to overwrite.`);
      }
      if (published === 0 && skipped === 0) {
        this.warn("Nothing to publish.");
      }
    }
  }
}
