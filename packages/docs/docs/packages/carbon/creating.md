# Creating Dates

Create Carbon date instances in various ways.

## Current Time

```typescript
import { Carbon } from "@lara-node/carbon";

const now = Carbon.current();
const today = Carbon.today();
const tomorrow = Carbon.tomorrow();
const yesterday = Carbon.yesterday();
```

## From String

```typescript
const date = Carbon.from("2024-01-15");
const date = Carbon.from("2024-01-15 10:30:00");
```

## From Timestamp

```typescript
const date = Carbon.fromTimestamp(1705276800);
```

## From Format

```typescript
const date = Carbon.fromFormat("2024-01-15", "YYYY-MM-DD");
```

## Min/Max

```typescript
const earliest = Carbon.min(date1, date2, date3);
const latest = Carbon.max(date1, date2, date3);
```

## Next Steps

- [Carbon Overview](/packages/carbon) -- Overview
- [Manipulation](/packages/carbon/manipulation) -- Modify dates
- [Formatting](/packages/carbon/formatting) -- Format dates
