# @lara-node/example

> Skeleton for authoring a new `@lara-node/*` package. Copy it, rename it, and start building.

This directory is `private: true`, so it is **never published**. It exists as a
ready-to-copy template that already matches the monorepo's build, tsconfig, and
service-provider conventions.

## Create a new package from this skeleton

```bash
# From the repo root
cp -r packages/_template packages/<your-package>
cd packages/<your-package>
rm -rf node_modules dist
```

Then edit `package.json`:

1. Set `"name"` to `@lara-node/<your-package>`.
2. **Remove** the `"private": true` line so it can be published.
3. Set a real `"version"` (e.g. `0.1.0`), `"description"`, and `"keywords"`.
4. Add any internal deps you need as `"@lara-node/<dep>": "workspace:^"` and
   list each one in `external` inside `tsdown.config.ts` (see below).

Finally, install and build:

```bash
# From the repo root
pnpm install
pnpm --filter @lara-node/<your-package> build
```

## Layout

```
src/
  config.ts                  # typed config + defaults (read env at call time)
  ExampleService.ts          # the functionality your package provides
  ExampleServiceProvider.ts  # wires the package into the app lifecycle
  index.ts                   # registers config + re-exports the public API
package.json                 # name, exports (esm+cjs+types), scripts, deps
tsconfig.json                # extends the root tsconfig
tsdown.config.ts             # esm + cjs + d.ts build, @lara-node/* kept external
```

## Conventions that matter

- **Dual build (ESM + CJS + types).** `tsdown` emits `dist/index.js`,
  `dist/index.cjs`, and `dist/index.d.ts`; `package.json#exports` maps all three.
  Don't hand-write `dist`.

- **Keep `@lara-node/*` peers external.** In `tsdown.config.ts`, every internal
  dependency must be listed in `external`. Bundling a copy of, say,
  `@lara-node/db` would give your package its **own** module instance and break
  process-global singletons (you'd get errors like _"MongoDB not initialized"_
  even though the app connected). Resolve peers at runtime instead.

- **No module-level process-global state.** Don't keep connections, pools, or
  registries in a top-level `let`. If an app bundles your package while another
  package loads it from `node_modules`, those are two different module instances
  with separate state. Store shared state on `globalThis` behind a
  `Symbol.for("@lara-node/<pkg>:<thing>")` key — see `@lara-node/db`'s
  `connection.ts` for the canonical pattern.

- **Read env at call time.** Capture `process.env.*` inside functions/getters,
  not at module top-level, so `dotenv` has run first.

- **Register config on import.** `index.ts` calls `setConfig("<ns>", defaults)`
  so `config("<ns>")` works before any app override.

## Usage (once published & registered)

Apps register your provider in `AppServiceProvider.additionalProviders`:

```ts
import { ExampleServiceProvider } from "@lara-node/example";

protected additionalProviders = [
  // ...
  ExampleServiceProvider,
];
```

…then resolve and use the service:

```ts
import { ExampleService } from "@lara-node/example";

const example = app.make(ExampleService);
console.log(example.greet("Ada")); // "Hello from @lara-node/example, Ada!"
```

## Scripts

| Script             | What it does                          |
| ------------------ | ------------------------------------- |
| `pnpm build`       | Build ESM + CJS + `.d.ts` into `dist` |
| `pnpm dev`         | Rebuild on change (`tsdown --watch`)  |
| `pnpm typecheck`   | `tsc --noEmit`                        |
| `pnpm test`        | Run `vitest`                          |
| `pnpm clean`       | Remove `dist`                         |
