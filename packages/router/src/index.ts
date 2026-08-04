export { RouterBuilder, default } from "./router.js";
export { Doc } from "./Doc.js";
export type { DocMetadata } from "./Doc.js";
export type { GroupOptions, HandlerOrAlias } from "./router.js";
export { OpenApiGenerator } from "./OpenApiGenerator.js";
export { RouteScanner, registerRouteBuilder } from "./RouteScanner.js";
export { MiddlewareStack, middlewareStack } from "./Middleware/MiddlewareStack.js";
export type {
  MiddlewareEntry,
  // MiddlewareClass is the constructor type, IMiddleware the handler interface.
  // Neither is called `Middleware` — that name belongs to the decorator below,
  // and sharing it broke the generated .d.ts. See MiddlewareStack.ts.
  MiddlewareClass,
  IMiddleware,
  MiddlewareGroupConfig,
} from "./Middleware/MiddlewareStack.js";
export {
  registerMiddleware,
  resolveMiddleware,
  getRegisteredMiddleware,
  hasMiddleware,
} from "./Middleware/middleware.js";
export {
  throttle as ThrottleMiddleware,
  apiThrottle,
  userThrottle,
} from "./Middleware/ThrottleMiddleware.js";
export { HttpKernel } from "./Http/Kernel.js";
export { DocServiceProvider } from "./DocServiceProvider.js";
export { autoRegisterModels, modelRegistryMiddleware } from "./ModelAutoRegistry.js";
export { Bind, Middleware } from "./decorators.js";
export { Route, getRegisteredControllers } from "./ControllerDecorators.js";
export type { MethodRoute, ControllerMeta } from "./ControllerDecorators.js";

export * from "./Commands.js";
