import { asyncLocalStorage } from "@app/Http/Middleware/asyncContext";
import AuthService from "@app/Services/AuthService";
import { User } from "@app/Models/User";
import type { Request } from "express";
import { TRequest } from "@app/Http/types";

export function auth() {
  const store = asyncLocalStorage.getStore();
  const userModel = store ? (store as any).user : undefined;

  return {
    user(): User | null {
      return userModel || null;
    },
    id(): number | string | undefined {
      return userModel
        ? (userModel as any).getAttribute
          ? (userModel as any).getAttribute((userModel.constructor as any).primaryKey || "id")
          : userModel.id
        : undefined;
    },
    check(): boolean {
      return !!userModel;
    },
  };
}

export async function authenticate(email: string, password: string) {
  const res = await AuthService.login(email, password);
  if (!res) return null;
  // load full model instance
  const userModel = await User.with(["profile", "roles", "roles.permissions"])
    .where("email", "=", email)
    .first();
  const store = asyncLocalStorage.getStore();
  if (store) store.user = userModel;
  return { token: res.token, user: userModel };
}

export function setUser(userModel: any) {
  const store = asyncLocalStorage.getStore();
  if (store) store.user = userModel;
}

export function clearUser() {
  const store = asyncLocalStorage.getStore();
  if (store) delete (store as any).user;
}

export const parseRequest = (req: Request) => {
  const { query, params, body, headers, user } = req;
  query.page =
    Number(query.page) && Number(query.page) > 0 ? Math.floor(Number(query.page)) : (0 as any);
  query.limit =
    Number(query.limit) && Number(query.limit) > 0 ? Math.floor(Number(query.limit)) : (10 as any);
  return { query, params, body, headers, user } as TRequest;
};

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const rawKey = process.env.APP_KEY;
  if (!rawKey) return Buffer.alloc(32); // fallback when APP_KEY not set
  return Buffer.from(rawKey.replace(/^base64:/, ""), "base64");
}
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(token, "utf8", "base64");
  encrypted += cipher.final("base64");

  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted].join(":");
}

export function decryptToken(token: string): string {
  const [ivBase64, tagBase64, encrypted] = token.split(":");

  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
export default auth;
