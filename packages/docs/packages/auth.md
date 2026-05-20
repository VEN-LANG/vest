# Auth Package

The `@lara-node/auth` package provides JWT authentication, password hashing, and token encryption.

## Installation

```bash
pnpm add @lara-node/auth @lara-node/core bcrypt jsonwebtoken
```

## Overview

Features include:

- **JWT token generation** and verification
- **Password hashing** with bcrypt (scrypt fallback)
- **Auth middleware** for protecting routes
- **Token encryption** with AES-256-GCM

## Quick Start

```typescript
import { generateToken, verifyToken, hashPassword, comparePassword } from "@lara-node/auth";

// Hash password
const hashed = await hashPassword("secret");

// Verify password
const isValid = await comparePassword("secret", hashed);

// Generate token
const token = generateToken({ userId: 1 }, 3600); // 1 hour

// Verify token
const payload = verifyToken(token);
```

## Key Exports

| Export              | Description                    |
| ------------------- | ------------------------------ |
| `generateToken()`   | Create JWT token               |
| `verifyToken()`     | Verify and decode token        |
| `hashPassword()`    | Hash password with bcrypt      |
| `comparePassword()` | Compare password with hash     |
| `authMiddleware`    | Express auth middleware        |
| `encryptToken()`    | Encrypt token with AES-256-GCM |
| `decryptToken()`    | Decrypt token                  |

## Next Steps

- [Token Generation](/packages/auth/tokens) -- JWT tokens
- [Password Hashing](/packages/auth/passwords) -- Hash passwords
- [Auth Middleware](/packages/auth/middleware) -- Protect routes
