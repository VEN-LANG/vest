# Configuration (Core)

LaraNode provides a dot-notation configuration system for managing application settings.

## Config Functions

### `config()`

Get a configuration value:

```typescript
import { config } from '@lara-node/core'

// Get value
const host = config('database.mysql.host')

// Get with default
const port = config('app.port', 3000)

// Get entire section
const dbConfig = config('database')
```

### `setConfig()`

Set a configuration value:

```typescript
import { setConfig } from '@lara-node/core'

setConfig('app.debug', true)
setConfig('database.mysql.host', 'localhost')
```

### `hasConfig()`

Check if a configuration key exists:

```typescript
import { hasConfig } from '@lara-node/core'

if (hasConfig('cache.redis')) {
  // Redis is configured
}
```

### `allConfig()`

Get all configuration:

```typescript
import { allConfig } from '@lara-node/core'

const all = allConfig()
console.log(all.database)
```

## Loading Configuration

Configuration is typically loaded from files in `src/config/`:

```typescript
// src/bootstrap/app.ts
import { setConfig } from '@lara-node/core'
import databaseConfig from '../config/database.config'
import cacheConfig from '../config/cache.config'

setConfig('database', databaseConfig)
setConfig('cache', cacheConfig)
```

## Dot Notation

Access nested values with dot notation:

```typescript
// config/database.config.ts
export default {
  mysql: {
    host: 'localhost',
    port: 3306
  }
}

// Access
config('database.mysql.host') // 'localhost'
config('database.mysql.port') // 3306
```

## Next Steps

- [Configuration Guide](/guide/configuration) -- Full configuration guide
- [Application](/packages/core/application) -- Application class
- [Service Providers](/packages/core/service-providers) -- Service providers
