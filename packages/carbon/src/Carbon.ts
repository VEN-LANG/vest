// Day-of-week constants (match JS getDay())
export const MONDAY = 1;
export const TUESDAY = 2;
export const WEDNESDAY = 3;
export const THURSDAY = 4;
export const FRIDAY = 5;
export const SATURDAY = 6;
export const SUNDAY = 0;

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TimeUnit = "year" | "month" | "week" | "day" | "hour" | "minute" | "second";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * Extended Date class with Laravel Carbon-like features.
 * All mutation methods return a new Carbon instance (immutable pattern).
 */
export class Carbon extends Date {
  // -------------------------------------------------------------------------
  // Static factories
  // -------------------------------------------------------------------------

  static current(): Carbon {
    return new Carbon();
  }

  static from(date: string | number | Date): Carbon {
    return new Carbon(date);
  }

  static fromTimestamp(ts: number): Carbon {
    return new Carbon(ts * 1000);
  }

  static fromFormat(dateStr: string, format: string): Carbon {
    // Parses a date string based on a format token map
    let year = 0, month = 0, day = 1, hours = 0, minutes = 0, seconds = 0;

    const tokenMap: Record<string, (v: string) => void> = {
      YYYY: (v) => { year = parseInt(v, 10); },
      MM:   (v) => { month = parseInt(v, 10) - 1; },
      DD:   (v) => { day = parseInt(v, 10); },
      HH:   (v) => { hours = parseInt(v, 10); },
      mm:   (v) => { minutes = parseInt(v, 10); },
      ss:   (v) => { seconds = parseInt(v, 10); },
    };

    const tokens = Object.keys(tokenMap);
    let regex = format;
    const order: string[] = [];
    for (const token of tokens) {
      if (format.includes(token)) {
        order.push(token);
        regex = regex.replace(token, "(\\d+)");
      }
    }

    const match = dateStr.match(new RegExp(`^${regex}$`));
    if (!match) throw new Error(`Cannot parse "${dateStr}" with format "${format}"`);

    match.slice(1).forEach((val, i) => tokenMap[order[i]]?.(val));
    return new Carbon(new Date(year, month, day, hours, minutes, seconds));
  }

  static today(): Carbon {
    return Carbon.current().startOfDay();
  }

  static tomorrow(): Carbon {
    return Carbon.current().addDay();
  }

  static yesterday(): Carbon {
    return Carbon.current().subDay();
  }

  static min(...dates: (Carbon | Date)[]): Carbon {
    return Carbon.from(new Date(Math.min(...dates.map((d) => d.getTime()))));
  }

  static max(...dates: (Carbon | Date)[]): Carbon {
    return Carbon.from(new Date(Math.max(...dates.map((d) => d.getTime()))));
  }

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  constructor(date?: string | number | Date | Carbon) {
    if (date === undefined) super();
    else super(date as string | number | Date | Carbon);
  }

  clone(): Carbon {
    return new Carbon(this);
  }

  // -------------------------------------------------------------------------
  // Accessors / Getters
  // -------------------------------------------------------------------------

  get year(): number { return this.getFullYear(); }
  get month(): number { return this.getMonth() + 1; }
  get day(): number { return this.getDate(); }
  get hour(): number { return this.getHours(); }
  get minute(): number { return this.getMinutes(); }
  get second(): number { return this.getSeconds(); }
  get millisecond(): number { return this.getMilliseconds(); }
  get dayOfWeek(): WeekDay { return this.getDay() as WeekDay; }
  get timestamp(): number { return Math.floor(this.getTime() / 1000); }

  get quarter(): number {
    return Math.ceil(this.month / 3);
  }

  get weekOfYear(): number {
    const startOfYear = new Date(this.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((this.getTime() - startOfYear.getTime()) / 86400000);
    return Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  }

  get dayOfYear(): number {
    const startOfYear = new Date(this.getFullYear(), 0, 1);
    return Math.floor((this.getTime() - startOfYear.getTime()) / 86400000) + 1;
  }

  get decade(): number {
    return Math.floor(this.getFullYear() / 10) * 10;
  }

  get age(): number {
    const now = Carbon.current();
    let age = now.getFullYear() - this.getFullYear();
    const hasBirthdayPassed =
      now.getMonth() > this.getMonth() ||
      (now.getMonth() === this.getMonth() && now.getDate() >= this.getDate());
    if (!hasBirthdayPassed) age -= 1;
    return age;
  }

  get monthName(): string {
    return MONTH_NAMES[this.getMonth()];
  }

  get dayName(): string {
    return WEEKDAY_NAMES[this.getDay()];
  }

  get shortMonthName(): string {
    return this.monthName.slice(0, 3);
  }

  get shortDayName(): string {
    return this.dayName.slice(0, 3);
  }

  // -------------------------------------------------------------------------
  // Start / End of period
  // -------------------------------------------------------------------------

  startOfDay(): Carbon {
    const d = this.clone();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  endOfDay(): Carbon {
    const d = this.clone();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  startOfWeek(mondayFirst = true): Carbon {
    const d = this.clone();
    const dow = d.getDay();
    const diff = mondayFirst ? (dow === 0 ? 6 : dow - 1) : dow;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  endOfWeek(mondayFirst = true): Carbon {
    const d = this.startOfWeek(mondayFirst);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  startOfMonth(): Carbon {
    const d = this.clone();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  endOfMonth(): Carbon {
    const d = this.clone();
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  startOfQuarter(): Carbon {
    const firstMonthOfQuarter = (this.quarter - 1) * 3;
    const d = this.clone();
    d.setMonth(firstMonthOfQuarter, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  endOfQuarter(): Carbon {
    const lastMonthOfQuarter = this.quarter * 3 - 1;
    const d = this.clone();
    d.setMonth(lastMonthOfQuarter + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  startOfYear(): Carbon {
    const d = this.clone();
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  endOfYear(): Carbon {
    const d = this.clone();
    d.setMonth(11, 31);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  startOfDecade(): Carbon {
    return this.setYear(this.decade).startOfYear();
  }

  endOfDecade(): Carbon {
    return this.setYear(this.decade + 9).endOfYear();
  }

  startOfCentury(): Carbon {
    const century = Math.floor(this.getFullYear() / 100) * 100;
    return this.setYear(century).startOfYear();
  }

  endOfCentury(): Carbon {
    const century = Math.floor(this.getFullYear() / 100) * 100;
    return this.setYear(century + 99).endOfYear();
  }

  startOfHour(): Carbon {
    const d = this.clone();
    d.setMinutes(0, 0, 0);
    return d;
  }

  endOfHour(): Carbon {
    const d = this.clone();
    d.setMinutes(59, 59, 999);
    return d;
  }

  startOfMinute(): Carbon {
    const d = this.clone();
    d.setSeconds(0, 0);
    return d;
  }

  endOfMinute(): Carbon {
    const d = this.clone();
    d.setSeconds(59, 999);
    return d;
  }

  // -------------------------------------------------------------------------
  // Add / Sub
  // -------------------------------------------------------------------------

  add(value: number, unit: TimeUnit): Carbon {
    switch (unit) {
      case "year":   return this.addYears(value);
      case "month":  return this.addMonths(value);
      case "week":   return this.addWeeks(value);
      case "day":    return this.addDays(value);
      case "hour":   return this.addHours(value);
      case "minute": return this.addMinutes(value);
      case "second": return this.addSeconds(value);
    }
  }

  sub(value: number, unit: TimeUnit): Carbon {
    return this.add(-value, unit);
  }

  addYear()                   : Carbon { return this.addYears(1); }
  addYears(n: number)         : Carbon { const d = this.clone(); d.setFullYear(d.getFullYear() + n); return d; }
  subYear()                   : Carbon { return this.addYears(-1); }
  subYears(n: number)         : Carbon { return this.addYears(-n); }

  addQuarter()                : Carbon { return this.addQuarters(1); }
  addQuarters(n: number)      : Carbon { return this.addMonths(n * 3); }
  subQuarter()                : Carbon { return this.addQuarters(-1); }
  subQuarters(n: number)      : Carbon { return this.addMonths(-n * 3); }

  addMonth()                  : Carbon { return this.addMonths(1); }
  addMonths(n: number)        : Carbon { const d = this.clone(); d.setMonth(d.getMonth() + n); return d; }
  subMonth()                  : Carbon { return this.addMonths(-1); }
  subMonths(n: number)        : Carbon { return this.addMonths(-n); }

  addWeek()                   : Carbon { return this.addWeeks(1); }
  addWeeks(n: number)         : Carbon { return this.addDays(n * 7); }
  subWeek()                   : Carbon { return this.addWeeks(-1); }
  subWeeks(n: number)         : Carbon { return this.addDays(-n * 7); }

  addDay()                    : Carbon { return this.addDays(1); }
  addDays(n: number)          : Carbon { const d = this.clone(); d.setDate(d.getDate() + n); return d; }
  subDay()                    : Carbon { return this.addDays(-1); }
  subDays(n: number)          : Carbon { return this.addDays(-n); }

  addHour()                   : Carbon { return this.addHours(1); }
  addHours(n: number)         : Carbon { const d = this.clone(); d.setHours(d.getHours() + n); return d; }
  subHour()                   : Carbon { return this.addHours(-1); }
  subHours(n: number)         : Carbon { return this.addHours(-n); }

  addMinute()                 : Carbon { return this.addMinutes(1); }
  addMinutes(n: number)       : Carbon { const d = this.clone(); d.setMinutes(d.getMinutes() + n); return d; }
  subMinute()                 : Carbon { return this.addMinutes(-1); }
  subMinutes(n: number)       : Carbon { return this.addMinutes(-n); }

  addSecond()                 : Carbon { return this.addSeconds(1); }
  addSeconds(n: number)       : Carbon { const d = this.clone(); d.setSeconds(d.getSeconds() + n); return d; }
  subSecond()                 : Carbon { return this.addSeconds(-1); }
  subSeconds(n: number)       : Carbon { return this.addSeconds(-n); }

  addMillisecond()            : Carbon { return this.addMilliseconds(1); }
  addMilliseconds(n: number)  : Carbon { return Carbon.from(this.getTime() + n); }
  subMillisecond()            : Carbon { return this.addMilliseconds(-1); }
  subMilliseconds(n: number)  : Carbon { return Carbon.from(this.getTime() - n); }

  // -------------------------------------------------------------------------
  // Diffs
  // -------------------------------------------------------------------------

  diffInYears(other: Carbon | Date): number {
    return other.getFullYear() - this.getFullYear();
  }

  diffInMonths(other: Carbon | Date): number {
    return (other.getFullYear() - this.getFullYear()) * 12 + (other.getMonth() - this.getMonth());
  }

  diffInQuarters(other: Carbon | Date): number {
    return Math.floor(this.diffInMonths(other) / 3);
  }

  diffInWeeks(other: Carbon | Date): number {
    return this.diffInDays(other) / 7;
  }

  diffInDays(other: Carbon | Date): number {
    const msPerDay = 86400000;
    const utc1 = Date.UTC(this.getFullYear(), this.getMonth(), this.getDate());
    const utc2 = Date.UTC(other.getFullYear(), other.getMonth(), other.getDate());
    return Math.round((utc2 - utc1) / msPerDay);
  }

  diffInHours(other: Carbon | Date): number {
    return (other.getTime() - this.getTime()) / 3600000;
  }

  diffInMinutes(other: Carbon | Date): number {
    return (other.getTime() - this.getTime()) / 60000;
  }

  diffInSeconds(other: Carbon | Date): number {
    return (other.getTime() - this.getTime()) / 1000;
  }

  diffInMilliseconds(other: Carbon | Date): number {
    return other.getTime() - this.getTime();
  }

  diffAbsInDays(other: Carbon | Date): number {
    return Math.abs(this.diffInDays(other));
  }

  diffAbsInHours(other: Carbon | Date): number {
    return Math.abs(this.diffInHours(other));
  }

  diffForHumans(other?: Carbon | Date): string {
    const now = other ? Carbon.from(other) : Carbon.current();
    const diffSeconds = now.diffInSeconds(this);
    const abs = Math.abs(diffSeconds);
    const future = diffSeconds > 0;

    let unit: string, value: number;
    if (abs < 60)       { value = Math.round(abs);           unit = "second"; }
    else if (abs < 3600)     { value = Math.round(abs / 60);      unit = "minute"; }
    else if (abs < 86400)    { value = Math.round(abs / 3600);    unit = "hour";   }
    else if (abs < 2592000)  { value = Math.round(abs / 86400);   unit = "day";    }
    else if (abs < 31536000) { value = Math.round(abs / 2592000); unit = "month";  }
    else                     { value = Math.round(abs / 31536000); unit = "year";  }

    return `${value} ${unit}${value !== 1 ? "s" : ""} ${future ? "from now" : "ago"}`;
  }

  // -------------------------------------------------------------------------
  // Comparisons
  // -------------------------------------------------------------------------

  isPast(): boolean    { return this.getTime() < Date.now(); }
  isFuture(): boolean  { return this.getTime() > Date.now(); }
  isToday(): boolean   { return this.isSameDay(Carbon.current()); }
  isTomorrow(): boolean { return this.isSameDay(Carbon.tomorrow()); }
  isYesterday(): boolean { return this.isSameDay(Carbon.yesterday()); }

  isWeekend(): boolean { const d = this.getDay(); return d === 0 || d === 6; }
  isWeekday(): boolean { return !this.isWeekend(); }
  isMonday(): boolean    { return this.getDay() === MONDAY; }
  isTuesday(): boolean   { return this.getDay() === TUESDAY; }
  isWednesday(): boolean { return this.getDay() === WEDNESDAY; }
  isThursday(): boolean  { return this.getDay() === THURSDAY; }
  isFriday(): boolean    { return this.getDay() === FRIDAY; }
  isSaturday(): boolean  { return this.getDay() === SATURDAY; }
  isSunday(): boolean    { return this.getDay() === SUNDAY; }

  isSameDay(other: Carbon | Date): boolean {
    return (
      this.getFullYear() === other.getFullYear() &&
      this.getMonth() === other.getMonth() &&
      this.getDate() === other.getDate()
    );
  }

  isSameHour(other: Carbon | Date): boolean {
    return this.isSameDay(other) && this.getHours() === other.getHours();
  }

  isSameMonth(other: Carbon | Date): boolean {
    return this.getFullYear() === other.getFullYear() && this.getMonth() === other.getMonth();
  }

  isSameYear(other: Carbon | Date): boolean {
    return this.getFullYear() === other.getFullYear();
  }

  isSameQuarter(other: Carbon | Date): boolean {
    return this.isSameYear(other) && this.quarter === Carbon.from(other).quarter;
  }

  isSame(other: Carbon | Date, unit: TimeUnit): boolean {
    switch (unit) {
      case "year":   return this.isSameYear(other);
      case "month":  return this.isSameMonth(other);
      case "week":   return this.isSameDay(Carbon.from(other).startOfWeek());
      case "day":    return this.isSameDay(other);
      case "hour":   return this.isSameHour(other);
      case "minute": return this.isSameHour(other) && this.getMinutes() === other.getMinutes();
      case "second": return this.diffInSeconds(other) === 0;
    }
  }

  isAfter(other: Carbon | Date): boolean   { return this.getTime() > other.getTime(); }
  isBefore(other: Carbon | Date): boolean  { return this.getTime() < other.getTime(); }
  isSameOrAfter(other: Carbon | Date): boolean  { return this.getTime() >= other.getTime(); }
  isSameOrBefore(other: Carbon | Date): boolean { return this.getTime() <= other.getTime(); }

  isBetween(start: Carbon | Date, end: Carbon | Date, inclusive = false): boolean {
    return inclusive
      ? this.isSameOrAfter(start) && this.isSameOrBefore(end)
      : this.isAfter(start) && this.isBefore(end);
  }

  isLeapYear(): boolean {
    const y = this.getFullYear();
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  isDST(): boolean {
    const jan = new Date(this.getFullYear(), 0, 1).getTimezoneOffset();
    const jul = new Date(this.getFullYear(), 6, 1).getTimezoneOffset();
    return this.getTimezoneOffset() < Math.max(jan, jul);
  }

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  next(weekday: WeekDay): Carbon {
    const d = this.clone();
    let daysToAdd = (weekday - d.getDay() + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    return d.addDays(daysToAdd);
  }

  previous(weekday: WeekDay): Carbon {
    const d = this.clone();
    let daysToSub = (d.getDay() - weekday + 7) % 7;
    if (daysToSub === 0) daysToSub = 7;
    return d.subDays(daysToSub);
  }

  nextWeekday(): Carbon {
    let d = this.addDay();
    while (d.isWeekend()) d = d.addDay();
    return d;
  }

  previousWeekday(): Carbon {
    let d = this.subDay();
    while (d.isWeekend()) d = d.subDay();
    return d;
  }

  /**
   * nth weekday of the month (e.g., 3rd Monday → nthOfMonth(3, MONDAY)).
   * Negative n counts from end: nthOfMonth(-1, FRIDAY) = last Friday.
   */
  nthOfMonth(nth: number, weekday: WeekDay): Carbon {
    if (nth > 0) {
      const start = this.startOfMonth();
      let found = 0;
      let d = start.clone();
      while (d.isSameMonth(this)) {
        if (d.getDay() === weekday) {
          found++;
          if (found === nth) return d;
        }
        d = d.addDay();
      }
      throw new Error(`No ${nth}th weekday ${weekday} in month`);
    } else {
      const end = this.endOfMonth();
      let found = 0;
      let d = end.startOfDay();
      while (d.isSameMonth(this)) {
        if (d.getDay() === weekday) {
          found--;
          if (found === nth) return d;
        }
        d = d.subDay();
      }
      throw new Error(`No ${nth}th (from end) weekday ${weekday} in month`);
    }
  }

  // -------------------------------------------------------------------------
  // Fluent setters (immutable — return new Carbon)
  // -------------------------------------------------------------------------

  setYear(year: number): Carbon {
    const d = this.clone(); d.setFullYear(year); return d;
  }

  setMonthOfYear(month: number): Carbon {
    const d = this.clone(); d.setMonth(month - 1); return d;
  }

  setDateOfMonth(day: number): Carbon {
    const d = this.clone(); d.setDate(day); return d;
  }

  setTimeOfDay(h: number, m = 0, s = 0, ms = 0): Carbon {
    const d = this.clone(); d.setHours(h, m, s, ms); return d;
  }

  setTimestamp(ts: number): Carbon {
    return Carbon.fromTimestamp(ts);
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  daysInMonth(): number {
    return new Date(this.getFullYear(), this.getMonth() + 1, 0).getDate();
  }

  daysInYear(): number {
    return this.isLeapYear() ? 366 : 365;
  }

  weeksInYear(): number {
    // ISO 8601: check if Dec 28 is in week 52 or 53
    const dec28 = new Carbon(new Date(this.getFullYear(), 11, 28));
    return dec28.weekOfYear;
  }

  toObject(): {
    year: number; month: number; day: number;
    hour: number; minute: number; second: number;
    millisecond: number; timestamp: number; dayOfWeek: WeekDay;
    quarter: number; weekOfYear: number; dayOfYear: number;
  } {
    return {
      year: this.year, month: this.month, day: this.day,
      hour: this.hour, minute: this.minute, second: this.second,
      millisecond: this.millisecond, timestamp: this.timestamp,
      dayOfWeek: this.dayOfWeek, quarter: this.quarter,
      weekOfYear: this.weekOfYear, dayOfYear: this.dayOfYear,
    };
  }

  toArray(): [number, number, number, number, number, number, number] {
    return [this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond];
  }

  // -------------------------------------------------------------------------
  // Formatting
  // -------------------------------------------------------------------------

  format(formatStr = "YYYY-MM-DD HH:mm:ss"): string {
    const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
    const map: Record<string, string> = {
      YYYY:  this.getFullYear().toString(),
      YY:    this.getFullYear().toString().slice(-2),
      MM:    pad(this.getMonth() + 1),
      M:     (this.getMonth() + 1).toString(),
      DD:    pad(this.getDate()),
      D:     this.getDate().toString(),
      HH:    pad(this.getHours()),
      H:     this.getHours().toString(),
      hh:    pad(this.getHours() % 12 || 12),
      h:     (this.getHours() % 12 || 12).toString(),
      mm:    pad(this.getMinutes()),
      m:     this.getMinutes().toString(),
      ss:    pad(this.getSeconds()),
      s:     this.getSeconds().toString(),
      SSS:   pad(this.getMilliseconds(), 3),
      A:     this.getHours() < 12 ? "AM" : "PM",
      a:     this.getHours() < 12 ? "am" : "pm",
      dddd:  this.dayName,
      ddd:   this.shortDayName,
      MMMM:  this.monthName,
      MMM:   this.shortMonthName,
      Q:     this.quarter.toString(),
      X:     this.timestamp.toString(),
      x:     this.getTime().toString(),
      W:     this.weekOfYear.toString(),
      WW:    pad(this.weekOfYear),
      DDD:   this.dayOfYear.toString(),
    };

    const pattern = /YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|hh|H|h|mm|m|ss|s|SSS|A|a|dddd|ddd|Q|X|x|WW|W|DDD/g;
    return formatStr.replace(pattern, (token) => map[token] ?? token);
  }

  // Override to avoid Date's native toDateString collision
  toDateOnlyString(): string  { return this.format("YYYY-MM-DD"); }
  toDateTimeString(): string  { return this.format("YYYY-MM-DD HH:mm:ss"); }
  toTimeOnlyString(): string  { return this.format("HH:mm:ss"); }
  toAtomString(): string      { return this.toISOString(); }
  toRfc2822String(): string   { return this.toUTCString(); }

  humanize(): string { return this.diffForHumans(); }
}
