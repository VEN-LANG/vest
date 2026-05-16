import net from "net";
import { Command } from "../Command.js";
import type { Argv } from "yargs";

function findAvailablePort(startPort: number, host: string): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(findAvailablePort(startPort + 1, host)));
    server.once("listening", () => {
      server.close(() => resolve(startPort));
    });
    server.listen(startPort, host);
  });
}

export class ServeCommand extends Command {
  protected signature = "serve";
  protected description = "Start the Lara-Node HTTP server";

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
        const host = String(argv.host);
        const requestedPort = Number(argv.port);
        const port = await findAvailablePort(requestedPort, host);

        if (port !== requestedPort) {
          console.log(`Port ${requestedPort} is in use, starting on port ${port}.`);
        }

        process.env.PORT = String(port);
        process.env.HOST = host;

        const serverPath = process.cwd() + "/src/server.ts";
        const serverDistPath = process.cwd() + "/dist/server.js";
        const { existsSync } = await import("fs");
        const { spawn } = await import("child_process");


        // Pick source (dev) or compiled output (prod)
        let targetPath: string;
        let nodeArgs: string[];

        if (existsSync(serverPath)) {
          // Spawn with the same TypeScript loader flags artisan was started with
          // (e.g. -r @swc-node/register -r tsconfig-paths/register ...)
          // so that require() hooks are active when server.ts is loaded.
          targetPath = serverPath;
          nodeArgs = [...process.execArgv, targetPath];
        } else if (existsSync(serverDistPath)) {
          targetPath = serverDistPath;
          nodeArgs = [targetPath];
        } else {
          console.error("No src/server.ts or dist/server.js found.");
          return process.exit(1);
        }

        const child = spawn(process.execPath, nodeArgs, {
          stdio: "inherit",
          env: process.env,
          cwd: process.cwd(),
        });

        child.on("exit", (code) => process.exit(code ?? 0));
      },
    ) as Argv;
  }
}
