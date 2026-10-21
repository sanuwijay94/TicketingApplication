---
allowed-tools: Bash(git:*)
description: Manage locally-ignored files that are tracked by git but shouldn't show as changed
argument-hint: add|remove|list|untracked [filepath]
---

## Usage

- `/ignore-local add <path>` — hide local changes (`git update-index --assume-unchanged`)
- `/ignore-local remove <path>` — resume tracking local changes (`git update-index --no-assume-unchanged`)
- `/ignore-local list` — show files currently assume-unchanged
- `/ignore-local untracked <path>` — add to `.git/info/exclude` (local-only gitignore)

## Rules

- **Tracked files** (committed): use `--assume-unchanged`
- **Untracked files** (new files): add to `.git/info/exclude`
- **Never** add files to `.gitignore` for local-only purposes — that affects the whole team
- **Never** commit files that are marked assume-unchanged

## Implementation

| Subcommand | Command |
|------------|---------|
| `add` | `git update-index --assume-unchanged <path>` |
| `remove` | `git update-index --no-assume-unchanged <path>` |
| `list` | `git ls-files -v \| grep '^h '` |
| `untracked` | `echo "<path>" >> .git/info/exclude` |

Parse `$ARGUMENTS` for subcommand and filepath.
