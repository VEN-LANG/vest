import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  external: ["fast-xml-parser"],
  outDir: "dist",
  hash: false,
});
