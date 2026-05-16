#!/usr/bin/env node
/**
 * Lara-Node Artisan CLI
 *
 * Usage:
 *   artisan <command> [options]
 *   artisan serve [--port=3000] [--host=localhost]
 *   artisan migrate
 *   artisan make:migration create_users_table
 *   artisan queue:work
 *
 * In an app's package.json:
 *   "artisan": "node node_modules/@lara-node/console/dist/artisan.js"
 */

import "dotenv/config";
import "reflect-metadata";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Kernel } from "./Kernel/Kernel.js";

async function main() {
  const kernel = new Kernel();
  await kernel.boot();

  let cli = yargs(hideBin(process.argv)).scriptName("artisan").usage("$0 <command> [options]");

  cli = kernel.registerCommands(cli);

  await cli
    .demandCommand(1, "Please specify a command. Run --help for usage.")
    .strict()
    .help()
    .alias("h", "help")
    .version(false)
    .parseAsync();
}

main().catch((err) => {
  console.error("Artisan error:", err);
  process.exit(1);
});
