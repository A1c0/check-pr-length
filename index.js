#!/usr/bin/env node
"use strict";
const args = require("minimist")(process.argv.slice(2));
const shell = require("shelljs");
const chalk = require("chalk");
const fs = require("fs");
const version = require("./package.json").version;

const excludeFiles = (args.exclude?.split(";") ?? []).flatMap((glob) =>
  shell.ls(glob)
);

if (!shell.which("git")) {
  shell.echo(chalk.red("Sorry, this script requires git"));
  shell.exit(1);
}

if (args.version || args.v) {
  shell.echo(version);
  shell.exit(0);
}

if (args.help || args.h) {
  shell.echo(fs.readFileSync("./ressource/usage.txt", "utf8"));
  shell.exit(0);
}

const isInRepoGit =
  shell.exec("git rev-parse --show-toplevel", { silent: true }).code === 0;

if (!isInRepoGit) {
  shell.echo(chalk.red("Sorry, this script must be run in a git repository"));
  shell.exit(1);
}

const baseBranch = args.base ?? "develop";
const maxLines = args.max ?? 500;

if (!(typeof args.max === "number")) {
  shell.echo(chalk.red("Sorry, max must be a number"));
  shell.exit(1);
}

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

const mergeStatusCode = shell.exec(
  `git merge --no-ff --no-commit ${prBranch}`,
  { silent: true }
).code;

if (mergeStatusCode !== 0) {
  shell.echo(chalk.red("Sorry, merge failed"));
  shell.exit(1);
}

const changes = shell.exec(
  `git diff --staged --stat ${excludeFiles
    .map((f) => `':(exclude)${f}'`)
    .join(" ")}`,
  { silent: true }
).stdout;

shell.exec(`git merge --abort`, { silent: true });

shell.exec(`git checkout ${prBranch}`, { silent: true });

const changesLines = changes.split("\n");

const lastLine = changesLines[changesLines.length - 1];

const safeParseInt = (str) => {
  if (!/^\d+$/.test(str)) {
    throw new Error(`${str} is not a number`);
  }
  return Number(str);
};

const ChangesSummaryRegex =
  /(\d+ files? changed, )(\d+)( insertions?\(\+\), )(\d+)( deletions?\(\-\))/;

const [filesInfo, insertionCount, insertionInfo, deletionCount, deletionInfo] =
  ChangesSummaryRegex.exec(lastLine).slice(1);

const isMaxLinesInsertionReached = safeParseInt(insertionCount) > maxLines;
const isMaxLinesDeletionReached = safeParseInt(deletionCount) > maxLines;

shell.echo("PR number of changes:");
shell.echo(changesLines.slice(0, -1).join("\n"));
shell.echo(
  `${filesInfo}${
    isMaxLinesInsertionReached
      ? chalk.red(`${insertionCount}${insertionInfo}`)
      : chalk.green(`${insertionCount}${insertionInfo}`)
  }${
    isMaxLinesDeletionReached
      ? chalk.red(`${deletionCount}${deletionInfo}`)
      : chalk.green(`${deletionCount}${deletionInfo}`)
  }`
);

if (isMaxLinesInsertionReached || isMaxLinesDeletionReached) {
  shell.echo(chalk.red(`Sorry, the PR is too big`));
  shell.exit(1);
} else {
  shell.echo(chalk.green(`The PR is fine`));
}
