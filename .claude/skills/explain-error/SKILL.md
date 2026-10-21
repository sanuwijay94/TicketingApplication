---
allowed-tools: Bash(node:*), Bash(git:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Read, Glob, Grep, Agent
description: Explain any error message, stack trace, or exception in plain English — parse the error, locate the origin via the discovery ladder, explain what it means and why, and recommend the fix. Read-only.
argument-hint: '[error message | stack trace | exception text | "TS2345: ..." | paste error here]'
---

**Plain-English error explanation.** Given any error message, stack trace, or exception, this skill parses the error to extract the file and line, locates that file via the discovery ladder, and explains what the error means, why it happened, and how to fix it — in language a junior developer or non-TypeScript expert can understand.

Use this when you have an actual error in hand and want to know what it means before acting. Then hand off to `/fix` to write the failing test and implement the change.

**Division of labour across the error-handling skills:**

| Skill | Starting point | What it produces |
|-------|---------------|-----------------|
| `/explain-error` | An actual error message or stack trace | Plain-English explanation + fix recommendation |
| `/trace-bug` | A symptom description ("X doesn't work") | Root Cause Report for `/fix` |
| `/fix` | A root cause or GitHub issue | Failing test + code fix + regression suite |
| `/explain` | A file, symbol, or domain concept | Structural explanation of what that thing is |

Use `/explain-error` first when an error is in hand. If the error does not point clearly at a root cause, escalate to `/trace-bug` for deeper localization.

---

## Current State

- Branch: !`git branch --show-current`
- Architecture docs: !`ls .claude/planning/architecture/ 2>/dev/null | tr '\n' ' '`

## The error

$ARGUMENTS

If empty, ask for: the full error message or stack trace (paste verbatim), where it appeared (terminal / browser / CI / test run), and what action triggered it.

**Paste the error verbatim** — exact casing, exact text. A truncated or paraphrased error skips the parse phase and falls back to slower keyword search.

---

## Why this skill exists

An error message or stack trace already contains the exact `file:line` that failed — the hard part of localization is already done. This skill uses that information as a direct entry point into the indexes, skipping the multi-angle search that `/trace-bug` requires when only a symptom is known. The indexes then answer "what is that file", "what layer does it belong to", "what calls it", and "are there known structural issues at this location" — without cold-reading source.

The result is a self-contained explanation readable by a junior engineer: what the error *means* in plain terms, what *caused* it at the graph level, and the smallest fix. For complex bugs or class defects across multiple files, escalate to `/trace-bug` after reading this output.

---

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

## Phase 0: Parse the error

Extract the following from the raw error text before searching. This is the key that unlocks the lookup.

### 0a — Extract file and line

Identify the **origin frame** — the first `file:line` that is inside `packages/` (skip `node_modules` frames):

```
# TypeScript compiler error
server/src/domain/.../file.ts:42:10 - error TS2345: ...
→ file = server/src/domain/.../file.ts, line = 42

# Node.js / Karma + Jasmine stack trace
at ClassName.method (server/src/.../file.ts:42:10)
→ file = server/src/.../file.ts, line = 42

# Express 4 startup error — no file:line, use the class/token name instead
Express 4 can't resolve dependencies of XxxService (?, ...). ...
→ token = XxxService (query graph by class name)

# Mongoose / validation error — use the field path
ZodError: [ { path: ["fieldName"], message: "...", code: "..." } ]
→ field = fieldName (query graph by schema name + field)
```

If the stack trace has **multiple frames in `packages/`**, take the **deepest frame inside application code** — the first `packages/` frame going down from the error message, not the last. That is the origin; frames above it are callers propagating the exception.

### 0b — Classify the error type

Match the error to one of these categories — each has a different explanation and fix pattern:

| Error pattern | Category | Common cause in TKT |
|---|---|---|
| `TS2345`, `TS2322`, `TS2339`, `TS2304` | TypeScript type mismatch | Wrong type passed, missing field, `any` leak |
| `TS2307` | Module not found | Wrong import path, missing export, circular dependency |
| `TS2564`, `TS2531` | Null / undefined | Optional not guarded, non-null assertion on actually-null value |
| `TS1005`, `TS1128` | Syntax error | Malformed code, unclosed bracket |
| `TypeError: Cannot read properties of undefined` | Runtime null access | Object not initialised, async result not awaited, missing guard |
| `TypeError: X is not a function` | Runtime wrong type | Import resolved to `undefined` — often circular dep or missing export |
| `ReferenceError: X is not defined` | Runtime missing binding | Circular dependency, scope issue, missing import |
| `Express 4 can't resolve dependencies` | Express 4 DI failure | Provider not in module, circular injection, missing `@Injectable()` |
| `QueryFailedError` / `EntityNotFoundError` | Mongoose DB error | Wrong column/table name, constraint violation, missing migration |
| `ZodError` | Validation failure | Request/response does not match shared schema |
| `ConflictException` / `NotFoundException` (TKT) | Domain exception | Business rule violation surfaced at the HTTP layer |
| `Error: Cannot find module` | Node module resolution | Wrong path alias, missing build step, `tsconfig.json` paths mismatch |
| `ECONNREFUSED` / `ETIMEDOUT` | Network / service | Dev container not running, wrong port, service not started |

### 0c — Extract searchable keywords

From the error text, pull:
- **File stem** (last two path segments, e.g. `ticket.repository.impl`)
- **Class / function name** (from the error message or stack frame, e.g. `TicketRepositoryImpl`, `findById`)
- **Token / symbol** (what could not be resolved — e.g. `ITicketRepository`, `XxxService`)
- **Error code** (e.g. `TS2345`, `ECONNREFUSED`)

These keywords drive the search in Phase 1.

---

## Phase 1: Locate via the discovery ladder

### Step 1a — Understand Anything graph: file-path lookup

Use the extracted file path as the primary key:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

If zero hits on file path, fall back to the class / symbol name:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### Step 1b — Extract node detail and neighbours

For the matched node, pull its full profile and direct edges:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### Step 1c — Sibling-file check (same module, same pattern)

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

---

## Phase 2: Check for known structural issues at the error location

Some errors are symptoms of structural graph problems — not just a wrong value or missing guard. Check these before reading source.

### Step 2a — Self-import / circular dependency check

`TypeError: X is not a function`, `ReferenceError: X is not defined at import time`, or Express 4 `Cannot instantiate circular dependency` are often circular import symptoms. Check if the error-origin file is in a cycle:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### Step 2b — Hub-module check

If the error file has ≥ 5 dependents, it is a hub module. Errors here affect many callers — the fix must account for blast radius:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### Step 2c — Low-cohesion layer check

If the error file belongs to a layer that keeps accumulating cross-layer dependencies (check `layer-map.md`), the error may be a symptom of architectural drift rather than a simple logic bug. Note this in the explanation.

---

## Phase 3: Read the exact error origin (minimum source)

Now read **only** the specific line(s) where the error occurred. Do not read the whole file.

1. Use the `file:line` extracted in Phase 0
2. Read a window of ±10 lines around the error line for context

```
Read <filePath> offset=<line - 10> limit=20
```

For **Express 4 DI errors** (no file:line in the message): read the module file that registers the failing provider, not the provider itself. The module is where the injection token is wired.

For **Mongoose validation errors**: read the schema file, not the controller. The schema is at `server/models/src/<domain>/<feature>.schemas.ts`.

For **Mongoose errors**: read the entity file and the migration that created the relevant table. The mismatch is usually between the column definition and the actual DB schema.

After reading the error origin, verify the architecture docs are accurate for this file. If the summary diverges from what the source shows (e.g., summary mentions a feature that was removed), flag graph staleness.

---

## Phase 4: Explain the error in plain English

Combine Phase 0–3 findings into a structured explanation. **Write for a junior developer** — no assumed TypeScript or Express 4 expertise, no jargon without definition, analogies where helpful.

---

## Output Format

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

---

## Error-type quick-reference

When Phase 0 classifies the error, use these patterns to produce the "Why it happens" and "How to fix it" sections accurately:

| Error type | Why it typically happens in TKT | First fix to try |
|---|---|---|
| `TS2345` type argument mismatch | `z.infer<typeof Schema>` diverged from hand-written interface; or domain entity field renamed | Replace hand-written interface with `z.infer`; or grep and update the renamed field |
| `TS2339` property does not exist | Field removed from schema or entity; optional field accessed without guard | Add `?.` guard or restore the field; check `server/models` contract |
| `TS2307` module not found | Wrong `@/` path alias; missing export from `index.ts`; circular dep | Check `tsconfig.json` paths; add the export; run cycle check |
| `TS2531` object is possibly null | `findOne` returns `T \| null` but code treats it as `T` | Add `if (!entity) throw new NotFoundException(...)` guard |
| `TypeError: not a function` at runtime | Circular import resolved to `{}` before the exporting module initialised | Move shared types to a separate file; break the cycle |
| `Express 4 can't resolve dependencies` | Provider missing from `imports:[]` or `providers:[]` in the Express 4 module | Add the missing module to `imports` or the missing provider to `providers` |
| `QueryFailedError: Invalid column name` | Mongoose entity column name diverged from actual DB column (migration not run) | Run `npm migration:run`; check the entity `@Column()` decorator matches the migration |
| `ZodError` on response | Controller returns a field the schema does not declare, or vice versa | Diff `ResponseSchema` fields against what the use case returns; one is wrong |
| `ECONNREFUSED localhost:5432` | Dev container not running | `npm dev:up`; confirm with `docker compose ps` |

---

## Quality Gates

- ✅ Discovery ladder worked before any source file opened
- ✅ Error parsed to a specific `file:line` before querying (Phase 0 complete)
- ✅ Circular dependency and hub-module checks run for every error at a source file
- ✅ Explanation written in plain English — no unexplained TypeScript / Express 4 jargon
- ✅ "How to fix it" is numbered, concrete steps — not abstract advice
- ✅ Graph summary cross-checked against source at the error line — staleness noted if found
- ✅ Structural issues (hub module, cycle, cross-layer community) called out when present

## Never

- Read a source file before working the discovery ladder
- Give a fix that addresses only the symptom when the evidence reveals a structural cause (circular dependency, over-coupled module)
- Explain the error in TypeScript terms without defining those terms for a junior reader
- Produce an explanation that does not include the specific `file:line` where the error originated
- Conflate Express 4 DI errors (wrong module wiring) with circular dependency errors (import cycle) — they have different symptoms and different fixes
- Skip the structural-issues checks (Phase 2) — an error in a hub module or a cyclic file has wider implications than the immediate fix suggests
- Edit any source file — read-only; hand off to `/fix` for all code changes
