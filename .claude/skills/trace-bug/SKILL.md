---
allowed-tools: Bash(node:*), Bash(git:*), Bash(gh:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Bash(npm:*), Read, Glob, Grep, Agent
description: Trace the root cause of a bug to an exact file, function, and line — indexes first, source files second, observation last. Read-only. Hands off a Root Cause Report to /fix.
argument-hint: '[symptom description | #issue-number | "FE/BE/domain" hint]'
---

**Read-only root-cause identification.** Given a symptom or a GitHub issue number, locate the exact `file:line` and mechanism of the bug before any code is touched. Produces a structured Root Cause Report that feeds directly into `/fix` Phase 2 — skipping Phase 1 entirely.

Use this when you want to understand *where and why* before acting. Then hand the report to `/fix` which writes the failing test and implements the change.

**Division of labour with `/fix`:**

| Skill | Phases | Writes code? |
|-------|--------|-------------|
| `/trace-bug` | Phase 0 capture → Phase 1 localize → Root Cause Report | ❌ Never |
| `/fix` | Phase 2 failing test → Phase 3 fix → Phase 4 regression → Phase 5 close | ✅ Yes |

Use `/fix` alone when you want the full automated lifecycle. Use `/trace-bug` when the root cause is unclear or contested and you need a read-only diagnosis first.

---

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Layer/domain maps: !`ls .claude/planning/architecture/layer-map.md .claude/planning/architecture/domain-model.md .claude/planning/architecture/component-map.md 2>/dev/null | tr '\n' ' '`

## The bug

$ARGUMENTS

**If the argument is a GitHub issue number (`#142` or `142`)** — this is a triaged defect (see `SDLC.md` → MAINTAIN Phase 6). Load it as the Phase 0 capture:
```bash
gh issue view <#> --json number,title,body,labels,milestone
```
Read the symptom / repro / found-in version from the body. Note the `sev:*` and `lane:*` labels — they determine urgency and whether this is a hotfix or scheduled fix. Carry `#<#>` through to the Root Cause Report so `/fix` can close it.

If it is **not** triaged (no `sev:*` label), pause and suggest `/bug triage <#>` first.

If empty and no issue number, ask for: symptom (what's wrong), where it was observed (screen / endpoint / user action), expected vs actual, and any error message or stack trace.

## Why this skill exists

`/fix` already localizes in Phase 1, but it does so as a prelude to writing code — the decision to start changing files is implicit once Phase 1 ends. This skill makes localization a **separate, confirmable checkpoint**: root cause identified and agreed before any implementation begins.

A stack trace, a log line, or a `file:line` from the indexes often makes Phase 1 of `/fix` trivial. Without a systematic discovery pass, `/fix` falls back to scattered grep-based search. `/trace-bug` uses the indexes and a disciplined search order as its primary localization tools — resolving ownership and dependents before opening source collapses a multi-hour manual search to minutes.

The result is a **Root Cause Report** — a structured artifact that answers: what broke, at which exact `file:line`, why, which layer owns the fix, and what the failing test should assert. `/fix` consumes this report directly as its Phase 0 capture, skipping its own Phase 1.

---

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

## Phase 0: Capture the symptom (cheap, do not skip)

Pin down, in one short paragraph:
- **Symptom** — what the user sees / what breaks.
- **Trigger** — exact action, screen, endpoint, or input.
- **Expected vs actual.**
- **Evidence** — stack trace, failing request/response, console/log output, screenshot.

If there is a stack trace pointing at a `file:line`, **skip Phase 1 graph search** and go straight to Phase 2 confirming that frame.

**If loading from a GitHub issue:**
Extract from the issue body the `### Symptom`, `### Steps to reproduce`, `### Expected`, `### Actual`, and `### Evidence` sections. If any are missing, note the gap — a well-reproduced bug localizes faster.

---

## Phase 1: Graph-first localization

**Always work the discovery ladder before opening any source file.** The indexes answer "what is the suspect code and what touches it" faster than cold-reading.

### Step 1a — Index search (feature index, glossary, architecture docs)

Search nodes by symptom keywords:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

For each hit with `complexity: complex` or that is a domain aggregate / use case / controller, follow its inbound edges to find callers:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### Step 1b — Symbol search across the codebase

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

If the suspect area has sibling files in the same module or built on the same pattern, check them too that share the same defect mechanism.

### Step 1c — Recent-change trace

Many bugs are regressions from a recent commit. Check before tracing deeper:

```bash
# Files changed in the last 10 commits touching the suspect area
git log --oneline -20 -- 'packages/<area>/**'

# Blame the suspect file/line if known
git log --oneline -10 -- '<suspect-file>'

# Diff the last 3 commits on the suspect file
git diff HEAD~3..HEAD -- '<suspect-file>'
```

If a specific commit introduced the symptom, the diff is the root cause. Skip to Phase 3 confirming.

### Step 1d — Symptom-string grep

Search the exact error text, field name, route, event name, or label that appears in the symptom:

```bash
rg -n '<exact-error-string-or-field-name>' packages/ --type ts | head -30
```

For a **class / capability bug** (the same affordance broken in multiple places — e.g. "attachment button doesn't work", "mentions don't render", "empty state missing"):

```bash
# Map every site before localizing any one
rg -l '<capability-keyword>' clientApp/src/features/ | sort
rg -l '<capability-keyword>' server/src/ | sort
```

Per `SDLC.md` Phase 6 and `/fix` Phase 1: a capability bug is almost always a **class bug**. A single confirmed root cause is not "done" — enumerate all sites and carry them through to the Root Cause Report.

---

## Phase 2: Layer-chain trace

For the candidate node(s) from Phase 1, walk the Clean Architecture layers to find the exact defect site.

```
[HTTP request / UI action]
      ↓
Presentation  clientApp/src/features/<feature>/        (FE entry)
              server/src/presentation/http/controllers/<feature>.controller.ts
      ↓
Application   server/src/application/<domain>/use-cases/<action>.use-case.ts
      ↓         ← ports at this boundary (application/ports/)
Domain        server/src/domain/<domain>/entities/<aggregate>.ts
              server/src/domain/<domain>/services/<service>.ts
      ↓
Infrastructure server/src/infrastructure/<domain>/<repo>.repository.impl.ts
               server/src/infrastructure/external/<service>/<client>.ts
```

For each layer in the chain:
1. Read the relevant section (constructor, suspect method, validation call)
2. Note: what it does, what it delegates to, what invariant or guard it enforces or *fails to enforce*
3. Ask: is this where the wrong value originates? Is this where the missing check should be?

**Decide:** if reading yields a **clear, specific** `file:line` root cause → go to Phase 4 confirming.
If it yields only plausible-but-unconfirmed guesses after **two attempts** → escalate to Phase 3.

---

## Phase 3: Escalate to observation (when reading is inconclusive)

**Rule: do not theorize past two failed read-based hypotheses.** Stop reading and make the running program show the truth.

### Rung 2 — Instrument and observe

1. Identify the suspect `file:line` from Phase 2
2. Ask the developer to add structured logger calls (`this.logger.debug(...)` — never `console.log`) on both sides of the suspect boundary — log actual values, types, and JSON-stringified forms
3. Run the failing scenario:
   - `npm dev:up` + `npm dev:api` + `npm dev:ui`; tail logs with `npm dev:logs`
   - Or run the single suspect unit/integration test: `npm test -- --testPathPattern=<file>`
4. Read the captured values. The bug is usually obvious the instant actual values are visible.

### Rung 3 — Query the data source

For "doesn't match / not found" bugs — the value is right in code but wrong in the database or external system:

Ask the developer for the raw DB row or API response. Or query locally using creds from `.env` (the DB connection vars):

> ⚠️ Never echo secrets. Query through the project's documented DB client (see `AGENTS.md` § Development Environment), or a throwaway script using the app's connection string — not by pasting credentials into the shell.

**Cross-boundary representation checklist** (for "doesn't match / not found" bugs — check each):

| Dimension | MongoDB / TKT pattern | Common mismatch |
|-----------|---------------------|----------------|
| **Case** | `uniqueidentifier` returns GUIDs **UPPERCASE** | JS/UUID libs, OCM, Keycloak emit lowercase |
| **Whitespace** | `CHAR(n)` columns right-pad with spaces | Trim on read or use `VARCHAR` |
| **Dates** | timezone, offset, ms precision, `Z` vs `+00:00` | Diff both sides side-by-side |
| **Numbers** | `bigint` serialised as string | `parseInt` / `BigInt` mismatch |
| **Null-ish** | `null` vs `""` vs `undefined` vs `"null"` | Mongoose `.nullable()` vs `.optional()` |
| **Type coercion** | numeric id vs string id | `1 === "1"` is `false` |
| **Collation** | case/accent-insensitive DB collation | app compares case-sensitively |

Fix at the **boundary** (e.g. normalise GUID case as it leaves the repository) — not at the symptom site.

---

## Phase 4: Confirm root cause

State the root cause in **one sentence**: `file:line` + mechanism + why it produces the symptom. Examples:
- `ticket.repository.impl.ts:214 — SELECT returns GUID uppercase but comparator is lowercase; match always false`
- `comment-composer.tsx:88 — edit flow omits the mention-dropdown prop that create flow passes; mentions unavailable on edit`
- `transition-ticket.use-case.ts:61 — ETag check uses loose equality; stale-token path never throws 409`

**CHECKPOINT** — confirm the root cause with the developer before producing the final report. State: "Root cause is `<file:line>` — does this match what you observe?" Do not move to the report until confirmed.

---

## Output: Root Cause Report

Produce this report as the final output. It is designed to be **pasted directly into `/fix`** as a pre-filled Phase 0 capture, skipping `/fix`'s own Phase 1 entirely.

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

---

## SDLC Phase 6 (Maintain) integration

This skill sits in the **intake → localize** segment of the Phase 6 fix engine. The three intake paths from `SDLC.md`:

| Path | Source | Workflow |
|------|--------|---------|
| **A** — found during developer testing | Current branch, pre-release | `/trace-bug "<symptom>"` → `/fix` |
| **B** — reported externally (QA / PM / support) | GitHub issue, post-release | `/bug triage #N` → `/trace-bug #N` → `/fix #N` |
| **C** — found systematically | `/regression` or `/code-review` findings | confirm → `/trace-bug` → `/fix` or `/bug file` |

**Severity / lane** (from the triaged issue labels — pass to the Root Cause Report):

| Label | Lane | Release target |
|-------|------|----------------|
| `sev:S1-critical` | `lane:hotfix` | Immediate `v0.x.1` |
| `sev:S2-major` | `lane:hotfix` | Batched `v0.x.1` |
| `sev:S3-minor` | `lane:scheduled` | Next phase `v0.x.0` |
| `sev:S4-trivial` | `lane:scheduled` | Next phase `v0.x.0` |

---

## Quality Gates

- ✅ Discovery ladder worked (indexes → architecture docs → targeted rg) before any source file opened
- ✅ Root cause is a specific `file:line` with a stated mechanism — not a symptom site, not a theory
- ✅ Root cause confirmed with the developer before the report is produced
- ✅ Class bug scope enumerated — every sibling site of the same defect listed (create / edit / detail / same mechanism at other call sites)
- ✅ Failing test section states the layer, location, and exact assertion — not just "write a test"
- ✅ Did not escalate to observation until after two failed read-based hypotheses (Rung 2 escalation rule honoured)
- ✅ Root Cause Report is self-contained — `/fix` can start at Phase 2 using it alone

## Never

- Open a source file before working the discovery ladder
- State a root cause that names only a symptom site (wrong value displayed in UI) when the cause is upstream (wrong value returned by API)
- Produce the report after only one graph hit without cross-checking the layer trace
- Keep theorizing past two failed read-based hypotheses — escalate to Rung 2 (instrument + run + observe)
- Fix a value-mismatch / "doesn't match" bug by reading comparison code alone — actual runtime values must be observed or the real data queried before concluding
- List only the reported site in the class bug scope table without grep-checking siblings — a broken capability almost always exists in create **and** edit
- Edit any source file — this skill is read-only; hand off to `/fix` for all code changes
