'use strict';

const args = require('yargs').argv;

const shell = require('shelljs');
const chalk = require("chalk");

if (!shell.which('git')) {
  shell.echo(chalk.red('Sorry, this script requires git'));
  shell.exit(1);
}

const baseBranch = args.base ?? 'develop';
const maxLines = args.max ?? 500;

console.log(args);

