import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@vest/auth";
import { User } from "../../Models/User.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }

  try {
    const payload = verifyToken(token) as { sub: string };
    const user = await User.find(payload.sub);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
