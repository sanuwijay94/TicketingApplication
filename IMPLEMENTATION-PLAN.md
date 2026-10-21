# Implementation plan — conventions

This file holds the planning **conventions** only. The backlog itself lives in **GitHub Issues**
(`type:feature`), grouped into **Milestones** (= phases) and tracked on the **Project board** —
see `SDLC.md` → *Where everything lives* and `/implementation-plan`. Do not maintain a parallel
list of work items here.

## §1 Conventions

### Identity
The GitHub **issue number** is the stable feature ID (`#142`). Milestones name the phase
(`Phase 3`). Branch `feature/<#>-<slug>`; PR title `[Feature] <#>: <title>`; PR body `Closes #<#>`.

### Dependencies
List blocking issues in the body as `Depends on: #123, #131`. A feature is **unblocked** only when
every listed issue is closed (`/implementation-plan next` applies this).

### Touched zones
Every feature issue names the zones it changes, using this taxonomy:

| Zone | Meaning |
|---|---|
| `dom.<aggregate>` | domain layer — entities, value objects, domain services, events |
| `app.<use-case>` | application layer — use cases, ports, DTOs |
| `infra.<adapter>` | infrastructure — repositories, external clients, messaging |
| `http.<endpoint>` | presentation — controllers / handlers (contract gate applies) |
| `ui.<screen>` | frontend screens and slices (design files apply — `.claude/rules/ui-designs.md`) |
| `schemas.<name>` | shared contract schemas in `server/models` (contract gate applies) |
| `openapi` | the generated OpenAPI document / registry |
| `mig` | a database migration — **single-threaded**, coordinate via `MIGRATIONS-LOG.md` |

### Effort sizing
Shared with `/implement` and `/review` (`.claude/patterns/change-sizing.md`): **Trivial** (1 file,
<10 lines) · **Small** (1–2 files, <50 lines) · **Medium** (3–5 files, design choices) · **Large**
(5+ files, architectural — new service, integration, worker, migration). Put the size in the issue.

### Parallel work
Two open features that touch the **same zone** are scheduled serially; features with disjoint zones
may run in parallel (separate worktrees — `.claude/rules/branch-isolation.md`). `mig` is always
serial. Anything touching `http.*`, `ui.*`, `schemas.*` or `openapi` passes the **contract gate**
first (`.claude/rules/api-contracts.md`).

### PR hygiene
One feature per PR. `PLAN-NNN` committed before the first code edit (Standard/Feature lanes).
Squash-merge. The PR closes its issue; never close feature issues by hand.
