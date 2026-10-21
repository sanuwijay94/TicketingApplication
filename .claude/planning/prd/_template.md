---
id: NNN
title: <feature, in one line>
status: Draft                        # Draft | Approved | Implemented
date: YYYY-MM-DD
author: pm-agent (stakeholder: <name / role>)
intent: intent/NNN-<slug>.md         # the accepted intent this PRD formalises, if any
spec: [SPEC-NNN]                     # governing requirement spec(s); cite rules as SPEC-NNN §R<n>
implemented_by: []                   # [.claude/planning/adr/ADR-NNN-<slug>.md, …] — mirror of the ADR's implements
issue: "#N"                          # GitHub feature issue (type:feature), when filed
---

# PRD-NNN — <title>

> Product requirements, not technical implementation. Include: problem, user impact,
> requirements, acceptance criteria, MVP scope, success metrics, risks. Exclude: libraries, code,
> schemas, implementation detail — those belong to the ADR. Historical record: never rewritten.

## 1. Problem statement

What cannot be done today, for whom, and the cost of that. Quote the intent where it exists.

## 2. Users and impact

| User / role | Today | After |
|---|---|---|

## 3. User stories

Grouped so QA can derive cases per story (`/write-qa-cases` groups by `US<n>`).

### US1 — <title>
As a <role>, I want <capability> so that <outcome>.

**Acceptance criteria**
- **AC1.1** — <observable, testable statement>
- **AC1.2** — …

### US2 — <title>
…

## 4. Requirements

**Functional** — numbered; each traces to an acceptance criterion or a `SPEC-NNN §R<n>` rule.
- **FR1** — …

**Non-functional** — performance, security, accessibility (WCAG 2.1 AA for UI), compliance,
auditability. State the measurable target, not the adjective.
- **NFR1** — …

## 5. Scope

**MVP (this PRD)** — the slice that ships first.
**Deferred** — explicitly out of scope now, with the reason. Mirror in `MVP-SCOPE.md`.

## 6. Success metrics

How we will know it worked, with the baseline and the target. Prefer metrics already emitted.

## 7. Risks and open questions

| Risk / question | Owner | Resolution |
|---|---|---|

## 8. Traceability

- **Intent**: `intent/NNN-<slug>.md`
- **Spec**: `SPEC-NNN §R<n>` …
- **RFC**: `.claude/planning/rfc/RFC-NNN-<slug>.md` (if formal sign-off is needed)
- **ADR**: filled in `implemented_by` by `/adr`
- **Test plan**: `.claude/planning/qa/test-plans/TP-NNN-<slug>.md`
