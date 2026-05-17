import { EventEmitter } from "events";
import { CronExpressionParser as parser } from "cron-parser";
import { Cache } from "@lara-node/cache";

/*
|--------------------------------------------------------------------------
| Distributed Lock Helpers
|--------------------------------------------------------------------------
*/

const SCHEDULER_LOCK_PREFIX = `${process.env.APP_NAME || "app"}:scheduler:lock`;

async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const lockKey = `${SCHEDULER_LOCK_PREFIX}:${key}`;
  const existing = await Cache.get(lockKey);
  if (existing) return false;
  await Cache.set(lockKey, Date.now(), ttlSeconds);
  return true;
}

async function releaseLock(key: string): Promise<void> {
  await Cache.del(`${SCHEDULER_LOCK_PREFIX}:${key}`);
}

/*
|--------------------------------------------------------------------------
| ScheduledTask Interface
|--------------------------------------------------------------------------
*/

export interface ScheduledTask {
  name: string;
  callback: () => Promise<void> | void;
  expression: string;
  timezone?: string;
  description?: string;
  withoutOverlapping: boolean;
  onOneServer: boolean;
  evenInMaintenanceMode: boolean;
  runInBackground: boolean;
  conditions: Array<() => boolean | Promise<boolean>>;
  skipConditions: Array<() => boolean | Promise<boolean>>;
  betweenStart?: string; // "HH:MM"
  betweenEnd?: string; // "HH:MM"
  onSuccessHook?: (task: ScheduledTask) => void;
  onFailureHook?: (task: ScheduledTask, error: Error) => void;
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
}

export function createObservableTask(task: ScheduledTask): ScheduledTask {
  // Update nextRun once at registration — no Proxy needed since expression
  // changes only happen during builder chaining, not at runtime.
  try {
    const interval = parser.parse(task.expression, { tz: task.timezone || "UTC" });
    task.nextRun = interval.next().toDate();
  } catch {
    // invalid expression — leave nextRun as-is
  }
  return task;
}

/*
|--------------------------------------------------------------------------
| Schedule Manager
|--------------------------------------------------------------------------
*/

export class Schedule {
  private tasks: ScheduledTask[] = [];
  private running: boolean = false;
  private events: EventEmitter = new EventEmitter();
  private readonly cronPartsCache = new Map<string, string[]>();
  private readonly taskCacheKey = (name: string) =>
    `${process.env.APP_NAME || "app"}:scheduler:task:${name}`;

  /*
  |--------------------------------------------------------------------------
  | Task Registration
  |--------------------------------------------------------------------------
  */

  call(callback: () => Promise<void> | void): ScheduledTaskBuilder {
    const task = createObservableTask(this.defaultTask(`closure-${Date.now()}`, callback));
    this.tasks.push(task);
    return new ScheduledTaskBuilder(task);
  }

  command(command: string, args: string[] = []): ScheduledTaskBuilder {
    const callback = async () => {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const fullCommand = `npm run artisan -- ${command} ${args.join(" ")}`;
      console.log(`[Scheduler] Running command: ${fullCommand}`);
      const { stdout, stderr } = await execAsync(fullCommand);
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    };
    const task = createObservableTask(
        this.defaultTask(`command:${command}`, callback, `Artisan command: ${command}`),
    );
    this.tasks.push(task);
    return new ScheduledTaskBuilder(task);
  }

  exec(command: string): ScheduledTaskBuilder {
    const callback = async () => {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      console.log(`[Scheduler] Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    };
    const task = createObservableTask(
        this.defaultTask(`exec:${command.slice(0, 50)}`, callback, `Shell command: ${command}`),
    );
    this.tasks.push(task);
    return new ScheduledTaskBuilder(task);
  }

  job<T extends { dispatch: () => { dispatch: () => Promise<string> } }>(
      JobClass: T,
      queue?: string,
  ): ScheduledTaskBuilder {
    const callback = async () => {
      const pending = JobClass.dispatch();
      if (queue) (pending as any).onQueue(queue);
      await pending.dispatch();
    };
    const task = createObservableTask(
        this.defaultTask(
            `job:${(JobClass as any).name || "anonymous"}`,
            callback,
            `Dispatch job: ${(JobClass as any).name}`,
        ),
    );
    this.tasks.push(task);
    return new ScheduledTaskBuilder(task);
  }

  private defaultTask(
      name: string,
      callback: () => Promise<void> | void,
      description?: string,
  ): ScheduledTask {
    return {
      name,
      callback,
      expression: "* * * * *",
      description,
      withoutOverlapping: false,
      onOneServer: false,
      evenInMaintenanceMode: false,
      runInBackground: false,
      conditions: [],
      skipConditions: [],
      isRunning: false,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Execution
  |--------------------------------------------------------------------------
  */

  updateNextTaskRun(task: ScheduledTask): void {
    const interval = parser.parse(task.expression, { tz: task.timezone || "UTC" });
    task.nextRun = interval.next().toDate();
  }

  getTasks(): ScheduledTask[] {
    return this.tasks;
  }

  getDueTasks(): ScheduledTask[] {
    const now = new Date();
    return this.tasks.filter((task) => this.isDue(task, now));
  }

  private isDue(task: ScheduledTask, now: Date = new Date()): boolean {
    if (!this.matchesCronExpression(task.expression, now)) return false;

    // between() filter
    if (task.betweenStart && task.betweenEnd) {
      const [sh, sm] = task.betweenStart.split(":").map(Number);
      const [eh, em] = task.betweenEnd.split(":").map(Number);
      const current = now.getHours() * 60 + now.getMinutes();
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      if (current < start || current > end) return false;
    }

    return true;
  }

  private matchesCronExpression(expression: string, date: Date): boolean {
    let parts = this.cronPartsCache.get(expression);
    if (!parts) {
      parts = expression.split(" ");
      if (parts.length !== 5) {
        console.warn(`[Scheduler] Invalid cron expression: ${expression}`);
        return false;
      }
      this.cronPartsCache.set(expression, parts);
    }
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    return (
        this.matchCronPart(minute, date.getMinutes()) &&
        this.matchCronPart(hour, date.getHours()) &&
        this.matchCronPart(dayOfMonth, date.getDate()) &&
        this.matchCronPart(month, date.getMonth() + 1) &&
        this.matchCronPart(dayOfWeek, date.getDay())
    );
  }

  private matchCronPart(pattern: string, value: number): boolean {
    if (pattern === "*") return true;
    if (pattern.startsWith("*/")) {
      const interval = parseInt(pattern.slice(2), 10);
      return value % interval === 0;
    }
    if (pattern.includes("-")) {
      const [start, end] = pattern.split("-").map(Number);
      return value >= start && value <= end;
    }
    if (pattern.includes(",")) {
      return pattern.split(",").map(Number).includes(value);
    }
    return parseInt(pattern, 10) === value;
  }

  async runDueTasks(): Promise<void> {
    const maintenanceKey = `${process.env.APP_NAME || "app"}:maintenance`;
    const inMaintenance = await Cache.has(maintenanceKey).catch(() => false);

    const dueTasks = this.getDueTasks();
    console.log(`[Scheduler] Found ${dueTasks.length} due task(s)`);

    for (const task of dueTasks) {
      // Maintenance mode gate
      if (inMaintenance && !task.evenInMaintenanceMode) {
        console.log(`[Scheduler] Skipping task in maintenance mode: ${task.name}`);
        continue;
      }

      // Evaluate when() conditions — all must pass
      if (task.conditions.length > 0) {
        const results = await Promise.all(task.conditions.map((fn) => fn()));
        if (!results.every(Boolean)) {
          if (this.options.verbose)
            console.log(`[Scheduler] Skipping task (when() failed): ${task.name}`);
          continue;
        }
      }

      // Evaluate skip() conditions — any true → skip
      if (task.skipConditions.length > 0) {
        const results = await Promise.all(task.skipConditions.map((fn) => fn()));
        if (results.some(Boolean)) {
          if (this.options.verbose)
            console.log(`[Scheduler] Skipping task (skip() matched): ${task.name}`);
          continue;
        }
      }

      // In-process overlapping guard
      if (task.withoutOverlapping && task.isRunning) {
        console.log(`[Scheduler] Skipping overlapping task (in-memory): ${task.name}`);
        continue;
      }

      // Distributed overlapping lock
      if (task.withoutOverlapping) {
        const lockAcquired = await acquireLock(`overlap:${task.name}`, 300).catch(() => false);
        if (!lockAcquired) {
          console.log(`[Scheduler] Skipping overlapping task (distributed lock): ${task.name}`);
          continue;
        }
      }

      // Single-server lock (one cron tick ≈ 60s + 5s buffer)
      if (task.onOneServer) {
        const lockAcquired = await acquireLock(
            `once:${task.name}:${Math.floor(Date.now() / 60000)}`,
            65,
        ).catch(() => false);
        if (!lockAcquired) {
          console.log(
              `[Scheduler] Skipping task (onOneServer, another server has it): ${task.name}`,
          );
          continue;
        }
      }

      await this.runTask(task);
    }
  }

  private options = { verbose: false };

  private async runTask(task: ScheduledTask): Promise<void> {
    task.isRunning = true;
    this.updateNextTaskRun(task);

    console.log(`[Scheduler] Running task: ${task.name}`);
    this.events.emit("task:start", task);

    const finalize = async (error?: Error) => {
      task.isRunning = false;
      task.lastRun = new Date();
      Cache.set(this.taskCacheKey(task.name), { lastRun: task.lastRun }, null).catch(() => {});
      if (task.withoutOverlapping) {
        await releaseLock(`overlap:${task.name}`).catch(() => {});
      }
      if (error) {
        task.onFailureHook?.(task, error);
      } else {
        task.onSuccessHook?.(task);
      }
    };

    try {
      if (task.runInBackground) {
        setImmediate(async () => {
          try {
            await task.callback();
            this.events.emit("task:success", task);
            await finalize();
          } catch (error) {
            console.error(`[Scheduler] Task failed: ${task.name}`, error);
            this.events.emit("task:failed", task, error);
            await finalize(error as Error);
          }
        });
        // For background tasks, don't hold isRunning — the setImmediate owns it
      } else {
        await task.callback();
        this.events.emit("task:success", task);
        await finalize();
      }
    } catch (error) {
      console.error(`[Scheduler] Task failed: ${task.name}`, error);
      this.events.emit("task:failed", task, error);
      await finalize(error as Error);
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      console.log("[Scheduler] Already running");
      return;
    }

    this.running = true;
    console.log("[Scheduler] Starting scheduler daemon...");

    // Restore lastRun from cache for all registered tasks so the dashboard
    // shows accurate history after a process restart.
    await Promise.all(
      this.tasks.map(async (task) => {
        const state = await Cache.get(this.taskCacheKey(task.name)).catch(() => null) as any;
        if (state?.lastRun) task.lastRun = new Date(state.lastRun);
      }),
    );

    await this.runDueTasks();

    while (this.running) {
      const now = new Date();
      const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      await this.sleep(msUntilNextMinute);
      if (this.running) await this.runDueTasks();
    }
  }

  stop(): void {
    this.running = false;
    console.log("[Scheduler] Stopping...");
  }

  isRunning(): boolean {
    return this.running;
  }

  on(
      event: "task:start" | "task:success" | "task:failed",
      listener: (task: ScheduledTask, error?: any) => void,
  ): void {
    this.events.on(event, listener);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/*
|--------------------------------------------------------------------------
| Scheduled Task Builder
|--------------------------------------------------------------------------
*/

export class ScheduledTaskBuilder {
  constructor(private task: ScheduledTask) {}

  /*
  |--------------------------------------------------------------------------
  | Frequency — sub-hourly
  |--------------------------------------------------------------------------
  */

  everyMinute(): this {
    return this.cron("* * * * *");
  }
  everyTwoMinutes(): this {
    return this.cron("*/2 * * * *");
  }
  everyThreeMinutes(): this {
    return this.cron("*/3 * * * *");
  }
  everyFiveMinutes(): this {
    return this.cron("*/5 * * * *");
  }
  everyTenMinutes(): this {
    return this.cron("*/10 * * * *");
  }
  everyFifteenMinutes(): this {
    return this.cron("*/15 * * * *");
  }
  everyTwentyMinutes(): this {
    return this.cron("*/20 * * * *");
  }
  everyThirtyMinutes(): this {
    return this.cron("*/30 * * * *");
  }
  everyFortyFiveMinutes(): this {
    return this.cron("*/45 * * * *");
  }

  /** Run every N minutes (arbitrary interval). */
  everyNMinutes(n: number): this {
    return this.cron(`*/${n} * * * *`);
  }

  /*
  |--------------------------------------------------------------------------
  | Frequency — hourly / daily / weekly / monthly / yearly
  |--------------------------------------------------------------------------
  */

  hourly(): this {
    return this.cron("0 * * * *");
  }
  hourlyAt(minute: number): this {
    return this.cron(`${minute} * * * *`);
  }
  everyTwoHours(): this {
    return this.cron("0 */2 * * *");
  }
  everyFourHours(): this {
    return this.cron("0 */4 * * *");
  }
  everySixHours(): this {
    return this.cron("0 */6 * * *");
  }

  /** Run every N hours (arbitrary interval). */
  everyNHours(n: number): this {
    return this.cron(`0 */${n} * * *`);
  }

  daily(): this {
    return this.cron("0 0 * * *");
  }

  dailyAt(time: string): this {
    const [hour, minute] = time.split(":").map(Number);
    return this.cron(`${minute ?? 0} ${hour} * * *`);
  }

  twiceDaily(firstHour: number = 1, secondHour: number = 13): this {
    return this.cron(`0 ${firstHour},${secondHour} * * *`);
  }

  twiceDailyAt(
      firstHour: number,
      firstMinute: number,
      secondHour: number,
      secondMinute: number,
  ): this {
    return this.cron(`${firstMinute} ${firstHour},${secondHour} * * *`);
  }

  weekly(): this {
    return this.cron("0 0 * * 0");
  }

  weeklyOn(dayOfWeek: number, time: string = "0:0"): this {
    const [hour, minute] = time.split(":").map(Number);
    return this.cron(`${minute ?? 0} ${hour} * * ${dayOfWeek}`);
  }

  monthly(): this {
    return this.cron("0 0 1 * *");
  }

  monthlyOn(day: number, time: string = "0:0"): this {
    const [hour, minute] = time.split(":").map(Number);
    return this.cron(`${minute ?? 0} ${hour} ${day} * *`);
  }

  /**
   * Run on the last day of the month at midnight.
   * Uses day 28 as a universally-safe proxy (real last-day check runs at runtime).
   */
  lastDayOfMonth(time: string = "0:0"): this {
    const [hour, minute] = time.split(":").map(Number);
    // Schedule on day 28 and let a when() condition handle the true last-day check
    this.cron(`${minute ?? 0} ${hour} 28-31 * *`);
    this.task.conditions.push(() => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return tomorrow.getDate() === 1; // tomorrow is the 1st ⇒ today is the last day
    });
    return this;
  }

  quarterly(): this {
    return this.cron("0 0 1 1,4,7,10 *");
  }
  yearly(): this {
    return this.cron("0 0 1 1 *");
  }
  yearlyOn(month: number, day: number = 1, time: string = "0:0"): this {
    const [hour, minute] = time.split(":").map(Number);
    return this.cron(`${minute ?? 0} ${hour} ${day} ${month} *`);
  }

  /*
  |--------------------------------------------------------------------------
  | Frequency — day-of-week shortcuts
  |--------------------------------------------------------------------------
  */

  weekdays(): this {
    const parts = this.task.expression.split(" ");
    parts[4] = "1-5";
    return this.cron(parts.join(" "));
  }

  weekends(): this {
    const parts = this.task.expression.split(" ");
    parts[4] = "0,6";
    return this.cron(parts.join(" "));
  }

  sundays(): this {
    return this._setDow("0");
  }
  mondays(): this {
    return this._setDow("1");
  }
  tuesdays(): this {
    return this._setDow("2");
  }
  wednesdays(): this {
    return this._setDow("3");
  }
  thursdays(): this {
    return this._setDow("4");
  }
  fridays(): this {
    return this._setDow("5");
  }
  saturdays(): this {
    return this._setDow("6");
  }

  private _setDow(dow: string): this {
    const parts = this.task.expression.split(" ");
    parts[4] = dow;
    return this.cron(parts.join(" "));
  }

  /*
  |--------------------------------------------------------------------------
  | Time window filter
  |--------------------------------------------------------------------------
  */

  /**
   * Only run the task if current time is between start and end (inclusive).
   * @param start "HH:MM"
   * @param end   "HH:MM"
   */
  between(start: string, end: string): this {
    this.task.betweenStart = start;
    this.task.betweenEnd = end;
    return this;
  }

  /*
  |--------------------------------------------------------------------------
  | Conditions
  |--------------------------------------------------------------------------
  */

  /** Only run when all provided callbacks return true. */
  when(callback: () => boolean | Promise<boolean>): this {
    this.task.conditions.push(callback);
    return this;
  }

  /** Skip the task when callback returns true. */
  skip(callback: () => boolean | Promise<boolean>): this {
    this.task.skipConditions.push(callback);
    return this;
  }

  /*
  |--------------------------------------------------------------------------
  | Configuration
  |--------------------------------------------------------------------------
  */

  cron(expression: string): this {
    this.task.expression = expression;
    try {
      const interval = parser.parse(expression, { tz: this.task.timezone || "UTC" });
      this.task.nextRun = interval.next().toDate();
    } catch {
      // invalid expression — leave nextRun as-is
    }
    return this;
  }

  name(name: string): this {
    this.task.name = name;
    return this;
  }

  description(description: string): this {
    this.task.description = description;
    return this;
  }

  timezone(timezone: string): this {
    this.task.timezone = timezone;
    try {
      const interval = parser.parse(this.task.expression, { tz: timezone });
      this.task.nextRun = interval.next().toDate();
    } catch {
      // invalid expression — leave nextRun as-is
    }
    return this;
  }

  withoutOverlapping(): this {
    this.task.withoutOverlapping = true;
    return this;
  }

  onOneServer(): this {
    this.task.onOneServer = true;
    return this;
  }

  evenInMaintenanceMode(): this {
    this.task.evenInMaintenanceMode = true;
    return this;
  }

  runInBackground(): this {
    this.task.runInBackground = true;
    return this;
  }

  /*
  |--------------------------------------------------------------------------
  | Output / Lifecycle Hooks
  |--------------------------------------------------------------------------
  */

  onSuccess(callback: (task: ScheduledTask) => void): this {
    this.task.onSuccessHook = callback;
    return this;
  }

  onFailure(callback: (task: ScheduledTask, error: Error) => void): this {
    this.task.onFailureHook = callback;
    return this;
  }
}

// Singleton
export const scheduler = new Schedule();