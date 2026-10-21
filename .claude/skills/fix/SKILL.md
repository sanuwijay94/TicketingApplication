---
allowed-tools: Task, Agent, Skill, Bash(git:*), Bash(gh:*), Bash(npm:*), Bash(npm:*), Bash(ls:*), Bash(grep:*), Bash(rg:*)
description: Localize and fix a bug test-first — parallel root-cause search, failing test, fix, regression
argument-hint: '[symptom description | issue-id | "FE/BE/domain" hint]'
---

Fix a bug the fast way: **localize first (in parallel), reproduce as a failing test, then fix.** The slow part of bug-fixing is finding *where* the bug lives — this skill attacks that with concurrent root-cause search across the layer chain, then locks the fix with a test so it cannot recur.

Use this instead of jumping straight into the code. The discipline is what makes it fast.

## Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Layer/domain maps: !`ls .claude/planning/architecture/layer-map.md .claude/planning/architecture/domain-model.md .claude/planning/architecture/component-map.md 2>/dev/null | tr '\n' ' '`

## The bug

$ARGUMENTS

**If the argument is a GitHub issue number (`#142` or `142`)** — this is a triaged defect (see `SDLC.md` → MAINTAIN). Load it as the Phase 0 capture instead of asking the human:
```
gh issue view <#> --json number,title,body,labels,milestone
```
Read the symptom / repro / found-in version from the body, and note the `sev:*` and `lane:*` labels. Carry `#<#>` through to Phase 5 so the PR closes it. (If it is **not** triaged — no `sev:*` label — pause and suggest `/bug triage <#>` first.)

If empty and no issue number, ask for: the symptom (what's wrong), where it was observed (screen / endpoint / which user action), expected vs actual, and any error message or stack trace. (A bug worth tracking should usually have a GitHub issue — offer `/bug file` if none exists.)

## Why this skill exists

Root-cause localization is the bottleneck (not the fix itself). A human searches serially and blindly. This skill searches **in parallel and exhaustively**, then converts the bug into a failing test so the fix is proven and regression-locked. See `.claude/rules/testing.md` for the layer→test-type mapping.

---

## Phase 0: Capture the symptom (cheap, do not skip)

Pin down, in one short paragraph:
- **Symptom** — what the user sees / what breaks.
- **Trigger** — exact action, screen, endpoint, or input.
- **Expected vs actual.**
- **Evidence** — stack trace, failing request/response, console/log lines, screenshot. A stack trace usually collapses localization to near-zero — always ask for it first.

If there's a stack trace pointing at a `file:line`, **skip the fan-out in Phase 1** and go straight to confirming that frame.

## Phase 1: LOCALIZE — escalate: read → observe → get the data

Localization is the slow part. Climb this ladder **in order** and stop the moment you have a *confirmed* root cause. The rule that matters most — and the one most often broken: **do not keep theorizing; escalate to observation.** Past **two** failed read-based hypotheses, you MUST move to Rung 2. Reading harder will never find a runtime / boundary / data bug, because the source code is individually correct — the defect is in the running behaviour or the actual data.

### Rung 1 — READ (static): understand the code first

Spawn **independent read-only searchers concurrently** (use `Agent` with the `Explore` subagent type, or `Task`). Each traces from a *different angle* — none should know what the others find. Give every searcher the symptom from Phase 0; each returns ranked `file:line` candidates with a one-line rationale.

Run these angles in parallel:

1. **Layer-chain trace.** Walk the predictable path for this bug's surface (read `layer-map.md` first):
   - FE symptom: `clientApp/src/features/<feature>/` component → its `*-api.ts` Angular HttpClient services slice → the `../models/` contract → BE `*.controller.ts` → use case → domain entity/service.
   - BE/API symptom: controller → use case → domain → repository/adapter.
   - Domain/logic symptom: go straight to `server/src/domain/` (entities, value-objects, services) — these are pure and unit-tested; a hard-to-find domain bug is usually a coverage gap.
2. **Ownership trace.** Use `/explain <suspect symbol>` and `rg` the feature index to find which feature owns the suspect code, what touches it, and where its entry points are (`.claude/rules/code-navigation.md`).
3. **Symptom-string grep.** Search the exact error text, label/copy, route path, event name, or field name across the source tree.
4. **Recent-change trace.** `git log` / `git blame` around the suspect area and `git diff` of recent commits — many bugs are regressions from a recent change.

**Capability bugs are usually CLASS bugs — map every site before fixing.** If the symptom is a *capability or affordance* ("the attachment button doesn't work", "mentions don't render", "validation is missing", "the empty state is wrong") rather than one specific wrong value, the same defect almost always lives in **every flow that uses that capability**. A single confirmed root cause is **not** "done" — first enumerate all the sites:
- **Create vs edit vs detail.** The same capability is typically wired separately in the create drawer, the edit/detail view, and sometimes a bulk/inline path. Per `.claude/rules/ui-quality.md` (*"Create/edit feature parity — build one component used by both"*), a capability broken in one is broken in all. Grep the affordance: e.g. `rg -l "attachment|AttachButton|useAttach" clientApp/src/features` → fix every match, not just the reported one.
- **Same mechanism, many call sites.** For BE/domain class bugs (a controller missing `Schema.parse`, a use case missing a guard), grep the *pattern* across siblings and fix each.
- Output a **site list** and carry it through Phases 2–3: write a failing test per affected flow, fix all of them in one PR.

For **FE/BE integration bugs** (mismatched payloads): the contract is the localizer. BE controllers end with `Schema.parse(response)`, so a bad payload throws *at the controller naming the field*. Check API logs/stack first; then diff the `../models/` contract against what each side actually sends/expects.

**Decide:** many bugs are obvious from reading alone (wrong condition, missing `await`, off-by-one, wrong field name). If reading yields a **clear, specific** root cause → skip to Phase 2. If it yields only plausible-but-unconfirmed guesses, or the symptom smells like runtime/boundary/data (values wrong, "doesn't match / not found", intermittent, only-reproduces-in-the-running-app) → **do not guess, go to Rung 2.**

### Rung 2 — OBSERVE (dynamic): instrument, run, read the logs

Stop reading. Make the running program show you the truth.

1. **Instrument** the suspect points with the structured logger (never `console.log`) — log the actual values plus `typeof`, length, and a JSON-stringified/quoted form so case and whitespace are visible. For a mismatch, log *both* operands side by side.
2. **Run it** — prefer (a):
   - **(a) Run it yourself and read the output.** Boot the stack and tail logs:
     - `npm dev:up` (docker compose + migrations), then `npm dev:api` and/or `npm dev:ui`
     - logs: `npm dev:logs`, or `docker compose logs -f server` (see `docker-compose.yml` for the service names)
     - fastest of all: reproduce in isolation by running the **single failing test** — instant feedback, no full stack.
   - **(b) Ask the developer to run it and paste the relevant log lines** — when the repro needs manual UI steps, real auth/SSO, or live external systems (OCM / TMAC / Keycloak) you can't drive locally. Tell them exactly what to click and which log lines to copy.
3. **Read the captured values and diff them.** The bug is usually obvious the instant you see the real values.

### Rung 3 — GET THE DATA: query the source of truth

When the suspect value's *origin* is in doubt (especially DB or external-boundary bugs), look at the real data — never infer it.

- **Ask the developer** for the raw artifact: the actual DB row, the real API request/response, the exact payload.
- **Or query the local setup yourself**, using creds from `.env` (`DB_HOST` / `DB_PORT` / `DB_USER` / `DB_SA_PASSWORD` / `DB_DB` — read them, never hardcode or echo secrets):
  - ⚠️ Query through the project's documented DB client (see `AGENTS.md` § Development Environment) or a throwaway script using the app's connection string. Never echo secrets.
  - Inspect the **raw stored value** — case, padding, type, collation. This is precisely what would have cracked the 4-hour MongoDB `uniqueidentifier` bug in minutes: a single `SELECT id` shows the column stores GUIDs **UPPERCASE**, while the FE compared a lowercase value.

### Cross-boundary representation checklist — for "doesn't match / not found" bugs

Each side is individually spec-correct, so the mismatch hides in the *interaction*. Diff the actual captured values against:

- **Case** — MongoDB `uniqueidentifier` returns GUIDs **UPPERCASE**; JS/UUID libs, OCM, Keycloak emit lowercase.
- **Whitespace** — trailing/leading spaces, `CHAR(n)` right-padding.
- **Dates/time** — timezone, offset, millisecond precision, `Z` vs `+00:00`.
- **Numbers** — float precision, `bigint` serialised as string, leading zeros.
- **Encoding** — UTF-8 vs Latin-1, URL-encoding, Unicode NFC vs NFD.
- **Null-ish** — `null` vs `""` vs `undefined` vs the string `"null"`.
- **Type coercion** — numeric id vs string id (`1 === "1"` is `false`).
- **Collation** — a case/accent-insensitive DB collation masking a case-sensitive app comparison.

Fix at the **boundary** (e.g. normalise GUID case as it leaves the repository, or compare case-insensitively) — not at the FE symptom site.

**Converge:** pick the most likely root cause (not a symptom site) and state the `file:line` + mechanism in one sentence. **CHECKPOINT** — confirm the root cause with the developer before changing code.

## Phase 2: Reproduce as a FAILING test (red)

Write a test at the correct layer that fails *because of this bug* (per `.claude/rules/testing.md`):

| Bug surface | Test type | Location |
|---|---|---|
| Domain / business logic | unit | `test/unit/domain/` |
| Use case orchestration | unit (mock ports) | `test/unit/application/` |
| HTTP contract / controller | integration | `test/integration/` |
| Repository / adapter | integration (real DB) | `test/integration/` |
| UI behavior | component/RTL | `clientApp/src/**/__tests__/` |

Use factories — never hardcoded data. Run it and **confirm it fails for the right reason** (the bug, not a typo in the test). A symptom-only patch will not make the right test pass — this is what forces a true root-cause fix.

**Commit the failing test, then lock it.** Commit the test on its own (`test(<scope>): reproduce #N`), then create the fix-mode marker:
```bash
mkdir -p .claude/session-state && touch .claude/session-state/fix-mode
```
From here until Phase 5, `.claude/hooks/test-protection-gate.sh` blocks every edit to a test file (`test/`, `tests/`, `__tests__/`, `*.spec.*`, `*.test.*`). A test that existed before the fix and that the agent could not rewrite is the proof the bug is gone. If you discover the *test* is wrong, stop and tell the engineer what is wrong with it — only the engineer removes the marker, and the reason goes in the Phase 5 report.

For UI behavior bugs, also plan the browser check from `.claude/rules/ui-quality.md` (force the loading/empty/error/success states) — a unit test alone is not "done" for UI.

## Phase 3: Fix (green)

Invoke `developer-agent` to make the **smallest** change that turns the failing test(s) green. Per `.claude/rules/yagni.md`: fix the bug, don't refactor the neighborhood.

**YAGNI boundary — fix the whole class, not the whole neighborhood.** Fixing the *same defect* at every sibling site found in Phase 1 (create **and** edit, every call site of the broken mechanism) **is the fix** — not scope creep. YAGNI forbids *unrelated* cleanup, not fixing the same bug where it recurs. The right fix for a duplicated capability bug is often to converge the flows on **one shared component/function** (per `ui-quality.md`) so the defect cannot diverge again.

Enforce the invariant in the right layer (domain rules in the aggregate, not the controller — see `.claude/rules/ddd.md`). Use the base error class and structured logger.

## Phase 4: Verify

- Run `/test` (unit + lint + typecheck). Must pass.
- Run `/regression` for the affected layers (`fe`, `be`, or `e2e`) — proves no neighbor broke.
- **UI bugs:** browser-verify per `ui-quality.md` and attach state screenshots. Passing tests are not sufficient for UI.

## Phase 5: Report + close the loop + recurrence guard

**Unlock the tests** — the fix is done and verified, so remove the marker: `rm -f .claude/session-state/fix-mode`. If the engineer removed it earlier to correct a wrong test, say so and why in the report.

Report: root cause (one sentence), the `file:line` changed, the failing→passing test added, and verification results.

**Close the GitHub issue loop** (if this fix maps to a defect issue):
- Ensure the PR body contains `Fixes #<#>` (or `Closes #<#>`) so merging auto-closes the issue and records the commit→PR→issue link. `/pr` adds this — confirm it's there.
- A `lane:hotfix` fix should target `main` and be assigned to the open patch milestone (`v0.x.1`); after merge it must be **back-merged to `develop`** (see `/release`).
- If no issue exists yet but the bug warrants tracking (escaped to a shipped version), offer `/bug file` so the fix is traceable to a release.

**Related-issue sweep** — before declaring done, check for siblings already reported:
```
gh issue list --label type:bug --state open --search "<area/keyword>"
```
Link any duplicates/related issues in the PR.

**Class-bug sweep (REQUIRED — gate, not an afterthought).** Before declaring done you MUST confirm the same defect does not survive at a sibling site. This is a **code** sweep, not just the GitHub-issue check above:
1. Re-grep the broken mechanism/affordance across the codebase (`rg -l "<affordance>" packages/`). For a UI capability bug, **explicitly verify create/edit/detail parity** (`ui-quality.md`).
2. For every sibling site, either **fix it in this PR** (the same defect in create + edit is one bug, see Phase 3) or state in the report *why* it is genuinely out of scope. "I only fixed the reported site" is not an acceptable outcome for a capability/class bug.
3. Consider a **class-level guard** (a shared component, a lint rule, a checklist item, a hook) so the class cannot recur — the same move behind `ui-quality.md` and the contract-first hook.

Report the **site list** and which sites were fixed.

**Close the learning loop (REQUIRED — the fix is not done until the loop has learned):**

1. **Add a regression eval** — if the repo has `evals/cases/` (ai-factory installed), write
   `evals/cases/incident-<issue-number-or-slug>.json` that reproduces this failure as an agent task,
   in the ai-factory case format (`evals/README.md`):
   ```json
   {
     "id": "incident-<slug>",
     "description": "Regression for #<N>: <one line>. Added by /fix in PR #<M>.",
     "repo_fixture": "<path to a small fixture at the pre-fix state, or the existing fixture this applies to>",
     "prompt": "<the task phrased as the issue reporter would — reproduce, then fix>",
     "allowed_tools": ["Read", "Edit", "Grep", "Glob", "Bash(<test command>*)"],
     "max_turns": 15,
     "checks": [
       { "type": "tests_pass", "command": "<test command>" },
       { "type": "no_test_edits", "globs": ["test/**"] },
       { "type": "file_contains", "path": "<file>", "pattern": "<the guard the fix introduced>" }
     ]
   }
   ```
   Every production incident becomes a permanent eval — written by the team that owned it, in the
   same PR as the fix. Without `evals/`, note in the report that the eval is owed once the factory
   is installed.
2. **Write the post-mortem** — for `sev:S1` / `sev:S2` (or any incident that reached a shipped
   version), create `docs/lessons/YYYY-MM-<slug>.md` from `docs/templates/lesson.md.template` in
   this PR: what happened, timeline, root cause, fix, and the *What the loop learned* checklist
   (eval added · `CLAUDE.md` line · band tuned · guard promoted · runbook). `/trace-bug` and the
   factory's diagnose run read `docs/lessons/` first on the next incident.
3. **`CLAUDE.md` twice rule** — if an agent caused or missed this and it is the second time, add
   the one-line correction under *Things Claude gets wrong* in this PR (`documentation.md`).

## Quality Gates

- ✅ Root cause identified and confirmed (not a symptom patch) — and **observed**, not just theorized, when reading was inconclusive
- ✅ A test that failed before the fix and passes after
- ✅ `/test` green; `/regression` green for affected layers
- ✅ UI bugs browser-verified with screenshots
- ✅ Smallest viable change to fix the **class** (no unrelated refactor) — not just the single reported site
- ✅ **Class-bug sweep done** — every sibling site of the same defect fixed (create + edit + detail) or explicitly justified as out of scope; create/edit parity checked for UI bugs
- ✅ **Loop closed** — regression eval added to `evals/cases/` (or noted as owed), `docs/lessons/` post-mortem written for S1/S2, `CLAUDE.md` correction added if the twice rule applies

## Never

- Start editing source before localizing and confirming the root cause
- **Keep theorizing past two failed read-based hypotheses** — escalate to Rung 2 (instrument + run + observe). Continuing to guess is *the* anti-pattern this skill exists to stop.
- **"Fix" a value-mismatch / "doesn't match" bug by reading comparison code alone** — the actual runtime values must be observed (logs) or the real data queried (DB) before proposing a cause.
- Fix a bug without a test that reproduces it first
- Edit, weaken, skip, or delete a test while the fix-mode marker is present — and never remove the marker yourself; that is the engineer's call
- Patch the symptom site when the cause is upstream (e.g., format the value in the UI when the API returns the wrong field)
- **Fix one instance of a class bug and stop** — a broken capability (attachment button, mentions, a missing state) almost always exists in create *and* edit; map and fix every site (Phase 1 + Phase 5 sweep)
- Refactor unrelated code in a bug fix (YAGNI)
