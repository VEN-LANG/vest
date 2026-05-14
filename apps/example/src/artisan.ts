#!/usr/bin/env node
/**
 * Artisan Console
 *
 * Usage:
 *   pnpm artisan <command> [options]
 *   pnpm artisan migrate
 *   pnpm artisan queue:work
 *   pnpm artisan serve --port=3000
 */

import "reflect-metadata";
import "dotenv/config";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Kernel } from "@vest/console";

async function main() {
  const kernel = new Kernel();
  await kernel.boot();

  let cli = yargs(hideBin(process.argv)).scriptName("artisan").usage("$0 <command> [options]");

  cli = kernel.registerCommands(cli);

  await cli
    .demandCommand(1, "Please specify a command. Use --help for usage.")
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
