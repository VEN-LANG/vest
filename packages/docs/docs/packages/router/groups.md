# Route Groups

Group routes with shared attributes like middleware, prefixes, and constraints.

## Basic Groups

```typescript
Route.group(() => {
  Route.get('/users', UserController.index)
  Route.post('/users', UserController.store)
})
```

## With Prefix

```typescript
Route.group(() => {
  Route.get('/users', UserController.index)
  Route.get('/users/:id', UserController.show)
}).prefix('/api/v1')
```

## With Middleware

```typescript
Route.group(() => {
  Route.get('/users', UserController.index)
  Route.post('/users', UserController.store)
}).middleware('auth')
```

## Multiple Middleware

```typescript
Route.group(() => {
  Route.get('/admin', AdminController.index)
}).middleware(['auth', 'admin'])
```

## Chaining

```typescript
Route.group(() => {
  Route.get('/users', UserController.index)
  Route.post('/users', UserController.store)
  Route.get('/users/:id', UserController.show)
}).prefix('/api').middleware('auth').name('api.')
```

## Nested Groups

```typescript
Route.group(() => {
  Route.group(() => {
    Route.get('/users', UserController.index)
  }).prefix('/admin').middleware('admin')

  Route.group(() => {
    Route.get('/users', PublicController.index)
  }).prefix('/public')
}).prefix('/api/v1')
```

## Without Middleware

Remove middleware from a group:

```typescript
Route.group(() => {
  Route.get('/public', PublicController.index)
}).middleware('api').withoutMiddleware('auth')
```

## Named Groups

```typescript
Route.group(() => {
  Route.get('/users', UserController.index).name('index')
}).prefix('/api').name('api.users.')

// Results in route name: api.users.index
```

## Next Steps

- [Controllers](/packages/router/controllers) -- Controller decorators
- [Middleware](/packages/router/middleware) -- Route middleware
- [Resource Routes](/packages/router/resource) -- RESTful routing
