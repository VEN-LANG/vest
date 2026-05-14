import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.APP_KEY;
  if (!raw) throw new Error("APP_KEY is not set");
  const stripped = raw.replace(/^base64:/, "");
  const decoded = Buffer.from(stripped, "base64");
  return decoded.length === 32 ? decoded : crypto.createHash("sha256").update(decoded).digest();
}

export function encryptToken(token: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted].join(":");
}

export function decryptToken(token: string): string {
  const key = getKey();
  const [ivBase64, tagBase64, encrypted] = token.split(":");
  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/*
|--------------------------------------------------------------------------
| JWT-like Token Generation (HMAC-SHA256)
|--------------------------------------------------------------------------
*/

interface TokenPayload {
  sub: string | number;
  [key: string]: any;
}

export function generateToken(payload: TokenPayload, expiresInSeconds?: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const claims: Record<string, any> = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
  };
  if (expiresInSeconds) {
    claims.exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  }
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const secret = process.env.APP_KEY ?? "fallback-secret";
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const secret = process.env.APP_KEY ?? "fallback-secret";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${body}`)
      .digest("base64url");
    if (sig !== expected) return null;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (claims.exp && Math.floor(Date.now() / 1000) > claims.exp) return null;
    return claims as TokenPayload;
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Password Hashing (pure crypto, no bcrypt dependency)
|--------------------------------------------------------------------------
*/

export async function hashPassword(password: string): Promise<string> {
  try {
    const bcrypt = await import("bcrypt");
    return bcrypt.hash(password, 12);
  } catch {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  try {
    const bcrypt = await import("bcrypt");
    return bcrypt.compare(password, hashed);
  } catch {
    const [salt, hash] = hashed.split(":");
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  }
}

/*
|--------------------------------------------------------------------------
| Auth Middleware
|--------------------------------------------------------------------------
*/

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
  (req as any).user = payload;
  next();
}

export default { generateToken, verifyToken, hashPassword, comparePassword, authMiddleware };
