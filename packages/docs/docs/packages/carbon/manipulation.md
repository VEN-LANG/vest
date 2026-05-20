# Date Manipulation

Modify dates with Carbon's fluent API.

## Accessors

```typescript
const date = Carbon.current()

date.year        // 2024
date.month       // 1-12
date.day         // 1-31
date.hour        // 0-23
date.minute      // 0-59
date.second      // 0-59
date.timestamp   // Unix timestamp
date.quarter     // 1-4
date.weekOfYear  // 1-52
date.dayOfYear   // 1-365
date.decade      // Decade number
date.age         // Age in years
date.monthName   // January
date.dayName     // Monday
```

## Start/End of

```typescript
date.startOfDay()
date.endOfDay()
date.startOfWeek()
date.endOfWeek()
date.startOfMonth()
date.endOfMonth()
date.startOfQuarter()
date.endOfQuarter()
date.startOfYear()
date.endOfYear()
date.startOfDecade()
date.endOfDecade()
date.startOfCentury()
```

## Add/Subtract

```typescript
date.addDays(5)
date.addMonths(2)
date.addYears(1)
date.addHours(3)
date.addMinutes(30)
date.addSeconds(60)

date.subDays(5)
date.subMonths(2)
date.subYears(1)
```

## Navigation

```typescript
date.next()           // Next day
date.previous()       // Previous day
date.nextWeekday()    // Next weekday
date.nthOfMonth(2)    // 2nd occurrence of day in month
```

## Next Steps

- [Creating Dates](/packages/carbon/creating) -- Create dates
- [Formatting](/packages/carbon/formatting) -- Format dates
- [Comparison](/packages/carbon/comparison) -- Compare dates
