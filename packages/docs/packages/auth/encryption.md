# Token Encryption

Encrypt and decrypt tokens using AES-256-GCM.

## Configuration

Requires `APP_KEY` environment variable:

```dotenv
APP_KEY=base64:your-32-byte-key-here
```

Generate a key:

```bash
pnpm exec artisan key:generate
```

## Encrypting Tokens

```typescript
import { encryptToken } from '@lara-node/auth'

const encrypted = encryptToken(token)
```

## Decrypting Tokens

```typescript
import { decryptToken } from '@lara-node/auth'

const decrypted = decryptToken(encrypted)
```

## Use Cases

### Password Reset Tokens

```typescript
const token = generateToken({ userId: user.id, type: 'reset' }, 3600)
const encrypted = encryptToken(token)

// Send encrypted token via email
await Mail.to(user.email).send(new ResetPasswordMail(encrypted))
```

### Email Verification

```typescript
const token = generateToken({ userId: user.id, email: user.email }, 86400)
const encrypted = encryptToken(token)

// Store in database or send via email
```

## Next Steps

- [Token Generation](/packages/auth/tokens) -- JWT tokens
- [Password Hashing](/packages/auth/passwords) -- Hash passwords
- [Auth Middleware](/packages/auth/middleware) -- Protect routes
