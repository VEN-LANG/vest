import { Command } from "../Command.js";
import type { Argv } from "yargs";

export class ServeCommand extends Command {
  protected signature = "serve";
  protected description = "Start the Vest HTTP server";

  async handle(): Promise<void> {
    // Handled via buildCommand override below
  }

  buildCommand(cli: Argv): Argv {
    return cli.command(
      "serve",
      this.description,
      (yargs) =>
        yargs
          .option("port", {
            alias: "p",
            type: "number",
            default: Number(process.env.PORT ?? 3000),
            description: "Port to listen on",
          })
          .option("host", {
            type: "string",
            default: process.env.HOST ?? "localhost",
            description: "Host to bind to",
          }),
      async (argv) => {
        process.env.PORT = String(argv.port);
        process.env.HOST = String(argv.host);

        const serverPath = process.cwd() + "/src/server.ts";
        const serverDistPath = process.cwd() + "/dist/server.js";
        const { existsSync } = await import("fs");
        const { pathToFileURL } = await import("url");

        // Prefer source when artisan itself is running under tsx (source-first dev)
        const runningUnderTsx =
          process.execArgv.some((a) => a.includes("tsx")) ||
          !!process.env.TSX_TSCONFIG_PATH ||
          (process.argv[1] && process.argv[1].endsWith(".ts"));

        if (runningUnderTsx && existsSync(serverPath)) {
          await import(pathToFileURL(serverPath).href);
        } else if (existsSync(serverDistPath)) {
          await import(pathToFileURL(serverDistPath).href);
        } else if (existsSync(serverPath)) {
          const { execSync } = await import("child_process");
          execSync(`node --import tsx ${serverPath}`, { stdio: "inherit" });
        } else {
          console.error("No server.ts found. Create src/server.ts to start a server.");
          process.exit(1);
        }
      },
    ) as Argv;
  }
}
