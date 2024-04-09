#!/usr/bin/env node
"use strict";
const args = require("minimist")(process.argv.slice(2));
const shell = require("shelljs");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const version = require("./package.json").version;

if (!shell.which("git")) {
  shell.echo(chalk.red("Sorry, this script requires git"));
  shell.exit(1);
}

if (args.version || args.v) {
  shell.echo(version);
  shell.exit(0);
}

if (args.help || args.h) {
  shell.echo(
    fs.readFileSync(path.resolve(__dirname, "./ressource/usage.txt"), "utf8")
  );
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
const maxTotalLines = args.total ?? maxLines * 2;
const silent = args.silent !== 'false' ? true : false;

if (! silent) {
  shell.echo(`baseBranch: ${baseBranch}`);
  shell.echo(`max: ${maxLines}`);
  shell.echo(`total: ${maxTotalLines}`);
  shell.echo(`silent: false`);
}

if (!(typeof maxLines === "number")) {
  shell.echo(chalk.red("Sorry, max must be a number"));
  shell.exit(1);
}

if (!(typeof maxTotalLines === "number")) {
  shell.echo(chalk.red("Sorry, total must be a number"));
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

const onFinish = () => {
  shell.exec(`git merge --abort`, { silent: true });

  shell.exec(`git checkout ${prBranch}`, { silent: true });
};

shell.exec(`git checkout ${baseBranch}`, { silent: true });

const mergeStatusCode = shell.exec(
  `git merge --no-ff --no-commit ${prBranch}`,
  { silent }
).code;

if (mergeStatusCode !== 0) {
  shell.echo(chalk.red("Sorry, merge failed"));
  onFinish();
  shell.exit(1);
}

const excludeFiles = (args.exclude?.split(";") ?? []).flatMap((glob) =>
  shell.ls(glob)
);

const includeFiles = (args.include?.split(";") ?? []).flatMap((glob) =>
  shell.ls(glob)
);

const excludeOptions = excludeFiles.map((f) => `':!${f}'`).join(" ");
const includeOptions = includeFiles.map((f) => `'${f}'`).join(" ");

const changes = shell.exec(
  `git diff --staged --stat ${excludeOptions} ${includeOptions}`,
  { silent }
).stdout;

if (!changes || changes.length === 0) {
  const changesWithoutExcudes = shell.exec(
    `git diff --staged --stat ${includeOptions}`,
    { silent }
  ).stdout;
  if (changesWithoutExcudes && changesWithoutExcudes.length > 0) {
    shell.echo(chalk.green("All changes were ignored"));
    onFinish();
    shell.exit(0);
  }
  shell.echo(chalk.red("Sorry, there are no changes"));
  onFinish();
  shell.exit(1);
}

onFinish();

const changesLines = changes.split("\n").filter((l) => l.trim());

const lastLine = changesLines[changesLines.length - 1];

if (! silent) {
  shell.echo(`Processing: ${lastLine}`);
};

const changesSummaryRegex =
  /(\d+ files? changed)(, (\d+) insertions?\(\+\))?(, (\d+) deletions?\(\-\))?/;

const [
  filesInfo,
  crap0,
  insertionCount,
  crap1,
  deletionCount,
] = changesSummaryRegex.exec(lastLine).slice(1);

const isMaxLinesInsertionReached = Number(insertionCount ?? '0') > maxLines;
const isMaxLinesDeletionReached = Number(deletionCount ?? '0') > maxLines;
const changedCount = Number(deletionCount ?? '0') + Number(insertionCount ?? '0');
const isMaxLinesTotalReached = changedCount > maxTotalLines;

shell.echo("PR number of changes:");
shell.echo(changesLines.slice(0, -1).join("\n"));
shell.echo(
  `${
    isMaxLinesInsertionReached
      ? chalk.red(`${insertionCount ?? 0}/${maxLines} lines added`)
      : chalk.green(`${insertionCount ?? 0}/${maxLines} lines added`)
  }`);
shell.echo(
  `${
    isMaxLinesDeletionReached
      ? chalk.red(`${deletionCount ?? 0}/${maxLines} lines removed`)
      : chalk.green(`${deletionCount ?? 0}/${maxLines} lines removed`)
  }`);
shell.echo(
  `${
    isMaxLinesTotalReached
      ? chalk.red(`${changedCount}/${maxTotalLines} lines changed`)
      : chalk.green(`${changedCount}/${maxTotalLines} lines changed`)
  }`);

if (isMaxLinesInsertionReached || isMaxLinesDeletionReached || isMaxLinesTotalReached) {
  shell.echo(chalk.red(`Sorry, the PR is too big`));
  shell.exit(1);
} else {
  shell.echo(chalk.green(`The PR is fine`));
}
