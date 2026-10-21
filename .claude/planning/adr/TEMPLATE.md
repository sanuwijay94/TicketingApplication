---
id: ADR-NNN
title: <decision, in one line>
status: Proposed                     # Proposed | Accepted | Implemented | Superseded by ADR-NNN
date: YYYY-MM-DD
implements: [.claude/planning/prd/NNN-<slug>.md]   # the PRD(s) this design satisfies; mirror in the PRD's implemented_by
supersedes: []                       # [ADR-NNN, …]
deciders: <tech lead; architect for higher-risk>
---

# ADR-NNN — <title>

**Status**: Proposed
**Amends spec**: —                   <!-- SPEC-NNN if this changes spec-governed behaviour; the spec must then cite this ADR -->

> Historical record: the reasoning at decision time. Do not rewrite when the code evolves —
> supersede with a new ADR. Mechanism docs in `../architecture/` carry the *current* state.

## Context

The problem this decision answers, in terms of the PRD's acceptance criteria and the constraints
that bound the solution (existing architecture, `SPEC-NNN §R<n>` rules, NFRs). Cite
`../architecture/layer-map.md` and `domain-*.md` where they constrain the design.

## Decision

What we will build. Components and their responsibilities, the data flow between them, and where
each lands in the layer structure (domain / application / infrastructure / presentation). Name the
aggregates, value objects, ports, and adapters introduced or changed, using the ubiquitous
language from `../architecture/domain-model.md`.

## Alternatives considered

| Option | Why not |
|---|---|
| <alternative> | <the trade-off that ruled it out> |

## Trade-offs and consequences

What becomes easier, what becomes harder, what we are deliberately accepting. Call out every new
cross-layer dependency explicitly (the tech-lead checklist in `.claude/agents/tech-lead-agent.md`).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|

## Testability

How the architecture is validated: which layer each behaviour is tested at
(`.claude/rules/testing.md`), what the contract tests cover, what needs a browser check.

## Acceptance criteria coverage

| PRD acceptance criterion | Satisfied by |
|---|---|
| <AC from the PRD> | <component / mechanism> |

## Traceability

- **PRD**: `.claude/planning/prd/NNN-<slug>.md`
- **RFC**: `.claude/planning/rfc/RFC-NNN-<slug>.md` (if any)
- **Spec**: `SPEC-NNN §R<n>` (rules this design implements or amends)
- **Plan**: `.claude/planning/plan/PLAN-NNN-<slug>.md` (added by `/implement`)
- **Architecture docs to update on implementation**: `../architecture/<mechanism>.md`
