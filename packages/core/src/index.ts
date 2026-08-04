export { Container, container, app, Injectable, INJECTED_DEPENDENCIES } from "./Container.js";
export { FormRequest, Request, request, requestOrFail } from "./Request.js";
export type {
  RequestInstance,
  UploadedFile,
  HeaderBag,
  CookieBag,
  BasicCredentials,
} from "./Request.js";
export {
  asyncLocalStorage,
  runWithContext,
  currentContext,
  contextGet,
  contextSet,
} from "./context.js";
export type { RequestContextStore } from "./context.js";
export type { Constructor, Abstract } from "./Container.js";
export { Application } from "./Application.js";
export { ServiceProvider } from "./ServiceProvider.js";
export type { ServiceProviderClass, CommandClass } from "./ServiceProvider.js";
export { MiddlewareServiceProvider } from "./MiddlewareServiceProvider.js";
export { MiddlewareStack, middlewareStack } from "./MiddlewareStack.js";
export type {
  MiddlewareEntry,
  Middleware,
  IMiddleware,
  MiddlewareGroupConfig,
} from "./MiddlewareStack.js";
export {
  registerMiddleware,
  resolveMiddleware,
  getRegisteredMiddleware,
  hasMiddleware,
  getMiddlewareStack,
} from "./middleware.js";
export {
  config,
  setConfig,
  mergeConfig,
  hasConfig,
  allConfig,
  hydrateConfig,
  cacheConfig,
  restoreConfigFromCache,
  clearConfigCache,
  setConfigCacheBackend,
  hasConfigCacheBackend,
} from "./Config.js";
export type { ConfigCacheBackend } from "./Config.js";
export { Provider, getRegisteredProviders } from "./decorators.js";
export { dd, clone } from "./helpers.js";

// Register on globalThis so request() works everywhere without an import,
// mirroring auth() from @lara-node/auth.
import { request as _request, requestOrFail as _requestOrFail } from "./Request.js";
import type { RequestInstance as _RequestInstance } from "./Request.js";
Object.assign(globalThis, { request: _request, requestOrFail: _requestOrFail });

declare global {
  /** The current request, or null outside an HTTP request context. */
  function request(): _RequestInstance | null;

  /** The current request, throwing when there is none. */
  function requestOrFail(): _RequestInstance;
}
