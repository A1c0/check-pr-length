#!/usr/bin/env node
'use strict';
const args = require('minimist')(process.argv.slice(2));
const shell = require('shelljs');
const chalk = require("chalk");
const fs = require("fs");
const version = require('./package.json').version;

if (!shell.which('git')) {
  shell.echo(chalk.red('Sorry, this script requires git'));
  shell.exit(1);
}


if (args.version || args.v) {
  shell.echo(`v${version}`);
  shell.exit(0);
}

if (args.help || args.h) {
  shell.echo(fs.readFileSync('./ressource/usage.txt', 'utf8'));
  shell.exit(0);
}

// todo check if in git repo : git rev-parse --show-toplevel
const isInRepoGit = shell.exec('git rev-parse --show-toplevel', {silent:true}).code ===0;

if (!isInRepoGit) {
  shell.echo(chalk.red('Sorry, this script must be run in a git repository'));
  shell.exit(1);
}


// todo switch command/action

const baseBranch = args.base ?? 'develop';
const maxLines = args.max ?? 500;

console.log(args);

