---
allowed-tools: Bash(node:*), Bash(git:*), Bash(ls:*), Read, Glob, Grep, Agent
description: Generate a day-one onboarding guide for a new engineer — architecture overview, guided tour, key gotchas, first tasks
argument-hint: '[role | area | "backend" | "frontend" | "full-stack" | "domain:<name>"]'
---

Generate a structured onboarding package for a new engineer joining Ticketing Application. Uses the architecture docs, and key source files to produce a concrete, citable day-one guide — not a generic README.

## Current State

- Architecture docs: !`ls .claude/planning/architecture/ 2>/dev/null | grep '\.md$' | tr '\n' ' ' || echo "none"`
- ADRs: !`ls .claude/planning/adr/ADR-*.md 2>/dev/null | wc -l | tr -d ' '` ADRs present

## Audience

$ARGUMENTS

| Argument | Guide scope |
|----------|------------|
| (none) | Full-stack: complete guide covering all layers |
| `backend` | the API framework, Clean Architecture, DDD, database |
| `frontend` | the frontend framework, its data layer, the component library, the contracts package |
| `full-stack` | Both sides + integration contracts |
| `domain:<name>` | Deep dive into one bounded context (ticketing/workflow/master-data/search/audit) |
| `qa` | Testing strategy, factories, integration test setup, regression |

## Why This Skill Exists

A new engineer who reads only the README misses three things that cost days: (1) the contract-first rule (ADR-016) that blocks you from writing a controller before the Mongoose schema is merged, (2) the four bounded contexts in the backend (not two), and (3) that ticket state transitions go through a Flow Engine validation gate before persisting. This skill generates a guide that foregrounds those non-obvious constraints, not just the happy path.

## Workflow

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

### Phase 1: Load the guided tour

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### Phase 2: Load architecture docs

Read the relevant docs in parallel based on the audience argument:

- **All:** `AGENTS.md`, `MVP-SCOPE.md`, `.claude/planning/architecture/layer-map.md`, `.claude/planning/architecture/domain-model.md`
- **Backend / full-stack:** `.claude/planning/architecture/component-map.md`, `REQUIREMENT-ADDENDUM.md`
- **Critical ADRs to read for any backend engineer:** ADR-003 (condition model), ADR-006 (Keycloak), ADR-008 (UI stack), ADR-012 (TMAC/Flow Engine), ADR-016 (contract-first), ADR-021 (role permissions), ADR-027 (CaseType/AssignmentRule)

### Phase 3: Identify the most important source files by audience

**Backend engineer — must read on day one:**
1. `server/src/domain/ticketing/entities/ticket.ts` — the central aggregate
2. `server/src/application/ticketing/use-cases/transition-ticket.use-case.ts` — the most complex use case
3. `server/src/application/ports/flow-engine.port.ts` — TMAC integration boundary
4. `server/src/application/auth/role-permissions.ts` — authorization map
5. `server/src/domain/master/entities/case-type.ts` — ticket template aggregate
6. `server/models/src/` — contract-first source of truth

**Frontend engineer — must read on day one:**
1. `clientApp/src/app/store.ts` — Angular HttpClient services store setup
2. `clientApp/src/features/tickets/` — main feature slice
3. `server/models/src/` — Mongoose schemas (types come from here, not hand-written interfaces)
4. `clientApp/src/app/msw/` — MSW dev-mode setup

**QA engineer — must read on day one:**
1. `test/README.md` — testing conventions
2. `test/unit/` and `test/integration/` structure
3. `server/src/test/factories/` — DDD factories
4. `docker-compose.test.yml` — integration test services

### Phase 4: Extract the top 5 gotchas

Read the following sources for non-obvious constraints, then pick the 5 most likely to block a new engineer in week one:

- `.claude/rules/api-contracts.md` — contract-first gate (blocking rule)
- `.claude/rules/ddd.md` — aggregate invariants, ubiquitous language
- `.claude/rules/ui-quality.md` — browser verification, Bootstrap 4 + Angular HttpClient services mandatory
- `.claude/rules/git-workflow.md` — use `/commit` and `/pr`, no AI footers
- `.claude/rules/testing.md` — integration tests hit real DB, never mocked
- `docs/graph-review.md` — "what a new engineer would misunderstand" section

### Phase 5: Build the onboarding guide

Synthesise into the report format below.

## Output Format

```markdown
# Ticketing Application — Day-One Onboarding Guide
**Audience:** <role>  
**Generated:** <date>  
**Graph:** <node count> nodes · <tour steps> tour steps

---

## 1. What Ticketing Application Is (30 seconds)

<2-3 sentences: what it does, who uses it, what problem it solves.>

---

## 2. Repository Layout

```
ticketing-application/
  packages/
    api/           Express 4 backend — Clean Architecture + DDD
    ui/            the frontend app
    contracts/ Mongoose schemas — single source of truth for BE validation + FE types
    shared-types/   Shared TypeScript types
  test/            Backend tests (unit + integration + e2e)
  .claude/         Project conventions, skills, architecture docs
```

---

## 3. Architecture in One Diagram

```
FE (Angular 8 / Angular HttpClient services)
      ↓ fetch  ↑ z.infer<Schema>
server/models  ←→  openapi.json
      ↓ ZodValidationPipe
Presentation (Express 4 controllers)
      ↓
Application (use cases + ports)
      ↓                    ↓
Domain (aggregates)    Infrastructure (Mongoose repos, Redis, Flow Engine, OCM)
```

**The dependency rule:** arrows always point inward. Domain knows nothing about infrastructure.

---

## 4. The Guided Tour (<N> steps)

Work through these in order. Each step has key files to read.

<For each tour step: step number, title, 2-sentence summary, and the 2-3 most important node file paths.>

---

## 5. The Four Bounded Contexts (Backend)

| Context | Core Aggregate(s) | Key Invariant |
|---------|------------------|---------------|
| **Ticketing** | Ticket, Comment, SavedView | Transitions require FlowEngine validation; ETag for optimistic lock |
| **Workflow** | Workflow, Stage, Transition, AssignmentRule | Rules evaluated in priority order; first-match wins routing |
| **Master Data** | CaseType, FieldConfig | CaseType owns default workflow + counter binding; FieldConfig is create-only |
| **Search / Audit** | (ports only) | Append-only audit log; search via full-text SQL |

---

## 6. The Contract-First Rule (READ BEFORE WRITING CODE — ADR-016)

**You may not write a controller or FE api-slice until the Mongoose contract is merged.**

Sequence:
1. `/contract <domain> <feature>` — creates schema + MSW handler + mock factory + OpenAPI entry
2. Merge the contract PR
3. FE and BE branch in parallel (FE uses MSW, BE uses the schema)

The harness hook `.claude/hooks/contract-first-gate.sh` will reject a controller write that does not import from `../models/`.

---

## 7. Top 5 Gotchas for Week One

1. **<Gotcha title>** — <What it is, what breaks if you miss it, where to look>
2. **<Gotcha title>** — <...>
3. **<Gotcha title>** — <...>
4. **<Gotcha title>** — <...>
5. **<Gotcha title>** — <...>

---

## 8. Dev Environment Setup

```bash
npm install
npm dev:up          # docker compose (MongoDB, Redis, RabbitMQ)
npm dev:api         # Express 4 API on :3000
npm dev:ui          # Vite FE on :5173
npm test            # full suite (unit + lint + typecheck)
```

Read `.env.example` for required environment variables. Never edit `.env` — it is gitignored.

---

## 9. Key Skills to Know

| Command | When to use |
|---------|------------|
| `/explain <symbol>` | Locate and understand any file in the architecture |
| `/investigate how does <feature> work` | Trace a full call chain before touching it |
| `/impact-check <file>` | See blast radius before changing a shared abstraction |
| `/fix <symptom>` | Bug fix with root-cause localization |
| `/contract <domain> <feature>` | Start any new endpoint |
| `/commit` + `/pr` | Stage and submit work |
| `/test` | Run suite before committing |

---

## 10. First Week Checklist

- [ ] Read `AGENTS.md` and `MVP-SCOPE.md`
- [ ] Walk the guided tour in `docs/ONBOARDING.md` (generated by `/onboard`)
- [ ] Read the bounded context doc: `.claude/planning/architecture/domain-model.md`
- [ ] Read `server/src/domain/ticketing/entities/ticket.ts`
- [ ] Read `server/src/application/ticketing/use-cases/transition-ticket.use-case.ts`
- [ ] Read `server/models/src/` — understand the contract-first contract
- [ ] Run `npm dev:up && npm dev:api && npm dev:ui` and open the app
- [ ] Run `npm test` — confirm the suite is green locally
- [ ] Read `.claude/rules/` — especially `api-contracts.md`, `ddd.md`, `git-workflow.md`
```

## Quality Gates

- ✅ Every file path cited is a real path verified against the repo
- ✅ Tour steps sourced from the actual graph tour — not paraphrased from memory
- ✅ Gotchas sourced from `docs/graph-review.md` §4 and rules files — not invented
- ✅ Contract-first rule (ADR-016) explained in section 6 — this is the #1 new-engineer blocker
- ✅ Audience-specific sections omit irrelevant layers (e.g. backend guide does not explain Angular HttpClient services)

## Never

- Edit files — read-only output
- Write a generic README-style guide — cite actual file paths, actual tour steps, actual ADRs
- Omit the contract-first gate — it is the rule most likely to block a new engineer on day one
- Fabricate bounded context names or aggregate lists — read from graph and `domain-model.md`
