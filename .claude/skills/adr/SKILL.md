---
allowed-tools: Task, AskUserQuestion, Bash(git:*), Bash(ls:*)
description: Create an ADR from a PRD with Tech Lead authoring and Developer challenge
argument-hint: '[prd-slug-or-path]'
disable-model-invocation: true
---

Tech Lead drafts ADR, Developer challenges it, Tech Lead revises, PM validates scope.

**Delegate mode**: You must NOT author ADR content.

## Current State

- Branch: !`git branch --show-current`
- Existing PRDs: !`ls .claude/planning/prd/*.md 2>/dev/null | grep -v _template | grep -v README || echo "None"`
- Existing ADRs: !`ls .claude/planning/adr/*.md 2>/dev/null | grep -v TEMPLATE | grep -v README || echo "None"`

## PRD

$ARGUMENTS

Accepts slug (`multi-queue-per-workspace`), number (`003`), or path. If empty, list PRDs and ask which.

## Workflow

### Phase 1: ADR Authoring (Tech Lead)

Invoke `tech-lead-agent` to:
- Read the PRD
- Research patterns in `.claude/planning/architecture/` (permanent knowledge)
- Analyze codebase for existing patterns
- Design architecture: components, data flow, trade-offs, risks
- Determine next ADR number (sequential)
- Create ADR at `.claude/planning/adr/ADR-NNN-{slug}.md` with `status: Proposed` frontmatter and `implements: [<prd-path>]`
- Report path and summary

### Phase 2: Challenge (Developer)

Invoke `developer-agent` (analyze only, no edits) to challenge the ADR on:
- Feasibility (can this be built as designed?)
- Testability (how do we validate the architecture?)
- Hidden complexity (what's underestimated?)
- Edge cases missing from design
- Conflicts with existing patterns in `architecture/`

Invoke `tech-lead-agent` to defend or revise. Tech Lead applies agreed revisions.

### Phase 3: Validate (PM)

Invoke `pm-agent` to confirm the ADR satisfies the PRD's acceptance criteria. Note any gaps in the report.

### Phase 4: Update PRD Frontmatter

Update the PRD's `implemented_by` field to include the new ADR path.

### Phase 5: Synthesize

```markdown
## Report: ADR

**Path**: `.claude/planning/adr/ADR-NNN-slug.md` — Proposed
**Implements**: `.claude/planning/prd/NNN-slug.md`

### Developer Challenges
- [Challenge → Resolution]

### PM Validation
- [x] All PRD acceptance criteria covered
- [ ] Gaps: [list if any]

### Handoff
- Next: `/implement ADR-NNN`
```

## Important Notes

- **Tech Lead owns the ADR file**
- **Consult `architecture/`** — mechanism docs are authoritative
- **PRD link is bidirectional** — ADR `implements` field and PRD `implemented_by` field must match
