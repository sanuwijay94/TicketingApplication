---
allowed-tools: Bash(node:*), Bash(git:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Read, Glob, Grep
description: Before changing a file/symbol, enumerate all impacted callers, tests, contracts, and layers
argument-hint: '[file-path | symbol-name | node-id | "what breaks if I change X"]'
---

Read-only pre-change blast-radius assessment. Given a file, function, or symbol, enumerate every caller, consumer, dependent test, and contract artifact that would be affected by a change. Output a risk-ranked impact table.

**Run this before `/implement`, `/fix`, or any refactor that touches a shared abstraction (port interface, Mongoose schema, aggregate method, shared component).**

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`

## Target

$ARGUMENTS

If empty, ask: what file, symbol, or concept is about to change?

## Why This Skill Exists

The most expensive bugs in this codebase come from changing a shared abstraction (a Mongoose schema, a port interface, an aggregate method, a shared React component) without realizing how many consumers exist. The contract-first architecture (ADR-016) means schema changes ripple from `../models/` into BE validation, FE types, OpenAPI, MSW handlers, and mock factories simultaneously. This skill makes that blast radius visible *before* any code changes.

## Workflow

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

### Phase 1: Resolve the target to a file path and owning feature

1. If the argument is a file path, use it directly.
2. If it is a symbol name or keyword, resolve it via the discovery ladder:
   ```bash
   # Which feature owns it? (rung 1)
   rg -n -i '<keyword>' docs/feature-index.yaml

   # Where is it defined? (rung 4)
   rg -n '\b(class|interface|function|const|type|def|struct)\s+<SymbolName>\b' server clientApp/src
   ```
3. If multiple candidates, ask the user to pick one before proceeding.
4. Record the owning layer from `.claude/planning/architecture/layer-map.md` — it drives the
   cross-boundary check in Phase 5.

### Phase 2: Dependent scan (imports / usage)

Run these in parallel. This is the blast radius — **it is the core of the skill, never skip it**.

```bash
# Direct importers of the file
rg -n "from ['\"].*<filename-without-ext>['\"]|require\(['\"].*<filename-without-ext>" server clientApp/src -l

# Every reference to the exported symbol (catches barrels and re-exports)
rg -n '\b<ExportedSymbol>\b' server clientApp/src -l

# Contract consumers (if the target is a shared contract/schema)
rg -n '../models/' server clientApp/src -l

# Test files that reference the target
rg -n '<filename-without-ext>|\b<ExportedSymbol>\b' test/ tests/ -l 2>/dev/null || true
```

Group the hits by layer (Phase 1 step 4) — a hit that crosses a layer boundary is higher risk than
one inside the same module.

### Phase 3: Contract artifact check (if target is a published contract)

If the changed file is under `server/models/src/`:

1. Identify the generated OpenAPI path: `server/openapi.json` — note which operation schemas reference this type.
2. Find MSW handler file: `<feature>.handlers.ts` alongside the schema.
3. Find mock factory: `<feature>.mocks.ts` alongside the schema.
4. Find controller that `Schema.parse`s this type.
5. Find FE `*-api.ts` Angular HttpClient services slice that `z.infer`s from it.

All five are **required co-changes** for any breaking schema change.

### Phase 4: Test coverage audit

For each impacted file found in Phases 2–3:

```bash
# Find corresponding test file
rg -n "<impacted-filename>" test/ tests/ -l 2>/dev/null || echo "NO TEST FILE FOUND"
```

Flag any impacted file with no corresponding test as **HIGH RISK** (change has no regression safety net).

### Phase 5: Cross-boundary check

Identify if the target crosses any of these high-risk boundaries:

| Boundary | Risk |
|----------|------|
| Domain entity / aggregate method | All use cases that call this method are affected |
| Port interface (`application/ports/`) | Both the port consumer (use case) and all adapter implementations change |
| Mongoose schema in `server/models` | BE validation + FE types + OpenAPI + mock + MSW handler — all five must move together |
| Shared React component | Every feature that renders it affected — check create/edit parity per `ui-quality.md` |
| Repository interface | All use cases injecting it + the infrastructure adapter |
| Database migration | Irreversible — flag explicitly |

## Output Format

```markdown
## Impact Check: <target file or symbol>

**Layer:** <layer from layer-map.md>
**Owning feature:** <feature-index.yaml entry>
**Risk level:** HIGH / MEDIUM / LOW

### Dependents (<N> files)
| File | Type | Test coverage |
|------|------|---------------|
| <path> | caller/test/barrel | ✅ / ❌ MISSING |

### Contract artifacts (server/models only)
| Artifact | File | Status |
|----------|------|--------|
| BE validation | <controller.ts> | Present / MISSING |
| FE type | <*-api.ts> | Present / MISSING |
| OpenAPI | openapi.json | Present / MISSING |
| Mock factory | <*.mocks.ts> | Present / MISSING |
| MSW handler | <*.handlers.ts> | Present / MISSING |

### High-risk flags
- ❌ <file> — no test coverage (change is unguarded)
- ⚠️ Port interface change — <N> adapters must be updated
- ⚠️ Schema change — all 5 contract artifacts must move together

### Recommended actions before changing
1. <action — e.g., run /write-dev-tests for uncovered callers>
2. <action — e.g., update MSW handler after schema change>
3. <action — e.g., coordinate FE + BE branches per ADR-016>
```

## Quality Gates

- ✅ Every impacted file listed by actual path — not estimated, and found by a search that was actually run
- ✅ Test coverage verified for each impacted file — missing coverage flagged as HIGH RISK
- ✅ Contract artifact chain checked if target is a shared schema
- ✅ Port interface changes enumerate all adapter implementations

## Never

- Edit any file — read-only assessment only
- Approve a change as "safe" when coverage is missing — flag it
- Report a blast radius from the feature index alone — the index names owners, not every caller; the Phase 2 scan is what proves the list
