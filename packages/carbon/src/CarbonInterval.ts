import { Carbon } from "./Carbon.js";

export interface IntervalSpec {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/**
 * Represents a duration between two dates or a fixed interval spec.
 */
export class CarbonInterval {
  readonly years: number;
  readonly months: number;
  readonly weeks: number;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;

  constructor(spec: IntervalSpec = {}) {
    this.years   = spec.years   ?? 0;
    this.months  = spec.months  ?? 0;
    this.weeks   = spec.weeks   ?? 0;
    this.days    = spec.days    ?? 0;
    this.hours   = spec.hours   ?? 0;
    this.minutes = spec.minutes ?? 0;
    this.seconds = spec.seconds ?? 0;
  }

  static years(n: number): CarbonInterval   { return new CarbonInterval({ years: n }); }
  static months(n: number): CarbonInterval  { return new CarbonInterval({ months: n }); }
  static weeks(n: number): CarbonInterval   { return new CarbonInterval({ weeks: n }); }
  static days(n: number): CarbonInterval    { return new CarbonInterval({ days: n }); }
  static hours(n: number): CarbonInterval   { return new CarbonInterval({ hours: n }); }
  static minutes(n: number): CarbonInterval { return new CarbonInterval({ minutes: n }); }
  static seconds(n: number): CarbonInterval { return new CarbonInterval({ seconds: n }); }

  static between(start: Carbon | Date, end: Carbon | Date): CarbonInterval {
    const s = Carbon.from(start);
    const e = Carbon.from(end);
    const totalSeconds = Math.abs(e.diffInSeconds(s));
    return new CarbonInterval({
      years:   Math.floor(totalSeconds / 31536000),
      months:  Math.floor((totalSeconds % 31536000) / 2592000),
      days:    Math.floor((totalSeconds % 2592000) / 86400),
      hours:   Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: Math.floor(totalSeconds % 60),
    });
  }

  get totalSeconds(): number {
    return (
      this.years * 31536000 +
      this.months * 2592000 +
      this.weeks * 604800 +
      this.days * 86400 +
      this.hours * 3600 +
      this.minutes * 60 +
      this.seconds
    );
  }

  get totalMinutes(): number { return this.totalSeconds / 60; }
  get totalHours(): number   { return this.totalSeconds / 3600; }
  get totalDays(): number    { return this.totalSeconds / 86400; }
  get totalWeeks(): number   { return this.totalDays / 7; }

  add(other: CarbonInterval): CarbonInterval {
    return new CarbonInterval({
      years:   this.years   + other.years,
      months:  this.months  + other.months,
      weeks:   this.weeks   + other.weeks,
      days:    this.days    + other.days,
      hours:   this.hours   + other.hours,
      minutes: this.minutes + other.minutes,
      seconds: this.seconds + other.seconds,
    });
  }

  multiply(factor: number): CarbonInterval {
    return new CarbonInterval({
      years:   this.years   * factor,
      months:  this.months  * factor,
      weeks:   this.weeks   * factor,
      days:    this.days    * factor,
      hours:   this.hours   * factor,
      minutes: this.minutes * factor,
      seconds: this.seconds * factor,
    });
  }

  humanize(): string {
    const parts: string[] = [];
    const push = (n: number, label: string) => {
      if (n !== 0) parts.push(`${n} ${label}${Math.abs(n) !== 1 ? "s" : ""}`);
    };
    push(this.years,   "year");
    push(this.months,  "month");
    push(this.weeks,   "week");
    push(this.days,    "day");
    push(this.hours,   "hour");
    push(this.minutes, "minute");
    push(this.seconds, "second");
    return parts.join(", ") || "0 seconds";
  }

  toSpec(): IntervalSpec {
    return {
      years: this.years, months: this.months, weeks: this.weeks,
      days: this.days, hours: this.hours, minutes: this.minutes, seconds: this.seconds,
    };
  }
}
