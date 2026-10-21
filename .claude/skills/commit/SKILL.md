---
allowed-tools: Bash(git:*), Bash(npm:*), Skill
description: Stage, commit, and optionally push changes
---

Create a well-formatted git commit. See `.claude/rules/git-workflow.md` for format rules.

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Staged: !`git diff --cached --stat`
- Unstaged: !`git diff --stat`
- Recent commits (style reference): !`git log --oneline -5`

## Instructions

### 0. Pre-commit (REQUIRED)

Run `/test` first. If it fails, STOP and report failures. Do NOT commit with failing tests, type errors, or lint errors.

### 1. Stage and Commit

1. Review changes; stage unstaged if they belong in this commit
2. Commit with Conventional Commits format: `<type>(<scope>): <description>`
   - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`
   - Scopes: component affected (e.g., `auth`, `api`, `db`, `queue`)
3. Use `$ARGUMENTS` as guidance if provided
4. If `$ARGUMENTS` contains "push", also push after committing

**NEVER** include `Generated with Claude Code`, `Co-Authored-By: Claude`, or any AI footer. See `.claude/rules/git-workflow.md`.
