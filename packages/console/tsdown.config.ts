import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts", "src/artisan.ts"],
  format: ["esm", "cjs"],
  dts: true,
  external: ["@lara-node/core"],
  outDir: "dist",
  hash: false,
});
