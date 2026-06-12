---
name: @lara-node/auth — JWT Authentication & Password Hashing
description: >-
  JWT token generation/verification, bcrypt password hashing, and auth middleware.
  Activates for questions about generateToken, verifyToken, hashPassword,
  comparePassword, authMiddleware, or encryptToken/decryptToken.
---

# @lara-node/auth

JWT authentication, password hashing (bcrypt with scrypt fallback), and token encryption (AES-256-GCM).

## Key Exports

| Export | Description |
|--------|-------------|
| `generateToken(payload, expiresIn)` | Create JWT token |
| `verifyToken(token)` | Verify and decode JWT |
| `hashPassword(password)` | Hash with bcrypt |
| `comparePassword(password, hash)` | Compare password with hash |
| `authMiddleware` | Express auth middleware |
| `encryptToken(token)` | Encrypt with AES-256-GCM |
| `decryptToken(token)` | Decrypt token |

## Quick Start

```typescript
import { generateToken, verifyToken, hashPassword, comparePassword } from "@lara-node/auth";

const hashed = await hashPassword("secret");
const isValid = await comparePassword("secret", hashed);
const token = generateToken({ userId: 1 }, 3600);
const payload = verifyToken(token);
```

## Auth Middleware

```typescript
import { authMiddleware } from "@lara-node/auth";
import { middlewareStack } from "@lara-node/core";

middlewareStack.add("auth", authMiddleware);

// In router:
Route.get("/profile", UserController.profile).middleware("auth");
```
