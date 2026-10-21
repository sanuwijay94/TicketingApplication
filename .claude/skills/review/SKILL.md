---
allowed-tools: Task, TaskCreate, TaskUpdate, TaskList, TaskGet, TeamCreate, SendMessage, Skill, Bash(gh:*), Bash(git:*), Bash(node:*), Bash(rg:*)
description: Multi-perspective code review with selective agent profiles using Agent Teams — includes performance analysis (N+1, Redis, loops, pagination, indexes)
argument-hint: '[target] [--profile=trivial|small|medium|full]'
---

> **Runtime prerequisite**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (set in `.claude/settings.json`). If the harness does not expose `TeamCreate` / `SendMessage` (check with `ToolSearch`), fall back to **serial single-phase analysis** — invoke each teammate with `Task` one at a time, skip Phase 2 peer debate, and note the downgrade in the synthesis.

Two-phase code review using Agent Teams. Phase 1: independent analysis. Phase 2: peer-to-peer debate. Lead coordinates and synthesizes.

**Policy source: `REVIEW.md` at the repo root.** It defines the three passes (Bugs / Security / Compliance), what *Important* vs *Nit* means, the five-nit cap, and what not to report. Read it first; pass its path to every teammate; apply it in synthesis. The CI-side review uses the same file, so a finding means the same thing locally and in the PR.

**Delegate mode**: You must NOT perform review analysis. Create team, manage tasks, synthesize report.

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Recent changes: !`git diff --stat HEAD~1 2>/dev/null || echo "No previous commit to compare"`

## Review Target

$ARGUMENTS

If no arguments, review uncommitted changes or most recent commit.

## Profiles

| Profile | Teammates | Use Case |
|---------|-----------|----------|
| `trivial` | developer | Quick validation |
| `small` | developer, security, code-simplifier, docs | Lightweight, no architecture |
| `medium` | developer, tech-lead, qa, security, code-simplifier, docs, perf | Standard with architecture + QA + performance |
| `full` | developer, tech-lead, qa, security, code-simplifier, docs, perf, verify-app, pm | Comprehensive |

## Teammate Table

| Name | Agent Type | Model | Profiles |
|------|-----------|-------|----------|
| `reviewer-dev` | `developer-agent` | default | All |
| `reviewer-tech` | `tech-lead-agent` | `opus` | Medium, Full |
| `reviewer-qa` | `qa-agent` | default | Medium, Full |
| `reviewer-security` | `security-reviewer` | default | Small, Medium, Full |
| `reviewer-simplifier` | `code-simplifier` | default | Small, Medium, Full |
| `reviewer-docs` | `docs-reviewer` | default | Small, Medium, Full |
| `reviewer-perf` | `developer-agent` | default | Medium, Full |
| `reviewer-verify` | `verify-app` | default | Full |
| `reviewer-pm` | `pm-agent` | `opus` | Full |

## Workflow

### Step 1: Parse Arguments and Determine Profile

Extract review target (PR #, branch, or current changes) and profile:

- **Explicit `--profile=X`**: Use the given profile. Skip confirmation.
- **No profile specified**: Assess the changes using the sizing table in `.claude/patterns/change-sizing.md`, then ask the user to confirm: "Assessed profile: **[level]** — proceed or override?" Only continue after confirmation.

### Step 2: Capture Diff

Save diff to a file **inside the project** (`tmp/` is gitignored) to avoid `/tmp` permission issues with agents:

```bash
mkdir -p tmp
# Choose based on target:
# PR number: gh pr diff $NUMBER > tmp/review-diff.patch
# Branch: git diff main...$TARGET > tmp/review-diff.patch
# No args: git diff > tmp/review-diff.patch (or git diff HEAD~1)
```

**IMPORTANT**: Always write the diff to `tmp/review-diff.patch`, never to `/tmp`. Reference this file path in each task description so agents can read it directly.

### Step 3: Impact Pre-flight (MANDATORY — runs before team is created)

For each changed source file, get its blast radius (dependents, layer, contract artifacts) so teammates understand impact and caching context. Use the dedicated navigation skills — do not inline the search here.

```bash
# Identify changed source files from the diff
git diff --name-only HEAD~1 2>/dev/null | grep -E '\.(js|ts)$' | grep -vE '(spec|test)\.'
```

For each changed file, invoke **`/impact-check <file>`** — it returns dependents (with layers), test coverage gaps, and contract artifacts. The dependent list is what the performance teammate needs to see whether a caching layer already sits in front of the file. Add **`/dependency-check <file>`** for any file you suspect is high-centrality (deep chains, circular deps).

**Load the implementation plan.** Find the `PLAN-NNN` for this change — `rg -l "branch: <current branch>" .claude/planning/plan/` or the plan the PR body links. Copy its *Files that change* table and *Proof* section into `tmp/review-impact-context.txt` under a `## Plan` heading. If no plan exists for a Standard/Feature-sized change, record `PLAN: none` — the compliance pass reports that as a finding (Quick-lane changes are exempt).

Also record which **layers** the diff touches (`.claude/planning/architecture/layer-map.md`) and which **features** it belongs to (`docs/feature-index.yaml`) — that is the signal the tech-lead and QA reviewers need for architecture alignment and regression scope.

Save the combined output from `/impact-check` and `/dependency-check`, plus the layer/feature notes, to `tmp/review-impact-context.txt` and pass that path to every teammate alongside the diff.

### Step 4: Create Review Team

Follow spawn-before-delegate (`.claude/rules/agent-teams.md`): spawn idle, wait, then send assignments. All teammates get: diff path (`tmp/review-diff.patch`), impact context path (`tmp/review-impact-context.txt`), "ANALYSIS ONLY -- do not edit or write any files", phase instructions.

#### Phase 1 Tasks (Independent Analysis)

One task per teammate with role-specific focus:

Every teammate reads `REVIEW.md` before analysing and tags each finding `**Important**` or `**Nit**` plus its pass (`Bugs` / `Security` / `Compliance`) in the format `REVIEW.md` § *Finding format* specifies. Skip anything under § *Do not report*.

| Role | Focus | Report Format |
|------|-------|---------------|
| Developer | code quality, test coverage, conventions (`.claude/rules/testing.md`, `.claude/rules/typescript.md`) | issues with file:line refs, severity, and short explanation of why each matters |
| Developer (compliance pass) | diff vs. `PLAN-NNN` from the impact context: files changed but not listed in *Files that change*; listed files not changed; *Proof* not delivered; *Departures from plan* missing for any drift. Then diff vs. `SPEC-NNN` / PRD acceptance criteria / ADR | drift table (file → listed? → departure recorded?) with one finding per unexplained row, tagged **Compliance** |
| Tech Lead | architecture, patterns, risks (see `.claude/planning/architecture/`) | architecture alignment, risks with severity and rationale |
| QA | test plan completeness — are all acceptance criteria covered? missing scenarios, boundary cases, negative paths, E2E journey gaps | gap table with scenario, risk level, and recommended test type |
| Security | security vulnerabilities | severity-classified findings with concrete risk explanation |
| Simplifier | simplification opportunities | impact/effort sorted report with why each simplification matters |
| Docs | documentation drift, gaps in AGENTS.md / architecture / rules | drift table, suggested new docs, confirmed-accurate list |
| Performance | read the impact context first — then check all five patterns below | severity-classified findings (CRITICAL/HIGH/MEDIUM/LOW) with file:line, pattern type, concrete fix |
| Verify | test suite + quality gates | pass/fail, coverage metrics |
| PM | user impact, business value, documentation | impact, scope, concerns with user-facing rationale |

**Performance teammate task prompt** (send verbatim to `reviewer-perf`):

> Performance analysis. READ-ONLY — do not edit files.
> Target: `tmp/review-diff.patch`. Impact context: `tmp/review-impact-context.txt`.
>
> Read the impact context first — it shows inbound callers and whether a caching layer already exists before the changed file. Use this to avoid false positives on cache gaps.
>
> Check for all five patterns, reporting by severity (CRITICAL / HIGH / MEDIUM / LOW):
>
> 1. **N+1 query patterns** — repository implementations that call a DB query inside a loop (e.g., `findById` inside `for...of`). Look for `await` inside loops over collections, or multiple sequential queries that could be a single JOIN or `findByIds`.
>
> 2. **Missing cache opportunities** — hot-path reads (reference data, aggregate state, user/team lookups) that hit the datastore with no cache lookup first. Check the project's caching ADR in `.claude/planning/adr/` for the agreed key scheme and TTLs, and flag any repository `find*` on a cacheable table that skips the cache-first pattern. Only flag if the impact context shows no caching layer already sits between callers and this file. <!-- Replace with your project's cache ADR reference and key scheme. -->
>
> 3. **Unnecessary loops in domain logic** — O(n²) or worse patterns: nested loops over the same collection, repeated `.find()` / `.filter()` calls inside a loop that could be a Map lookup, full collection scans that could be indexed.
>
> 4. **Missing pagination in list endpoints** — controllers or use cases that return unbounded collections (no `limit`/`offset` or cursor parameter). Flag any `findAll()` / `findMany()` call with no page size cap on collections that can grow without bound.
>
> 5. **Missing indexes in DB migrations** — `scripts/db/migrations/*.sql` files that create tables with foreign key columns or frequently-queried filter columns (`organization_id`, `status`, `workflow_id`, `assigned_to`, `created_at`) but no corresponding `CREATE INDEX` statement.
>
> For each finding report: file:line, pattern type, why it is a problem, concrete fix. Sort CRITICAL first.

#### Phase 2 Tasks (Peer Discussion)

For all profiles except trivial: one discussion task per teammate, blocked by all Phase 1 tasks, **no owner at creation time**. The orchestrator assigns owners explicitly via `TaskUpdate` + `SendMessage` after Phase 1 completes and findings are broadcast. Each teammate reviews all Phase 1 findings, challenges disagreements via direct SendMessage to other teammates, and reports final position to lead.

#### Task List by Profile

**Trivial**: Task 1 only (reviewer-dev), no debate.

**Small**: Tasks 1-4 (Phase 1: dev, security, simplifier, docs), Tasks 5-8 (Phase 2, blockedBy: 1,2,3,4).

**Medium**: Tasks 1-6 (Phase 1: dev, tech, qa, security, simplifier, docs, perf), Tasks 7-13 (Phase 2, blockedBy: 1,2,3,4,5,6,7).

**Full**: Tasks 1-9 (Phase 1: dev, tech, qa, security, simplifier, docs, perf, verify, pm), Tasks 10-18 (Phase 2, blockedBy: 1–9).

### Step 5: Monitor

1. Wait for Phase 1 completion
2. Collect all Phase 1 reports
3. Broadcast Phase 1 findings to all teammates
4. **Explicitly assign Phase 2 tasks**: for each teammate, call `TaskUpdate` (set `owner`) then `SendMessage` with all Phase 1 findings and Phase 2 instructions — this is the gate that starts Phase 2
5. Wait for all final positions
6. Trivial: skip Phase 2, proceed to synthesis

### Step 6: Synthesize

Apply `REVIEW.md` while merging: drop findings in *Do not report*; keep every **Important**; keep at most **five Nits** (highest value first) and summarize the rest as a count; a finding without a `file:line` and a *why* goes back to its author or is dropped.

Then apply `REVIEW.md § Feedback into CLAUDE.md`: for each kept finding, check whether it is the **second occurrence** of the mistake in this repository (`git log -S'<pattern>' --oneline | head`, recent PR findings, `CLAUDE.md § Things Claude gets wrong`). If so, attach a *CLAUDE.md correction* — the exact one-line entry — to the finding. Also surface any Compliance finding that says the change has made `CLAUDE.md`, `AGENTS.md`, or an architecture doc **outdated**, with the stale line quoted.

```markdown
## Report: Code Review

### Summary
[1-2 sentence assessment]

### Profile
**Depth**: [level] | **Teammates**: [list] | **Discussion**: [Yes/No]

### Overall Assessment
[Approve / Request Changes / Needs Discussion]

### [Perspective] Perspective
[Findings per active teammate — each finding MUST include a short plain-language explanation of **why** it matters and what the concrete risk or benefit is, not just a label or file reference]

### Performance Findings
[N+1 patterns, Redis cache gaps, loop inefficiencies, pagination gaps, missing indexes — severity-classified. Reference the project's caching ADR (see `.claude/planning/adr/`) for the agreed key scheme and TTLs when reporting a caching gap. Note if graph context showed caching layer already present.]

### Discussion Summary
[Narrative summary of the key debates that happened between teammates during Phase 2. For each substantive disagreement or reinforcement: who raised it, who challenged or supported it, what arguments were made, and what the outcome was. Write this as readable prose, not bullet points — the reader should understand the team's reasoning process.]

### Discussion Insights
[Reinforced findings, challenged findings, severity adjustments, unresolved disagreements]

### Findings (per REVIEW.md)
<!-- Each finding may carry a `CLAUDE.md correction:` line (second-occurrence mistakes) and the Compliance pass lists any doc the change made outdated. -->
**Important** — all of them, Bugs → Security → Compliance:
- [ ] **Important** · <pass> · `file:line` — [what is wrong; why it matters here; the concrete fix]

**Nits** — at most five:
- [ ] **Nit** · <pass> · `file:line` — [what and why]
- *+N further nits: <one-line summary>*

### Handoff
- **Status**: [Approved / Changes requested]
- **Next step**: [/commit | /implement | manual discussion]
```

## Important Notes

1. **Delegate mode**: Never perform analysis -- only coordinate and synthesize
2. **Impact pre-flight first**: Step 3 is mandatory — performance analysis is meaningless without knowing which callers already have a caching layer
3. **Two-phase**: Phase 1 (independent) for unbiased findings; Phase 2 (debate) for consensus
4. **Peer-to-peer**: Teammates message each other directly in Phase 2
5. **No edits**: All teammates operate in analysis-only mode
6. **Important blocks**: any **Important** finding (per `REVIEW.md`) means *Changes requested*; Nits alone never block
7. **Policy lives in REVIEW.md**: do not restate severity or pass definitions here — change the file
8. **Team lifecycle**: Teammates auto-shut-down after all tasks complete
