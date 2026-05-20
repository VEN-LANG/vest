# Auth Middleware

Protect routes with JWT authentication middleware.

## Basic Usage

```typescript
import { authMiddleware } from "@lara-node/auth";

Route.get("/profile", UserController.profile).middleware("auth");
```

## How It Works

The middleware:

1. Extracts the `Bearer` token from `Authorization` header
2. Verifies the token
3. Sets `req.user` with the decoded payload
4. Returns 401 if token is invalid or missing

## Accessing User

```typescript
@Route.get('/profile')
async profile(req: Request) {
  // req.user contains the decoded token payload
  const userId = req.user.userId
  return User.find(userId)
}
```

## With User Loader

Load the full user model:

```typescript
// In middleware configuration
{
  auth: {
    middleware: AuthMiddleware,
    options: {
      userLoader: async (payload) => {
        return User.find(payload.userId)
      }
    }
  }
}
```

Then access the full user:

```typescript
@Route.get('/profile')
async profile(req: Request) {
  return req.user // Full User model
}
```

## Registering the Middleware

```typescript
export class MiddlewareProvider extends MiddlewareServiceProvider {
  registerMiddleware() {
    return {
      aliases: {
        auth: AuthMiddleware,
      },
      groups: {
        api: ["auth", "throttle"],
      },
    };
  }
}
```

## Next Steps

- [Token Generation](/packages/auth/tokens) -- JWT tokens
- [Password Hashing](/packages/auth/passwords) -- Hash passwords
- [Built-in Middleware](/packages/middlewares/built-in) -- All middleware
