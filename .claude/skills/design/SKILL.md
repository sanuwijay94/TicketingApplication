---
allowed-tools: Skill
description: Full feature workflow — PRD → ADR → implementation (thin chain-runner)
---

Combined PRD → ADR → implementation flow with approval checkpoints.

## Feature

$ARGUMENTS

## Workflow

1. **`/prd $ARGUMENTS`** — PM drafts, Tech Lead challenges. **CHECKPOINT**: user approves PRD.
2. **`/adr {slug}`** (use slug from Phase 1) — Tech Lead drafts, Developer challenges, PM validates. **CHECKPOINT**: user approves ADR.
3. **`/implement {slug}`** — Developer implements, tests, updates docs.
4. Suggest `/simplify` and `/verify`, then `/commit` + `/pr`.

## Rules

- **Checkpoints are mandatory** — user must approve PRD and ADR before proceeding
- **Same slug throughout** — PRD, ADR, and implementation use consistent naming
- **No skipping phases** — order is fixed
