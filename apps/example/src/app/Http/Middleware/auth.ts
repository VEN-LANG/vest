import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { asyncLocalStorage } from "@app/Http/Middleware/asyncContext";
import User from "@app/Models/User/User";
import { decryptToken } from "@app/Helpers/auth";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        roles?: string[];
        permissions?: string[];
        // landlord_ids/user_type removed in starter template
      };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    // DECRYPT FIRST
    const decryptedJwt = decryptToken(token);

    // VERIFY AFTER DECRYPTION
    const decoded = jwt.verify(decryptedJwt, JWT_SECRET) as any;

    const uid = decoded.sub;

    const userModel = await User.with(["profile", "roles", "roles.permissions"]).find(uid);

    if (!userModel) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    await userModel.update({
      last_seen_at: new Date(),
    });

    await userModel.refresh();

    const roles = (userModel.toJSON() as any).roles || [];
    const permissionsArr: any[] = [];

    for (const role of roles) {
      permissionsArr.push(...((role as any).permissions || []));
    }

    req.user = {
      id: uid,
      roles: roles.map((r: any) => r.slug),
      permissions: permissionsArr.map((p: any) => p.slug),
    };

    const store = asyncLocalStorage.getStore();
    if (store) {
      store.user = userModel;
    }

    next();
  } catch (e) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
}

export function authorizeRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    if (!roles.some((r) => userRoles.includes(r)))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

export function authorizePermissions(...perms: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPerms = req.user?.permissions || [];
    if (!perms.some((p) => userPerms.includes(p)))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
