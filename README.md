# check-pr-length

A little cli to check the length of a PR and exit 1 if it reaches a certain threshold.

## Install

With npm:
```sh
$ npm install check-pr-length -g
```

With yarn:
```sh
$ yarn global add check-pr-length
```

## Usage

```
usage : check-pr-length [-v | --version] [-h | --help]
                        [--base[=<base-branch>]] [--max[=<max-line-changes>]]
                        [--exclude[="<blob>;<blob>;..."]]
    -v, --version
        Print the version number.
    -h, --help
        Show this help message.
    --base[=<base-branch>]
        The base branch to compare against. Defaults to `develop`.
    --max[=<max-line-changes>]
        The maximum number of line changes allowed (insertions or deletions). Defaults to `500`.
    --exclude[="<blob>;<blob>;..."]
        A list of blobs to exclude from the check.
```
