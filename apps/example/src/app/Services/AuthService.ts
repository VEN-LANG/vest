import bcrypt from "bcrypt";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { TPermission, TRole } from "@app/Http/types";
import User from "@app/Models/User/User";
import { encryptToken } from "@app/Helpers/auth";

const JWT_SECRET: Secret = (process.env.JWT_SECRET || "dev-secret-change") as Secret;
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN || "7d") as any;

export class AuthService {
  async register(data: { name: string; email: string; password: string }) {
    const hashed = await bcrypt.hash(data.password, 10);
    return await User.create({
      name: data.name,
      email: data.email,
      password: hashed,
      active_status: false,
    });
  }

  async login(email: string, password: string) {
    let user = await User.where("email", "=", email)
      .with(["profile", "roles", "roles.permissions"])
      .first();

    if (!user) return null;

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return null;

    await user.update({
      last_login: new Date(),
    });

    const payload: JwtPayload = {
      sub: String(user.id),
      email: user.email,
    };

    const signedToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const encryptedToken = encryptToken(signedToken);

    return {
      token: encryptedToken,
      user: user.toJSON(),
    };
  }

  async getUserRoles(userId: number | string): Promise<TRole[]> {
    let user = await User.with(["profile", "roles", "roles.permissions"]).find(userId);
    if (!user || !user.toJSON().roles) return [];
    return user?.toJSON()?.roles as TRole[];
  }

  async getUserPermissions(userId: number | string): Promise<TPermission[]> {
    let roles = await this.getUserRoles(userId);
    let permissions = [];
    for (const role of roles) {
      permissions.push(...role.permissions);
    }
    return permissions;
  }
}

export default new AuthService();
