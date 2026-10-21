---
allowed-tools: Task, AskUserQuestion, Bash(git:*), Bash(ls:*)
description: Create an RFC with PM authoring and Tech Lead challenge debate
argument-hint: '[feature description or prd-slug]'
disable-model-invocation: true
---

PM authors RFC, Tech Lead challenges it, PM revises. Lead coordinates only.

**Delegate mode**: You must NOT author RFC content.

## Current State

- Branch: !`git branch --show-current`
- Existing RFCs: !`ls .claude/planning/rfc/*.md 2>/dev/null | grep -v _template | grep -v README || echo "None"`
- Existing PRDs: !`ls .claude/planning/prd/*.md 2>/dev/null | grep -v _template | grep -v README || echo "None"`

## Feature or PRD

$ARGUMENTS

Accepts a feature description or a PRD slug/path. If a PRD is provided, pm-agent should use it as the source of truth for the problem statement, user impact, and requirements. If empty, list existing PRDs and ask which to use (or whether to start from scratch).

## Workflow

### Phase 1: RFC Authoring (PM)

Invoke `pm-agent` to:
- If a PRD path/slug was provided, read it and use its content as the basis for the RFC
- If no PRD was provided, ask stakeholder clarifying questions via `AskUserQuestion` (problem, affected users, expected outcome, constraints, Linear/ticket link)
- Draft the RFC covering all 12 sections of the template
- Read template at `.claude/planning/rfc/_template.md`
- Determine next RFC number by scanning existing files (sequential)
- Create file at `.claude/planning/rfc/RFC-NNN-{slug}.md` with `status: Draft`
- If derived from a PRD, note the source PRD path in the RFC body under Section 1
- Report path and 2–3 sentence summary

### Phase 2: Challenge Debate (Tech Lead)

Invoke `tech-lead-agent` to challenge the RFC on:
- Problem definition — is it specific and measurable enough?
- Functional requirements — missing, ambiguous, or untestable?
- Non-functional requirements — performance, security, backward compatibility gaps
- Scope — is the MVP line drawn correctly? What is over-scoped or under-scoped?
- Risks — technical risks PM may have missed
- Open Questions — are the right questions surfaced?
- Documentation impact — is the ADR dependency correctly identified?

Invoke `pm-agent` again to respond: defend or revise. PM applies agreed revisions to the RFC file.

### Phase 3: Synthesize

```markdown
## Report: RFC

**Path**: `.claude/planning/rfc/RFC-NNN-slug.md` — Draft

### Challenge Summary
- [Section] → [Resolution/Revision]

### Unresolved Points
- [Points that remain open — captured in Section 10 Open Questions]

### Approval Needed
RFC is ready for stakeholder review. Section 12 Approval table tracks sign-offs from PM, Tech Lead, EM, and Stakeholders before proceeding.

### Handoff
- Next: `/adr RFC-NNN-slug` (after approval)
- Key decisions for ADR: [technical considerations surfaced during challenge]
```

## Important Notes

- **PM owns the RFC file** — Tech Lead challenges, PM applies revisions
- **Stakeholder interaction** — only during Phase 1 (if no PRD provided)
- **Approval gate** — Section 12 must have reviewer names filled before ADR proceeds
- **Ticket link** — capture the Linear/Jira/GitHub issue link in RFC frontmatter if provided
