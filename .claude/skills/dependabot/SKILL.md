---
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(npx:*), Read, Grep, Glob, Task
description: Triage and resolve Dependabot security alerts or Dependabot PRs
argument-hint: '[alert-number | "pr <number>"]'
---

Triage a Dependabot alert by number, combine two related alerts, or evaluate a Dependabot PR.

## Usage

- `/dependabot 58` — single alert
- `/dependabot 58 59` — two combined alerts
- `/dependabot pr 724` — evaluate a Dependabot PR

If no args: list open alerts, stop, let user pick.

```bash
gh api repos/{owner}/{repo}/dependabot/alerts --jq '.[] | select(.state == "open") | {number, severity: .security_advisory.severity, package: .security_vulnerability.package.name, summary: .security_advisory.summary}'
```

## Workflow

### 1. Read alert(s)

**If `pr <N>`**: fetch the PR, extract package + version, find linked alerts by package name.
**If alert number(s)**: `gh api repos/{owner}/{repo}/dependabot/alerts/<N> --jq '{number, state, severity: .security_advisory.severity, summary: .security_advisory.summary, package: .security_vulnerability.package.name, vulnerable_range: .security_vulnerability.vulnerable_range, patched_version: .security_vulnerability.first_patched_version.identifier}'`

Report: alert #, severity, package, vulnerable range, patched version.

### 2. Determine dependency type

- Direct: `grep "<pkg>" package.json`
- Transitive: `grep -B5 '"<pkg>"' package-lock.json | head -30`

### 3. Check codebase usage

- `grep -r "<pkg>" src/ test/ --include="*.ts" --include="*.js"`

Report which files import it and whether usage is affected.

### 3b. Removal check

If **not imported anywhere**: check if the parent that pulls it in is used. If parent is unused too, **suggest removal** (don't remove automatically).

```bash
npm ls <pkg>                                # find parent
grep -r "<parent>" src/ test/               # is parent used?
grep "<parent>" package.json                # is parent direct?
```

### 4. Existing Dependabot PR?

`gh pr list --search "dependabot" --json number,title,state,headRefName --jq '.[] | select(.title | test("<pkg>"; "i"))'`

### 5. Resolve

**Path A — PR exists**:
```bash
gh pr checkout <PR>
npm ci
npx tsc --noEmit --pretty
npx jest --testPathPattern="<pkg-related>" --passWithNoTests
git checkout -
```

**Path B — transitive, no PR**: update the parent package in `package.json`, `npm install`, verify with `npm ls <pkg>`.

**Path C — direct, no PR**: check changelog/breaking changes, bump version, `npm install`, typecheck, run relevant tests.

### 6. Summary

Report alert #, resolution path (A/B/C), whether PR is safe to merge or local changes were made, remaining items for user.

## Rules

- **Never promote transitive to direct** — update the parent instead
- **`npm ci`** (not `npm install`) when checking out a Dependabot PR branch
- **Typecheck after any dep change** to catch breaking API changes
- **Read release notes** before major-version bumps
- **One or two alerts per invocation** — combine only if same dependency tree
- **PR mode**: always resolve the linked alert too — report both PR safety and alert details
- **Prefer removal over upgrade** when the vulnerable package (or its unused parent) is unused
