# Password Hashing

Securely hash and verify passwords using bcrypt.

## Hashing Passwords

```typescript
import { hashPassword } from "@lara-node/auth";

const hashed = await hashPassword("my-secret-password");
```

## Verifying Passwords

```typescript
import { comparePassword } from "@lara-node/auth";

const isValid = await comparePassword("my-secret-password", hashed);
// true or false
```

## Usage in Registration

```typescript
@Route.post('/register')
async register(req: Request) {
  const { name, email, password } = req.body

  const user = await User.create({
    name,
    email,
    password: await hashPassword(password),
  })

  return user.toJSON()
}
```

## Usage in Login

```typescript
@Route.post('/login')
async login(req: Request) {
  const { email, password } = req.body

  const user = await User.where('email', email).first()

  if (!user) {
    return { error: 'User not found' }
  }

  const isValid = await comparePassword(password, user.password)

  if (!isValid) {
    return { error: 'Invalid password' }
  }

  const token = generateToken({ userId: user.id }, 86400)
  return { token }
}
```

## Using with Observers

Hash passwords automatically using a model observer:

```typescript
@Observe(User)
class UserObserver extends Observer {
  async creating(user: User) {
    user.password = await hashPassword(user.password);
  }

  async updating(user: User) {
    if (user.isDirty("password")) {
      user.password = await hashPassword(user.password);
    }
  }
}
```

## Next Steps

- [Token Generation](/packages/auth/tokens) -- JWT tokens
- [Auth Middleware](/packages/auth/middleware) -- Protect routes
- [Token Encryption](/packages/auth/encryption) -- Encrypt tokens
