---
allowed-tools: Bash(git:*), Bash(gh:*), Skill
argument-hint: '[title]'
description: Create or update a pull request for the current branch
---

Create or update a PR for the current branch.

## Current State

- Branch: !`git branch --show-current`
- Commits: !`git log --oneline origin/main..HEAD 2>/dev/null || echo "No commits yet"`
- Changed files: !`git diff --name-only origin/main..HEAD 2>/dev/null || echo "No changes yet"`
- Remote: !`git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "Not pushed yet"`
- Existing PR: !`gh pr view --json url,title 2>/dev/null || echo "None"`

## Instructions

### 0. Pre-PR (REQUIRED)

Run `/verify` first. STOP if anything fails.

Note which layers the diff touches (`.claude/planning/architecture/layer-map.md`) and whether it introduces any new cross-layer dependency. Include a one-paragraph summary in the PR body under an `## Architectural Impact` section.

**Check the diff against the plan.** Locate the `PLAN-NNN` for this branch (`rg -l "branch: <current branch>" .claude/planning/plan/`). Compare `git diff --name-only origin/main..HEAD` with its *Files that change* table. Every file changed but not listed, and every listed file not changed, must either appear under the plan's *Departures from plan* or be fixed before the PR opens — amend the plan (same commit, with the reason) or revert the drift. Paste the plan's *Proof* evidence (test output, screenshots) into the PR body. No plan on a Standard/Feature-sized change → STOP and write one retroactively via `/implement` Step 3, stating that it is retroactive.

### 1. Existing PR? → Update

1. `git push`
2. Update title with `gh pr edit --title "$ARGUMENTS"` if provided or scope shifted
3. If new commits added significant changes, update body with fresh summary using HEREDOC

### 2. No PR → Create

1. If uncommitted changes: run `/commit` first
2. `git push -u origin HEAD` if not pushed
3. Analyze commits: `git log origin/main..HEAD --oneline`, `git diff --stat origin/main..HEAD`
4. Create PR via HEREDOC:

```bash
gh pr create --base main --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 sentences>

## Changes
- **Services**: ...
- **Tests**: ...
- **Documentation**: ...

## Test Plan
- [x] All tests passing
- [x] Type check passing
- [x] Lint passing
- [ ] Manual verification: ...

## Documentation
- [ ] PRD created/updated
- [ ] ADR created/updated
- [ ] Architecture docs updated (if mechanism changed)

## Docs kept current
- CLAUDE.md / AGENTS.md / architecture docs: <unchanged and still accurate | updated in this PR: <files>> — a change that renames a command, alters a convention, or changes a mechanism must update them here, not later
- CLAUDE.md corrections from review (twice rule): <none | added: "<line>">

## Plan compliance
- Plan: `.claude/planning/plan/PLAN-NNN-slug.md`
- Files changed vs. plan: <all listed | N departures, recorded in the plan>
- Proof delivered: <tests / screenshots named in the plan — pasted above>

## Related
- PRD: `.claude/planning/prd/NNN-slug.md`
- ADR: `.claude/planning/adr/ADR-NNN-slug.md`
- Issue: [TICKET-NNN](https://your-tracker/issue/TICKET-NNN)
EOF
)"
```

### Title

- Conventional Commits: `<type>(<scope>): <description>`
- Use `$ARGUMENTS` if provided; otherwise derive from branch name or most significant commit

### Issue Tracker

> **TODO**: Replace the issue tracker link pattern above with your actual tracker (Linear, Jira, GitHub Issues, etc.).

### Return the PR URL.

**NEVER** include AI attribution footers. See `.claude/rules/git-workflow.md`.
