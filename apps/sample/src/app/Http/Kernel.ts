import { HttpKernel } from "@lara-node/router";
import { authMiddleware } from "./Middleware/auth.js";

export class Kernel extends HttpKernel {
  protected override routeMiddleware = {
    auth: authMiddleware,
  };
}
