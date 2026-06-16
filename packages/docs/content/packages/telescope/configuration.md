# Telescope Configuration

Configure Telescope for your environment.

## Configuration File

```typescript
// config/telescope.config.ts
export default {
  path: "/telescope",
  enabled: process.env.NODE_ENV !== "production",
  maxEntries: 1000,
  pruneHours: 48,
};
```

## Environment Variables

```dotenv
TELESCOPE_MAX_ENTRIES=1000
TELESCOPE_PRUNE_HOURS=48
```

## Configuration Options

| Option       | Default           | Description        |
| ------------ | ----------------- | ------------------ |
| `path`       | `/telescope`      | Dashboard URL      |
| `enabled`    | `true` (non-prod) | Enable/disable     |
| `maxEntries` | 1000              | Max stored entries |
| `pruneHours` | 48                | Prune old entries  |

## Disabling in Production

```typescript
export default {
  enabled: process.env.NODE_ENV === "development",
};
```

## Next Steps

- [Telescope Overview](/packages/telescope) -- Overview
- [Watchers](/packages/telescope/watchers) -- Telescope watchers
