import { Command } from "../Command.js";
import { ArgumentsCamelCase } from "yargs";
import { HorizonManager, horizonMetrics, horizonConfig } from "@vest-ts/horizon";
import type { HorizonSupervisor } from "@vest-ts/horizon";

export class HorizonWorkCommand extends Command {
  protected signature = "horizon:work";
  protected description = "Start the Horizon queue manager and all configured supervisors";
  protected keepAlive = true;

  protected options = {
    env: {
      type: "string" as const,
      description: "Environment to load supervisor config from",
      alias: "e",
    },
    supervisor: {
      type: "string" as const,
      description: "Name of a single supervisor to start (default: all)",
      alias: "s",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const env = (args.env as string) || process.env.NODE_ENV || "development";
    const envConfig = horizonConfig.environments[env] || horizonConfig.environments["development"];

    if (!envConfig?.supervisor?.length) {
      this.error(`No supervisor configuration found for environment [${env}].`);
      this.line(`Define supervisors in horizon.config.ts → environments.${env}`);
      return;
    }

    const filterName = args.supervisor as string | undefined;
    const supervisors = filterName
      ? envConfig.supervisor.filter((s) => s.name === filterName)
      : envConfig.supervisor;

    if (!supervisors.length) {
      this.error(`No supervisor named [${filterName}] found in environment [${env}].`);
      return;
    }

    this.printBanner(env, supervisors);

    for (const sup of supervisors) {
      await this.startSupervisor(sup);
    }

    const graceful = () => {
      this.warn("\n[Horizon] Shutting down…");
      process.exit(0);
    };
    process.once("SIGINT", graceful);
    process.once("SIGTERM", graceful);

    await new Promise<void>(() => {});
  }

  private async startSupervisor(sup: HorizonSupervisor): Promise<void> {
    const count = sup.processes ?? 1;
    const queues = Array.isArray(sup.queue) ? sup.queue : [sup.queue];

    for (let i = 0; i < count; i++) {
      const id = count > 1 ? `${sup.name}-${i + 1}` : sup.name;

      HorizonManager.startWorker({
        id,
        connection: sup.connection,
        queues: sup.queue,
        options: {
          memory: sup.memory,
          timeout: sup.timeout,
          sleep: sup.sleep,
          maxTries: sup.tries,
          maxJobs: sup.maxJobs,
          maxTime: sup.maxTime,
        },
      });

      this.info(
        `[${id}] started — queues: ${queues.join(", ")} | tries: ${sup.tries} | memory: ${sup.memory}MB`,
      );
    }
  }

  private printBanner(env: string, supervisors: HorizonSupervisor[]): void {
    const totalWorkers = supervisors.reduce((n, s) => n + (s.processes ?? 1), 0);
    const dash = horizonConfig.path;
    this.line("");
    this.line("╔══════════════════════════════════════════════════════════════╗");
    this.line("║                    Horizon Queue Manager                      ║");
    this.line("╠══════════════════════════════════════════════════════════════╣");
    this.line(`║ Environment : ${env.padEnd(46)}║`);
    this.line(`║ Supervisors : ${String(supervisors.length).padEnd(46)}║`);
    this.line(`║ Workers     : ${String(totalWorkers).padEnd(46)}║`);
    this.line(`║ Dashboard   : ${dash.padEnd(46)}║`);
    this.line("╚══════════════════════════════════════════════════════════════╝");
    this.line("");
  }
}

export class HorizonPauseCommand extends Command {
  protected signature = "horizon:pause";
  protected description = "Pause all Horizon workers";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const workers = await horizonMetrics.getWorkers();
    let count = 0;
    for (const w of workers) {
      if (HorizonManager.pauseWorker(w.id)) count++;
    }
    this.info(`Paused ${count} worker(s).`);
  }
}

export class HorizonContinueCommand extends Command {
  protected signature = "horizon:continue";
  protected description = "Resume all paused Horizon workers";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const workers = await horizonMetrics.getWorkers();
    let count = 0;
    for (const w of workers) {
      if (HorizonManager.resumeWorker(w.id)) count++;
    }
    this.info(`Resumed ${count} worker(s).`);
  }
}

export class HorizonTerminateCommand extends Command {
  protected signature = "horizon:terminate";
  protected description = "Stop all Horizon workers after finishing current jobs";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const workers = await horizonMetrics.getWorkers();
    let count = 0;
    for (const w of workers) {
      if (HorizonManager.stopWorker(w.id)) count++;
    }
    this.info(`Stopped ${count} worker(s).`);
  }
}

export class HorizonStatusCommand extends Command {
  protected signature = "horizon:status";
  protected description = "Show current Horizon worker status and metrics";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const [summary, workers] = await Promise.all([
      horizonMetrics.summary(),
      horizonMetrics.getWorkers(),
    ]);

    this.line("");
    this.line("╔══════════════════════════════════════════════════════════════╗");
    this.line("║                      Horizon Status                           ║");
    this.line("╠══════════════════════════════════════════════════════════════╣");
    this.line(`║ Active Workers   : ${String(summary.activeWorkers).padEnd(41)}║`);
    this.line(`║ Paused Workers   : ${String(summary.pausedWorkers).padEnd(41)}║`);
    this.line(`║ Throughput / min : ${String(summary.throughputPerMinute).padEnd(41)}║`);
    this.line(`║ Jobs Processed   : ${String(summary.totalProcessed).padEnd(41)}║`);
    this.line(`║ Jobs Failed      : ${String(summary.totalFailed).padEnd(41)}║`);
    this.line(`║ Memory           : ${`${summary.memoryMb}MB`.padEnd(41)}║`);
    this.line(`║ Uptime           : ${`${summary.uptimeSeconds}s`.padEnd(41)}║`);
    this.line("╚══════════════════════════════════════════════════════════════╝");

    if (workers.length > 0) {
      this.line("");
      this.table(
        ["ID", "Status", "Queues", "Processed", "Memory", "Runtime"],
        workers.map((w) => [
          w.id,
          w.status,
          Array.isArray(w.queues) ? w.queues.join(", ") : String(w.queues),
          String(w.jobsProcessed),
          `${Math.round(w.memoryMb)}MB`,
          `${Math.round(w.runtimeSeconds)}s`,
        ]),
      );
    } else {
      this.warn("No workers registered. Run `artisan horizon:work` to start workers.");
    }
  }
}

export class HorizonListCommand extends Command {
  protected signature = "horizon:list";
  protected description = "List configured Horizon supervisors";

  protected options = {
    env: {
      type: "string" as const,
      description: "Environment to inspect",
      alias: "e",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const env = (args.env as string) || process.env.NODE_ENV || "development";
    const envConfig = horizonConfig.environments[env] || horizonConfig.environments["development"];

    if (!envConfig?.supervisor?.length) {
      this.warn(`No supervisors configured for environment [${env}].`);
      return;
    }

    this.line(`\nSupervisors for [${env}]:\n`);
    this.table(
      ["Name", "Connection", "Queues", "Processes", "Memory", "Timeout", "Tries"],
      envConfig.supervisor.map((s) => [
        s.name,
        s.connection ?? process.env.QUEUE_CONNECTION ?? "default",
        Array.isArray(s.queue) ? s.queue.join(", ") : s.queue,
        String(s.processes ?? 1),
        `${s.memory}MB`,
        `${s.timeout}s`,
        String(s.tries),
      ]),
    );
  }
}
