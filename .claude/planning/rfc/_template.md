---
id: RFC-NNN
title: <proposal, in one line>
status: Draft                        # Draft | In Review | Approved | Rejected
date: YYYY-MM-DD
author: pm-agent (sponsor: <name / role>)
prd: .claude/planning/prd/NNN-<slug>.md      # source PRD, if derived from one
spec: [SPEC-NNN]
ticket: <issue / ticket link>
---

# RFC-NNN — <title>

> Formal proposal. Twelve sections; `/rfc` fills all of them, the tech lead challenges them, and
> Section 12 records the sign-offs that let design (`/adr`) begin. Historical record.

## 1. Problem statement

The problem, specific and measurable. If derived from a PRD, name it here and restate only what
the RFC adds.

## 2. User impact

Who is affected, how, and how often. Before / after.

## 3. Requirements

### 3.1 Functional
- **FR1** — … (traces to `SPEC-NNN §R<n>` / PRD AC)

### 3.2 Non-functional
Performance, security, backward compatibility, accessibility, compliance — measurable targets.
- **NFR1** — …

## 4. User stories

As a <role>, I want <capability> so that <outcome>. Acceptance criteria per story.

## 5. MVP scope

In the first release / deferred, with the reason for each deferral.

## 6. Success metrics

Baseline → target, and where the number comes from.

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|

## 8. Dependencies

Systems, teams, contracts (`../models/` schemas), migrations, external parties.

## 9. Documentation impact

Which living docs change (`../architecture/*.md`, `SPEC-NNN`, `AGENTS.md`) and whether an ADR is
required.

## 10. Open questions

| Question | Owner | Due | Resolution |
|---|---|---|---|

## 11. Timeline

Milestones and the GitHub milestone (phase) this targets.

## 12. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Product (PM) | | | |
| Tech Lead | | | |
| Engineering Manager | | | |
| Stakeholder(s) | | | |
