# Intervals & Periods

Work with date intervals and periods.

## CarbonInterval

Represent a duration:

```typescript
import { CarbonInterval } from "@lara-node/carbon";

const interval = CarbonInterval.years(2).months(3).days(5);

interval.years; // 2
interval.months; // 3
interval.days; // 5

// Between two dates
const interval = CarbonInterval.between(date1, date2);

// Human readable
interval.humanize(); // "2 years 3 months 5 days"
```

## CarbonPeriod

Iterate over a date range:

```typescript
import { CarbonPeriod } from "@lara-node/carbon";

const period = CarbonPeriod.create(startDate, endDate);

// Iterate
for (const date of period.everyDay()) {
  console.log(date.format("YYYY-MM-DD"));
}

// Frequencies
period.everyDay();
period.everyWeek();
period.everyMonth();
period.everyYear();
```

## Next Steps

- [Comparison](/packages/carbon/comparison) -- Compare dates
- [Formatting](/packages/carbon/formatting) -- Format dates
- [Carbon Overview](/packages/carbon) -- Overview
