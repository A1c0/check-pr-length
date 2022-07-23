#!/usr/bin/env node
"use strict";
const args = require("minimist")(process.argv.slice(2));
const shell = require("shelljs");
const chalk = require("chalk");
const fs = require("fs");
const version = require("./package.json").version;

console.log("args:");
console.log(args);
console.log();

const excludeFiles = (args.exclude?.split(";") ?? []).flatMap((blob) =>
  shell.ls(blob)
);

console.log("excludeFiles:");
console.log(excludeFiles);
console.log();

if (!shell.which("git")) {
  shell.echo(chalk.red("Sorry, this script requires git"));
  shell.exit(1);
}

if (args.version || args.v) {
  shell.echo(`v${version}`);
  shell.exit(0);
}

if (args.help || args.h) {
  shell.echo(fs.readFileSync("./ressource/usage.txt", "utf8"));
  shell.exit(0);
}

// todo check if in git repo : git rev-parse --show-toplevel
const isInRepoGit =
  shell.exec("git rev-parse --show-toplevel", { silent: true }).code === 0;

if (!isInRepoGit) {
  shell.echo(chalk.red("Sorry, this script must be run in a git repository"));
  shell.exit(1);
}

const baseBranch = args.base ?? "develop";
const maxLines = args.max ?? 500;

const isBaseBranchExists =
  shell.exec(`git rev-parse --verify ${baseBranch}`, { silent: true }).code ===
  0;

if (!isBaseBranchExists) {
  shell.echo(chalk.red(`Sorry, the base branch ${baseBranch} does not exist`));
  shell.exit(1);
}

const isSomethingToCommit =
  shell.exec("git status --porcelain", { silent: true }).stdout.length > 0;

if (isSomethingToCommit) {
  shell.echo(chalk.red("Sorry, there are changes in stage"));
  shell.exit(1);
}

const prBranch = shell
  .exec("git rev-parse --abbrev-ref HEAD", { silent: true })
  .stdout.trim();

shell.exec(`git checkout ${baseBranch}`, { silent: true });

shell.exec(`git merge --no-ff --no-commit ${prBranch}`, { silent: true });

const changes = shell.exec(
  `git diff --staged --stat ${excludeFiles
    .map((f) => `':(exclude)${f}'`)
    .join(" ")}`,
  { silent: true }
).stdout;

console.log(changes);

shell.exec(`git merge --abort`, { silent: true });

shell.exec(`git checkout ${prBranch}`, { silent: true });
