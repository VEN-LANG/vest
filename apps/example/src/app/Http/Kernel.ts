import { HttpKernel } from "@lara-node/router";
import { asyncContextMiddleware } from "./Middleware/asyncContext.js";
import requestLoggerMiddleware from "./Middleware/requestLogger.js";
import validatorMiddleware from "./Middleware/validator.js";
import responseExtenderMiddleware from "./Middleware/responseExtender.js";
import modelRegisterMiddleware from "./Middleware/modelRegister.js";
import { authMiddleware, authorizePermissions, authorizeRoles } from "./Middleware/auth.js";
import authorizeByStatus from "./Middleware/authorizeByStatus.js";
import errorHandler from "./Middleware/errorHandler.js";
import { ThrottleMiddleware } from "@lara-node/router";

/**
 * HTTP Kernel
 *
 * Configure global middleware, named aliases, and middleware groups for your app.
 * Framework internals (boot, configureErrorHandling, etc.) live in @lara-node/router.
 */
export class Kernel extends HttpKernel {
  /**
   * Global middleware — run on every request.
   * Order matters: async context first, then logging, validation, response augmentation.
   */
  protected override middleware = [
    asyncContextMiddleware,
    requestLoggerMiddleware,
    validatorMiddleware,
    responseExtenderMiddleware,
    modelRegisterMiddleware,
  ];

  /**
   * Named middleware aliases — use these in routes: Route.middleware('auth')
   */
  protected override routeMiddleware: Record<string, any> = {
    auth: authMiddleware,
    can: (...perms: string[]) => authorizePermissions(...perms),
    role: (...roles: string[]) => authorizeRoles(...roles),
    "must-be-active": authorizeByStatus,
    throttle: ThrottleMiddleware,
  };

  /**
   * Middleware groups — apply to a whole route group.
   */
  protected override middlewareGroups = {
    web: [] as any[],
    api: ["throttle:120,1"],
  };

  /**
   * Call configureErrorHandling() with the app error handler after routes are mounted.
   */
  configureErrorHandling(): void {
    super.configureErrorHandling(errorHandler as any);
  }
}
