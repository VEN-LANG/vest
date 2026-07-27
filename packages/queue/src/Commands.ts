import { Command } from "@lara-node/console";
import { ArgumentsCamelCase } from "yargs";
import { Queue, Worker, scheduler, getRegisteredJobs } from "./index.js";
import { appKey, getQueueConfig } from "./index.js";
import { Cache } from "@lara-node/cache";

export class QueueWorkCommand extends Command {
  protected signature = "queue:work [connection]";
  protected description = "Start processing jobs on the queue as a daemon";
  protected keepAlive = true;

  protected arguments = {
    connection: {
      type: "string" as const,
      description: "The name of the queue connection to work",
      required: false,
    },
  };

  protected options = {
    queue: { type: "string" as const, description: "The names of the queues to work (comma separated)", default: "default", alias: "Q" },
    once: { type: "boolean" as const, description: "Only process the next job on the queue", default: false },
    "stop-when-empty": { type: "boolean" as const, description: "Stop when the queue is empty", default: false },
    delay: { type: "number" as const, description: "Seconds to delay failed jobs before retrying", default: 0 },
    tries: { type: "number" as const, description: "Number of times to attempt a job before logging it failed", default: getQueueConfig().defaults.tries },
    timeout: { type: "number" as const, description: "Seconds a child process can run", default: getQueueConfig().defaults.timeout },
    sleep: { type: "number" as const, description: "Seconds to sleep when no job is available", default: 3 },
    memory: { type: "number" as const, description: "Memory limit in megabytes", default: 128 },
    "max-jobs": { type: "number" as const, description: "Maximum number of jobs to process before stopping", default: 0 },
    "max-time": { type: "number" as const, description: "Maximum seconds the worker should run", default: 0 },
    rest: { type: "number" as const, description: "Seconds to rest between jobs", default: 0 },
    verbose: { type: "boolean" as const, description: "Display verbose output", default: false, alias: "v" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const connection = (args.connection as string) || getQueueConfig().default;
    const queues = (args.queue as string).split(",").map((q) => q.trim());

    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║                      Queue Worker                             ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║ Connection: ${connection.padEnd(47)}║`);
    console.log(`║ Queues: ${queues.join(", ").padEnd(51)}║`);
    console.log(`║ Memory Limit: ${args.memory}MB`.padEnd(63) + "║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    const worker = new Worker(connection, queues, {
      delay: args.delay as number,
      memory: args.memory as number,
      timeout: args.timeout as number,
      sleep: args.sleep as number,
      maxTries: args.tries as number,
      maxJobs: args["max-jobs"] as number,
      maxTime: args["max-time"] as number,
      stopWhenEmpty: args["stop-when-empty"] as boolean,
      rest: args.rest as number,
      verbose: args.verbose as boolean,
    });

    worker.on("job:processing", ({ job }) => console.log(`\x1b[33m[Processing]\x1b[0m ${job.displayName} (${job.uuid})`));
    worker.on("job:processed", ({ job }) => console.log(`\x1b[32m[Completed]\x1b[0m ${job.displayName} (${job.uuid})`));
    worker.on("job:failed", ({ job, exception }) => console.log(`\x1b[31m[Failed]\x1b[0m ${job.displayName} (${job.uuid}) - ${exception.message}`));

    if (args.once) {
      const processed = await worker.runNextJob();
      if (!processed) console.log("No jobs available.");
    } else {
      await worker.daemon();
    }
  }
}

export class QueueListenCommand extends Command {
  protected signature = "queue:listen [connection]";
  protected description = "Listen to a given queue";
  protected keepAlive = true;

  protected arguments = {
    connection: { type: "string" as const, description: "Queue connection to listen on", required: false },
  };

  protected options = {
    queue: { type: "string" as const, description: "The queue to listen on", default: "default" },
    delay: { type: "number" as const, description: "Seconds to delay failed jobs", default: 0 },
    tries: { type: "number" as const, description: "Number of attempts before logging failure", default: getQueueConfig().defaults.tries },
    timeout: { type: "number" as const, description: "Seconds a child process can run", default: getQueueConfig().defaults.timeout },
    sleep: { type: "number" as const, description: "Seconds to sleep when no job available", default: 3 },
    memory: { type: "number" as const, description: "Memory limit in megabytes", default: 128 },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const connection = (args.connection as string) || getQueueConfig().default;
    console.log(`Listening on queue [${args.queue}] connection [${connection}]...`);

    const worker = new Worker(connection, args.queue as string, {
      delay: args.delay as number,
      memory: args.memory as number,
      timeout: args.timeout as number,
      sleep: args.sleep as number,
      maxTries: args.tries as number,
    });

    await worker.daemon();
  }
}

export class QueueRestartCommand extends Command {
  protected signature = "queue:restart";
  protected description = "Signal all queue worker daemons to restart after their current job";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const restartKey = appKey("queue", "restart");
    await Cache.set(restartKey, Date.now(), 3600);
    console.log("Queue restart signal broadcast.");
  }
}

export class QueueRetryCommand extends Command {
  protected signature = "queue:retry <id>";
  protected description = "Retry a failed queue job";

  protected arguments = {
    id: { type: "string" as const, description: 'UUID of the failed job or "all"', required: true },
  };

  protected options = {
    connection: { type: "string" as const, description: "Queue connection to use", alias: "c" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const id = args.id as string;
    const connection = args.connection as string | undefined;

    if (id === "all") {
      const failedJobs = await Queue.getFailedJobs(connection);
      let retried = 0;
      for (const job of failedJobs) {
        if (await Queue.retryFailed(job.uuid, connection)) retried++;
      }
      console.log(`Retried ${retried} failed job(s).`);
    } else {
      const success = await Queue.retryFailed(id, connection);
      console.log(success ? `The failed job [${id}] has been pushed back onto the queue!` : `Unable to find a failed job with UUID [${id}].`);
    }
  }
}

export class QueueForgetCommand extends Command {
  protected signature = "queue:forget <id>";
  protected description = "Delete a failed queue job";

  protected arguments = {
    id: { type: "string" as const, description: "UUID of the failed job", required: true },
  };

  protected options = {
    connection: { type: "string" as const, description: "Queue connection to use", alias: "c" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const success = await Queue.forgetFailed(args.id as string, args.connection as string | undefined);
    console.log(success ? `The failed job [${args.id}] has been deleted!` : `Unable to find a failed job with UUID [${args.id}].`);
  }
}

export class QueueFlushCommand extends Command {
  protected signature = "queue:flush";
  protected description = "Flush all of the failed queue jobs";

  protected options = {
    connection: { type: "string" as const, description: "Queue connection to use", alias: "c" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const count = await Queue.flushFailed(args.connection as string | undefined);
    console.log(`Deleted ${count} failed job(s).`);
  }
}

export class QueueFailedCommand extends Command {
  protected signature = "queue:failed";
  protected description = "List all of the failed queue jobs";

  protected options = {
    connection: { type: "string" as const, description: "Queue connection to use", alias: "c" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const failedJobs = await Queue.getFailedJobs(args.connection as string | undefined);

    if (failedJobs.length === 0) { console.log("No failed jobs found."); return; }

    console.log("\n┌───────────────────────────────────────┬─────────────────────┬──────────────────────┐");
    console.log("│ UUID                                  │ Queue               │ Failed At            │");
    console.log("├───────────────────────────────────────┼─────────────────────┼──────────────────────┤");
    for (const job of failedJobs) {
      const failedAt = new Date(job.failed_at || job.failedAt).toISOString().slice(0, 19).replace("T", " ");
      console.log(`│ ${job.uuid.padEnd(37)} │ ${(job.queue || "default").padEnd(19)} │ ${failedAt.padEnd(20)} │`);
    }
    console.log("└───────────────────────────────────────┴─────────────────────┴──────────────────────┘");
    console.log(`\nTotal: ${failedJobs.length} failed job(s)`);
  }
}

export class QueueClearCommand extends Command {
  protected signature = "queue:clear [connection]";
  protected description = "Delete all of the jobs from the specified queue";

  protected arguments = {
    connection: { type: "string" as const, description: "Queue connection to clear", required: false },
  };

  protected options = {
    queue: { type: "string" as const, description: "Queue name to clear", default: "default", alias: "Q" },
    force: { type: "boolean" as const, description: "Force the operation", default: false, alias: "f" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const connection = (args.connection as string) || getQueueConfig().default;
    const queue = args.queue as string;
    const count = await Queue.clear(queue, connection);
    console.log(`Cleared ${count} job(s) from the [${queue}] queue on [${connection}] connection.`);
  }
}

export class QueueStatusCommand extends Command {
  protected signature = "queue:status";
  protected description = "Display the status of queue workers and jobs";

  protected options = {
    connection: { type: "string" as const, description: "Queue connection to check", alias: "c" },
    queue: { type: "string" as const, description: "Queue to check", default: "default", alias: "Q" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const connection = (args.connection as string) || getQueueConfig().default;
    const queue = args.queue as string;

    const [size, jobs, failedJobs] = await Promise.all([
      Queue.size(queue, connection),
      Queue.getJobs(queue, connection),
      Queue.getFailedJobs(connection),
    ]);

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║                        Queue Status                           ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║ Connection: ${connection.padEnd(48)}║`);
    console.log(`║ Queue: ${queue.padEnd(53)}║`);
    console.log(`║ Driver: ${(getQueueConfig().connections[connection]?.driver ?? "").padEnd(52)}║`);
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║ Pending Jobs: ${String(size).padEnd(46)}║`);
    console.log(`║ Failed Jobs: ${String(failedJobs.length).padEnd(47)}║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");
  }
}

export class ScheduleRunCommand extends Command {
  protected signature = "schedule:run";
  protected description = "Run the scheduled commands";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    console.log("Running scheduled tasks...\n");
    await scheduler.runDueTasks();
    console.log("\nScheduled tasks completed.");
  }
}

export class ScheduleWorkCommand extends Command {
  protected signature = "schedule:work";
  protected description = "Start the schedule worker";
  protected keepAlive = true;

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║                     Schedule Worker                           ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║ The scheduler will run every minute. Press Ctrl+C to stop.  ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    scheduler.on("task:start", (task) => console.log(`\x1b[33m[Running]\x1b[0m ${task.name}`));
    scheduler.on("task:success", (task) => console.log(`\x1b[32m[Completed]\x1b[0m ${task.name}`));
    scheduler.on("task:failed", (task, error) => console.log(`\x1b[31m[Failed]\x1b[0m ${task.name}: ${error?.message || "Unknown error"}`));

    await scheduler.start();
  }
}

export class ScheduleListCommand extends Command {
  protected signature = "schedule:list";
  protected description = "List all scheduled tasks";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const tasks = scheduler.getTasks();

    if (tasks.length === 0) {
      console.log("No scheduled tasks found.\nDefine tasks in your QueueServiceProvider.boot().");
      return;
    }

    console.log("\nScheduled Tasks:");
    console.log("┌─────────────────────────────────────────────┬─────────────────────┬───────────────────────┐");
    console.log("│ Task                                        │ Expression          │ Next Run              │");
    console.log("├─────────────────────────────────────────────┼─────────────────────┼───────────────────────┤");

    for (const task of tasks) {
      const nextRun = task.nextRun ? task.nextRun.toISOString().slice(0, 19).replace("T", " ") : "calculating...";
      console.log(`│ ${task.name.slice(0, 43).padEnd(43)} │ ${task.expression.padEnd(19)} │ ${nextRun.padEnd(21)} │`);
    }

    console.log("└─────────────────────────────────────────────┴─────────────────────┴───────────────────────┘");
    console.log(`\nTotal: ${tasks.length} scheduled task(s)`);
  }
}

export class QueueJobsCommand extends Command {
  protected signature = "queue:jobs";
  protected description = "List all registered job classes";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const jobs = getRegisteredJobs();

    if (jobs.size === 0) {
      console.log("No registered jobs found. Decorate job classes with @Queueable().");
      return;
    }

    console.log("\nRegistered Jobs:");
    console.log("┌──────────────────────────────────────────────────────────────┐");
    console.log("│ Job Name                                                     │");
    console.log("├──────────────────────────────────────────────────────────────┤");
    for (const [name] of jobs) console.log(`│ ${name.padEnd(60)} │`);
    console.log("└──────────────────────────────────────────────────────────────┘");
    console.log(`\nTotal: ${jobs.size} registered job(s)`);
  }
}
