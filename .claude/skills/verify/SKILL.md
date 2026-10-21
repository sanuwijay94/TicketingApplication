---
allowed-tools: Bash(curl:*), Bash(npm:*), Task
description: Verify development environment or run comprehensive code quality checks
---

Two modes: env verification (`/verify env`) or comprehensive quality (`/verify`).

## Current State

- Branch: !`git branch --show-current`

## Modes

### `env` / `environment` — Local services

> **TODO**: Replace these checks with your actual local service ports and startup commands.

Check in parallel:
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` (App)
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5432` (Database)

If any are down: suggest the appropriate startup command (see `AGENTS.md`).

### Default (no args) — comprehensive quality

Invoke `verify-app` agent to run:
- Tests + typecheck + lint (invokes `/test` internally)
- Test coverage verification (modified files have tests)
- Architecture compliance (custom errors, import patterns, strict TS)
- Documentation sync (ADRs updated if arch changed)
- Security (no secrets, no `console.log`, proper error handling)
- Dependency audit (`npm audit`)
- Commit message conventions

## Service URLs

See `AGENTS.md` for local service URLs and ports.
