import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ensure .env loaded if this module is imported directly
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const APP_NAME = process.env.APP_NAME || "app";
export const CACHE_DRIVER = (process.env.CACHE_DRIVER || "file").toLowerCase();
export const CACHE_PREFIX = process.env.CACHE_PREFIX || APP_NAME;
export const SKIP_CACHE =
  String(process.env.SKIP_CACHE || "").toLowerCase() === "1" ||
  String(process.env.SKIP_CACHE || "").toLowerCase() === "true";

export const APP_KEY = process.env.APP_KEY || "";

// Documentation configuration
export const DOCS_ENABLED = (() => {
  const flag = process.env.DOCS_ENABLED;
  if (flag !== undefined) return flag.toLowerCase() === "true" || flag === "1";
  return process.env.NODE_ENV !== "production";
})();
export const DOCS_TITLE = process.env.DOCS_TITLE || "API Documentation";
export const DOCS_VERSION = process.env.DOCS_VERSION || "1.0.0";
export const DOCS_PATH = process.env.DOCS_PATH || "/docs";
export const DOCS_THEME = process.env.DOCS_THEME || "kepler";

export default {
  appName: APP_NAME,
  cache: {
    driver: CACHE_DRIVER,
    prefix: CACHE_PREFIX,
    skip: SKIP_CACHE,
  },
  appKey: APP_KEY,
  docs: {
    enabled: DOCS_ENABLED,
    title: DOCS_TITLE,
    version: DOCS_VERSION,
    path: DOCS_PATH,
    theme: DOCS_THEME,
  },
};
