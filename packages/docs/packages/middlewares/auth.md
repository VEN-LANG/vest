# Auth & Authorization Middleware

Protect routes with authentication and authorization.

## AuthMiddleware

Validates JWT tokens:

```typescript
import { AuthMiddleware } from '@lara-node/middlewares'

Route.get('/profile', handler).middleware('auth')
```

## AuthorizeByStatusMiddleware

Checks user active status:

```typescript
import { AuthorizeByStatusMiddleware } from '@lara-node/middlewares'

Route.get('/dashboard', handler).middleware('active')
```

## Role Authorization

```typescript
import { authorizeRoles } from '@lara-node/middlewares'

Route.get('/admin', handler).middleware(authorizeRoles('admin', 'superadmin'))
Route.get('/moderator', handler).middleware(authorizeRoles('moderator'))
```

## Permission Authorization

```typescript
import { authorizePermissions } from '@lara-node/middlewares'

Route.post('/posts', handler).middleware(authorizePermissions('posts.create'))
Route.put('/posts/:id', handler).middleware(authorizePermissions('posts.update'))
Route.delete('/posts/:id', handler).middleware(authorizePermissions('posts.delete'))
```

## Combining Middleware

```typescript
Route.group(() => {
  Route.get('/users', UserController.index)
  Route.post('/users', UserController.store)
}).middleware([
  'auth',
  authorizeRoles('admin'),
  authorizePermissions('users.manage'),
])
```

## Next Steps

- [Built-in Middleware](/packages/middlewares/built-in) -- All middleware
- [Auth Package](/packages/auth) -- Authentication
- [Middlewares Overview](/packages/middlewares) -- Overview
