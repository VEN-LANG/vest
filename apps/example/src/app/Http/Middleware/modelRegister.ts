import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { cacheSet, generateCacheKey } from "@vest-ts/cache";
import RouterBuilder from "@vest-ts/router";
import { Model } from "@vest-ts/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Scan src/app/Models tree, import classes extending Model, register them, and cache the registry summary
export async function registerModelsIntoCache() {
  const modelsRoot = path.resolve(__dirname, "../../Models");
  const found: Array<{ name: string; file: string }> = [];

  async function walk(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile() && /\.(ts|js)$/.test(ent.name)) {
        try {
          const mod = await import(pathToFileURL(full).href);
          for (const [key, val] of Object.entries(mod)) {
            if (
              typeof val === "function" &&
              (val as any).prototype &&
              (val as any).prototype instanceof Model
            ) {
              RouterBuilder.registerModel(key, val as unknown as typeof Model);
              found.push({ name: key, file: full });
            }
          }
        } catch (e) {
          // non-fatal; continue scanning
        }
      }
    }
  }

  try {
    await walk(modelsRoot);
  } catch (e) {
    // ignore if path missing
  }

  const cacheKey = generateCacheKey("models", "registry");
  await cacheSet(cacheKey, { count: found.length, items: found });
}

export default async function modelRegisterMiddleware(req: any, _res: any, next: any) {
  try {
    if (!(globalThis as any).__modelsRegistered) {
      await registerModelsIntoCache();
      (globalThis as any).__modelsRegistered = true;
    }
  } catch (e) {
    // proceed even if scan fails
  }
  next();
}
