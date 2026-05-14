import { TelescopeStore } from "../TelescopeStore.js";

/*
|--------------------------------------------------------------------------
| Log Watcher
|--------------------------------------------------------------------------
|
| Intercepts console.error, console.warn, console.log, and console.info
| and records each call as a Telescope log entry. Horizon/Telescope
| internal messages are suppressed to avoid noise.
|
*/

type LogLevel = "error" | "warn" | "info" | "log" | "debug";

const IGNORED_PREFIXES = ["[Worker]", "[Scheduler]", "[Horizon]", "[Telescope]"];

function shouldIgnore(msg: string): boolean {
  return IGNORED_PREFIXES.some((p) => msg.startsWith(p));
}

function tap(level: LogLevel, original: (...args: any[]) => void): (...args: any[]) => void {
  return function (...args: any[]) {
    original.apply(console, args);

    try {
      const message = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      if (shouldIgnore(message)) return;

      const context: Record<string, any> = {};
      if (args.length > 1) {
        args.slice(1).forEach((a, i) => {
          if (a instanceof Error) {
            context[`error_${i}`] = { message: a.message, stack: a.stack };
          } else if (typeof a === "object") {
            context[`context_${i}`] = a;
          }
        });
      }

      TelescopeStore.record(
        "log",
        { level, message: args[0] !== undefined ? String(args[0]) : "", context },
        [level],
      );
    } catch {
      // never break console
    }
  };
}

let installed = false;

export function activateLogWatcher(): void {
  if (installed) return;
  installed = true;

  console.error = tap("error", console.error);
  console.warn = tap("warn", console.warn);
  console.info = tap("info", console.info);
  console.log = tap("log", console.log);
  console.debug = tap("debug", console.debug);
}
