import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  // Keep @lara-node/* packages external so they are resolved at runtime and
  // share a single instance (important for process-global state such as the
  // database connection). Add other peers here as you depend on them.
  external: ["@lara-node/core"],
  outDir: "dist",
  hash: false,
});
