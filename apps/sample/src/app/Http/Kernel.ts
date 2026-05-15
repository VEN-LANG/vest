import { HttpKernel } from "@vest-ts/router";
import { authMiddleware } from "./Middleware/auth.js";

export class Kernel extends HttpKernel {
  protected override routeMiddleware = {
    auth: authMiddleware,
  };
}
