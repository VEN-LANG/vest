import { Carbon, TimeUnit, WeekDay } from "./Carbon.js";

/**
 * Strictly immutable variant of Carbon.
 * All native Date mutation methods are blocked at the type level.
 * Use the fluent API (addDays, subMonths, …) which always return new instances.
 */
export class CarbonImmutable extends Carbon {
  // Proxy every native setter to throw instead of mutating
  private _frozen = false;

  constructor(date?: string | number | Date) {
    super(date);
    this._frozen = true;
  }

  private _guard(method: string): void {
    if (this._frozen) {
      throw new Error(`CarbonImmutable: cannot call mutable method "${method}". Use the fluent API.`);
    }
  }

  // Override all mutable Date methods
  setTime(t: number): number        { this._guard("setTime");        return super.setTime(t); }
  setFullYear(...a: [number, number?, number?]): number {
    this._guard("setFullYear"); return super.setFullYear(...a);
  }
  setMonth(...a: [number, number?]): number  { this._guard("setMonth");  return super.setMonth(...a); }
  setDate(d: number): number         { this._guard("setDate");        return super.setDate(d); }
  setHours(...a: [number, number?, number?, number?]): number {
    this._guard("setHours"); return super.setHours(...a);
  }
  setMinutes(...a: [number, number?, number?]): number { this._guard("setMinutes"); return super.setMinutes(...a); }
  setSeconds(...a: [number, number?]): number { this._guard("setSeconds"); return super.setSeconds(...a); }
  setMilliseconds(ms: number): number { this._guard("setMilliseconds"); return super.setMilliseconds(ms); }
  setUTCFullYear(...a: [number, number?, number?]): number {
    this._guard("setUTCFullYear"); return super.setUTCFullYear(...a);
  }
  setUTCMonth(...a: [number, number?]): number  { this._guard("setUTCMonth");  return super.setUTCMonth(...a); }
  setUTCDate(d: number): number  { this._guard("setUTCDate");  return super.setUTCDate(d); }
  setUTCHours(...a: [number, number?, number?, number?]): number {
    this._guard("setUTCHours"); return super.setUTCHours(...a);
  }
  setUTCMinutes(...a: [number, number?, number?]): number { this._guard("setUTCMinutes"); return super.setUTCMinutes(...a); }
  setUTCSeconds(...a: [number, number?]): number { this._guard("setUTCSeconds"); return super.setUTCSeconds(...a); }
  setUTCMilliseconds(ms: number): number { this._guard("setUTCMilliseconds"); return super.setUTCMilliseconds(ms); }

  // Override clone() to return CarbonImmutable
  clone(): CarbonImmutable {
    return new CarbonImmutable(new Date(this.getTime()));
  }

  // All fluent factory methods below must bypass the guard during construction.
  // We do this by temporarily using `new CarbonImmutable(date)` which calls
  // the parent `super(date)` before `_frozen` is set.

  // Static factories
  static current(): CarbonImmutable { return new CarbonImmutable(); }
  static from(date: string | number | Date): CarbonImmutable { return new CarbonImmutable(date); }
  static today(): CarbonImmutable { return CarbonImmutable.current().startOfDay(); }
  static tomorrow(): CarbonImmutable { return CarbonImmutable.current().addDays(1); }
  static yesterday(): CarbonImmutable { return CarbonImmutable.current().subDays(1); }
  static min(...dates: (Carbon | Date)[]): CarbonImmutable {
    return CarbonImmutable.from(new Date(Math.min(...dates.map((d) => d.getTime()))));
  }
  static max(...dates: (Carbon | Date)[]): CarbonImmutable {
    return CarbonImmutable.from(new Date(Math.max(...dates.map((d) => d.getTime()))));
  }

  // All add/sub/start/end methods return CarbonImmutable (inherited via clone())
  // because clone() is overridden above — no extra overrides needed.

  // Provide typed overrides so callers get CarbonImmutable back
  startOfDay(): CarbonImmutable { return super.startOfDay() as CarbonImmutable; }
  endOfDay():   CarbonImmutable { return super.endOfDay()   as CarbonImmutable; }
  addDays(n: number): CarbonImmutable { return super.addDays(n) as CarbonImmutable; }
  subDays(n: number): CarbonImmutable { return super.subDays(n) as CarbonImmutable; }
  addMonths(n: number): CarbonImmutable { return super.addMonths(n) as CarbonImmutable; }
  subMonths(n: number): CarbonImmutable { return super.subMonths(n) as CarbonImmutable; }
  addYears(n: number): CarbonImmutable { return super.addYears(n) as CarbonImmutable; }
  subYears(n: number): CarbonImmutable { return super.subYears(n) as CarbonImmutable; }
  add(value: number, unit: TimeUnit): CarbonImmutable { return super.add(value, unit) as CarbonImmutable; }
  sub(value: number, unit: TimeUnit): CarbonImmutable { return super.sub(value, unit) as CarbonImmutable; }
  next(weekday: WeekDay): CarbonImmutable { return super.next(weekday) as CarbonImmutable; }
  previous(weekday: WeekDay): CarbonImmutable { return super.previous(weekday) as CarbonImmutable; }
}
