export { MiddlewareStack, middlewareStack } from "@lara-node/core";
export type {
  MiddlewareEntry,
  IMiddleware,
  MiddlewareGroupConfig,
} from "@lara-node/core";

/*
 * Core's middleware-constructor type is called `Middleware`, and so is the
 * @Middleware() decorator this package exports. Two symbols under one name in
 * the same barrel is more than a readability problem: the .d.ts generator
 * resolved the collision by emitting BOTH as types, so the decorator was
 * declared `export type Middleware` while the JavaScript exported a function.
 * Consumers then got
 *
 *   TS1362: 'Middleware' cannot be used as a value because it was exported
 *           using 'export type'.
 *
 * on code that runs perfectly well. Renaming here — the only point this
 * package pulls the type in — leaves the name `Middleware` unambiguous
 * everywhere downstream.
 */
export type { Middleware as MiddlewareClass } from "@lara-node/core";
