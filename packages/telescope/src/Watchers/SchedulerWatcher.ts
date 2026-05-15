import { scheduler } from "@vest-ts/queue";
import { getEventDispatcher } from "@vest-ts/events";
import { TelescopeStore } from "../TelescopeStore.js";

/*
|--------------------------------------------------------------------------
| Scheduler Watcher
|--------------------------------------------------------------------------
|
| Hooks into the Schedule singleton's Node EventEmitter to capture task
| lifecycle events and also re-fires them through the application's
| EventDispatcher so user-defined listeners can react to them.
|
| Events dispatched (application-level):
|   horizon:task.start    { task }
|   horizon:task.success  { task, durationMs }
|   horizon:task.failed   { task, durationMs, error }
|
*/

export function activateSchedulerWatcher(): void {
  const runTimes = new Map<string, number>();
  const dispatcher = getEventDispatcher();

  scheduler.on("task:start", (task) => {
    runTimes.set(task.name, Date.now());
    dispatcher.dispatchNow("horizon:task.start", { task });

    TelescopeStore.record(
      "schedule",
      {
        task: task.name,
        expression: task.expression,
        description: task.description,
        status: "running",
        ranAt: new Date(),
      },
      [task.name],
    );
  });

  scheduler.on("task:success", (task) => {
    const started = runTimes.get(task.name);
    const durationMs = started ? Date.now() - started : undefined;
    runTimes.delete(task.name);

    dispatcher.dispatchNow("horizon:task.success", { task, durationMs });

    TelescopeStore.record(
      "schedule",
      {
        task: task.name,
        expression: task.expression,
        description: task.description,
        status: "success",
        durationMs,
        ranAt: task.lastRun,
      },
      [task.name, "success"],
    );
  });

  scheduler.on("task:failed", (task, error) => {
    const started = runTimes.get(task.name);
    const durationMs = started ? Date.now() - started : undefined;
    runTimes.delete(task.name);

    dispatcher.dispatchNow("horizon:task.failed", { task, durationMs, error });

    TelescopeStore.record(
      "schedule",
      {
        task: task.name,
        expression: task.expression,
        description: task.description,
        status: "failed",
        durationMs,
        exception: error?.message,
        ranAt: task.lastRun,
      },
      [task.name, "failed"],
    );
  });
}
