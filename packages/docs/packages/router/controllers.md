# Controllers

Controllers group related request handling logic into a single class using decorators.

## Creating Controllers

Use the `@Route()` decorator on a class:

```typescript
import { Route } from '@lara-node/router'

@Route('/api/users')
class UserController {
  @Route.get('/')
  async index() {
    return User.all()
  }

  @Route.get('/:id')
  async show(req: Request) {
    return User.find(req.params.id)
  }

  @Route.post('/')
  async store(req: Request) {
    return User.create(req.body)
  }

  @Route.put('/:id')
  async update(req: Request) {
    const user = await User.find(req.params.id)
    return user.update(req.body)
  }

  @Route.delete('/:id')
  async destroy(req: Request) {
    const user = await User.find(req.params.id)
    await user.delete()
    return { message: 'Deleted' }
  }
}
```

## Controller Middleware

Apply middleware to the entire controller:

```typescript
@Route('/api/admin', 'auth', 'admin')
class AdminController {
  @Route.get('/users')
  async index() {
    return User.all()
  }
}
```

Or on individual methods:

```typescript
@Route('/api/users')
class UserController {
  @Route.get('/', 'auth')
  async profile(req: Request) {
    return req.user
  }

  @Route.post('/')
  async store(req: Request) {
    return User.create(req.body)
  }
}
```

## Registering Controllers

```typescript
// In your route provider
import { UserController } from '../Controllers/UserController'

Route.addController(UserController)

// Or multiple
Route.fromControllers([UserController, PostController])
```

## Complete Example with Documentation

```typescript
import { Route, Doc } from '@lara-node/router'

@Route('/api/users')
class UserController {
  @Doc({
    summary: 'List all users',
    description: 'Returns a paginated list of users',
    tags: ['Users'],
    responses: {
      200: { description: 'List of users' },
    },
  })
  @Route.get('/')
  async index() {
    return User.paginate(15)
  }

  @Doc({
    summary: 'Create a user',
    tags: ['Users'],
    auth: true,
  })
  @Route.post('/')
  async store(req: Request) {
    return User.create(req.body)
  }
}
```

## Next Steps

- [Route Model Binding](/packages/router/model-binding) -- Automatic model resolution
- [Resource Routes](/packages/router/resource) -- RESTful routing
- [OpenAPI](/packages/router/openapi) -- API documentation
