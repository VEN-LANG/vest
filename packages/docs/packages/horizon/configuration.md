# Horizon Configuration

Configure Horizon for your environment.

## Configuration File

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
        workers: {
          default: {
            connection: 'redis',
            queue: ['default'],
            tries: 3,
            timeout: 60,
          },
          emails: {
            connection: 'redis',
            queue: ['emails'],
            tries: 3,
            timeout: 120,
          },
        },
      },
    },
    local: {
      supervisor: {
        maxProcesses: 3,
        workers: {
          default: {
            connection: 'redis',
            queue: ['default'],
          },
        },
      },
    },
  },
}
```

## Environment Variables

```dotenv
HORIZON_PATH=/horizon
```

## Supervisor Configuration

| Option | Description |
|--------|-------------|
| `maxProcesses` | Maximum worker processes |
| `balance` | Load balancing strategy |
| `workers` | Worker definitions |

## Worker Configuration

| Option | Description |
|--------|-------------|
| `connection` | Queue connection |
| `queue` | Queues to process |
| `tries` | Max retry attempts |
| `timeout` | Job timeout |

## Next Steps

- [Horizon Overview](/packages/horizon) -- Overview
- [Dashboard](/packages/horizon/dashboard) -- Dashboard usage
