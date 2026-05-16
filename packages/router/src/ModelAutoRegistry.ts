import fs from "fs";
import path from "path";
import type { RequestHandler } from "express";
import type { Model } from "@lara-node/db";
import RouterBuilder from "./router.js";

/**
 * Walk a directory tree and register every exported class that extends Model
 * into the router's model registry (used for route-model binding).
 *
 * - Runs in CJS environments using require().
 * - Safe to call multiple times; duplicate registrations overwrite silently.
 * - Skips files that fail to import.
 */
export async function autoRegisterModels(modelsDir: string): Promise<void> {
  const found: Array<{ name: string; file: string }> = [];

  async function walk(dir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile() && /\.(ts|js)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mod: Record<string, unknown> = require(full);
          const candidates = Object.entries(mod);
          if (typeof mod.default === "function") {
            candidates.push(["default", mod.default]);
          }
          for (const [key, val] of candidates) {
            if (
              typeof val === "function" &&
              val.prototype &&
              isModelSubclass(val as typeof Model)
            ) {
              const className = key === "default"
                ? ((val as typeof Model).name || path.parse(ent.name).name)
                : key;
              RouterBuilder.registerModel(className.toLowerCase(), val as typeof Model);
              found.push({ name: className, file: full });
            }
          }
        } catch {
          // Non-fatal — file may have side-effects or missing deps; skip
        }
      }
    }
  }

  await walk(modelsDir);
  return;
}

function isModelSubclass(cls: typeof Model): boolean {
  try {
    // Walk the prototype chain looking for a class named "Model"
    let proto = Object.getPrototypeOf(cls);
    while (proto && proto !== Function.prototype) {
      if (proto.name === "Model") return true;
      proto = Object.getPrototypeOf(proto);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Express middleware that auto-registers all Model subclasses from the given
 * directory on the first request. Subsequent requests skip the scan.
 *
 * Usage in RouteServiceProvider.boot():
 *   app.use(modelRegistryMiddleware(path.join(__dirname, '../Models')));
 */
export function modelRegistryMiddleware(modelsDir: string): RequestHandler {
  let registered = false;
  return async (_req, _res, next) => {
    try {
      if (!registered) {
        await autoRegisterModels(modelsDir);
        registered = true;
      }
    } catch {
      // proceed even if scan fails
    }
    next();
  };
}
