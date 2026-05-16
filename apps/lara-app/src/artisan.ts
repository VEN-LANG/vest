import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Kernel } from '@lara-node/console';
import { app, bootForConsole } from './bootstrap/app';

async function main() {
  await bootForConsole();
  const kernel = new Kernel(app);
  await kernel.boot();
  let cli = yargs(hideBin(process.argv)).scriptName('artisan').usage('$0 <command> [options]');
  cli = kernel.registerCommands(cli);
  await cli.demandCommand(1).strict().help().version(false).parseAsync();
}

main().catch((err) => { console.error(err); process.exit(1); });
