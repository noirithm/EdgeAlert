#!/usr/bin/env node
import { Command } from 'commander';
import { STATEWEAVE_CORE_VERSION } from '@stateweave/core';

const program = new Command();

program
  .name('stateweave')
  .description('Finds accessibility bugs that only appear between UI states')
  .version(STATEWEAVE_CORE_VERSION);

program
  .command('explore <url>')
  .description('Explore a web app and build a state graph')
  .option('--depth <n>', 'max exploration depth', '3')
  .option('--max-states <n>', 'max number of states to visit', '40')
  .option('--seed <n>', 'seed for deterministic ordering', '1')
  .option('--out <dir>', 'report output directory', './stateweave-report')
  .option('--allow-selector <selector...>', 'restrict exploration to these selectors')
  .option('--deny-text <text...>', 'never click elements whose accessible name matches')
  .option('--ignore-selector <selector...>', 'exclude regions from fingerprinting')
  .option('--headed', 'run with a visible browser', false)
  .action(() => {
    console.error('stateweave explore: not implemented yet');
    process.exitCode = 1;
  });

program
  .command('verify <generated-tests-dir>')
  .description('Run generated Playwright regression tests')
  .action(() => {
    console.error('stateweave verify: not implemented yet');
    process.exitCode = 1;
  });

program
  .command('bench')
  .description('Run the axe-core vs StateWeave benchmark')
  .action(() => {
    console.error('stateweave bench: not implemented yet');
    process.exitCode = 1;
  });

await program.parseAsync(process.argv);
