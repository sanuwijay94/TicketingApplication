---
allowed-tools: Bash(node:*), Bash(git:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Read, Glob, Grep, Agent
description: Deep-dive investigation — trace how a feature works, why something behaves a certain way, or what owns a concept
argument-hint: '[question | "how does X work" | "why does Y behave like Z" | "trace the flow for <action>"]'
---

Read-only investigation. Given a question about system behaviour, feature flow, or concept ownership, produce a precise, file-cited narrative answer. No code changes.

Use this when you need to *understand* before you act — before `/fix`, `/implement`, or `/impact-check` for anything non-trivial.

## Current State

- Branch: !`git branch --show-current`
- Architecture docs: !`ls .claude/planning/architecture/ 2>/dev/null || echo "none"`

## Investigation Target

$ARGUMENTS

If empty, ask what to investigate.

Accepts:
- A feature name or user action: `"how does ticket transition work"`
- A flow question: `"trace the call chain from the lobby to the database"`
- A concept question: `"what owns authorization"`
- A behaviour question: `"why does creating a ticket also bind a workflow"`
- A component question: `"what is the role of FlowValidationGate"`

## Why This Skill Exists

Reading code without an architecture map leads to local understanding — you know what *this* function does but not how it connects to the whole. This skill forces systematic top-down tracing through the Clean Architecture layers (presentation → application → domain → infrastructure) using the indexes as the navigation layer and the source files for ground truth. The result is a citable narrative, not a guess.

## Workflow

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

### Phase 1: Orient using the architecture docs

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

Read `.claude/planning/architecture/layer-map.md` and `domain-model.md` for the bounded-context and layer context before reading source files.

### Phase 2: Trace the call chain layer by layer

For each relevant layer, identify the entry point and read the key files. Follow Clean Architecture flow:

```
[HTTP request]
      ↓
Presentation  server/src/presentation/http/controllers/<feature>.controller.ts
      ↓
Application   server/src/application/<domain>/use-cases/<action>.use-case.ts
      ↓         ← ports at this boundary (application/ports/)
Domain        server/src/domain/<domain>/entities/<aggregate>.ts
              server/src/domain/<domain>/services/<service>.ts
      ↓
Infrastructure server/src/infrastructure/<domain>/<repo>.repository.impl.ts
               server/src/infrastructure/external/<service>/<client>.ts
```

For each file in the chain:
1. Read the relevant section (constructor, key method, port usage)
2. Note: what it does, what it delegates to, what invariant or business rule it enforces

### Phase 3: Identify key decision points

For the investigation question, extract:

- **Entry trigger** — what HTTP action / event / scheduled job starts this flow
- **Authorization check** — where permissions are verified (typically `RequirePermission` decorator or use-case guard)
- **Domain invariant** — which aggregate method enforces the business rule
- **External boundaries** — which ports are crossed (Flow Engine, OCM, Redis, RabbitMQ outbox)
- **Persistence** — which repository is written to, whether a transaction wraps multiple writes
- **Events** — any domain events raised and their downstream consumers (outbox relay → TMAC)

### Phase 4: Cross-check against architecture docs

Check `.claude/planning/architecture/` for documented decisions that explain *why* the code is structured this way:
- `layer-map.md` — which layer owns what
- `domain-model.md` — bounded context boundaries and ubiquitous language
- `component-map.md` — external integration contracts
- Relevant ADRs in `.claude/planning/adr/` — especially if the investigation touches a decision point (auth, workflow binding, contract-first, TMAC, ETags)

### Phase 5: Spawn a focused explore agent for deep reads (optional)

For complex flows spanning many files, spawn an `Explore` agent to read the full source rather than excerpts:

```
Agent(subagent_type: "Explore", prompt: "Read these files in full and return the key logic paths for <question>: <file list>")
```

## Output Format

```markdown
## Investigation: <question>

### One-line answer
<Direct answer to the question in one sentence.>

### Flow trace

**Entry:** <HTTP verb + route> — `<controller file:line>`
**Auth:** <permission checked> — `<where enforced>`

**Step 1 — Presentation** (`<controller.ts:line>`)
<What the controller does: validates input with ZodValidationPipe, extracts principal, calls use case.>

**Step 2 — Application** (`<use-case.ts:line>`)
<What the use case does: loads aggregate, calls domain method, crosses which ports, writes outbox.>

**Step 3 — Domain** (`<entity.ts:line>` or `<service.ts:line>`)
<Business rule / invariant enforced. Domain event raised if any.>

**Step 4 — Infrastructure** (`<repo.impl.ts:line>`)
<Persistence: what table, transaction scope, ETag rotation.>

**External calls** (if any)
- Flow Engine (`<flow-engine.client.ts:line>`): <what it validates, what happens on rejection>
- OCM (`<ocm.client.ts:line>`): <what it fetches>
- Outbox → TMAC: <when the outbox row is written and what fires it>

### Key decision points
- **<Decision>**: <why it works this way, ADR reference if applicable>

### Files involved
| File | Layer | Role |
|------|-------|------|
| `<path>` | `<layer>` | <one-line role> |

### What a new engineer should know
- <Non-obvious thing 1 — gotcha, invariant, or constraint that the code alone doesn't explain>
- <Non-obvious thing 2>
```

## Quality Gates

- ✅ Every claim backed by a `file:line` citation — no assertions from memory
- ✅ Flow trace covers all four Clean Architecture layers for any end-to-end question
- ✅ External boundary crossings (ports) identified and adapter named
- ✅ ADR referenced wherever a design decision shapes the implementation

## Never

- Edit files — read-only
- Answer from memory without reading the current source
- Stop at the first matching file — always trace the full layer chain
- Omit domain invariants — they are the *why* behind the code
