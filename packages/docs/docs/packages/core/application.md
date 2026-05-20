# Application

The `Application` class is the main bootstrap class for LaraNode applications. It wraps Express and manages the service provider lifecycle.

## Creating an Application

```typescript
import { Application, Container } from '@lara-node/core'

const container = new Container()
const app = new Application(container)
```

## Registering Providers

```typescript
app.register(AppServiceProvider)
app.register(RouteServiceProvider)
app.register(CacheServiceProvider)
```

## Booting

```typescript
await app.boot()
```

This triggers:

1. `register()` on all providers
2. `boot()` on all providers
3. Middleware registration
4. Express app setup

## Starting the Server

```typescript
// Default port (from config or 3000)
await app.listen()

// Specific port
await app.listen(3000)

// With callback
await app.listen(3000, () => {
  console.log('Server started')
})
```

## Accessing Express

```typescript
const expressApp = app.getExpress()
expressApp.use(cors())
```

## Lifecycle Hooks

```typescript
// Before booting
app.booting(() => {
  console.log('Booting...')
})

// After booting
app.booted(() => {
  console.log('Booted!')
})
```

## Global Middleware

```typescript
app.useGlobalMiddleware(CorsMiddleware)
app.useGlobalMiddleware(RequestLoggerMiddleware)
```

## Complete Example

```typescript
import { Application, Container } from '@lara-node/core'
import { AppServiceProvider } from './app/Providers/AppServiceProvider'
import { RouteServiceProvider } from './app/Providers/RouteServiceProvider'
import 'reflect-metadata'

const container = new Container()
const app = new Application(container)

// Register providers
app.register(AppServiceProvider)
app.register(RouteServiceProvider)

// Lifecycle hooks
app.booting(() => {
  console.log('Starting application...')
})

app.booted(() => {
  console.log('Application booted!')
})

// Boot and start
async function bootstrap() {
  await app.boot()
  await app.listen(3000)
  console.log('Server running on http://localhost:3000')
}

bootstrap()
```

## Next Steps

- [Container](/packages/core/container) -- IoC container
- [Service Providers](/packages/core/service-providers) -- Creating providers
- [Getting Started](/guide/getting-started) -- Quick start guide
