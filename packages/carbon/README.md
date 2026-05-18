# @lara-node/carbon

> Laravel Carbon-inspired date/time library for Node.js — immutable fluent API, zero dependencies.

## Installation

```bash
npm install @lara-node/carbon
# or
pnpm add @lara-node/carbon
```

---

## Quick Start

```ts
import { Carbon, CarbonImmutable, CarbonInterval, CarbonPeriod, MONDAY } from "@lara-node/carbon";

const now = Carbon.now();
console.log(now.format("YYYY-MM-DD HH:mm:ss")); // 2025-08-14 09:30:00

const nextMonday = now.next(MONDAY).startOfDay();
console.log(nextMonday.toDateOnlyString());      // 2025-08-18
```

---

## API Reference

### `Carbon`

The main class. Extends `Date` — you can pass any `Carbon` where a `Date` is expected. All mutation methods return a **new** instance (immutable pattern).

#### Static Factories

| Method | Description |
|---|---|
| `Carbon.now()` / `Carbon.current()` | Current date & time |
| `Carbon.from(date)` | From a `Date`, timestamp, or ISO string |
| `Carbon.fromTimestamp(ts)` | From a Unix timestamp (seconds) |
| `Carbon.fromFormat(str, fmt)` | Parse with a format string (`YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`) |
| `Carbon.today()` | Today at midnight |
| `Carbon.tomorrow()` | Tomorrow at midnight |
| `Carbon.yesterday()` | Yesterday at midnight |
| `Carbon.min(...dates)` | Earliest of the given dates |
| `Carbon.max(...dates)` | Latest of the given dates |

```ts
const d = Carbon.fromFormat("14/08/2025 09:30", "DD/MM/YYYY HH:mm");
const d2 = Carbon.fromTimestamp(1723625400);
const earliest = Carbon.min(Carbon.today(), Carbon.tomorrow());
```

---

#### Getters / Accessors

| Property | Type | Description |
|---|---|---|
| `.year` | `number` | Full year (e.g. 2025) |
| `.month` | `number` | Month 1–12 |
| `.day` | `number` | Day of month 1–31 |
| `.hour` | `number` | Hours 0–23 |
| `.minute` | `number` | Minutes 0–59 |
| `.second` | `number` | Seconds 0–59 |
| `.millisecond` | `number` | Milliseconds 0–999 |
| `.dayOfWeek` | `WeekDay` | 0 (Sun) – 6 (Sat) |
| `.timestamp` | `number` | Unix timestamp (seconds) |
| `.quarter` | `number` | Quarter 1–4 |
| `.weekOfYear` | `number` | ISO week number |
| `.dayOfYear` | `number` | Day of year 1–366 |
| `.decade` | `number` | Decade (e.g. 2020) |
| `.age` | `number` | Years since this date (birthday age) |
| `.monthName` | `string` | e.g. `"August"` |
| `.shortMonthName` | `string` | e.g. `"Aug"` |
| `.dayName` | `string` | e.g. `"Thursday"` |
| `.shortDayName` | `string` | e.g. `"Thu"` |

---

#### Start / End of Period

```ts
carbon.startOfDay()       // 00:00:00.000
carbon.endOfDay()         // 23:59:59.999
carbon.startOfWeek()      // Monday 00:00 (pass false for Sunday-first)
carbon.endOfWeek()        // Sunday 23:59
carbon.startOfMonth()
carbon.endOfMonth()
carbon.startOfQuarter()   // e.g. Apr 1 for Q2
carbon.endOfQuarter()     // e.g. Jun 30 for Q2
carbon.startOfYear()
carbon.endOfYear()
carbon.startOfDecade()    // Jan 1 of decade year
carbon.endOfDecade()      // Dec 31 of decade+9
carbon.startOfCentury()
carbon.endOfCentury()
carbon.startOfHour()
carbon.endOfHour()
carbon.startOfMinute()
carbon.endOfMinute()
```

---

#### Add / Sub

Every unit has singular, plural, and generic `add(n, unit)` forms:

```ts
carbon.addYear()             carbon.subYear()
carbon.addYears(3)           carbon.subYears(3)
carbon.addQuarter()          carbon.subQuarter()
carbon.addQuarters(2)        carbon.subQuarters(2)
carbon.addMonth()            carbon.subMonth()
carbon.addMonths(6)          carbon.subMonths(6)
carbon.addWeek()             carbon.subWeek()
carbon.addWeeks(2)           carbon.subWeeks(2)
carbon.addDay()              carbon.subDay()
carbon.addDays(10)           carbon.subDays(10)
carbon.addHour()             carbon.subHour()
carbon.addHours(5)           carbon.subHours(5)
carbon.addMinute()           carbon.subMinute()
carbon.addMinutes(30)        carbon.subMinutes(30)
carbon.addSecond()           carbon.subSecond()
carbon.addSeconds(45)        carbon.subSeconds(45)
carbon.addMillisecond()      carbon.subMillisecond()
carbon.addMilliseconds(500)  carbon.subMilliseconds(500)

// Generic
carbon.add(3, "day")
carbon.sub(2, "month")
```

---

#### Diffs

```ts
const a = Carbon.from("2025-01-01");
const b = Carbon.from("2025-08-14");

a.diffInDays(b)        // 225
a.diffInWeeks(b)       // 32.14…
a.diffInMonths(b)      // 7
a.diffInQuarters(b)    // 2
a.diffInYears(b)       // 0
a.diffInHours(b)
a.diffInMinutes(b)
a.diffInSeconds(b)
a.diffInMilliseconds(b)
a.diffAbsInDays(b)     // always positive
a.diffAbsInHours(b)

// Human-readable relative time
Carbon.from("2025-08-01").diffForHumans()  // "13 days ago"
Carbon.from("2025-09-01").diffForHumans()  // "18 days from now"
carbon.humanize()                           // alias for diffForHumans()
```

---

#### Comparisons

```ts
carbon.isPast()
carbon.isFuture()
carbon.isToday()
carbon.isTomorrow()
carbon.isYesterday()
carbon.isWeekend()
carbon.isWeekday()
carbon.isMonday()
carbon.isTuesday()
carbon.isWednesday()
carbon.isThursday()
carbon.isFriday()
carbon.isSaturday()
carbon.isSunday()
carbon.isLeapYear()
carbon.isDST()           // is Daylight Saving Time active?

carbon.isSameDay(other)
carbon.isSameHour(other)
carbon.isSameMonth(other)
carbon.isSameYear(other)
carbon.isSameQuarter(other)
carbon.isSame(other, "day")      // generic comparison by unit

carbon.isAfter(other)
carbon.isBefore(other)
carbon.isSameOrAfter(other)
carbon.isSameOrBefore(other)
carbon.isBetween(start, end)           // exclusive by default
carbon.isBetween(start, end, true)     // inclusive
```

---

#### Navigation

```ts
import { MONDAY, FRIDAY } from "@lara-node/carbon";

carbon.next(MONDAY)       // next Monday
carbon.previous(FRIDAY)   // previous Friday
carbon.nextWeekday()      // next working day (skip weekends)
carbon.previousWeekday()  // previous working day

// nth weekday of month
carbon.nthOfMonth(1, MONDAY)   // 1st Monday
carbon.nthOfMonth(3, FRIDAY)   // 3rd Friday
carbon.nthOfMonth(-1, FRIDAY)  // last Friday of the month
```

---

#### Fluent Setters (immutable)

```ts
carbon.setYear(2030)
carbon.setMonthOfYear(12)      // 1-based
carbon.setDateOfMonth(25)
carbon.setTimeOfDay(14, 30, 0) // hour, min, sec, ms
carbon.setTimestamp(1723625400)
```

---

#### Utilities

```ts
carbon.daysInMonth()   // 28 / 29 / 30 / 31
carbon.daysInYear()    // 365 or 366
carbon.weeksInYear()   // 52 or 53

carbon.toObject()
// { year, month, day, hour, minute, second, millisecond,
//   timestamp, dayOfWeek, quarter, weekOfYear, dayOfYear }

carbon.toArray()
// [year, month, day, hour, minute, second, millisecond]

carbon.clone()
```

---

#### Formatting

```ts
carbon.format("YYYY-MM-DD HH:mm:ss")   // default
carbon.format("DD/MM/YYYY")
carbon.format("dddd, MMMM D, YYYY")    // Thursday, August 14, 2025
carbon.format("h:mm A")                // 9:30 AM
carbon.format("Q[Q] YYYY")             // 3Q 2025
```

**Supported tokens:**

| Token | Output |
|---|---|
| `YYYY` | 4-digit year |
| `YY` | 2-digit year |
| `MMMM` | Full month name |
| `MMM` | Short month name |
| `MM` | Month 01–12 |
| `M` | Month 1–12 |
| `DD` | Day 01–31 |
| `D` | Day 1–31 |
| `dddd` | Full weekday name |
| `ddd` | Short weekday name |
| `HH` | Hours 00–23 |
| `H` | Hours 0–23 |
| `hh` | Hours 01–12 |
| `h` | Hours 1–12 |
| `mm` | Minutes 00–59 |
| `m` | Minutes 0–59 |
| `ss` | Seconds 00–59 |
| `s` | Seconds 0–59 |
| `SSS` | Milliseconds 000–999 |
| `A` | AM / PM |
| `a` | am / pm |
| `Q` | Quarter 1–4 |
| `W` / `WW` | Week of year |
| `DDD` | Day of year |
| `X` | Unix timestamp (seconds) |
| `x` | Unix timestamp (ms) |

**Convenience methods:**

```ts
carbon.toDateOnlyString()   // "2025-08-14"
carbon.toDateTimeString()   // "2025-08-14 09:30:00"
carbon.toTimeOnlyString()   // "09:30:00"
carbon.toAtomString()       // ISO 8601
carbon.toRfc2822String()    // RFC 2822 (UTC)
```

---

### `CarbonImmutable`

Drop-in replacement for `Carbon` that throws if any native mutable `Date` method is called directly. All fluent methods still return new `CarbonImmutable` instances.

```ts
import { CarbonImmutable } from "@lara-node/carbon";

const d = CarbonImmutable.now();
const next = d.addDays(7);    // OK — returns new CarbonImmutable

d.setDate(1);                 // throws: "cannot call mutable method setDate"
```

---

### `CarbonInterval`

Represents a duration — can be constructed from a spec or derived from two dates.

```ts
import { CarbonInterval, Carbon } from "@lara-node/carbon";

const iv = CarbonInterval.days(30);
iv.humanize();          // "30 days"
iv.totalSeconds;        // 2592000

const iv2 = CarbonInterval.between(
  Carbon.from("2025-01-01"),
  Carbon.from("2025-08-14")
);
iv2.humanize();         // "7 months, 13 days"

// Named constructors
CarbonInterval.years(1)
CarbonInterval.months(3)
CarbonInterval.weeks(2)
CarbonInterval.days(10)
CarbonInterval.hours(6)
CarbonInterval.minutes(45)
CarbonInterval.seconds(30)

// Combine
const total = iv.add(CarbonInterval.hours(5));
const doubled = iv.multiply(2);

// Computed getters
iv.totalSeconds
iv.totalMinutes
iv.totalHours
iv.totalDays
iv.totalWeeks

iv.toSpec()   // { years, months, weeks, days, hours, minutes, seconds }
```

---

### `CarbonPeriod`

Iterable date range between two dates.

```ts
import { CarbonPeriod, Carbon, MONDAY } from "@lara-node/carbon";

const period = CarbonPeriod
  .between(Carbon.from("2025-08-01"), Carbon.from("2025-08-31"))
  .everyDay();

for (const date of period) {
  console.log(date.toDateOnlyString());
}

// Collect to array
const days = period.toArray();

// Count
period.count();           // 31

// Check containment
period.contains(Carbon.today());  // true / false

// Custom step
CarbonPeriod.between(start, end).every(3, "day");
CarbonPeriod.between(start, end).everyWeek();
CarbonPeriod.between(start, end).everyMonth();

// Exclusive (end not included)
CarbonPeriod.between(start, end).everyDay().exclusive();
```

---

### Weekday Constants

```ts
import { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY } from "@lara-node/carbon";
```

---

## Examples

```ts
import { Carbon, CarbonInterval, CarbonPeriod, FRIDAY } from "@lara-node/carbon";

// Age from birthday
const birthday = Carbon.from("1995-06-15");
console.log(`Age: ${birthday.age}`);

// Business days in August 2025
const aug = CarbonPeriod.between(
  Carbon.from("2025-08-01"),
  Carbon.from("2025-08-31")
).everyDay();

const businessDays = aug.toArray().filter((d) => d.isWeekday());
console.log(`Business days: ${businessDays.length}`);

// Last Friday of the month
const lastFriday = Carbon.today().nthOfMonth(-1, FRIDAY);
console.log(lastFriday.format("dddd, MMMM DD YYYY"));

// Countdown
const newYear = Carbon.fromFormat("2026-01-01", "YYYY-MM-DD");
console.log(newYear.diffForHumans());  // "X months from now"

// Quarter boundaries
const q = Carbon.today();
console.log(`Q${q.quarter}: ${q.startOfQuarter().toDateOnlyString()} – ${q.endOfQuarter().toDateOnlyString()}`);

// Interval between dates
const interval = CarbonInterval.between(Carbon.from("2025-01-01"), Carbon.today());
console.log(interval.humanize());
```

---

## License

MIT
