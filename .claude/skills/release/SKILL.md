---
allowed-tools: Skill, AskUserQuestion, Bash(gh:*), Bash(git:*)
description: Cut a phase (v0.x.0), patch (v0.x.1), GA (v1.0.0), or pre-release (-alpha/-beta/-rc) from a GitHub milestone — notes, tag, QA gate (production only), prod gate
argument-hint: '[<version> | --phase=N | --patch]'
---

Ship a versioned increment via **GitHub Releases + Tags** (see `SDLC.md` → SHIP). There is no hand-maintained `CHANGELOG.md` — release notes are generated from the milestone's merged PRs/issues.

**Versioning:** `MINOR` = phase (`v0.1.0`), `PATCH` = bug-fix release against a shipped phase (`v0.1.1`), `MAJOR` = GA (`v1.0.0`).

**Release type drives the QA gate (binding):**
- **Pre-release** — a tag with a `-alpha` / `-beta` / `-rc` suffix (e.g. `1.0.0-alpha.1`). A *checkpoint / QA input*: it exists so QA has a fixed build to test **against**. QA runs **after** the tag. **NOT sign-off-gated** — gating a pre-release is backwards (you cannot sign off before there is a build to test). Always cut with `--prerelease` so it is never mistaken for production.
- **Production** — a clean semver with no suffix (`v0.3.0`, `v0.3.1`, `v1.0.0`). A *QA output*: it must be **QA-signed-off before** the tag (Phase 1a). This is what deploys to customers.

The pre-release ladder to GA: `-alpha` (QA plans + exploratory) → `-beta` (full plan execution) → `-rc` (**QA sign-off lands here** — no open S1/S2) → `v1.0.0` (GA, gated).

For the full **GA (`v1.0.0`)** path — scope reconciliation, version stamp, go/no-go, and the manual deploy — follow `docs/qa/GA-RELEASE-RUNBOOK.md`.

## Current State

- Repo / default branch: !`gh repo view --json nameWithOwner,defaultBranchRef -q '.nameWithOwner + " (" + .defaultBranchRef.name + ")"' 2>/dev/null || echo "(gh not authed)"`
- Latest release: !`gh release list --limit 1 2>/dev/null | head -1 || echo "(none yet)"`
- Open milestones: !`gh api repos/:owner/:repo/milestones --jq '.[] | "\(.title): \(.closed_issues)/\(.open_issues+.closed_issues) closed"' 2>/dev/null || echo "?"`

## Arguments

$ARGUMENTS

`<version>` is the tag to cut, e.g. `v0.2.0` (phase) or `v0.2.1` (patch). The source milestone is inferred: `vX.Y.0` ← `Phase Y`; `vX.Y.Z` (Z>0) ← the `vX.Y.Z` patch milestone.

---

## Phase 0 — Classify the release type & identify scope

0. **Classify** from the version string:
   - Suffix `-alpha` / `-beta` / `-rc` → **pre-release**: skip the QA sign-off gate
     (Phase 1a), cut with `--prerelease` (Phase 2). Still run the automated + branch
     gate (Phase 1b) so the pre-release build is at least green.
   - No suffix → **production**: the full gate applies (Phase 1a + 1b).
1. Resolve the target version and its **source milestone**:
   - `v0.2.0` → milestone `Phase 2`
   - `v0.2.1` → milestone `v0.2.1`
2. List what will ship:
   ```
   gh issue list --milestone "<milestone>" --state closed --json number,title,labels
   ```
3. Confirm the milestone is **complete** (no open issues):
   ```
   gh issue list --milestone "<milestone>" --state open --json number -q 'length'
   ```
   If non-zero → **HALT**: list the open issues and ask whether to defer them (move to the next milestone) or hold the release.

## Phase 1 — Gate (must pass before tagging)

### 1a. QA sign-off gate (per `QA-PROCESS.md §6`) — **production releases only**

> **Skip for pre-releases** (`-alpha`/`-beta`/`-rc`, Phase 0). A pre-release is the
> build QA tests *against*; it cannot be sign-off-gated. Proceed straight to 1b.

A **production** release must be **QA-signed-off**, not merely code-complete. HALT unless **all** hold:

1. **Every milestone issue is verified, not merely closed.** A fixing PR auto-closes
   its issue (`Fixes #N`), but that is not sign-off (`QA-PROCESS.md §3`). Any issue
   labelled `qa:reopened`, or a closed bug lacking `qa:verified`, blocks:
   ```
   gh issue list --milestone "<milestone>" --state all --label "type:bug" \
     --json number,state,labels
   ```
   → HALT and list any closed bug without `qa:verified`, or any `qa:reopened`.
2. **No open `sev:S1` / `sev:S2` against the release scope:**
   ```
   gh issue list --milestone "<milestone>" --state open \
     --label "sev:S1-critical" --label "sev:S2-major" --json number,title
   ```
   → any result HALTS.
3. **A test-run report exists** for this version at
   `docs/qa/reports/<version>-test-run.md` with the sign-off checklist completed
   (from `TEMPLATE-test-run.md`). Absent or unchecked → HALT and ask QA to complete it.

This is the *tool-enforced* half; the milestone sign-off comment is the *human* half.

### 1b. Automated + branch gate

- **Regression green.** Run `/regression` (BE + FE + E2E) **and** the QA suite
  (`npm test:qa:ci`). A release must not ship on red. For a hotfix patch, at minimum
  run the affected layers + the failing-then-fixed test.
- **Branch state.** Phase release cuts from the default branch (`main`). A **patch**
  cuts from `main` too (hotfixes land on `main` first), then is back-merged to
  `develop` — confirm the hotfix PRs are merged to `main`.
- **No uncommitted changes** on the release branch.

If any gate fails → **HALT** and report. Never tag over a red regression or without QA sign-off.

## Phase 2 — Cut the release

1. Create the GitHub Release with **auto-generated notes** from merged PRs/issues since the last tag:
   ```
   gh release create <version> --target main --title "<version> — <milestone>" --generate-notes
   ```
   - **Pre-release** (`-alpha`/`-beta`/`-rc`): add **`--prerelease`** so GitHub marks it
     "Pre-release" and it is never treated as the latest production release. It must not
     be deployed to production.
   - For a pre-GA line, pass `--latest=false` on patches if an older line is being patched.
2. Close the source milestone (**production releases** — a pre-release usually leaves its
   milestone open, since QA/bug-fixing against the pre-release continues):
   ```
   gh api -X PATCH repos/:owner/:repo/milestones/<id> -f state=closed
   ```
3. Print the release URL and the tag.

## Phase 3 — Promote (per `ci-cd.md`)

> **Pre-releases are NOT promoted to production.** A `-alpha`/`-beta`/`-rc` tag may be
> deployed to a QA/staging environment for testing, but never to prod. Only a
> QA-signed-off production tag reaches production.

Promotion is gated, not automatic:

1. **Staging** — deploy this tag to the QA/staging environment; confirm the staging smoke test is green.
   **Rollback rehearsal check (production tags only):** rollback must have been exercised in staging within the last **30 days** (adjust per `ci-cd.md`). Evidence is the last successful run of the rollback workflow/runbook (`gh run list --workflow <rollback-workflow> --status success --limit 1`, or the `MIGRATIONS-LOG.md` / release-notes entry the team records it in). No rehearsal in the window → **HALT**: *"Rollback has not been rehearsed in staging since <date>. Rehearse it (one command, staging) and record the run before cutting a production tag."* Rollback is the path the monitoring loop will invoke unattended; it must be proven first.
2. **Production** (production tags only) requires the **manual approval gate**. Do **not** trigger prod deploy from here — instruct the developer to approve the deployment in the CI environment, and confirm the post-deploy `/health` smoke check.

## Phase 4 — Post-release

- **Patch only:** ensure the hotfix is **back-merged to `develop`** so it isn't lost on the next phase branch.
- Announce: link the release notes; for a patch, list the `B-`/issue numbers fixed.

---

## Quality Gates

- ✅ Release **type classified** — pre-release (`-alpha`/`-beta`/`-rc`) vs production (Phase 0)
- ✅ Source milestone has zero open issues (or open ones explicitly deferred) — *production*
- ✅ **QA sign-off** (*production only*) — every milestone bug `qa:verified` (none `qa:reopened`), no open S1/S2, test-run report present (`QA-PROCESS.md §6`)
- ✅ `/regression` green for the release scope + QA suite (`npm test:qa:ci`) green — *all types*
- ✅ Pre-release cut with `--prerelease`
- ✅ Release created with generated notes + tag on `main`
- ✅ Milestone closed
- ✅ Staging smoke green before the prod approval gate
- ✅ Rollback rehearsed in staging within the window (*production only*) — run id or log entry cited
- ✅ Patch back-merged to `develop`

## Never

- Tag a release over a failing regression suite
- **Block a pre-release on the QA sign-off gate** — a pre-release is the build QA tests against (Phase 1a is production-only)
- **Deploy a `-alpha`/`-beta`/`-rc` pre-release to production**, or cut one without `--prerelease`
- Cut a **production** tag (`v1.0.0`, `vX.Y.0`, `vX.Y.Z`) without QA sign-off, or without a rollback rehearsed in the window
- Trigger a production deploy without the manual approval gate (`ci-cd.md`)
- Hand-write release notes when `--generate-notes` covers it — the merged PRs/issues are the record
- Cut `vX.Y.0` while its `Phase Y` milestone still has open issues
- Forget the back-merge of a patch to `develop`
