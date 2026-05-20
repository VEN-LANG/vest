# Date Comparison

Compare dates with Carbon's comparison methods.

## Basic Comparisons

```typescript
date.isPast()       // Before now
date.isFuture()     // After now
date.isToday()      // Is today
date.isTomorrow()   // Is tomorrow
date.isYesterday()  // Is yesterday
```

## Day Checks

```typescript
date.isWeekend()    // Saturday or Sunday
date.isWeekday()    // Monday-Friday
date.isMonday()
date.isTuesday()
// ... all days
```

## Year Checks

```typescript
date.isLeapYear()   // Leap year
date.isDST()        // Daylight saving time
```

## Between

```typescript
date.isBetween(start, end) // Between two dates
```

## Diffs

```typescript
date.diffInDays(other)    // Days difference
date.diffInHours(other)   // Hours difference
date.diffInMinutes(other) // Minutes difference
date.diffInSeconds(other) // Seconds difference
date.diffInMonths(other)  // Months difference
date.diffInYears(other)   // Years difference
```

## Next Steps

- [Formatting](/packages/carbon/formatting) -- Format dates
- [Intervals](/packages/carbon/intervals) -- Intervals and periods
- [Carbon Overview](/packages/carbon) -- Overview
