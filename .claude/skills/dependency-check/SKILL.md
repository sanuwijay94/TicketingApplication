---
allowed-tools: Bash(node:*), Bash(git:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Read, Glob, Grep
description: Full dependency chain analysis for a file or module — imports, dependents, depth, hub modules, circular deps, and change-risk level
argument-hint: '[file-path | symbol-name | module-group | "dependency chain for X"]'
---

Read-only dependency analysis. Given a file, symbol, or module, map the complete dependency chain in both directions: what it pulls in (imports) and what pulls it in (dependents). Surfaces hub modules, chain depth, circular dependencies, and a risk level before any change is made.

**Run this before `/implement`, `/fix`, or any refactor that touches a shared abstraction — especially before `/impact-check`, which measures blast radius but not chain depth or circular risks.**

## Current State

- Branch: !`git branch --show-current`

## Target

$ARGUMENTS

If empty, ask: what file or symbol do you want the dependency chain for?

Accepts any of:
- A file path: `server/src/application/ticketing/services/flow-validation.gate.ts`
- A class or symbol: `FlowValidationGate`, `ETag`, `IFlowEngineClient`
- A module group: `infra/messaging`, `features/saved-views`, `domain/ticketing`
- A vague description: `"dependency chain for the outbox"`, `"what does TransitionTicketUseCase depend on"`

## Why This Skill Exists

`/impact-check` answers "who calls this file" — one hop outward. This skill answers the harder question: how deep does the chain go in *both* directions, which high-centrality modules sit in the chain (changing anything many files depend on has enormous blast radius), and whether circular imports exist that would make a refactor unsafe. It combines the feature index and layer map (ownership and legal dependencies) with an exhaustive reverse-dependency scan (who actually imports what) to give a complete picture.

Hub modules in this codebase (tracked in `docs/change-impact-matrix.md` — avoid depending on more of these than necessary):

| Module | Dependents | Risk |
|--------|-----------|------|
| _(populate as they are found — see below)_ | | |

<!-- Fill this table in for your project. A module belongs here once its dependent
     count crosses 5. Typical candidates: the i18n/translation helper,
     the core domain aggregate, an injected clock/config port, and the base error class.
     Keep it in sync with `docs/change-impact-matrix.md`. -->

Count dependents for a candidate with:

```bash
rg -n '\b<Symbol>\b' server clientApp/src -l | wc -l
```

---

## Workflow

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

### Phase 1: Resolve the target to file paths

**Step 1a — Understand Anything graph:**

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

**Step 1b — Reverse-dependency scan (which files are most depended upon):**

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

If multiple candidates match, ask the user to pick one before proceeding.

---

### Phase 2: Direct dependencies — what this file imports (outbound)

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

---

### Phase 3: Direct dependents — what imports this file (inbound)

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

Complement with a grep scan for imports the index does not capture:

```bash
rg --type ts "from ['\"].*<filename-without-ext>['\"]" packages/ -l
```

---

### Phase 4: Transitive depth — how deep does the chain go

BFS outward (what this file transitively depends on) up to depth 4:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

---

### Phase 5: Hub module detection

Check whether known hub modules appear anywhere in the transitive chain (both inbound and outbound):

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

Flag any node with **≥ 5 dependents** as a hub module. Call out explicitly any hub module recorded in `docs/change-impact-matrix.md`:

| Symbol | Threshold | Action if in chain |
|--------|----------|--------------------|
| `t()` translation fn | 150e | FE-only change is safe; changing `t()` itself is full-FE migration |
| `Ticket` aggregate | 82e | Domain interface change requires coordinated use-case + repo + test update |
| `IClock` port | 81e | Any signature change needs update across all domain/app classes that inject it |
| `Workflow` aggregate | 70e | Ripples into routing, master-data, ticketing — coordinate across contexts |
| `NotFoundError` | 55e | Base error; changing it requires search across all bounded contexts |

---

### Phase 6: Circular dependency detection

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

Also run a grep-based circular check for the file's own module path appearing in its transitive imports:

```bash
# Find the file's own module identifier and check if anything it imports also imports it back
rg --type ts "from ['\"].*<filename-without-ext>['\"]" packages/ -l | head -20
```

---

### Phase 7: Risk level assessment

Compute final risk level from what was found in Phases 2–6:

| Signal | Risk bump |
|--------|-----------|
| Inbound dependents > 10 | +HIGH |
| Inbound dependents > 30 | +CRITICAL |
| Hub module in outbound chain | +HIGH |
| Target *is* a hub module (≥ 5 dependents) | +CRITICAL |
| Circular dependency detected | +HIGH |
| File is in `shared-contracts` layer (Mongoose schema) | +HIGH — all 5 contract artifacts move together |
| File is a port interface (`application/ports/`) | +HIGH — all adapter impls must update |
| File is a domain entity / aggregate method | +MEDIUM — all use cases that call it are affected |
| No test coverage for inbound dependents | +HIGH per uncovered file |
| Transitive depth > 3 | +MEDIUM |

Final levels: **LOW** (< 5 direct dependents, no hub modules, no circular deps) · **MEDIUM** · **HIGH** · **CRITICAL** (is a hub module or > 30 dependents)

---

## Output Format

```markdown
## Dependency Check: <target file or symbol>

**Layer:** <layerId>
**Summary:** <node summary from graph>
**Total edges:** <N> (direct outbound: X, direct inbound: Y)
**Risk level:** CRITICAL / HIGH / MEDIUM / LOW

---

### Imports (outbound — what this file depends on)
| File | Layer | Edges | Role |
|------|-------|-------|------|
| `<path>` | `<layer>` | N | <one-line role> |

### Dependents (inbound — what imports this file)
| File | Layer | Edges | Role |
|------|-------|-------|------|
| `<path>` | `<layer>` | N | <one-line role> |

### Transitive depth
| Depth | Node count | Sample nodes |
|-------|-----------|-------------|
| 1 (direct) | N | `<a>`, `<b>`, `<c>` |
| 2 | N | `<a>`, `<b>` |
| 3 | N | `<a>` |
| Total | N | (unique transitive dependencies) |

### Hub modules in chain
| Node | Edges | Direction | Risk |
|------|-------|-----------|------|
| `Ticket` | 82 | outbound depth 2 | Aggregate interface change ripples to all use cases |
| `t()` | 150 | inbound depth 1 | FE translation — safe unless t() signature changes |

*(None — chain does not pass through any high-centrality nodes.)*

### Circular dependencies
- ✅ None detected.
- ❌ `<path-A>` → `<path-B>` → `<path-C>` → `<path-A>` — **must resolve before refactor**

### Risk flags
- ❌ CRITICAL: target has N dependents — change affects N files
- ❌ HIGH: hub module `<X>` in outbound chain — changes propagate through it
- ❌ HIGH: circular dependency detected — refactor requires breaking the cycle first
- ⚠️ HIGH: file is a shared Mongoose schema — all 5 contract artifacts must move together (ADR-016)
- ⚠️ HIGH: file is a port interface — all adapter implementations must be updated
- ⚠️ MEDIUM: transitive depth is N — changes may have non-obvious downstream effects
- ⚠️ MEDIUM: N inbound dependents have no test coverage — changes are unguarded

### Recommended actions before changing
1. <action — e.g., "run /impact-check for the N direct dependents before touching this file">
2. <action — e.g., "break circular dep between A and B by extracting the shared type to shared-types">
3. <action — e.g., "if changing the Mongoose schema, update MSW handler, mock factory, OpenAPI registry, and FE api-slice in the same PR per ADR-016">
4. <action — e.g., "write tests for the N uncovered dependents before refactoring">
```

---

## Quality Gates

- ✅ Discovery ladder worked before reading any source file — indexes for ownership, targeted rg for dependents
- ✅ All edge directions reported — outbound (imports) AND inbound (dependents)
- ✅ Transitive depth computed, not just direct edges
- ✅ Every hub module (≥ 5 dependents) in the reachable chain called out by name with its dependent count
- ✅ Circular dependencies checked — reported as ✅ none or ❌ with full cycle path
- ✅ Risk level derived from the signals table — not estimated

## Never

- Edit any file — read-only analysis only
- Report risk as LOW when a hub module is in the chain — the hub module's blast radius is part of the risk
- Skip the grep scan — indexes rarely capture dynamic imports or barrel re-exports
- Omit transitive depth — direct-only analysis misses the real risk of deeply-nested dependencies
- Conflate inbound and outbound directions — "what this imports" and "what imports this" are distinct risk vectors
