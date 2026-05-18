# @lara-node/auth

JWT generation/verification, AES-256-GCM token encryption, bcrypt password hashing, and an Express auth middleware.

## Installation

```sh
pnpm add @lara-node/auth
```

## Quick Start

```ts
import { generateToken, verifyToken, hashPassword, comparePassword, authMiddleware } from '@lara-node/auth';

// Hash a password at registration
const hash = await hashPassword('secret123');

// Verify on login
const match = await comparePassword('secret123', hash); // true

// Issue a JWT
const token = generateToken({ userId: 42, role: 'admin' }, 3600);

// Protect a route
app.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});
```

## API

### `generateToken(payload, expiresInSeconds?)`

Signs an HS256 JWT using `APP_KEY`. The key must be a base64-encoded 32-byte value (see Environment Variables).

```ts
const token = generateToken({ userId: 1 });          // default: no expiry
const token = generateToken({ userId: 1 }, 86400);   // expires in 24 h
```

Returns a signed JWT string.

### `verifyToken(token)`

Decodes and verifies a JWT. Returns the payload object on success, or `null` if the token is invalid or expired.

```ts
const payload = verifyToken(token);
if (!payload) {
  throw new Error('Unauthorized');
}
console.log(payload.userId);
```

### `hashPassword(password)`

Hashes a plaintext password with bcrypt (falls back to scrypt if bcrypt is unavailable). Always async.

```ts
const hash = await hashPassword('my-password');
```

### `comparePassword(password, hash)`

Compares a plaintext password against a stored hash. Returns `true` on match, `false` otherwise.

```ts
const ok = await comparePassword('my-password', storedHash);
```

### `encryptToken(token)`

Encrypts a string using AES-256-GCM. Returns a colon-delimited string in the form `iv:tag:ciphertext`.

```ts
const encrypted = encryptToken(rawJwt);
// store in cookie or DB
```

### `decryptToken(encrypted)`

Reverses `encryptToken`. Returns the original string.

```ts
const original = decryptToken(encrypted);
```

### `authMiddleware`

Express middleware that reads the `Authorization: Bearer <token>` header, verifies the JWT, and attaches the decoded payload to `req.user`. Responds with `401` if the token is missing or invalid.

```ts
import express from 'express';
import { authMiddleware } from '@lara-node/auth';

const app = express();

app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
```

To extend the `Request` type:

```ts
// src/types/express.d.ts
import '@lara-node/auth';

declare module 'express-serve-static-core' {
  interface Request {
    user?: Record<string, unknown>;
  }
}
```

## Environment Variables

| Variable  | Default   | Description                                                        |
|-----------|-----------|--------------------------------------------------------------------|
| `APP_KEY` | —         | **Required.** Base64-encoded 32-byte key. Format: `base64:<key>`. |

Generate a key:

```sh
node artisan key:generate
```

Or manually:

```sh
node -e "console.log('base64:' + require('crypto').randomBytes(32).toString('base64'))"
```

## Notes

- `generateToken` and `verifyToken` use the standard `jsonwebtoken` library under the hood.
- `encryptToken`/`decryptToken` derive the AES key from `APP_KEY` using the same base64 decode; keep `APP_KEY` consistent across deploys.
- If bcrypt native bindings are not available (e.g. some Alpine/musl environments), the package silently falls back to the built-in `crypto.scrypt`. The hash format differs, so do not mix hashes between environments.
