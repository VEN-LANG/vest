# OpenAPI Generation

LaraNode can automatically generate OpenAPI 3.0 specifications from your route metadata.

## Documentation Decorator

Use the `@Doc()` decorator to document your routes:

```typescript
import { Route, Doc } from '@lara-node/router'

@Route('/api/users')
class UserController {
  @Doc({
    summary: 'List all users',
    description: 'Returns a paginated list of all users',
    tags: ['Users'],
    auth: true,
    params: {
      page: { type: 'integer', description: 'Page number' },
      perPage: { type: 'integer', description: 'Items per page' },
    },
    responses: {
      200: { description: 'List of users' },
      401: { description: 'Unauthenticated' },
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
    body: {
      name: { type: 'string', required: true },
      email: { type: 'string', required: true },
      password: { type: 'string', required: true },
    },
    responses: {
      201: { description: 'User created' },
      422: { description: 'Validation error' },
    },
  })
  @Route.post('/')
  async store(req: Request) {
    return User.create(req.body)
  }

  @Doc({
    summary: 'Get a user',
    tags: ['Users'],
    deprecated: true,
  })
  @Route.get('/:id')
  async show(req: Request) {
    return User.find(req.params.id)
  }
}
```

## Doc Options

| Option | Type | Description |
|--------|------|-------------|
| `summary` | string | Short summary |
| `description` | string | Detailed description |
| `tags` | string[] | OpenAPI tags |
| `auth` | boolean | Requires authentication |
| `params` | object | Query parameters |
| `body` | object | Request body schema |
| `responses` | object | Response definitions |
| `deprecated` | boolean | Mark as deprecated |

## Generating the Spec

```typescript
import { OpenApiGenerator, RouteScanner } from '@lara-node/router'

const scanner = new RouteScanner()
const routes = scanner.scan()

const generator = new OpenApiGenerator({
  title: 'My API',
  version: '1.0.0',
  description: 'API Documentation',
})

const spec = generator.generate(routes)
```

## Serving the Spec

```typescript
Route.get('/api/docs.json', () => {
  return generateOpenApiSpec()
})
```

## Next Steps

- [Controllers](/packages/router/controllers) -- Controller decorators
- [Basic Routing](/packages/router/basic) -- Define routes
- [Route Groups](/packages/router/groups) -- Group routes
