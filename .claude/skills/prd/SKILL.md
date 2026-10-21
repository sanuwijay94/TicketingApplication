---
allowed-tools: Task, AskUserQuestion, Bash(git:*), Bash(ls:*)
description: Create a PRD with PM authoring and Tech Lead challenge debate
disable-model-invocation: true
---

PM drafts PRD, Tech Lead challenges it. Lead coordinates only.

**Delegate mode**: You must NOT author PRD content.

## Current State

- Branch: !`git branch --show-current`
- Existing PRDs: !`ls .claude/planning/prd/*.md 2>/dev/null | grep -v _template | grep -v README || echo "None"`
- Existing ADRs: !`ls .claude/planning/adr/*.md 2>/dev/null | grep -v TEMPLATE | grep -v README || echo "None"`

## Feature

$ARGUMENTS

## Workflow

### Phase 1: PRD Authoring

Invoke `pm-agent` (Task tool) to:
- Ask stakeholder clarifying questions via `AskUserQuestion` (problem, users, outcome, constraints)
- Define requirements, acceptance criteria, user stories, MVP vs deferred scope, success metrics, risks
- Read template at `.claude/planning/prd/_template.md`
- Determine next PRD number (sequential)
- Create file at `.claude/planning/prd/NNN-{slug}.md` with `status: Draft` frontmatter
- Report path and 2–3 sentence summary

### Phase 2: Challenge Debate

Invoke `tech-lead-agent` to challenge the PRD on:
- Problem definition clarity
- Requirements (missing? ambiguous? untestable?)
- Scope (MVP vs deferred — line drawn well?)
- Success metrics (measurable?)
- Technical risks PM may have missed

Invoke `pm-agent` again to respond: defend or revise. PM applies agreed revisions to the PRD file.

### Phase 3: Synthesize

```markdown
## Report: PRD

**Path**: `.claude/planning/prd/NNN-slug.md` — Draft

### Challenge Summary
- [Section] → [Resolution/Revision]

### Unresolved Disagreements
- [Points without consensus]

### Handoff
- Next: `/adr NNN-slug`
- Key decisions for ADR: [technical considerations]
```

## Important Notes

- **PM owns the PRD file** — Tech Lead challenges, PM applies revisions
- **Stakeholder interaction** — only during Phase 1
- **Issue link** — note the ticket ID in PRD body if provided
