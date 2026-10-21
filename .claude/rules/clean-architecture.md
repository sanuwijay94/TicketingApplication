# Clean Architecture

## Layer Structure

```
src/domain/          — Entities, aggregate roots, value objects, domain events, domain services, repository interfaces
src/application/     — Use cases, input/output ports, DTOs
src/infrastructure/  — Repository implementations, ORM/DB adapters, external service clients
src/presentation/    — HTTP controllers, CLI handlers, GraphQL resolvers, WebSocket handlers
```

## Dependency Rule

**Dependencies always point inward. Outer layers depend on inner layers — never the reverse.**

```
Presentation ──→ Application ──→ Domain
Infrastructure ──→ Application ──→ Domain
```

- `domain/` has zero dependencies on any other layer
- `application/` has zero dependencies on `infrastructure/` or `presentation/`
- `infrastructure/` implements interfaces (ports) defined in `domain/` or `application/`
- `presentation/` calls `application/` use cases only — never touches `infrastructure/` directly

## Always

- One use case per class in `application/use-cases/` — no multi-responsibility use case classes
- Repository interfaces (ports) live in `domain/repositories/` — implementations live in `infrastructure/repositories/`
- DTOs live in `application/dtos/` — never pass raw domain entities to the presentation layer
- Domain events live in `domain/events/` and are named in past tense (`OrderPlaced`, `UserRegistered`)
- Inject all dependencies via constructor — no `new ConcreteClass()` inside domain or application layers
- When adding a new external integration, create a port interface in `application/ports/` and an adapter in `infrastructure/external/`
- Map domain errors to HTTP status codes at the presentation layer boundary only

## Never

- Import ORM models, HTTP types, database clients, or framework-specific types inside `domain/`
- Import ORM models or HTTP types inside `application/`
- Call use cases directly from `infrastructure/`
- Use `any` to bypass layer boundaries
- Put business logic (validation, calculations, rules) in controllers, repositories, or infrastructure adapters
- Reach across bounded contexts without an anti-corruption layer

## Ask First

- Introducing a new top-level layer or sublayer
- Adding cross-cutting concerns (logging, caching, transactions) — decide which layer owns the interface vs. implementation
- Moving a concept from one layer to another (e.g., promoting infrastructure logic to application)
- Any change to the dependency injection composition root
