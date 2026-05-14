#!/usr/bin/env node
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

  await cli.demandCommand(1).strict().help().version(false).parseAsync();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
