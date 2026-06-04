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
  providers?: string[];
}

interface PackageJson {
  name?: string;
  laraNode?: LaraNodeManifest;
}

export class VendorPublishCommand extends Command {
  protected signature = "vendor:publish";
  protected description = "Publish config/migration/view files from installed packages";

  protected options = {
    tag: {
      type: "string" as const,
      description: "Only publish items matching this tag (e.g. config, migrations)",
      alias: "t",
    },
    provider: {
      type: "string" as const,
      description: "Only publish from a specific package or provider class name",
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

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const tag = this.option<string | undefined>("tag");
    const provider = this.option<string | undefined>("provider");
    const force = this.option<boolean>("force", false);
    const listOnly = this.option<boolean>("list", false);

    const cwd = process.cwd();
    const nodeModulesPath = path.join(cwd, "node_modules");

    if (!fs.existsSync(nodeModulesPath)) {
      this.error("No node_modules found.");
      return;
    }

    const publishItems: Array<{ pkg: string; item: PublishItem }> = [];

    // Scan all packages that have a laraNode key in their package.json
    this.scanPackages(nodeModulesPath, provider, publishItems);

    if (publishItems.length === 0) {
      this.warn("No publishable files found.");
      return;
    }

    let published = 0;
    let skipped = 0;

    for (const { pkg, item } of publishItems) {
      if (tag && item.tag !== tag) continue;

      const pkgPath = path.join(nodeModulesPath, pkg);
      const fromPath = path.join(pkgPath, item.from);
      const toPath = path.join(cwd, "src", item.to);

      if (!fs.existsSync(fromPath)) {
        this.warn(`  [${pkg}] Source not found: ${item.from}`);
        continue;
      }

      if (listOnly) {
        this.line(`  ${pkg}  [${item.tag}]  src/${item.to}`);
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

    if (!listOnly) {
      this.newLine();
      if (published > 0) this.info(`Published ${published} file(s).`);
      if (skipped > 0) {
        this.comment(`Skipped ${skipped} file(s). Run with --force to overwrite.`);
      }
      if (published === 0 && skipped === 0 && !tag) {
        this.warn("Nothing to publish.");
      }
    }
  }

  private scanPackages(
    nodeModulesPath: string,
    provider: string | undefined,
    out: Array<{ pkg: string; item: PublishItem }>,
  ): void {
    const readPkg = (pkgDir: string, pkgName: string): void => {
      const pkgJsonPath = path.join(pkgDir, "package.json");
      if (!fs.existsSync(pkgJsonPath)) return;

      try {
        const pkgJson: PackageJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
        if (!pkgJson.laraNode) return;

        if (provider && pkgName !== provider && !pkgName.includes(provider)) return;

        const items: PublishItem[] = pkgJson.laraNode.publish ?? [];
        for (const item of items) {
          out.push({ pkg: pkgName, item });
        }

        // Also check service providers declared in the package for static publishes()
        const providerPaths = pkgJson.laraNode.providers ?? [];
        for (const providerRelPath of providerPaths) {
          try {
            const providerPath = path.join(pkgDir, providerRelPath);
            if (!fs.existsSync(providerPath)) continue;
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const mod: Record<string, unknown> = require(providerPath);
            for (const exported of Object.values(mod)) {
              if (
                typeof exported === "function" &&
                typeof (exported as unknown as Record<string, unknown>).publishes === "function"
              ) {
                const extra = (exported as unknown as { publishes: () => PublishItem[] }).publishes();
                for (const item of extra) out.push({ pkg: pkgName, item });
              }
            }
          } catch {
            /* skip unloadable providers */
          }
        }
      } catch {
        /* skip malformed package.json */
      }
    };

    // Scan flat packages (e.g. node_modules/some-package)
    try {
      for (const entry of fs.readdirSync(nodeModulesPath)) {
        if (entry.startsWith(".")) continue;
        const entryPath = path.join(nodeModulesPath, entry);
        const stat = fs.statSync(entryPath);
        if (!stat.isDirectory()) continue;

        if (entry.startsWith("@")) {
          // Scoped packages
          for (const scoped of fs.readdirSync(entryPath)) {
            const scopedPath = path.join(entryPath, scoped);
            if (fs.statSync(scopedPath).isDirectory()) {
              readPkg(scopedPath, `${entry}/${scoped}`);
            }
          }
        } else {
          readPkg(entryPath, entry);
        }
      }
    } catch {
      /* ignore read errors */
    }
  }
}
