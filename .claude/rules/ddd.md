# Domain-Driven Design

## Core Concepts

| Concept | Rule |
|---------|------|
| **Entity** | Has identity (`id`), mutable, lives in `domain/entities/` |
| **Value Object** | No identity, immutable, compared by value, validated on construction, lives in `domain/value-objects/` |
| **Aggregate Root** | Cluster of entities/VOs with one root; all mutations go through the root |
| **Domain Service** | Stateless logic that doesn't belong to a single entity, lives in `domain/services/` |
| **Domain Event** | Records something that happened, past tense, immutable, lives in `domain/events/` |
| **Repository** | One per aggregate root — interface in `domain/repositories/`, implementation in `infrastructure/` |
| **Use Case** | One per user action — orchestrates domain objects, lives in `application/use-cases/` |

## Ubiquitous Language

All code, tests, comments, and documentation must use the exact terms defined in `.claude/planning/architecture/domain-model.md`.

- If a term is not in `domain-model.md`, add it before using it in code
- If code uses a different term than the glossary, update the code — not the glossary
- Flag terminology drift in PRs — treat it as a bug

## Always

- Enforce aggregate invariants inside the aggregate root — not in use cases or services
- Use value objects for concepts with validation rules (e.g., `Email`, `Money`, `PhoneNumber`)
- Name domain events in past tense: `OrderPlaced`, `PaymentFailed`, `UserDeactivated`
- Raise domain events inside aggregate methods — not in use cases
- Reference other aggregates by ID only — never by object reference
- Scope transactions to one aggregate — cross-aggregate consistency uses domain events
- Read `.claude/planning/architecture/domain-model.md` before designing or implementing any domain concept

## Aggregate Design Rules

- Keep aggregates small — an aggregate root plus only the entities and VOs it exclusively owns
- Only the aggregate root has a public repository — inner entities have no standalone repository
- If two aggregates need to change together in one transaction, reconsider whether they belong to the same aggregate

## Never

- Put business rules, invariants, or calculations in use cases, controllers, or infrastructure
- Allow infrastructure types (ORM annotations, database IDs, HTTP types) on domain entities or value objects
- Create a value object with mutable state
- Create a repository for a non-root entity
- Name domain concepts with generic words: "manager", "helper", "processor", "handler", "util" — name what the concept IS

## Bounded Contexts

- Each bounded context has its own ubiquitous language — the same word can mean different things in different contexts
- Cross-context communication goes through an anti-corruption layer (ACL) in `infrastructure/`
- Document bounded context boundaries and integration contracts in `.claude/planning/architecture/domain-model.md`

## Ask First

- Changing an aggregate boundary (adding or removing entities from an aggregate)
- Introducing a new bounded context
- Changing an existing ubiquitous language term in `domain-model.md`
- Using eventual consistency across aggregates (requires explicit decision)
