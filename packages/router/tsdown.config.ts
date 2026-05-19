import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  external: ["@lara-node/core", "@lara-node/db"],
  outDir: "dist",
  hash: false,
});
