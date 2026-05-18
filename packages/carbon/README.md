# @lara-node/carbon

Laravel Carbon-inspired date/time library — immutable fluent API, zero runtime dependencies.

## Installation

```sh
pnpm add @lara-node/carbon
```

## Quick Start

```ts
import { Carbon, CarbonImmutable, MONDAY, FRIDAY } from '@lara-node/carbon';

const now = Carbon.now();
console.log(now.format('YYYY-MM-DD HH:mm:ss'));

// Navigate to next Monday
const nextMonday = now.next(MONDAY).startOfDay();
console.log(nextMonday.toDateOnlyString());

// Immutable — original is never modified
const base = CarbonImmutable.now();
const nextWeek = base.addDays(7);
console.log(base.toDateOnlyString());     // unchanged
console.log(nextWeek.toDateOnlyString()); // 7 days later
```

## API

### `Carbon`

The main class. Extends `Date` — any `Carbon` instance can be passed where a `Date` is expected. All fluent methods return a new instance.

#### Static factories

```ts
Carbon.now()                              // current date/time
Carbon.today()                            // today at midnight
Carbon.tomorrow()                         // tomorrow at midnight
Carbon.yesterday()                        // yesterday at midnight
Carbon.from('2025-06-15')                 // parse ISO/common string
Carbon.fromTimestamp(1723625400)          // from Unix timestamp (seconds)
Carbon.fromFormat('14/08/2025', 'DD/MM/YYYY') // custom format string
Carbon.min(a, b, c)                       // earliest of the given dates
Carbon.max(a, b, c)                       // latest of the given dates
```

#### Getters

| Property         | Type       | Description                              |
|------------------|------------|------------------------------------------|
| `.year`          | `number`   | Full year (e.g. 2025)                    |
| `.month`         | `number`   | Month 1–12                               |
| `.day`           | `number`   | Day of month 1–31                        |
| `.hour`          | `number`   | Hours 0–23                               |
| `.minute`        | `number`   | Minutes 0–59                             |
| `.second`        | `number`   | Seconds 0–59                             |
| `.millisecond`   | `number`   | Milliseconds 0–999                       |
| `.dayOfWeek`     | `WeekDay`  | 0 (Sun) – 6 (Sat)                        |
| `.timestamp`     | `number`   | Unix timestamp (seconds)                 |
| `.quarter`       | `number`   | Quarter 1–4                              |
| `.weekOfYear`    | `number`   | ISO week number                          |
| `.dayOfYear`     | `number`   | Day of year 1–366                        |
| `.age`           | `number`   | Years elapsed since this date            |
| `.monthName`     | `string`   | e.g. `"August"`                          |
| `.shortMonthName`| `string`   | e.g. `"Aug"`                             |
| `.dayName`       | `string`   | e.g. `"Thursday"`                        |
| `.shortDayName`  | `string`   | e.g. `"Thu"`                             |

#### Start / end of period

```ts
date.startOfDay()     date.endOfDay()
date.startOfWeek()    date.endOfWeek()
date.startOfMonth()   date.endOfMonth()
date.startOfQuarter() date.endOfQuarter()
date.startOfYear()    date.endOfYear()
date.startOfHour()    date.endOfHour()
date.startOfMinute()  date.endOfMinute()
date.startOfDecade()  date.endOfDecade()
date.startOfCentury() date.endOfCentury()
```

#### Add / subtract

Every unit has singular, plural, and generic forms:

```ts
date.addYear()           date.subYear()
date.addYears(3)         date.subYears(3)
date.addMonths(6)        date.subMonths(6)
date.addWeeks(2)         date.subWeeks(2)
date.addDays(10)         date.subDays(10)
date.addHours(5)         date.subHours(5)
date.addMinutes(30)      date.subMinutes(30)
date.addSeconds(45)      date.subSeconds(45)
date.addMilliseconds(500)

// Generic
date.add(3, 'day')
date.sub(2, 'month')
```

#### Diff methods

```ts
const a = Carbon.from('2025-01-01');
const b = Carbon.from('2025-08-14');

a.diffInDays(b)         // 225
a.diffInWeeks(b)        // 32.14...
a.diffInMonths(b)       // 7
a.diffInHours(b)
a.diffInMinutes(b)
a.diffInSeconds(b)
a.diffAbsInDays(b)      // always positive

Carbon.from('2025-08-01').diffForHumans()  // "13 days ago"
Carbon.from('2025-09-01').diffForHumans()  // "18 days from now"
date.humanize()                             // alias for diffForHumans()
```

#### Comparisons

```ts
date.isPast()         date.isFuture()
date.isToday()        date.isTomorrow()    date.isYesterday()
date.isWeekend()      date.isWeekday()
date.isLeapYear()     date.isDST()

date.isMonday()    date.isTuesday()   date.isWednesday()
date.isThursday()  date.isFriday()    date.isSaturday()   date.isSunday()

date.isSameDay(other)    date.isSameMonth(other)   date.isSameYear(other)
date.isSame(other, 'day')
date.isAfter(other)      date.isBefore(other)
date.isSameOrAfter(other) date.isSameOrBefore(other)
date.isBetween(start, end)          // exclusive
date.isBetween(start, end, true)    // inclusive
```

#### Navigation

```ts
import { MONDAY, FRIDAY } from '@lara-node/carbon';

date.next(MONDAY)       // next Monday
date.previous(FRIDAY)   // previous Friday
date.nextWeekday()      // next working day (skip weekends)
date.previousWeekday()

date.nthOfMonth(1, MONDAY)   // 1st Monday of the month
date.nthOfMonth(3, FRIDAY)   // 3rd Friday
date.nthOfMonth(-1, FRIDAY)  // last Friday of the month
```

#### Formatting

```ts
date.format('YYYY-MM-DD HH:mm:ss')
date.format('dddd, MMMM D, YYYY')   // Thursday, August 14, 2025
date.format('h:mm A')               // 9:30 AM
date.toDateOnlyString()             // "2025-08-14"
date.toDateTimeString()             // "2025-08-14 09:30:00"
date.toTimeOnlyString()             // "09:30:00"
date.toISOString()
date.toAtomString()
date.toRfc2822String()
```

Supported format tokens:

| Token  | Output example     |
|--------|--------------------|
| `YYYY` | 2025               |
| `MM`   | 08                 |
| `DD`   | 14                 |
| `MMMM` | August             |
| `MMM`  | Aug                |
| `dddd` | Thursday           |
| `ddd`  | Thu                |
| `HH`   | 09                 |
| `hh`   | 09 (12-hr)         |
| `mm`   | 30                 |
| `ss`   | 00                 |
| `SSS`  | 000                |
| `A`    | AM / PM            |
| `Q`    | 3 (quarter)        |
| `X`    | Unix timestamp (s) |
| `x`    | Unix timestamp (ms)|

### `CarbonImmutable`

Drop-in replacement for `Carbon`. All fluent methods return a new `CarbonImmutable` instance. Calling any native mutable `Date` method directly throws.

```ts
import { CarbonImmutable } from '@lara-node/carbon';

const d = CarbonImmutable.now();
const next = d.addDays(7);  // returns new CarbonImmutable

d.setDate(1);               // throws: "cannot call mutable method setDate"
```

### `CarbonInterval`

Represents a duration.

```ts
import { CarbonInterval, Carbon } from '@lara-node/carbon';

const iv = CarbonInterval.days(30);
iv.humanize();      // "30 days"
iv.totalSeconds;    // 2592000

const iv2 = CarbonInterval.between(
  Carbon.from('2025-01-01'),
  Carbon.from('2025-08-14')
);
iv2.humanize(); // "7 months, 13 days"

// Named constructors
CarbonInterval.years(1)
CarbonInterval.months(3)
CarbonInterval.weeks(2)
CarbonInterval.days(10)
CarbonInterval.hours(6)
CarbonInterval.minutes(45)
CarbonInterval.seconds(30)

// Computed totals
iv.totalDays
iv.totalHours
iv.totalMinutes
iv.totalSeconds

// Arithmetic
iv.add(CarbonInterval.hours(5))
iv.multiply(2)

iv.toSpec()  // { years, months, weeks, days, hours, minutes, seconds }
```

### `CarbonPeriod`

Iterable date range.

```ts
import { CarbonPeriod, Carbon } from '@lara-node/carbon';

const period = CarbonPeriod
  .between(Carbon.from('2025-08-01'), Carbon.from('2025-08-31'))
  .everyDay();

for (const date of period) {
  console.log(date.toDateOnlyString());
}

period.toArray()              // Carbon[]
period.count()                // 31
period.contains(Carbon.today())

// Custom steps
CarbonPeriod.between(start, end).every(3, 'day')
CarbonPeriod.between(start, end).everyWeek()
CarbonPeriod.between(start, end).everyMonth()
CarbonPeriod.between(start, end).everyDay().exclusive()  // end not included
```

### Weekday constants

```ts
import { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY } from '@lara-node/carbon';
```

## Notes

- `@lara-node/carbon` has zero runtime npm dependencies.
- `CarbonImmutable` is recommended for use in request handlers and shared contexts where accidental mutation is a concern.
- `diffForHumans()` / `humanize()` produce English-language relative strings suitable for display but not machine parsing.
