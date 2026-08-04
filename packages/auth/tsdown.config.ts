import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  /*
   * Every @lara-node package stays external. Bundling a sibling gives this
   * package a private copy of that sibling's module-global state — the job
   * registry, the container, the DB connection — and the two copies then
   * disagree about what has been registered. Never narrow this.
   */
  external: [/^@lara-node\//],
  outDir: "dist",
  hash: false,
});
