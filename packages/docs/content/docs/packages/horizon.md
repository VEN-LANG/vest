# Horizon Package

The `@lara-node/horizon` package provides a beautiful queue monitoring dashboard, inspired by Laravel Horizon.

## Installation

```bash
pnpm add @lara-node/horizon @lara-node/core @lara-node/queue express
```

## Overview

Features include:

- **Queue monitoring** dashboard
- **Worker management** (start, pause, resume, stop)
- **Job metrics** and statistics
- **Failed job** management
- **Scheduler task** monitoring
- **Real-time** updates

## Quick Start

Horizon is automatically registered when you install the `HorizonServiceProvider`:

```typescript
import { HorizonServiceProvider } from "@lara-node/horizon";

app.register(HorizonServiceProvider);
```

Visit `/horizon` to access the dashboard.

## Key Exports

| Export                   | Description       |
| ------------------------ | ----------------- |
| `HorizonManager`         | Worker manager    |
| `horizonMetrics`         | Metrics storage   |
| `HorizonDashboard`       | HTTP dashboard    |
| `HorizonServiceProvider` | Auto-registration |

## Next Steps

- [Configuration](/packages/horizon/configuration) -- Configure Horizon
- [Dashboard](/packages/horizon/dashboard) -- Dashboard usage
