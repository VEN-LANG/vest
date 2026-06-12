# Token Generation

Generate and verify JWT tokens for authentication.

## Generating Tokens

```typescript
import { generateToken } from "@lara-node/auth";

// Basic token (expires in 1 hour)
const token = generateToken({ userId: 1 }, 3600);

// Custom payload
const token = generateToken(
  {
    userId: 1,
    role: "admin",
    permissions: ["read", "write"],
  },
  86400,
); // 24 hours
```

## Verifying Tokens

```typescript
import { verifyToken } from "@lara-node/auth";

try {
  const payload = verifyToken(token);
  console.log(payload.userId);
} catch (error) {
  // Token is invalid or expired
}
```

## Token Expiry

Tokens expire based on the seconds provided:

```typescript
generateToken(payload, 60); // 1 minute
generateToken(payload, 3600); // 1 hour
generateToken(payload, 86400); // 24 hours
generateToken(payload, 604800); // 7 days
```

## Usage in Auth Flow

```typescript
@Route("/api/auth")
class AuthController {
  @Route.post("/login")
  async login(req: Request) {
    const { email, password } = req.body;

    const user = await User.where("email", email).first();

    if (!user || !(await comparePassword(password, user.password))) {
      return { error: "Invalid credentials" };
    }

    const token = generateToken({ userId: user.id }, 86400);

    return { token, user: user.toJSON() };
  }
}
```

## Next Steps

- [Auth Middleware](/packages/auth/middleware) -- Protect routes
- [Password Hashing](/packages/auth/passwords) -- Hash passwords
- [Token Encryption](/packages/auth/encryption) -- Encrypt tokens
