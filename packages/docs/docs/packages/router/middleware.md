# Route Middleware

Apply middleware to individual routes or groups.

## Route-Level Middleware

```typescript
Route.get('/profile', UserController.profile)
  .middleware('auth')

Route.get('/admin', AdminController.index)
  .middleware(['auth', 'admin'])
```

## Middleware with Parameters

```typescript
Route.get('/api/data', DataController.index)
  .middleware('throttle:60,1') // 60 requests per minute
```

## Group Middleware

```typescript
Route.group(() => {
  Route.get('/users', UserController.index)
  Route.post('/users', UserController.store)
}).middleware('api')
```

## Without Middleware

```typescript
Route.group(() => {
  Route.get('/public', PublicController.index)
}).middleware('api').withoutMiddleware('auth')
```

## Registering Middleware Aliases

```typescript
import { MiddlewareServiceProvider } from '@lara-node/core'

export class MiddlewareProvider extends MiddlewareServiceProvider {
  registerMiddleware() {
    return {
      aliases: {
        auth: AuthMiddleware,
        admin: AdminMiddleware,
        throttle: ThrottleMiddleware,
      },
      groups: {
        api: ['throttle:60,1', 'auth'],
        web: ['session'],
      },
    }
  }
}
```

## Next Steps

- [Middleware Guide](/guide/middleware) -- Full middleware guide
- [Built-in Middleware](/packages/middlewares/built-in) -- Pre-built middleware
- [Controllers](/packages/router/controllers) -- Controller decorators
