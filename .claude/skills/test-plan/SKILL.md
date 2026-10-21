---
allowed-tools: Task, AskUserQuestion, Read, Write, Edit, Bash(git:*), Bash(ls:*), Bash(gh:*)
description: Create or update a living, per-feature QA Test Plan (acceptance criteria → test cases + traceability) from a PRD and a dependency scan
argument-hint: '[feature-slug | prd-slug | TP-NNN] [--update]'
disable-model-invocation: true
---

Produce or maintain a **living, per-feature Test Plan** (`TP-NNN`) — the QA parallel
to a PRD/RFC. One plan per feature, edited in place, re-run every release (per-release
results go in `docs/qa/reports/`, not the plan). See `QA-PROCESS.md §7/§9` and
`ADR-053` for where this fits.

**Delegate mode**: `qa-agent` designs the test cases and gap analysis — you orchestrate
and write the file. Do not invent coverage the agent didn't derive.

## Current State

- Branch: !`git branch --show-current`
- Existing PRDs: !`ls .claude/planning/prd/*.md 2>/dev/null | grep -v _template | grep -v README || echo "None"`
- Existing Test Plans: !`ls .claude/planning/qa/test-plans/TP-*.md 2>/dev/null || echo "None"`
- Template: `.claude/planning/qa/templates/TEST-PLAN.md.template`

## Arguments

$ARGUMENTS

Accepts a feature slug (`ticket-comments`), a PRD slug/number, or an existing
`TP-NNN`. `--update` edits an existing plan in place (default when a `TP-NNN`
resolves). If empty, list features from `docs/feature-index.yaml` and ask which.

## Workflow

### Phase 0 — Resolve the feature and its acceptance criteria

1. Map the argument to a feature. Cross-reference `docs/feature-index.yaml` for the
   feature's aggregates, entry points, contracts, and ADRs.
2. Locate the **source of acceptance criteria**: the PRD (`.claude/planning/prd/`) and
   any RFC. These are the *input* — QA does not author acceptance criteria, it covers
   them. If no PRD exists, HALT and ask for the acceptance-criteria source.
3. If a `TP-NNN` already exists for this feature → this is an **update**; read it first
   and preserve existing results / run history.

### Phase 1 — Understand the feature via the indexes (no source reading)

Use the navigation skills, not raw source:
- `/explain <feature>` — behaviour in plain English
- `/api-trace` — each endpoint contract → controller → use case → domain → repo
- `/impact-check` — dependents and blast radius (scopes regression)

### Phase 2 — Design test cases (qa-agent)

Invoke `qa-agent` (read-only) to produce:
- **Acceptance criteria → test cases** — every AC maps to ≥1 case (happy path +
  negative + edge/concurrency + **permission-persona** cases per ADR-037/038).
- **Coverage gaps** — scenarios not yet covered and why; name the highest-risk gap.
- **Ownership tag per case (`Mode` column)** — this is binding:
  - **`🔵 dev`** — API / contract / integration / unit / authz-allow-deny cases.
    These are **developer-owned** (`testing.md`, `api-contracts.md`) — QA references the
    dev test for traceability but never authors it. **Every API-level assertion is `🔵 dev`.**
  - **`🤖 qa`** — QA-authored **`test/qa/` browser** specs only: a11y, console-error,
    visual, journey, affordance-visibility. The only input to `/write-qa-cases`.
  - **`✋ manual`** — QA manual / human judgment.
  Respect ADR-053: a journey lives in one suite; don't route API cases into `test/qa/`.
- **Test-data / persona needs** — what must be seeded to run the plan.

### Phase 3 — Write / update the plan

Create `.claude/planning/qa/test-plans/TP-NNN-<slug>.md` from the template (next
sequential `NNN`). Fill every section. For an update: merge new cases, keep prior
`Last result` values and the run-history table, and note what changed.

- Link the AC→case table to real spec ids where automation exists; mark `manual`
  otherwise. This table **is** the traceability record.
- Set `status`: `Draft` (pre-build) → `Ready` (entry criteria met) → `Active`
  (shipped; re-run each release) → `Certified <version>` when the feature meets the
  Definition of Done (`QA-PROCESS.md §5b`: all AC cases ✅, no open S1/S2, automated
  cases green, gaps accepted, verified on the deployed build). Never "done". On
  certification, also add `qa:verified` + a certification comment to the feature issue.

### Phase 4 — Update the traceability index

Add/refresh the plan's row in `docs/qa/traceability.md` (the top-level index that
links every `TP-NNN` and rolls up coverage). Keep it in sync — a plan not in the
index is invisible.

### Phase 5 — Synthesize

```markdown
## Report: Test Plan

**Path**: `.claude/planning/qa/test-plans/TP-NNN-slug.md` — <status>
**Covers**: PRD `NNN-slug` (<n> acceptance criteria → <m> test cases)
**Automation**: <x> automated (test/qa|test/e2e), <y> manual
**Top coverage gap**: <the highest-risk untested scenario>
**Test data needed**: <personas / seed>

### Handoff
- Author automation for: <case ids marked for test/qa or test/e2e>
- Execute during VERIFY; file misses with `/bug`
- Results → `docs/qa/reports/<version>-test-run.md` at release
```

## Important Notes

- **QA covers acceptance criteria; it does not author them.** The PRD/RFC is the
  source of truth for *what* the feature must do (mirrors ADR-016 for contracts).
- **The plan is living** — update in place; never fork per release. Results are the
  release report's job.
- **Traceability is the point** — every AC must reach ≥1 case, every automated case
  must name a real spec id. Flag any AC with no case as a blocking gap.
- **One journey, one suite** (ADR-053) — don't duplicate a `test/e2e/` flow into
  `test/qa/`; layer QA-specific assertions (a11y/console/visual) on top.
