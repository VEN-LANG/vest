# Resource Routes

Resource routes automatically generate RESTful routes for a controller.

## Resource Routing

```typescript
Route.resource('users', UserController)
```

This generates:

| Method | URI | Action | Route Name |
|--------|-----|--------|------------|
| GET | /users | index | users.index |
| GET | /users/create | create | users.create |
| POST | /users | store | users.store |
| GET | /users/:id | show | users.show |
| GET | /users/:id/edit | edit | users.edit |
| PUT/PATCH | /users/:id | update | users.update |
| DELETE | /users/:id | destroy | users.destroy |

## API Resource

For API-only routes (no create/edit forms):

```typescript
Route.apiResource('users', UserController)
```

This generates:

| Method | URI | Action |
|--------|-----|--------|
| GET | /users | index |
| POST | /users | store |
| GET | /users/:id | show |
| PUT/PATCH | /users/:id | update |
| DELETE | /users/:id | destroy |

## With Middleware

```typescript
Route.resource('users', UserController).middleware('auth')
Route.apiResource('posts', PostController).middleware(['auth', 'throttle'])
```

## With Prefix

```typescript
Route.group(() => {
  Route.resource('users', UserController)
  Route.resource('posts', PostController)
}).prefix('/api/v1')
```

## Multiple Resources

```typescript
Route.fromControllers([UserController, PostController, CommentController])
```

## Next Steps

- [Controllers](/packages/router/controllers) -- Controller decorators
- [OpenAPI](/packages/router/openapi) -- API documentation
- [Route Groups](/packages/router/groups) -- Group routes
