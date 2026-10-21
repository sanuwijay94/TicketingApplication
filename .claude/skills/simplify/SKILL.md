---
allowed-tools: Task, Skill, Bash(node:*), Bash(git:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Read, Glob, Grep, Agent
description: Simplify code (read-only report) or guided refactoring with blast-radius check, plan approval, and implementation with tests
argument-hint: '[file-path | symbol-name | "refactor X to Y" | "extract X from Y" | "move X to layer Z" | --refactor]'
---

## Navigate First (MANDATORY — always runs before any simplification or refactoring)

Before touching any file — or even proposing changes — work the discovery ladder (`.claude/rules/code-navigation.md`):

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

If either graph is missing, note it and proceed with source reads — but never skip the query attempt.

**If the proposed change is structural** (extract, move, rename, split, merge, schema change) — run `/impact-check` before proposing anything to understand blast radius.

---

## Mode Selection

| Invocation | Mode |
|-----------|------|
| `/simplify` or `/simplify <path>` | **Simplify** — read-only analysis report; no edits |
| `/simplify --refactor <target>` | **Refactor** — guided structural change with plan approval and implementation |

If `$ARGUMENTS` describes a refactor goal (`"refactor X"`, `"extract X from Y"`, `"move X to layer Z"`, `"rename X to Y"`, `"fix layer violation"`) treat it as **Refactor mode** automatically.

---

## SIMPLIFY MODE

Invoke `code-simplifier` for a read-only simplification report. **No edits.** Apply suggestions with `/implement` or manually.

### Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`

### Target

$ARGUMENTS

| Input | Files |
|-------|-------|
| (empty) | Uncommitted changes, or last commit if clean |
| `<path>` | Specific file or directory |
| `<hash>` | Files from that commit — `git diff --name-only $ARGUMENTS^..$ARGUMENTS` |
| `<N>` (number) | Files changed in last N commits — `git diff --name-only HEAD~N..HEAD` |

### Workflow

Spawn `code-simplifier` with:

> Simplification analysis. READ-ONLY — do not edit files.
> Target: [args]. Follow your agent definition (`.claude/agents/code-simplifier.md`) — classify by impact/effort, sort high-impact + low-effort first, be specific (file:line).

Present the agent's report verbatim. If the user wants changes applied, they invoke `/implement` with the report as input.

---

## REFACTOR MODE

Guided refactoring with mandatory pre-change analysis. Runs blast-radius and dependency checks before proposing anything, presents a plan for approval, then implements with tests. Never modifies code before the plan is approved.

**`/dependency-check` and `/impact-check` are embedded as Phase 0 — do not skip them by jumping straight to implementation.**

### Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Architecture docs: !`ls .claude/planning/architecture/ 2>/dev/null || echo "none"`

### Refactor Target

$ARGUMENTS

If empty, ask: what do you want to refactor and why?

Accepts:
- A file path: `server/src/application/ticketing/use-cases/create-ticket.use-case.ts`
- A symbol: `FlowValidationGate`, `DeadlineClock`, `AssignmentRule`
- A goal description: `"extract deadline logic out of Ticket into a domain service"`, `"move OCM HTTP calls to a dedicated adapter"`, `"rename Counter to SequenceGenerator"`
- A layer violation: `"fix infra imports leaking into domain"`, `"split this use case — it does two things"`

### Why This Mode Exists

Refactors that skip blast-radius analysis cause regressions. The most common failure pattern in this codebase: a shared abstraction (a port interface, an aggregate method, a Mongoose schema) is renamed or restructured without updating all consumers — tests pass locally because the change compiles, but integration tests or the FE break. This mode forces the dependency chain and layer-violation checks *before* proposing anything, so the plan already accounts for every consumer and every rule violation.

---

### Phase 0: Blast-radius and dependency analysis (READ-ONLY — always runs first)

#### 0a — Resolve the target via the discovery ladder

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

#### 0b — Direct inbound dependents (what imports this target)

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

Supplement with a grep import scan:

```bash
rg --type ts "from ['\"].*<filename-without-ext>['\"]" packages/ -l
```

#### 0c — Layer violation scan

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

#### 0d — Circular dependency check

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

#### 0e — Hub module check

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

Record this project's hub modules in `docs/change-impact-matrix.md` as they are discovered — a symbol crossing 5 dependents belongs on that list.

---

### Phase 1: Classify the refactor

| Type | Trigger | Key rules |
|------|---------|-----------|
| **Extract** | Logic doing too many things — split into smaller units | One use case per class; one responsibility per aggregate method |
| **Move** | Code in the wrong layer | Clean Architecture dependency rule — dependencies point inward only |
| **Rename** | Symbol or file name doesn't match ubiquitous language | `ddd.md` ubiquitous language; update `docs/glossary.md` if domain term changes |
| **Split aggregate** | Aggregate root owns entities it doesn't exclusively own | DDD aggregate design rules — keep aggregates small |
| **Extract port/adapter** | Concrete infra type leaking into domain or application | Port interface in `application/ports/`; adapter in `infrastructure/external/` |
| **Merge** | Redundant abstractions doing the same thing | Check both have test coverage before merging; keep the better-named one |
| **Schema change** | Mongoose schema in `server/models` being restructured | ADR-016 contract-first gate — schema change lands as its own PR; all 5 artifacts move together |

If the target is a Mongoose schema in `server/models/src/`:
> **STOP** — schema changes are contract changes. Run `/contract <domain> <feature>` to handle the contract PR workflow. A refactor that also changes a contract must split into two PRs: contract first, then consumers.

---

### Phase 2: Architecture and DDD compliance check

**Clean Architecture checks** (per `.claude/rules/clean-architecture.md`):
- Does the refactored file respect the dependency rule? (domain has zero external deps; application has no infra/presentation)
- Is business logic staying out of controllers, repositories, and infra adapters?
- Are new ports needed? If so, interface goes in `application/ports/`, adapter in `infrastructure/external/`
- Are DTOs used at the presentation boundary? Raw domain entities must not be returned from controllers

**DDD checks** (per `.claude/rules/ddd.md`):
- Do aggregate invariants remain enforced inside the aggregate root — not in the use case?
- Are domain events still raised inside aggregate methods (not use cases or services)?
- Are value objects still immutable and validated on construction?
- Does the refactor introduce a repository for a non-root entity? That is forbidden.
- Does renaming touch a ubiquitous language term? If yes, `docs/glossary.md` and `domain-model.md` must update.

---

### Phase 3: Propose the refactor plan — CHECKPOINT (user must approve before any file is written)

```markdown
## Refactor Plan: <target name>

**Type:** <Extract | Move | Rename | Split | Extract port/adapter | Merge | Schema change>
**Risk level:** HIGH / MEDIUM / LOW  (derived from Phase 0 — inbound count, hub modules, circular deps)

### Why this refactor is safe / not safe right now
<1–2 sentences based on Phase 0 findings. If risk is HIGH, state what must happen first.>

### Current violations being fixed
- <Layer violation: `domain/` imports from `infrastructure/` at file:line>
- <DDD violation: business rule enforced in use case instead of aggregate>
- <Naming drift: symbol called `Processor` — rename to match ubiquitous language term `X`>

### Files to change
| File | Change | Reason |
|------|--------|--------|
| `<path>` | rename / extract method / move to layer / split | <one-line reason tied to a rule> |

### Files to update (consumers that must change)
| File | Change needed |
|------|--------------|
| `<path>` | update import path / rename call site / implement new port method |

### New files (if any)
| File | What it becomes |
|------|----------------|
| `<new-path>` | Port interface / Adapter / Value Object / Domain Service |

### Tests to write or update
| Test file | What it covers |
|-----------|---------------|
| `test/unit/<path>` | <what invariant or behaviour is tested> |

### Sequence (order matters for compilability)
1. <step 1 — e.g., create new file so consumers can import it before the old one is deleted>
2. <step 2>
3. <step 3 — delete old file last>

### Out of scope
<Anything noticed but not changed — note it for a follow-up.>
```

**CHECKPOINT — wait for explicit user approval before Phase 4.**

If the user requests changes to the plan, revise and re-present. Do not implement a partially-approved plan.

---

### Phase 4: Implement the approved plan

Invoke `developer-agent` to:

1. **Execute the sequence** from the approved plan — in order; do not reorder steps
2. **Strict TypeScript** — no `any`, no `@ts-ignore`, extend `AppError` for new errors (`.claude/rules/typescript.md`)
3. **Constructor injection only** — no `new ConcreteClass()` inside domain or application layers
4. **No logic in the wrong layer** — business rules stay in the domain; orchestration stays in use cases; HTTP mapping stays in controllers
5. **Update all consumer call sites** identified in Phase 0 and the plan
6. **Update `docs/glossary.md`** if a domain term was renamed
7. **Update `domain-model.md`** if a bounded-context boundary, aggregate, or ubiquitous language term changed

---

### Phase 5: Tests

| Layer | Test location | Mocking strategy |
|-------|-------------|-----------------|
| `domain/` | `test/unit/domain/` | None — pure functions |
| `application/use-cases/` | `test/unit/application/` | Mock port interfaces only — never concrete implementations |
| `infrastructure/` | `test/integration/` | Real DB / test containers — never mock the database |
| `presentation/` | `test/integration/` | Mock use cases — test HTTP contract only |

- Use factories (`UserFactory.build()`) — no hardcoded test data
- Tests must fail before the refactor and pass after
- Run `/test` — all tests must pass before proceeding

---

### Phase 6: Validate and document

1. **`/test`** — full suite (Karma + Jasmine + TSLint + tsc). No failures, no type errors, no lint warnings. Fix before reporting done.
2. **Architecture drift check** — re-run the layer violation script from Phase 0c on each modified file to confirm violations are resolved.
3. **Docs** — update only what changed:
   - `docs/glossary.md` — if a domain term was renamed or a new concept introduced
   - `.claude/planning/architecture/domain-model.md` — if a bounded context, aggregate, or context boundary changed
   - `.claude/planning/architecture/layer-map.md` — if a new port or adapter was introduced
   - Do **not** rewrite ADRs — if the refactor reverses an ADR decision, ask the user whether a new ADR is needed

---

### Post-Refactor

Suggest:
- `/simplify` — review whether new code introduced accidental complexity
- `/verify` — comprehensive quality check
- `/commit` then `/pr`

---

### Output Format

```markdown
## Refactor Complete: <target name>

**Files changed:** N
**Files created:** N
**Tests added/updated:** N
**Layer violations resolved:** N (list them)
**Test result:** ✅ All passing / ❌ Failing (list failures)

### What changed
| File | Change |
|------|--------|
| `<path>` | <one-line description> |

### Violations resolved
- `<file>` — was importing `<infra type>` in domain layer; extracted to port
- `<file>` — business rule was in use case; moved to aggregate method

### Docs updated
- `docs/glossary.md` — renamed `Counter` → `SequenceGenerator`

### What was left out of scope
- <follow-up item if any>
```

---

### Refactor Quality Gates

- ✅ Discovery ladder worked before any file is written
- ✅ `/impact-check` run for structural changes
- ✅ Phase 0 blast-radius analysis completed before any file is written
- ✅ Layer violation scan run before and after — violations resolved, none introduced
- ✅ Plan approved by user before implementation begins
- ✅ All consumer call sites updated — no dangling imports
- ✅ Tests exist for every changed file; `/test` passes with zero failures, type errors, or lint warnings
- ✅ Domain terms that changed are updated in `docs/glossary.md` and `domain-model.md`
- ✅ Mongoose schema changes blocked until contract PR is handled separately via `/contract`

### Never (Refactor Mode)

- Write a single line of implementation code before the plan is approved (Phase 3 checkpoint)
- Skip Phase 0 analysis — "it's a small change" is how silent regressions happen
- Rename a domain term without updating `docs/glossary.md` — terminology drift is a bug
- Move business logic closer to the infrastructure layer — only ever move it toward the domain
- Create a repository for a non-root entity — per DDD aggregate rules
- Allow an ORM annotation, HTTP type, or framework import inside `domain/` or `application/`
- Mark the refactor complete when `/test` has failures — fix the tests, don't silence them
- Mix a schema (contract) change with a consumer (implementation) change in the same PR — ADR-016 requires them to be separate
