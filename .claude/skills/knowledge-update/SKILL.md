---
allowed-tools: Bash(node:*), Bash(npx:*), Bash(git:*), Bash(ls:*), Bash(find:*), Read, Glob, Grep, Write, Edit
description: Sync docs/ knowledge artifacts with the current codebase — glossary, feature-index, change-impact-matrix, ONBOARDING, and the CLAUDE.md dependency graph
argument-hint: '[--all | --glossary | --features | --impact | --onboarding | --graph | --diff-since <sha>]'
---

Regenerate or patch the project's knowledge artifacts after code changes. Reads the codebase and git diff, then writes only the artifacts affected by what changed.

## Current State

- Branch: !`git branch --show-current`
- Last commit: !`git log -1 --format="%h %s (%ar)"`
- Changed files (since last commit): !`git diff HEAD --name-only | head -20`
- Docs freshness:
  - glossary: !`test -f docs/glossary.md && git log -1 --format="%ar" -- docs/glossary.md || echo "MISSING"`
  - feature-index: !`test -f docs/feature-index.yaml && git log -1 --format="%ar" -- docs/feature-index.yaml || echo "MISSING"`
  - change-impact-matrix: !`test -f docs/change-impact-matrix.md && git log -1 --format="%ar" -- docs/change-impact-matrix.md || echo "MISSING"`
  - ONBOARDING: !`test -f docs/ONBOARDING.md && git log -1 --format="%ar" -- docs/ONBOARDING.md || echo "MISSING"`
  - CLAUDE.md graph: !`git log -1 --format="%ar" -- CLAUDE.md`

## Arguments

$ARGUMENTS

| Flag | What it updates |
|------|----------------|
| _(empty)_ | Auto-detect from `git diff` which artifacts need updating |
| `--all` | Force-refresh all artifacts regardless of diff |
| `--glossary` | `docs/glossary.md` only |
| `--features` | `docs/feature-index.yaml` only |
| `--impact` | `docs/change-impact-matrix.md` + CLAUDE.md Mermaid graph |
| `--onboarding` | `docs/ONBOARDING.md` only |
| `--graph` | CLAUDE.md Module Dependency Graph only (runs madge) |
| `--diff-since <sha>` | Use the given SHA as the diff base instead of HEAD |

## Why This Skill Exists

Four docs artifacts exist in `docs/` plus a Mermaid diagram in CLAUDE.md. They are generated from the codebase — not hand-written — so they go stale when code changes. This skill is the single command to bring them back in sync.

**Do not attempt a full-codebase re-scan here** — that is a separate, expensive full-codebase scan. This skill works directly from source files and the madge dependency graph.

---

## Workflow

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

### Phase 0 — Determine scope

If `--all` is given, set all update flags true and skip to Phase 1.

Otherwise compute the diff base:
- `--diff-since <sha>` → use that SHA
- Otherwise → `git merge-base HEAD origin/main` (changed since branch diverged); fall back to `HEAD~1` if the merge-base returns empty

```bash
BASE=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD~1)
CHANGED=$(git diff $BASE --name-only)
echo "$CHANGED"
```

Map changed paths to artifact flags:

| Changed path pattern | Flag set |
|---------------------|---------|
| `server/src/domain/**` | `UPDATE_GLOSSARY`, `UPDATE_FEATURES`, `UPDATE_IMPACT`, `UPDATE_ONBOARDING` |
| `server/src/application/**` | `UPDATE_FEATURES`, `UPDATE_IMPACT` |
| `server/src/infrastructure/**` | `UPDATE_IMPACT`, `UPDATE_GRAPH` |
| `server/src/presentation/**` | `UPDATE_IMPACT`, `UPDATE_GRAPH` |
| `clientApp/src/features/**` | `UPDATE_IMPACT`, `UPDATE_GRAPH` |
| `clientApp/src/**` | `UPDATE_IMPACT`, `UPDATE_GRAPH` |
| `server/models/**` | `UPDATE_GLOSSARY`, `UPDATE_FEATURES`, `UPDATE_IMPACT` |
| `.claude/planning/adr/**` | `UPDATE_GLOSSARY`, `UPDATE_FEATURES`, `UPDATE_ONBOARDING` |
| `docs/glossary.md` missing | `UPDATE_GLOSSARY` |
| `docs/feature-index.yaml` missing | `UPDATE_FEATURES` |
| `docs/change-impact-matrix.md` missing | `UPDATE_IMPACT` |
| `docs/ONBOARDING.md` missing | `UPDATE_ONBOARDING` |

Report to the user which artifacts will be updated and why. Confirm before proceeding if `--all` or if 3 or more artifacts are affected.

---

### Phase 1 — Update `docs/glossary.md` (if `UPDATE_GLOSSARY`)

Glossary covers domain terms. Update when domain entities, value objects, ADRs, or shared-schema types change.

**Step 1a** — Read the existing glossary:
```
Read docs/glossary.md
```

**Step 1b** — Find new or renamed terms by scanning changed domain files:
```bash
git diff $BASE -- 'server/src/domain/**' 'server/models/**' '.claude/planning/adr/**' | head -300
```

**Step 1c** — Read the authoritative domain model:
```
Read .claude/planning/architecture/domain-model.md
```

**Step 1d** — Edit `docs/glossary.md`:
- Add rows for new domain concepts (new entities, value objects, aggregate roots, events in the diff)
- Update "Maps to" column if a class/table was renamed
- Update "Notes" column if an ADR changed semantics (e.g. ADR-026 changed StageType vocabulary; ADR-027 changed AssignmentRule routing)
- Keep alphabetical order
- Do NOT remove rows unless the concept is provably deleted (verify with `Grep` first)

**Step 1e** — Report: list rows added / updated.

---

### Phase 2 — Update `docs/feature-index.yaml` (if `UPDATE_FEATURES`)

Feature index maps features to aggregates, contracts, and ADRs.

**Step 2a** — Read the existing index:
```
Read docs/feature-index.yaml
```

**Step 2b** — Detect new endpoints or use cases since the diff base:
```bash
git diff $BASE --name-only | grep -E 'use-case|controller|api\.ts' | head -30
```

**Step 2c** — For each new use case or controller file found, read it and extract:
- Feature id, description
- Domain aggregate it touches
- Entry points (controller method + UI api-slice)
- Contract (server/models path)
- Repository used
- Supporting ADRs

**Step 2d** — Edit `docs/feature-index.yaml`:
- Add new feature entries following the existing YAML schema (id, description, domain_aggregate, entry_points, contract, repository, ui_api, supporting, adr)
- Update `contract:` or `adr:` fields if a contract PR or new ADR was merged
- Do NOT remove existing entries unless the feature was provably deleted

---

### Phase 3 — Update `docs/change-impact-matrix.md` and CLAUDE.md graph (if `UPDATE_IMPACT` or `UPDATE_GRAPH`)

The impact matrix and the Mermaid diagram both derive from the dependency graph. Regenerate both together.

**Step 3a** — Regenerate madge JSON:
```bash
npx --yes madge --json --extensions ts,tsx server/src > $TEMP/api-graph.json
npx --yes madge --json --extensions ts,tsx clientApp/src  > $TEMP/ui-graph.json
```

**Step 3b** — Collapse to module-group level using the same grouping logic as the original generation:
```bash
node -e "
const api = JSON.parse(require('fs').readFileSync(process.env.TEMP + '/api-graph.json','utf-8'));
const ui  = JSON.parse(require('fs').readFileSync(process.env.TEMP + '/ui-graph.json','utf-8'));

const getApiGroup = f => {
  const p = f.split('/');
  if (p[0]==='domain')         return 'domain/' + (p[1]||'other');
  if (p[0]==='application')    return 'application/' + (p[1]||'core');
  if (p[0]==='infrastructure') return 'infra/' + (p[1]||'other');
  if (p[0]==='presentation')   return 'presentation/http';
  return null;
};
const getUiGroup = f => {
  const p = f.split('/');
  if (p[0]==='features')    return 'ui/features/' + (p[1]||'other');
  if (p[0]==='app')         return 'ui/app';
  if (p[0]==='application') return 'ui/application/auth';
  if (p[0]==='shared')      return 'ui/shared';
  if (p[0]==='router')      return 'ui/router';
  if (p[0]==='config')      return 'ui/config';
  return null;
};

const edges = new Set();
const addEdges = (graph, getGroup) => {
  Object.entries(graph).forEach(([src, deps]) => {
    const sg = getGroup(src);
    deps.forEach(dep => {
      const dg = getGroup(dep);
      if (sg && dg && sg !== dg) edges.add(sg + '|||' + dg);
    });
  });
};
addEdges(api, getApiGroup);
addEdges(ui, getUiGroup);

const bySource = {};
[...edges].forEach(e => {
  const [s, t] = e.split('|||');
  if (!bySource[s]) bySource[s] = [];
  bySource[s].push(t);
});

// Build reverse (impact) map
const reverse = {};
[...edges].forEach(e => {
  const [s, t] = e.split('|||');
  if (!reverse[t]) reverse[t] = new Set();
  reverse[t].add(s);
});

Object.entries(reverse).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([mod, deps]) => {
  console.log(mod + ' | downstream=' + [...deps].sort().join(','));
});
"
```

**Step 3c** — If `UPDATE_GRAPH`: compare new edges against the current Mermaid block in CLAUDE.md. If any edges were added or removed, replace the Mermaid block using Edit. Preserve subgraph structure (PKG, API subgraphs APP_L / DOM_L / INFRA_L, UI subgraphs UIFEAT / UICORE). Add new module nodes; remove nodes that no longer appear as any edge endpoint.

**Step 3d** — If `UPDATE_IMPACT`: recompute the reverse-dependency table for changed modules. Update `docs/change-impact-matrix.md`:
- Update rows where the dependent set or risk level changed
- Add rows for new modules
- Mark removed modules as `(removed — as of <date>)` rather than deleting rows

Refresh test coverage counts from spec file scan:
```bash
find server/src -name "*.spec.ts" | sed 's|.*/api/src/||;s|/[^/]*\.spec\.ts||' | sort | uniq -c
find clientApp/src  -name "*.spec.tsx" -o -name "*.spec.ts" | sed 's|.*/ui/src/||;s|/[^/]*\.spec\.[tj]sx*||' | sort | uniq -c
```

---

### Phase 4 — Update `docs/ONBOARDING.md` (if `UPDATE_ONBOARDING`)

Onboarding guide changes when domain model, architecture layers, or key concepts change.

**Step 4a** — Read the existing guide:
```
Read docs/ONBOARDING.md
```

**Step 4b** — Identify what changed that affects onboarding content:
```bash
git diff $BASE -- 'server/src/domain/**' '.claude/planning/adr/**' '.claude/planning/architecture/**' | head -400
```

**Step 4c** — Update only the affected sections with surgical edits:
- **Section 3 (Architecture Layers)** — if new bounded contexts, new aggregate roots, or new infra adapters were added; update the file tables
- **Section 4 (Key Concepts)** — if an ADR changed a binding decision (new constraint, renamed term, changed invariant); update or add the relevant bullet
- **Section 8 (Complexity Hotspots)** — if a file grew complex, add it; do not remove entries unless the file was deleted
- **Section 9 (Where to Find Things)** — if a new rule file, ADR, or docs artifact was added; add a row

Do NOT rewrite narrative paragraphs unless content is factually wrong. Prefer surgical edits over rewrites.

---

### Phase 5 — Report

After all updates, print a summary:

```
## Knowledge update complete

| Artifact | Status | Changes |
|----------|--------|---------|
| docs/glossary.md        | ✅ updated | +N rows, ~M edits |
| docs/feature-index.yaml | ✅ updated | +N features |
| docs/change-impact-matrix.md | ✅ updated | N modules changed |
| CLAUDE.md (graph)       | ✅ updated | +N edges, -M edges |
| docs/ONBOARDING.md      | ✅ updated | sections: 3, 4 |
```

Skipped artifacts: `— skipped (no relevant changes detected)`.

Suggest committing the updated docs as a single `docs: sync knowledge artifacts` commit via `/commit`.
