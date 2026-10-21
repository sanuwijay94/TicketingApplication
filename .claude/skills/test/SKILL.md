---
allowed-tools: Bash(npm:*), Bash(docker:*), Bash(npx:*)
description: Run the full test suite (tests, lint, typecheck) in parallel
---

Run the complete test suite. Execute all checks in parallel to surface all errors at once.

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`

## Commands

> **TODO**: Update the npm script names to match your project's `package.json`.

| Argument | Runs |
|----------|------|
| (none) | `npm run test:unit` + `npm run lint` + `npm run typecheck` **in parallel** (matches CI) |
| `all` | Full suite — `npm test` + `npm run lint` + `npm run typecheck` |
| `unit` | `npm run test:unit` |
| `integration` | Start services via `docker compose -f docker-compose.test.yml up -d`, run `npm run test:integration`, tear down |
| `e2e` | Start full stack via `docker compose -f docker-compose.test.yml up -d`, run `npx playwright test`, tear down |
| `lint` | `npm run lint` |
| `fix` | `npm run lint:fix` |
| `typecheck` / `types` | `npm run typecheck` |
| `ci` | `npm run test:ci` (coverage, matches CI pipeline exactly) |
| `coverage` | `npm test -- --coverage` |
| `<path>` | `npm test -- <path>` |

For the full regression suite across BE + FE + E2E, use `/regression` instead.

## Parallel Execution

For default mode, invoke all three commands in **separate Bash tool calls in a single message** so they run concurrently.

## Handling Results

**Do not ignore warnings.** Both errors and warnings must be addressed — see `.claude/rules/boundaries.md`.

If fixing a warning requires complex changes: present options to user (refactor vs targeted ignore vs assertion), explain trade-offs, ask preference. **Never silently add ignore comments.**

## Quality Gates

- ✅ 100% tests passing
- ✅ No type errors or warnings
- ✅ No lint errors or warnings
