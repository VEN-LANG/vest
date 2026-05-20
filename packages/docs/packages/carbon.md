# Carbon Package

The `@lara-node/carbon` package provides a Laravel Carbon-inspired date/time library. Zero dependencies, immutable, and fluent.

## Installation

```bash
pnpm add @lara-node/carbon
```

## Overview

Features include:

- **Immutable dates** by default
- **Fluent API** for manipulation
- **Human-readable diffs**
- **Date intervals and periods**
- **Zero dependencies**

## Quick Start

```typescript
import { Carbon } from '@lara-node/carbon'

// Current time
const now = Carbon.current()

// Create from string
const date = Carbon.from('2024-01-15')

// Create from timestamp
const date = Carbon.fromTimestamp(1705276800)

// Format
date.format('YYYY-MM-DD HH:mm:ss')

// Human readable
date.diffForHumans() // "2 days ago"
```

## Key Exports

| Export | Description |
|--------|-------------|
| `Carbon` | Main date class |
| `CarbonImmutable` | Strictly immutable variant |
| `CarbonInterval` | Duration representation |
| `CarbonPeriod` | Iterable date range |
| `MONDAY` - `SUNDAY` | Day constants |

## Next Steps

- [Creating Dates](/packages/carbon/creating) -- Create dates
- [Manipulation](/packages/carbon/manipulation) -- Modify dates
- [Formatting](/packages/carbon/formatting) -- Format dates
