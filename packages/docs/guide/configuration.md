# Configuration

LaraNode uses a file-based configuration system with environment variable support.

## Configuration Files

Configuration files live in `src/config/` and export configuration objects:

```typescript
// src/config/database.config.ts
export default {
  connection: process.env.DB_CONNECTION || 'mysql',
  mysql: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vest',
    poolLimit: parseInt(process.env.DB_POOL_LIMIT || '10'),
  },
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
    replicaSet: process.env.MONGO_REPLICA_SET,
  },
}
```

## Environment Variables

Create a `.env` file in your project root:

```dotenv
# Application
NODE_ENV=development
APP_KEY=base64:your-key-here
APP_PORT=3000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=vest_app

# Cache
CACHE_DRIVER=file
CACHE_PREFIX=vest_

# Queue
QUEUE_CONNECTION=sync

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Mail
MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=hello@example.com
MAIL_FROM_NAME="LaraNode App"

# Broadcast
BROADCAST_DRIVER=websocket
```

## Accessing Configuration

Use the `config()` helper to access configuration values:

```typescript
import { config, hasConfig, setConfig } from '@lara-node/core'

// Get a value (dot notation)
const dbHost = config('database.mysql.host')

// Get with default
const port = config('app.port', 3000)

// Check if exists
if (hasConfig('cache.redis')) {
  // ...
}

// Set a value
setConfig('app.debug', true)
```

## Configuration by Package

### Core

```typescript
// config/app.config.ts
export default {
  name: 'LaraNode App',
  env: process.env.NODE_ENV || 'development',
  debug: process.env.NODE_ENV === 'development',
  key: process.env.APP_KEY,
  port: parseInt(process.env.APP_PORT || '3000'),
}
```

### Database

```typescript
// config/database.config.ts
export default {
  connection: process.env.DB_CONNECTION || 'mysql',
  mysql: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  mongodb: {
    uri: process.env.MONGO_URI,
  },
}
```

### Cache

```typescript
// config/cache.config.ts
export default {
  driver: process.env.CACHE_DRIVER || 'file',
  prefix: process.env.CACHE_PREFIX || 'vest_',
  path: process.env.CACHE_PATH || './storage/cache',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
}
```

### Queue

```typescript
// config/queue.config.ts
export default {
  default: process.env.QUEUE_CONNECTION || 'sync',
  connections: {
    sync: { driver: 'sync' },
    database: { driver: 'database', table: 'jobs' },
    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  },
}
```

### Mail

```typescript
// config/mail.config.ts
export default {
  driver: process.env.MAIL_DRIVER || 'log',
  from: {
    address: process.env.MAIL_FROM_ADDRESS,
    name: process.env.MAIL_FROM_NAME,
  },
  smtp: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  },
}
```

### Horizon

```typescript
// config/horizon.config.ts
export default {
  domain: '',
  path: '/horizon',
  environments: {
    production: {
      supervisor: {
        maxProcesses: 10,
        balance: 'auto',
      },
    },
    local: {
      supervisor: {
        maxProcesses: 3,
      },
    },
  },
}
```

### Telescope

```typescript
// config/telescope.config.ts
export default {
  path: '/telescope',
  enabled: process.env.NODE_ENV !== 'production',
  maxEntries: 1000,
  pruneHours: 48,
}
```

## Next Steps

- [Service Providers](/guide/service-providers) -- Learn about service providers
- [Core Package](/packages/core) -- Deep dive into the core
- [Database](/packages/db) -- Configure your database
