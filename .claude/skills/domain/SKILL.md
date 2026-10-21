---
allowed-tools: Task, AskUserQuestion, Bash(git:*), Bash(ls:*)
description: Domain modeling workshop — bounded contexts, aggregates, ubiquitous language
argument-hint: '[domain area or feature name]'
disable-model-invocation: true
---

PM elicits domain knowledge from the stakeholder, Tech Lead designs the model. Lead coordinates only.

**Delegate mode**: You must NOT author domain model content.

## Current State

- Branch: !`git branch --show-current`
- Existing domain models: !`ls .claude/planning/architecture/domain-*.md 2>/dev/null || echo "None"`
- Existing PRDs: !`ls .claude/planning/prd/*.md 2>/dev/null | grep -v _template | grep -v README || echo "None"`
- Existing RFCs: !`ls .claude/planning/rfc/*.md 2>/dev/null | grep -v _template | grep -v README || echo "None"`

## Domain Area

$ARGUMENTS

If empty, ask the user which domain area or feature to model before proceeding.

## Workflow

### Phase 1: Domain Discovery (PM)

Invoke `pm-agent` to interview the stakeholder via `AskUserQuestion`:

- What are the core business processes in this area? (e.g., "a customer places an order", "an operator approves a request")
- Who are the actors and what roles do they play?
- What are the key business terms and what do they mean precisely? Are any terms ambiguous or used differently by different people?
- What are the rules that can never be violated? (invariants — e.g., "an order cannot be placed with zero items")
- What meaningful events happen in this domain? (things that trigger reactions elsewhere)
- What changes frequently vs. what is stable?

PM produces: a raw domain glossary with terms, definitions, example sentences, invariants noted, and ambiguities flagged.

### Phase 2: Domain Model Design (Tech Lead)

Invoke `tech-lead-agent` to:
- Read any existing domain model docs in `.claude/planning/architecture/`
- Read existing PRDs/RFCs relevant to this domain area (listed in Current State above)
- Design the domain model from the PM's glossary:
  - Identify bounded contexts and draw their boundaries
  - Identify aggregate roots (what entity enforces the invariants?)
  - Identify entities (have identity, mutable) within each aggregate
  - Identify value objects (no identity, immutable, validated on construction)
  - Define domain events (what meaningful state transitions happen?)
  - Map integration points between bounded contexts (ACL, events, shared kernel)
- Read the template at `.claude/planning/architecture/domain-model.md` if it exists
- Write the domain model to `.claude/planning/architecture/domain-{slug}.md`
- Report path and brief summary

### Phase 3: Synthesize

```markdown
## Report: Domain Model

**Path**: `.claude/planning/architecture/domain-{slug}.md`

### Bounded Contexts
- [Context name]: [scope and core responsibility]

### Aggregate Roots
- [Aggregate]: [key invariant it enforces]

### Ubiquitous Language (key terms)
- [Term]: [definition]

### Open Design Questions
- [Unresolved boundary or ambiguous term — to resolve before implementation]

### Handoff
- Next: `/rfc` or `/adr` (to design the technical solution)
- Key constraints for architects: [invariants, consistency rules, cross-context dependencies]
```

## Important Notes

- **PM elicits, Tech Lead designs** — PM owns the language discovery, Tech Lead owns aggregate and context boundaries
- **Living document** — domain model docs update in place as understanding evolves; do not create a new file for refinements
- **Ubiquitous language is law** — all downstream code, tests, and docs must use the exact terms from this document
- **Run before `/rfc` or `/adr`** when designing a new feature that introduces domain concepts not yet modelled
