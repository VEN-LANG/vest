---
name: carbon
description: >-
  Laravel Carbon-inspired date/time library. Immutable, fluent, zero-dependency.
  Activates for questions about Carbon, CarbonImmutable, CarbonInterval, CarbonPeriod,
  date formatting, manipulation, diffForHumans, or day constants (MONDAY-SUNDAY).
---

# @lara-node/carbon

Laravel Carbon-inspired date/time library. Immutable, fluent, zero dependencies.

## Key Exports

| Export | Description |
|--------|-------------|
| `Carbon` | Main date class (immutable) |
| `CarbonImmutable` | Strictly immutable variant |
| `CarbonInterval` | Duration representation |
| `CarbonPeriod` | Iterable date range |
| `MONDAY` – `SUNDAY` | Day-of-week constants (0-6) |

## Quick Start

```typescript
import { Carbon } from "@lara-node/carbon";

const now = Carbon.current();
const date = Carbon.from("2024-01-15");
const fromTs = Carbon.fromTimestamp(1705276800);

date.format("YYYY-MM-DD HH:mm:ss");
date.diffForHumans(); // "2 days ago"

// Manipulation
date.addDays(5).subMonths(1).startOfYear();
```

## Intervals & Periods

```typescript
import { CarbonInterval, CarbonPeriod } from "@lara-node/carbon";

const interval = CarbonInterval.from("2 weeks");
const period = CarbonPeriod.create("2024-01-01", "2024-01-31");
for (const day of period) {
  console.log(day.format("YYYY-MM-DD"));
}
```
