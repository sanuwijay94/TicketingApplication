---
allowed-tools: Task, Bash(git:*)
description: Run security review on code changes (read-only report)
---

Spawn `security-reviewer` agent for read-only security analysis.

## Current State

- Branch: !`git branch --show-current`
- Changed files: !`git diff --name-only HEAD~1 2>/dev/null || git diff --name-only`

## Target

$ARGUMENTS

If no arguments, analyze uncommitted changes or most recent commit. Use `--branch` for full branch diff.

## Workflow

Spawn `security-reviewer` agent:

> Security review. READ-ONLY -- do not edit files.
> Target: [args]. Follow your workflow: determine scope, prioritize security-sensitive files, analyze with OWASP checklist, report by severity.

Present: summary with risk assessment, findings by severity, remediation steps, positive observations.
