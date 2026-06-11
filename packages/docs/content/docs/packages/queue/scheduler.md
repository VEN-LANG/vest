# Task Scheduler

The scheduler allows you to define cron-like tasks that run automatically.

## Defining Scheduled Tasks

```typescript
import { scheduler } from "@lara-node/queue";

// Run a command
scheduler.command("cache:clear").daily();

// Run a job
scheduler.job(new SendDailyReport()).dailyAt("08:00");

// Run a callback
scheduler
  .call(async () => {
    await cleanupOldFiles();
  })
  .hourly();

// Run a shell command
scheduler.exec("php artisan backup:run").daily();
```

## Schedule Frequencies

```typescript
.everyMinute()
.everyTwoMinutes()
.everyThreeMinutes()
.everyFourMinutes()
.everyFiveMinutes()
.everyTenMinutes()
.everyFifteenMinutes()
.everyThirtyMinutes()
.hourly()
.hourlyAt(15)        // 15 minutes past the hour
.everyTwoHours()
.everyThreeHours()
.everyFourHours()
.everySixHours()
.daily()
.dailyAt('13:00')
.twiceDaily(1, 13)
.weekly()
.weeklyOn(1, '8:00') // Monday at 8am
.monthly()
.monthlyOn(4, '15:00')
.quarterly()
.yearly()
.cron('* * * * *')   // Custom cron expression
```

## Constraints

```typescript
scheduler
  .command("report:generate")
  .daily()
  .weekdays() // Mon-Fri
  .weekends() // Sat-Sun
  .sundays()
  .mondays()
  .tuesdays()
  .wednesdays()
  .thursdays()
  .fridays()
  .saturdays()
  .between("8:00", "17:00")
  .unlessBetween("12:00", "13:00")
  .when(() => isProduction());
```

## Running the Scheduler

```bash
# Start scheduler (runs in foreground)
pnpm exec artisan schedule:run

# Or use cron to call this every minute
* * * * * cd /path-to-app && pnpm exec artisan schedule:run
```

## On One Server

```typescript
scheduler.command("report:generate").daily().onOneServer(); // Only run on one server
```

## Run in Background

```typescript
scheduler.command("long:task").hourly().runInBackground();
```

## Next Steps

- [Jobs](/packages/queue/jobs) -- Creating jobs
- [Workers](/packages/queue/workers) -- Queue workers
- [Horizon](/packages/horizon) -- Queue monitoring
