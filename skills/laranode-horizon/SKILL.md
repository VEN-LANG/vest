---
name: laranode-horizon
description: >-
  Laravel Horizon-inspired queue monitoring dashboard with worker management,
  job metrics, failed job tracking, scheduler monitoring, and real-time updates.
  Activates for questions about HorizonServiceProvider, HorizonManager, horizonMetrics,
  or HorizonDashboard.
---

# @lara-node/horizon

Beautiful queue monitoring dashboard inspired by Laravel Horizon.

## Key Exports

| Export | Description |
|--------|-------------|
| `HorizonManager` | Worker management (start, pause, resume, stop) |
| `horizonMetrics` | Metrics storage |
| `HorizonDashboard` | HTTP dashboard |
| `HorizonServiceProvider` | Auto-registration |

## Quick Start

```typescript
import { HorizonServiceProvider } from "@lara-node/horizon";

app.register(HorizonServiceProvider);
// Dashboard available at /horizon
```

## Features

- Queue monitoring dashboard
- Worker management (start, pause, resume, stop)
- Job metrics and statistics
- Failed job management with retry
- Scheduler task monitoring
- Real-time updates via WebSocket
