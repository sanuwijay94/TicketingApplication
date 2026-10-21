---
allowed-tools: Bash(node:*), Bash(git:*), Bash(gh:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Bash(npm:*), Read, Glob, Grep, Write, Agent
description: Generate a complete structured bug report — root cause, affected files with line numbers, reproduction steps, S1–S4 severity, hotfix/scheduled lane, and recommended fix approach. Read-only. Feeds /bug (GitHub issue) and /fix (implementation).
argument-hint: '[symptom description | #issue-number | "FE/BE/domain" hint]'
---

**Complete bug documentation from any symptom.** Given a symptom, error, or GitHub issue number, locates the root cause, maps every affected file and line, writes reproduction steps, classifies severity (S1–S4), determines the fix lane, and produces a self-contained Bug Report document. Read-only — no source files are changed.

Use this when you need full technical documentation before acting — for triaging, handing off to another developer, writing a post-mortem, or feeding a structured input into `/fix` and `/bug`.

**Division of labour across the three bug skills:**

| Skill | What it does | Writes code? | Writes GitHub issue? |
|-------|-------------|-------------|---------------------|
| `/trace-bug` | Localize root cause only → Root Cause Report for `/fix` | ❌ Never | ❌ Never |
| `/bug-report` | Full documentation — root cause + reproduction + severity + lane + affected files + fix approach | ❌ Never | ❌ Never |
| `/bug` | File and triage GitHub issue — labels, milestone, lane routing | ❌ Never | ✅ Yes |

Use `/trace-bug` when you need a fast, focused root cause for an immediate `/fix`. Use `/bug-report` when you need complete documentation — for handoff, post-mortem, planning, or before filing with `/bug`. Use `/bug` to create the GitHub issue once the report is ready.

---

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Layer/domain maps: !`ls .claude/planning/architecture/layer-map.md .claude/planning/architecture/domain-model.md .claude/planning/architecture/component-map.md 2>/dev/null | tr '\n' ' '`

## The bug

$ARGUMENTS

**If the argument is a GitHub issue number (`#142` or `142`)** — load it as the Phase 0 capture:
```bash
gh issue view <#> --json number,title,body,labels,milestone
```
Read the symptom / repro / found-in version from the body. Note the `sev:*` and `lane:*` labels — they inform but do not replace Phase 4 severity classification (the report may upgrade or downgrade based on what the graph reveals). Carry `#<#>` through to the Bug Report.

If it is **not** triaged (no `sev:*` label), note this in the report and run Phase 4 classification from scratch.

If empty and no issue number, ask for: symptom (what breaks), where observed (screen / endpoint / user action), expected vs actual, and any error message or stack trace.

## Why this skill exists

`/trace-bug` produces a targeted root cause for `/fix` — it stops at "what broke and where." `/bug-report` goes further: it maps every affected file, writes reproduction steps a QA engineer or new developer can follow, classifies severity against the `SDLC.md` S1–S4 scale, determines the fix lane, and produces a document that stands alone — without reading the code. The graphs make this possible without serial source-reading: pre-computed summaries, edge relationships, and community clustering answer "what else is affected" in a single script rather than hours of manual tracing.

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
Extract `### Symptom`, `### Steps to reproduce`, `### Expected`, `### Actual`, and `### Evidence` from the body. Note any missing sections — they become gaps in the reproduction steps.

---

## Phase 1: Graph-first localization

**Always work the discovery ladder before opening any source file.** The indexes answer "what is the suspect code and what touches it" faster than cold-reading, and "what else is affected" without grep.

### Step 1a — Index search (feature index, glossary, architecture docs)

Search nodes by symptom keywords:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

For each hit, follow inbound edges to find callers and expand the affected-file map:

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

Enumerate the suspect file.s siblings — same module, same pattern — these are the candidate sibling files for the affected-file map and class-bug scope.

### Step 1c — Recent-change trace

Many bugs are regressions. Check before tracing deeper:

```bash
# Files changed in the last 10 commits in the suspect area
git log --oneline -20 -- 'packages/<area>/**'

# Blame the suspect file/line if known
git log --oneline -10 -- '<suspect-file>'

# Diff last 3 commits on suspect file
git diff HEAD~3..HEAD -- '<suspect-file>'
```

If a specific commit introduced the symptom, the diff is the root cause. Skip to Phase 3 confirming.

### Step 1d — Symptom-string and capability grep

Search exact error text, field names, routes, event names, or labels from the symptom:

```bash
rg -n '<exact-error-string-or-field-name>' packages/ --type ts | head -30
```

For a **class / capability bug** (same affordance broken in multiple places):

```bash
# Map every site before localizing any one
rg -l '<capability-keyword>' clientApp/src/features/ | sort
rg -l '<capability-keyword>' server/src/ | sort
```

A capability bug is almost always a **class bug**. A single confirmed root cause is not "done" — enumerate all sites now and carry them through to the Affected Files table in the report.

---

## Phase 2: Layer-chain trace

For the candidate node(s) from Phase 1, walk the Clean Architecture layers to locate the exact defect site and every file it implicates.

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
1. Read the relevant section (constructor, suspect method, validation call) — minimum span, not the whole file
2. Note: what it does, what it delegates, what invariant it enforces or fails to enforce
3. Ask: is this where the wrong value originates? Is this where the missing check should be?
4. Record the `file:line` for the Affected Files table — include both the defect site and every propagation site

**Decide:** if reading yields a **clear, specific** `file:line` root cause → go to Phase 4 confirming. If it yields only plausible-but-unconfirmed guesses after **two attempts** → escalate to Phase 3.

---

## Phase 3: Escalate to observation (when reading is inconclusive)

**Rule: do not theorize past two failed read-based hypotheses.** Stop reading and make the running program show the truth.

### Rung 2 — Instrument and observe

1. Identify the suspect `file:line` from Phase 2
2. Ask the developer to add structured logger calls (`this.logger.debug(...)` — never `console.log`) at the suspect boundary — log actual values, types, and JSON-stringified forms so case, whitespace, and type are visible
3. Run the failing scenario:
   - `npm dev:up` + `npm dev:api` + `npm dev:ui`; tail logs with `npm dev:logs`
   - Or run the single suspect test: `npm test -- --testPathPattern=<file>`
4. Read the captured values. The bug is usually obvious the instant actual values are visible.

### Rung 3 — Query the data source

For "doesn't match / not found" bugs — ask the developer for the raw DB row or API response. Or query locally using creds from `.env`:

> ⚠️ Never echo secrets. Query through the project's documented DB client (see `AGENTS.md` § Development Environment), or a throwaway script using the app's connection string — not by pasting credentials into the shell.

**Cross-boundary representation checklist** (check each for "doesn't match / not found" bugs):

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

## Phase 4: Classify severity and lane

With the root cause confirmed, apply the `SDLC.md` S1–S4 scale to determine severity and fix lane.

### Severity criteria

| Severity | Label | Criteria | Examples |
|----------|-------|----------|---------|
| **S1** | `sev:S1-critical` | System down, data loss, security breach, authentication bypass, all users blocked from core workflow | Login fails for all users; ticket data corrupted; XSS in a public endpoint |
| **S2** | `sev:S2-major` | Core feature broken for most users, no workaround, significant data risk | Stage transitions fail; assignment rule never fires; created tickets disappear |
| **S3** | `sev:S3-minor` | Feature partially broken, workaround exists, subset of users affected | Edit flow missing mentions; date shown without time; empty state shows wrong copy |
| **S4** | `sev:S4-trivial` | Cosmetic, negligible impact, no functional regression | Wrong label colour; typo in a non-critical message; alignment off by 4px |

**Classify by the worst realistic impact, not the most optimistic.** A bug that *could* cause data loss is S1 even if it has not yet.

### Lane routing

| Severity | Lane | Release target |
|----------|------|----------------|
| S1-critical | `lane:hotfix` | Immediate `v0.x.1` patch — do not wait for next phase |
| S2-major | `lane:hotfix` | Batched `v0.x.1` patch |
| S3-minor | `lane:scheduled` | Next phase `v0.x.0` |
| S4-trivial | `lane:scheduled` | Next phase `v0.x.0` (backlog) |

**Escalation rule:** if the class-bug scope table (Phase 1d / Phase 2) reveals the defect is broader than initially reported, re-evaluate severity upward. A cosmetic bug that turns out to be a missing state in every flow may graduate from S4 to S3.

**CHECKPOINT** — confirm root cause and severity classification with the developer before producing the report.

---

## Output: Bug Report

Produce this report as the final output. It is a self-contained documentation artifact — readable without source access. It can be pasted into a GitHub issue via `/bug`, passed to a developer for `/fix`, or archived for a post-mortem.

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

---

## SDLC Phase 6 (Maintain) integration

This skill sits in the **intake → document** segment of Phase 6. The three intake paths from `SDLC.md`:

| Path | Source | Workflow |
|------|--------|---------|
| **A** — found during developer testing | Current branch, pre-release | `/bug-report "<symptom>"` → `/fix` |
| **B** — reported externally (QA / PM / support) | GitHub issue, post-release | `/bug-report #N` → `/bug triage #N` (if not triaged) → `/fix #N` |
| **C** — found systematically | `/regression` or `/review` findings | confirm → `/bug-report` → `/bug file` → `/fix` |

For pre-release bugs (Path A), `/bug-report` replaces the need to immediately file a GitHub issue — fix inline on the feature branch, then use the report as PR documentation.

---

## Quality Gates

- ✅ Discovery ladder worked (indexes → architecture docs → targeted rg) before any source file opened
- ✅ Root cause is a specific `file:line` with a stated mechanism — not a symptom site, not a theory
- ✅ Root cause confirmed with the developer before the report is produced
- ✅ Reproduction steps written so a QA engineer or new developer can follow them without code access
- ✅ Severity assigned against the S1–S4 criteria table — not guessed; rationale stated
- ✅ Lane determined from severity — no manual override without stated justification
- ✅ Affected Files table covers the defect site, propagation sites, test gaps, and sibling sites
- ✅ Class bug scope enumerated — every sibling site grepped and listed (create / edit / detail / same mechanism at other call sites)
- ✅ Did not escalate to observation until after two failed read-based hypotheses (Rung 2 escalation rule honoured)
- ✅ Bug Report is self-contained — readable without source access; ready for `/bug`, `/fix`, or post-mortem

## Never

- Open a source file before working the discovery ladder
- State a root cause that names only a symptom site (wrong value in UI) when the cause is upstream (wrong value from API)
- Assign severity based on how the bug was reported rather than actual impact — classify by worst realistic consequence
- Produce reproduction steps that require source code access to follow
- List only the reported site in the class bug scope without grep-checking siblings
- Keep theorizing past two failed read-based hypotheses — escalate to Rung 2 (instrument + run + observe)
- Fix a value-mismatch / "doesn't match" bug by reading comparison code alone — actual runtime values must be observed or the real data queried
- Edit any source file — this skill is read-only; hand off to `/fix` for all code changes
