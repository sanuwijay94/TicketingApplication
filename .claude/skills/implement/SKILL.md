---
allowed-tools: Task, Skill, Bash(node:*), Bash(git:*), Bash(npm:*), Bash(npm:*), Bash(ls:*), Bash(grep:*), Bash(rg:*), Read, Glob, Grep
description: Implement a new feature from an ADR, or update existing code — lightweight, risk-gated. Ceremony scales with the change.
argument-hint: '[adr-slug | F-P1-08 | --update "target or description"]'
---

# /implement

Build a feature or change existing code. **Ceremony scales with the change** — do the minimum the lane requires, escalate only when the change genuinely needs it.

### Current state
- Branch: !`git branch --show-current`
- Status: !`git status --short`

### Target
$ARGUMENTS  (strip a leading `--update`)

If empty: for a feature, list ADRs (`ls .claude/planning/adr/*.md`) and ask which; for an update, ask what changes and how it should behave.

---

## Step 1 — Pick a lane

| Lane | When | Pre-flight | How to build | Validate |
|------|------|-----------|--------------|----------|
| **Quick** | one file, obvious edit, bug-adjacent — you already know the file | none | inline | `/test` on the touched package |
| **Standard** | change to an existing feature, a handful of files | `/impact-check <target>` **once** | inline | `/test` |
| **Feature** | new feature from an ADR, or a multi-layer change | read the ADR + `/impact-check <target>` once | `developer-agent` | `/test` (+ browser-verify for UI) |

Default to the **lowest** lane that fits. Escalate a lane only if the impact-check surfaces a **hub module** (≥50 edges) or a shared abstraction (Mongoose schema, port interface, aggregate root) in the blast radius.

One discovery pass, max. `/impact-check` already returns callers, dependent tests, and contract artifacts — **do not** also run `/dependency-check`. Reach for `/dependency-check` only when impact-check flags a CRITICAL target and you need the transitive chain.

---

## Step 2 — Contract gate (only if touching an HTTP endpoint)

If the change adds or edits a controller or an FE `*-api.ts` slice, the Mongoose contract in `../models/` must already exist (ADR-016).

- Missing contract → **HALT**: "This endpoint has no merged contract. Run `/contract <domain> <feature>` first." FE then builds against the MSW handler; BE against the schema.
- This is also enforced on write by `.claude/hooks/contract-first-gate.sh`, so this check is a courtesy, not the only guard.

Skip this step entirely for domain-only or non-endpoint changes.

---

## Step 3 — Plan, then commit it as `PLAN-NNN`

- **Quick lane:** no written plan — just make the change. The commit is the plan.
- **Standard / Feature:** state in a few lines the files you'll change, the order, and what you're **not** changing (scope boundary). One **CHECKPOINT** — wait for approval — but only for the **Feature** lane or a **CRITICAL/hub-module** target. A routine Standard change proceeds without a checkpoint.
- **Interrogate the plan before asking for approval** (binding for Feature and CRITICAL targets; do it silently for Standard). Answer three questions in the plan itself, not in chat:
  1. **What could this change break?** — the callers, tests and contracts from `/impact-check`, and what a user would notice.
  2. **Which step is the most risky, and why?** — name one step from *Order of work*.
  3. **What options did you choose not to do?** — the alternatives weighed, one line each with the reason.
  Then iterate until **an engineer who has never seen this conversation could implement the change from the plan alone**. If the plan needs the chat to make sense, it is not finished.
- **Then, before the first code edit**, write the approved plan to `.claude/planning/plan/PLAN-NNN-<slug>.md` from `docs/templates/plan.md.template` (next sequential number; `source` = the ADR / issue / intent; `status: living`). Fill *Files that change* exhaustively — `/review` diffs the PR against that table and `plan-sync.sh` warns on every edit outside it. Set `branch:` to the exact git branch. Fill *What could break*, *Risks* (naming the riskiest step) and *Alternatives not chosen* from the interrogation above. Commit it on its own (`docs(plan): PLAN-NNN <title>`) so the plan predates the code in history.
- **Keep it in sync.** If implementation departs from the plan — a file not listed, a step reordered, scope moved — update the plan **in the same commit** as the departure and add one line under *Departures from plan*. A diff touching unlisted files is a review finding; the fix is amending the plan with a reason, or reverting the drift.

---

## Step 4 — Implement

Follow existing patterns (`.claude/rules/typescript.md`): strict TS, the project base error class, structured logger, `z.infer` for API shapes (never a hand-written interface).

Order by change type:
- **Domain:** aggregate/VO (invariants live here) → repo interface → migration (`/scaffold --migrate`) → repo impl → use case → controller.
- **API:** Mongoose schema → `openapi:emit` → mock + MSW handler → controller (`ZodValidationPipe` + `ResponseSchema.parse`) → use case → FE slice.
- **UI:** MSW handler → Angular HttpClient services slice (`providesTags`/`invalidatesTags`) → component (Bootstrap 4 only; all states: loading, empty, error, success toast).

Standard/Quick lanes implement inline. Only the **Feature** lane hands off to `developer-agent` (and only then to avoid loading a large ADR + many files into the main thread).

---

## Step 5 — Validate

- **`/test`** — the single gate. It runs lint + typecheck + tests; don't also run `tsc` by hand.
- **UI changes:** browser-verify per `ui-quality.md` — start `npm dev:ui`, walk the flow, force loading/empty/error/success, screenshot. If you can't run the app, **say so** — don't claim it works.
- Tests must exist for changed code; suite must pass with the test count ≥ where it started.

---

## Step 6 — Done

Report: files changed, test result, and (UI) the screenshots. Then:
- Suggest `/commit` (→ `/pr`).
- Suggest `/knowledge-update` **only** if new files were added/renamed.
- `/simplify`, `/verify`, `/review` — on request only, not by default.

The plan flips to `status: merged` when the PR merges, not here — leave `PLAN-NNN` `living` and make sure its *Files that change* table matches the final diff.

Update docs **only where content changed**: ADR/PRD `status: Implemented`; a mechanism doc in `.claude/planning/architecture/` if a mechanism actually changed; a new ADR (ask first) if this reverses a prior decision. Never rewrite ADRs/PRDs — they're historical records.

---

## Non-negotiables (kept, but cheap)
- Contract-first for endpoints (Step 2)
- `PLAN-NNN` committed before the first code edit on Standard/Feature lanes, and kept in sync (Step 3)
- Domain invariants inside the aggregate — never in use cases, controllers, or infra
- `z.infer` for every API request/response shape
- Tests exist for changed code; `/test` green before commit
- No ORM/HTTP/framework types inside `domain/`

## Deliberately dropped (the old overhead)
- The 4x repeated resolution (`impact-check` + `dependency-check` run over and over) → **one** `/impact-check`
- Separate `tsc --noEmit` runs after `/test` → `/test` already typechecks
- Mandatory `developer-agent` handoff on small changes → inline
- The post-step cascade (`/knowledge-update` + `/simplify` + `/verify` every time) → suggest only when relevant
- Repeating the dependency scan per file -> one `/impact-check` covers the change set
