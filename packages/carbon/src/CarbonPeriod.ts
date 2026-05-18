import { Carbon, TimeUnit } from "./Carbon.js";
import { CarbonInterval } from "./CarbonInterval.js";

export type PeriodStep = CarbonInterval | { value: number; unit: TimeUnit };

/**
 * Iterable date range between two Carbon dates with a configurable step.
 *
 * @example
 * for (const date of CarbonPeriod.between(start, end).everyDay()) {
 *   console.log(date.toDateOnlyString());
 * }
 */
export class CarbonPeriod implements Iterable<Carbon> {
  private _start: Carbon;
  private _end: Carbon;
  private _step: PeriodStep;
  private _inclusive: boolean;

  constructor(start: Carbon | Date, end: Carbon | Date, step?: PeriodStep) {
    this._start = Carbon.from(start);
    this._end   = Carbon.from(end);
    this._step  = step ?? { value: 1, unit: "day" };
    this._inclusive = true;
  }

  static between(start: Carbon | Date, end: Carbon | Date): CarbonPeriod {
    return new CarbonPeriod(start, end);
  }

  everySecond()  : CarbonPeriod { this._step = { value: 1, unit: "second" }; return this; }
  everyMinute()  : CarbonPeriod { this._step = { value: 1, unit: "minute" }; return this; }
  everyHour()    : CarbonPeriod { this._step = { value: 1, unit: "hour" };   return this; }
  everyDay()     : CarbonPeriod { this._step = { value: 1, unit: "day" };    return this; }
  everyWeek()    : CarbonPeriod { this._step = { value: 1, unit: "week" };   return this; }
  everyMonth()   : CarbonPeriod { this._step = { value: 1, unit: "month" };  return this; }
  everyYear()    : CarbonPeriod { this._step = { value: 1, unit: "year" };   return this; }

  every(value: number, unit: TimeUnit): CarbonPeriod {
    this._step = { value, unit };
    return this;
  }

  exclusive(): CarbonPeriod { this._inclusive = false; return this; }
  inclusive(): CarbonPeriod { this._inclusive = true;  return this; }

  toArray(): Carbon[] {
    return [...this];
  }

  count(): number {
    return this.toArray().length;
  }

  contains(date: Carbon | Date): boolean {
    return Carbon.from(date).isBetween(this._start, this._end, this._inclusive);
  }

  [Symbol.iterator](): Iterator<Carbon> {
    const forward = this._end.isAfter(this._start) || this._end.getTime() === this._start.getTime();
    let current = this._start.clone();
    const end = this._end;
    const step = this._step;
    const inclusive = this._inclusive;

    return {
      next(): IteratorResult<Carbon> {
        const isWithin = inclusive
          ? (forward ? current.isSameOrBefore(end) : current.isSameOrAfter(end))
          : (forward ? current.isBefore(end)       : current.isAfter(end));

        if (!isWithin) return { value: current, done: true };

        const value = current.clone();

        if ("unit" in step) {
          current = current.add(forward ? step.value : -step.value, step.unit);
        } else {
          const ms = step.totalSeconds * 1000;
          current = Carbon.from(current.getTime() + (forward ? ms : -ms));
        }

        return { value, done: false };
      },
    };
  }
}
