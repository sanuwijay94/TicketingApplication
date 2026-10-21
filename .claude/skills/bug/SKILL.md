---
allowed-tools: Skill, AskUserQuestion, Read, Glob, Bash(gh:*), Bash(git:*), Bash(node:*)
description: File and triage a defect as a GitHub issue (type:bug) and route it to a lane
argument-hint: '[file <symptom> | file-from-qa [<TC-id>… | --all-failed] | triage <#> | list [--lane=hotfix|scheduled] | fix <#>]'
---

File, triage, and route defects as **GitHub Issues** — the operational source of truth for bugs (see `SDLC.md` → MAINTAIN). Non-developers file via the GitHub bug template in the UI; this skill is the developer/Claude front-door for the same flow plus triage.

Bugs are **not** planned like features — no PRD/RFC/ADR. The plan for a bug is: **triage → lane → ship.** Hotfix-lane bugs batch into a patch release (`v0.x.1`); scheduled-lane bugs fold into the next phase milestone.

## Current State

- Repo: !`gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "(gh not authed)"`
- Open bugs: !`gh issue list --label type:bug --state open --json number --jq '"\(length) open"' 2>/dev/null || echo "?"`
- Needs triage (no sev label): !`gh issue list --label type:bug --state open --json number,labels -q '[.[] | select((.labels | map(.name) | map(startswith("sev:")) | any) | not)] | length' 2>/dev/null || echo "?"`

## Arguments

$ARGUMENTS

---

## Severity → lane (triage reference)

| Sev | Meaning | Default lane |
|-----|---------|--------------|
| `sev:S1-critical` | Prod down, data loss, security breach, auth bypass | `lane:hotfix` → immediate patch |
| `sev:S2-major` | Key feature broken, no workaround | `lane:hotfix` (or next patch) |
| `sev:S3-minor` | Broken but has a workaround | `lane:scheduled` → next phase |
| `sev:S4-trivial` | Cosmetic / low impact | `lane:scheduled` (backlog) |

**Pre-release bugs** (caught in QA/CI before the `v0.x.0` tag) are ordinary fixes on the feature branch — do **not** file a defect issue for them.

---

## Commands

### `file <symptom>` — Create a bug issue

1. If details are thin, ask for: what happened, expected, steps to reproduce, **found-in version** (release tag / staging / local), and any error/stack/screenshot.
2. Create the issue with the `type:bug` label:
   ```
   gh issue create --label type:bug --title "[Bug]: <short title>" --body "<structured body>"
   ```
3. Print the issue URL and immediately offer to `triage` it.

> Prefer the GitHub UI bug template for non-dev reporters — it captures the same fields.

### `file-from-qa [<TC-id>… | --all-failed]` — File a bug from a failed QA case

Turns a **failed QA UI-automation case** into a bug issue, joining two sources: the
manual `TC-NNN` case doc supplies the **Execution Steps** and **Expected Result**; the
Allure report supplies the **Actual Result** — the cause of failure and the failure
**screenshot**. Use it after a `/run-qa-test` run leaves red cases. Nothing is filed
until the user confirms (step 5).

**Sources (do not invent — read them):**

| Bug field | Source |
|-----------|--------|
| **Execution Steps** | `Navigation Steps` block of the case's `### <TC-id>` in `.claude/planning/qa/test-cases/TC-*.md` |
| **Expected Result** | `Expected Result` block of the same case doc |
| **Actual Result** | Allure result JSON `statusDetails.message` (cause) + trace excerpt — the real observed outcome, **not** the case doc's pre-filled Actual Result |
| **Screenshot** | the `screenshot` attachment nested in the Allure result's `steps[]` → `allure-results/<source>.png` |
| **Severity / Priority / Feature / Story / Scenario** | the case's `qaCase({…})` metadata (case doc + `support/allure.ts`) |

**Steps:**

1. **Collect the failures** from `allure-results/` (the raw JSON the last run wrote;
   regenerated every run). For each `*-result.json` with `status` `failed` or `broken`,
   pull: the **TC-id** from the `name` prefix (`^([A-Z]+-\d+)` — the `testCaseId` label is
   absent, so parse the name), the **cause** (`statusDetails.message`, first line), a trace
   excerpt (`statusDetails.trace`), and the **screenshot** path by walking `steps[]` for the
   attachment named `screenshot`. Scope to the ids the user named, or all failures with
   `--all-failed`. Example collector:
   ```
   node -e '
   const fs=require("fs"),d="allure-results";
   for(const f of fs.readdirSync(d)){ if(!f.endsWith("-result.json"))continue;
     const r=JSON.parse(fs.readFileSync(d+"/"+f)); if(!["failed","broken"].includes(r.status))continue;
     const id=(r.name.match(/^([A-Z]+-\d+)/)||[])[1];
     let shot=null,w=s=>(s||[]).forEach(x=>{(x.attachments||[]).forEach(a=>{if(a.name==="screenshot")shot=a.source});w(x.steps)});w(r.steps);
     console.log(JSON.stringify({id,status:r.status,cause:(r.statusDetails?.message||"").split("\n")[0],shot}));
   }'
   ```
2. **Read the case doc** for each id: find the `### <TC-id>` block in
   `.claude/planning/qa/test-cases/TC-*.md`, extract the `Navigation Steps` (→ Execution
   Steps) and `Expected Result` numbered lists verbatim, and the case's Feature / Story /
   Severity / Priority / Scenario metadata. If no case doc matches an id, say so and skip it
   — do not fabricate steps.
3. **Handle the screenshot** (`gh` cannot inline-upload to an issue body): copy each
   `allure-results/<source>.png` to a stable, named path
   `docs/qa/bug-evidence/<TC-id>-failure.png`, so it can be embedded by URL once pushed. If
   the user declines committing evidence (step 5), fall back to referencing the local Allure
   path in the body and note that the screenshot must be dragged into the issue in the UI.
4. **Compose the issue body** per case (map straight onto the `file` structure):
   ```
   **Found in:** QA UI-automation (`/run-qa-test`) · <feature> · <story>
   **Test case:** <TC-id> — <case title>
   **Severity (from case):** <S1–S4>  ·  **Priority:** <P1–P3>  ·  **Scenario:** <type>

   ### Execution Steps
   <Navigation Steps, verbatim from the case doc>

   ### Expected Result
   <Expected Result, verbatim from the case doc>

   ### Actual Result (from Allure)
   <cause of failure — statusDetails.message>

   <details><summary>Trace excerpt</summary>

   ```
   <trace excerpt>
   ```
   </details>

   ### Failure screenshot
   ![<TC-id> failure](<raw URL after push, or evidence path>)
   ```
5. **Ask for confirmation before filing (binding).** Show the composed title + body (and
   the screenshot handling chosen) for each case and use `AskUserQuestion` to confirm:
   *file all shown / pick a subset / edit first / cancel*, and *commit+push the screenshot
   evidence so it embeds, or reference the local path*. **File nothing until the user
   confirms.**
6. **On confirm — file to GitHub.** If evidence is to be embedded: commit the
   `docs/qa/bug-evidence/*.png` on the current branch and push (per `git-workflow.md` —
   check for an open PR first), then rewrite each `![…](…)` to the pushed
   `https://github.com/<owner>/<repo>/blob/<branch>/docs/qa/bug-evidence/<TC-id>-failure.png?raw=true`
   URL. Then create one issue per case:
   ```
   gh issue create --label type:bug --title "[Bug]: <TC-id> — <short symptom>" --body "<body above>"
   ```
   Map the case **Severity** onto the `sev:*` label at triage — print each issue URL and
   immediately offer to `triage` it (step chains into `triage <#>`).

> Only failed/broken cases become bugs. Skipped/`fixme` cases are not defects — do not file
> them (they are honesty guards per `ui-automation.md` §6). A **pre-release** QA failure on a
> feature branch is an inline fix, not an issue (see "Never" below).

### `triage <#>` — Classify and route

1. Read the issue: `gh issue view <#>`.
2. Decide severity (S1–S4) from the table above. If ambiguous, ask the user.
3. Set labels + route:
   - **Severity**: add the one `sev:*` label.
   - **Lane**: `lane:hotfix` for S1/S2 on a *shipped* version; `lane:scheduled` for S3/S4.
   - **Milestone**:
     - `lane:scheduled` → assign the **next phase** milestone (`Phase N`).
     - `lane:hotfix` → assign the open **patch** milestone (`v0.x.1`). If none exists, create it on demand:
       ```
       gh api repos/:owner/:repo/milestones -f title="v0.x.1" -f description="Patch release — hotfix-lane defects against v0.x.0"
       ```
   ```
   gh issue edit <#> --add-label "sev:S2-major,lane:hotfix" --milestone "v0.2.1"
   ```
4. Report the routing decision (sev, lane, milestone) and, for hotfix, suggest `/bug fix <#>`.
5. **S1/S2:** state in the issue that the fix PR must carry a post-mortem (`docs/lessons/YYYY-MM-<slug>.md`) and a regression eval (`evals/cases/incident-<#>.json`) — `/fix` Phase 5 writes both; triage is where the expectation is set. Check `rg -i '<component>' docs/lessons/` for a prior incident of the same class and link it.

### `list [--lane=hotfix|scheduled]` — Show the bug queue

```
gh issue list --label type:bug --state open --json number,title,labels,milestone
```
Group by lane; flag any **untriaged** (no `sev:*`) bug first. For `--lane=hotfix`, also show which patch milestone each is assigned to so you can see the next patch's scope.

### `fix <#>` — Hand off to the fix workflow

Confirm the issue is triaged (has a `sev:*` label), then invoke `/fix <#>` — that skill loads the issue as its Phase 0 capture and links the PR back with `Fixes #<#>`.

---

## How a patch release gets planned (practical)

A patch is a **collected batch**, not a planned document:

1. Triaged `lane:hotfix` bugs are assigned to an open `v0.x.1` patch milestone.
2. A single **S1** can trigger `v0.x.1` immediately; **S2s batch** until the milestone is complete or a max-wait hits.
3. When the milestone's issues are closed, run `/release v0.x.1` — it generates notes from the closed issues, tags, and walks the prod gate.

Scope query at any time: `gh issue list --milestone v0.x.1 --state closed`.

## Never

- File a defect issue for a bug caught **before** its phase shipped — fix it inline on the feature branch.
- Leave a bug **untriaged** (no `sev:*` label) — an unclassified bug has no lane and silently stalls.
- Close a bug issue by hand — let the fixing PR close it via `Fixes #<#>` so the commit→PR→issue link is recorded.
- Put a `lane:scheduled` bug into a patch milestone — scheduled bugs ship with the next phase `v0.x.0`.
