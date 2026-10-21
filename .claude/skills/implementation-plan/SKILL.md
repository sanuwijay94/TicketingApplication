---
allowed-tools: Skill, AskUserQuestion, Bash(gh:*), Bash(git:*)
description: Navigate and track the feature backlog — GitHub Issues, Milestones (phases), and the Project board
argument-hint: '[status | next [--track=backend|ui] | pick <#> | new]'
---

Navigate the **feature backlog**, which lives in **GitHub Issues** (`type:feature`), grouped by **Milestone** (= phase) and tracked on the **Project board** (see `SDLC.md` → "Where everything lives").

> `IMPLEMENTATION-PLAN.md` holds the planning **conventions** only (§1: identity, dependencies, touched-zone codes, effort sizing, parallel-work rules, PR hygiene). It is never the live backlog — read it for *how the conventions work*; read GitHub for *what's next*.

This skill covers **features**. For defects use `/bug`; to ship a milestone use `/release`.

## Current State

- Repo: !`gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "(gh not authed — run: gh auth login)"`
- Open phase milestones: !`gh api repos/:owner/:repo/milestones --jq '.[] | select(.title|startswith("Phase")) | "\(.title): \(.closed_issues)/\(.open_issues+.closed_issues) closed"' 2>/dev/null || echo "?"`
- Open features: !`gh issue list --label type:feature --state open --json number --jq '"\(length) open"' 2>/dev/null || echo "?"`

## Arguments

$ARGUMENTS

---

## Commands

### `status` — Phase / backlog progress

1. Per phase milestone, show completion:
   ```
   gh api repos/:owner/:repo/milestones --jq '.[] | "\(.title): \(.closed_issues)/\(.open_issues+.closed_issues)"'
   ```
   Render as a simple progress bar per phase + an overall total.
2. List the **next 3 unblocked** open features (no open dependency — see Depends convention below):
   ```
   gh issue list --label type:feature --state open --json number,title,labels,milestone
   ```
3. If a Project board exists, point to it for the live column view (Backlog → Ready → In Progress → In Review → Done).

### `next [--track=backend|ui]` — Recommend what to pick up

1. List open `type:feature` issues in the **current phase** milestone, filtered by `track:*` if given.
2. Exclude blocked issues — those whose linked "Depends on" issues are still open (read the issue body's Depends section / linked issues).
3. Present up to 3 candidates: `#`, title, effort, track, touched zones.
4. Ask which to start → run `pick <#>`.

### `pick <#>` — Start work on a feature

1. Load the issue:
   ```
   gh issue view <#> --json number,title,body,labels,milestone,assignees
   ```
2. Print a structured brief: number, title, track, effort, depends, touched zones, source (PRD/RFC/ADR links from the body), and the proposed branch `feature/<#>-<slug>`.
3. **Contract gate** (if the issue touches `http.*`, `ui.*`, `schemas.*`, or `openapi` — per ADR-016 / `.claude/rules/api-contracts.md`):
   - Identify every endpoint the feature introduces/consumes.
   - Check `server/models/src/<domain>/<feature>.schemas.ts` exists for each.
   - If any contract is missing → **HALT**: "This feature touches an HTTP endpoint with no merged contract. Run `/contract <domain> <feature>` and merge the contract PR first."
4. Assign + move to In Progress:
   ```
   gh issue edit <#> --add-assignee @me
   ```
   (and move its board card to In Progress if the Project board is set up).
5. Suggest the branch and hand off:
   ```
   git checkout -b feature/<#>-<slug>
   ```
   Then invoke `/implement` (or `/scaffold` first for a new domain concept). The PR should reference `Closes #<#>` so merge closes the issue.

### `new` — File a feature issue

Most features are filed via the GitHub **feature template** in the UI. To file one here:
1. Ask for: summary, source (PRD/RFC/ADR), track, effort, depends, touched zones, acceptance criteria.
2. Create it:
   ```
   gh issue create --label type:feature --milestone "Phase N" --title "[Feature]: <title>" --body "<structured body>"
   ```
3. Add the `track:*` label and confirm the URL.

---

## Conventions (unchanged — see `IMPLEMENTATION-PLAN.md` §1 for the full text)

- **Identity**: the GitHub **issue number** is the stable ID (replaces `F-Pn-nn`). Milestones name the phase.
- **Depends**: list blocking issues in the body (`Depends on: #123, #131`); GitHub links them. A feature is *unblocked* when all its Depends issues are closed.
- **Touched zones**: the `dom.* / app.* / infra.* / http.* / ui.* / schemas.* / openapi / mig` taxonomy still applies — put it in the issue body. If two open features touch the same zone, schedule them serially.
- **Migrations** (`mig`) are single-threaded — coordinate sequence numbers via `MIGRATIONS-LOG.md` before generating one.
- **PR hygiene**: one feature per PR; branch `feature/<#>-<slug>`; PR title `[Feature] <#>: <title>`; body says `Closes #<#>`; squash-merge.

## Never

- Skip the contract gate when a feature touches HTTP endpoints, UI screens, or shared schemas.
- Add backlog rows to `IMPLEMENTATION-PLAN.md` — features live in GitHub Issues; the file holds conventions only.
- Start a feature whose Depends issues are still open.
- Close a feature issue by hand — let the PR close it via `Closes #<#>`.
