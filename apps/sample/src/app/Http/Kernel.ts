import { HttpKernel } from "@vest/router";
import { authMiddleware } from "./Middleware/auth.js";

export class Kernel extends HttpKernel {
  protected override routeMiddleware = {
    auth: authMiddleware,
  };
}
