import type { NextFunction, Request, Response } from "express";
import { auth } from "@app/Helpers/auth";

export default function authorizeByStatus(req: Request, res: Response, next: NextFunction) {
  if (auth().check()) {
    const user = auth().user();
    if (user) {
      if (user.isActive()) {
        next();
        return;
      }
      res.status(401).json({ message: "Account Inactive" });
      return;
    }
    res.status(401).json({ message: "Failed to load authenticated user" });
    return;
  }
  res.status(401).json({ message: "Unauthorized" });
}
