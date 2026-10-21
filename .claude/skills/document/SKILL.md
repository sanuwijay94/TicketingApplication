---
allowed-tools: Bash(node:*), Bash(git:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Read, Glob, Grep, Edit, Write
description: Generate or update documentation for any file, function, module, or domain concept — indexes first, minimum source second
argument-hint: '[file-path | class/function name | domain concept | feature-id | "document X"]'
---

Generates or updates documentation for any target — a file, symbol, domain concept, or feature. Works the discovery ladder first to understand what already exists, reads the minimum source needed to verify accuracy, then writes to the right doc layer. Never rewrites ADRs or PRDs. Never generates inline code comments.

Use this when code has been added or changed and the docs haven't caught up — before `/pr` or after `/implement`.

The distinction from sibling skills:
- `/document` → writes or updates documentation artifacts for a target
- `/explain` → explains a target to you in this conversation (read-only, no files written)
- `/knowledge-update` → syncs all docs that drifted since the last `git diff` (broad sweep)

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Glossary terms: !`grep -c '^\| \*\*' docs/glossary.md 2>/dev/null || echo "glossary missing"`
- Feature index entries: !`grep -c '^\  - id:' docs/feature-index.yaml 2>/dev/null || echo "feature-index missing"`

## Document Target

$ARGUMENTS

If empty, ask what to document.

Accepts any of:
- A file path: `server/src/domain/ticketing/entities/ticket.ts`
- A class or function name: `FlowValidationGate`, `ETag`, `TransitionTicketUseCase`
- A domain concept or aggregate: `AssignmentRule`, `DeadlineClock`, `SavedView`
- A feature ID: `F-P2-06`, `ticket-stage-transition`
- A module group: `infra/messaging`, `features/saved-views`
- A vague description: `"document the outbox pattern"`, `"document how circuit breaker works"`

## Why This Skill Exists

Documentation written from memory drifts. Documentation written by cold-reading source files misses the *why* — the design motivation captured in the architecture docs, ADRs, and layer map, and ADR cross-references. This skill reads the graph first (pre-computed summaries, edge relationships, layer context) and only reads raw source to verify accuracy or fill gaps the graph summary leaves open. The result is documentation grounded in the actual structure of the code, not a description of what someone thought the code did.

---

## Workflow

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

### Phase 1: Locate via the discovery ladder

Search both the node index and the layer map for the target. **Always run this before opening any source file.**

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

If zero hits, broaden with a shorter keyword. If the ladder cannot locate the target, check `docs/glossary.md` and `docs/feature-index.yaml` before falling back to source.

### Phase 2: Check what is already documented

Run all three checks in parallel to avoid duplicating or overwriting existing accurate docs.

**2a — Glossary check** (is it already a domain term?):
```bash
grep -i '<keyword>' docs/glossary.md
```

**2b — Feature index check** (is it already a tracked feature?):
```bash
grep -i '<keyword>' docs/feature-index.yaml
```

**2c — Architecture docs check** (is the mechanism already documented?):
```bash
grep -rl '<keyword>' .claude/planning/architecture/ 2>/dev/null | head -5
```

**2d — ADR check** (is there a binding decision that explains why it exists?):
```bash
grep -rl '<keyword>' .claude/planning/adr/ 2>/dev/null | head -5
```

Use what is found to:
- Avoid re-documenting what is already accurate — update only if the existing entry is stale or missing a field
- Reference the ADR in the generated documentation instead of re-explaining the decision

### Phase 3: Enrich from graph edges and layer context

For the matched node, extract its neighbours and layer assignment to build the "how it connects" and "why it exists" sections without reading raw source:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### Phase 4: Read minimum source (only when graph is insufficient)

The indexes and architecture docs cover ~80% of documentation needs. Read source only when:
- The summary is too brief to write an accurate "what it does" section
- The target has `complexity: complex` and the docs do not capture the key invariants
- You need the exact constructor signature, method names, or field names to write the "Maps to" column in the glossary

Read the **minimum necessary** — one method or constructor block, not the whole file:

```
Read <filePath> offset=<start-line> limit=<span>
```

Never read a file just to confirm what the docs already state.

### Phase 5: Determine the documentation target(s)

Based on the layer, type, and content found in Phases 1–4, identify which documentation artifacts need to be written or updated:

| Layer / Type | Write to |
|---|---|
| Domain entity, aggregate root, value object | `docs/glossary.md` (new term) AND `.claude/planning/architecture/domain-model.md` (if boundary/aggregate changed) |
| Port interface or external integration | `.claude/planning/architecture/layer-map.md` |
| Full feature (controller + use case + domain + infra + UI) | `docs/feature-index.yaml` |
| Mechanism: resilience, messaging, caching, auth | `.claude/planning/architecture/` — new or updated mechanism doc |
| Workflow or convention change | `AGENTS.md` |
| Anything else | `docs/glossary.md` for the concept; architecture docs for the mechanism |

**Never write to:**
- `.claude/planning/adr/` — ADRs are historical records; new decisions get a new ADR
- `.claude/planning/prd/` — PRDs are historical records
- Source code comments — per `documentation.md`, comments are only for non-obvious WHY; this skill does not add inline comments

### Phase 6: Write or update the documentation

#### 6a — New `docs/glossary.md` entry

Append alphabetically. Match the exact existing table format:

```markdown
| **TermName** | Plain-English definition in one sentence. Key invariants or constraints. What it is NOT (if a common confusion exists). | `domain/<context>/entities/<file>.ts`, `<table_name>` table | Distinct from `<similar term>`. <Phase note if deferred>. ADR-NNN if a binding decision governs it. |
```

Rules for glossary entries:
- Lead with what the concept IS, not "it is responsible for"
- The "Maps to" column must include the file path and table name (or port name for interfaces)
- The "Notes" column must call out any commonly confused sibling concept by name
- Sorted alphabetically — insert at the correct position

#### 6b — New or updated `docs/feature-index.yaml` entry

Match the exact existing YAML structure:

```yaml
  - id: <kebab-case-feature-id>
    description: <one sentence — what this feature lets a user do>
    domain_aggregate: <path to aggregate root>
    entry_points:
      controller: <path>    # ControllerClassName
      use_cases:
        - <path>            # UseCaseClassName
      ui_page: <path>
      ui_component: <path>  # ComponentName
    contract: <path to the contract file>
    repository:
      port: <path>
      impl: <path>
    ui_api: <path>
    adr_refs:
      - ADR-NNN
```

Omit fields that do not exist yet. Do not add placeholder paths.

#### 6c — Architecture mechanism doc (`.claude/planning/architecture/`)

For a new mechanism (new integration, new resilience pattern, new messaging topology):

1. Check if an existing file covers the mechanism — update in place if so
2. If new: create `<mechanism-name>.md` following this structure:
   ```markdown
   # <Mechanism Name>

   **Last Updated**: <date>
   **Status**: Active
   **Related ADRs**: ADR-NNN

   ## What it is
   <One paragraph. What problem it solves, what it does, what it is not.>

   ## How it works
   <Numbered steps or flow description. File:line citations where the key logic lives.>

   ## Configuration
   <Env vars, constructor params, or admin settings that control it.>

   ## Failure modes
   <What happens when it fails. How errors surface. Recovery path.>

   ## Key files
   | File | Role |
   |------|------|
   | `<path>` | <one-line role> |
   ```
3. Architecture docs are **living** — update in place when the mechanism changes; do not append history

#### 6d — `AGENTS.md` update

Only when a workflow, dev command, or project convention changed. Update the relevant section in place. Keep it lean — one source of truth per topic; do not duplicate what `CLAUDE.md` already states.

---

## Output Format

After all writes are complete, report:

```markdown
## Document: <target name>

### What was documented
| Artifact | File | Action |
|----------|------|--------|
| Glossary entry | `docs/glossary.md` | Added / Updated |
| Feature index | `docs/feature-index.yaml` | Added / Updated |
| Architecture doc | `.claude/planning/architecture/<file>.md` | Created / Updated section |
| AGENTS.md | `AGENTS.md` | Updated section |

### New glossary entries
- **TermName** — <one-line definition>

### New feature index entries
- `<feature-id>` — <one-line description>

### ADRs referenced (not written)
- ADR-NNN (`<title>`) — governs <what aspect>

### What was skipped and why
- <e.g., "No architecture doc written — mechanism already covered in layer-map.md lines 42–67">
- <e.g., "No AGENTS.md update — no workflow or convention changed">
```

---

## Quality Gates

- ✅ Discovery ladder worked before any source file is opened
- ✅ Existing docs checked before writing — no duplication, no overwrite of accurate content
- ✅ ADRs and PRDs left untouched — historical records are never edited
- ✅ No inline code comments added — per `documentation.md`, comments are only for non-obvious WHY
- ✅ Glossary entries inserted alphabetically and match exact table format of existing rows
- ✅ Feature index entries use real file paths only — no placeholders
- ✅ Architecture docs updated in place — no history appended, no new file created when an existing one covers the mechanism
- ✅ Every factual claim in generated docs is backed by a graph node, ADR, or `file:line` — nothing from memory

## Never

- Edit `.claude/planning/adr/` or `.claude/planning/prd/` — historical records, never rewritten
- Add inline source code comments — this skill documents *about* code, not *in* code
- Generate documentation from memory without reading the docs or source — drift is created, not fixed
- Duplicate content that already exists accurately in another doc — reference it instead
- Write "it is responsible for" — state what the concept IS and what it DOES
- Pad with generic descriptions that would apply to any codebase — every sentence must be specific to TKT
- Create a new architecture doc file when an existing file already covers the mechanism — update in place
