# Testing

## Always

- Tests must exist for all modified code — no untested changes
- Use factories (e.g., `UserFactory.build()`) — never hardcoded test data
- Unit tests mirror `src/` structure under `test/unit/`
- Integration tests under `test/integration/`, E2E under `test/e2e/`
- Run `/test` before committing (Karma + Jasmine + TSLint + tsc in parallel)
- Run `/verify` before creating a PR

## Import Aliases (in tests)

- `@/` → `src/` (source imports via tsconfig path alias)
- `@test/` → `test/` (factories, helpers, fixtures)
- `../models/` / `../models/` → workspace packages

## Commands

| Command | Purpose |
|---------|---------|
| `/test` | Full suite (Karma + Jasmine + lint + typecheck, parallel) |
| `/test unit` | Unit tests only |
| `/test integration` | Integration tests only |
| `/test lint` | Linting only |
| `/test fix` | Auto-fix lint issues |
| `/verify` | Comprehensive quality checks via `verify-app` |

See `test/README.md` for detailed testing conventions.

## DDD + Clean Architecture Testing Strategy

Each layer has a distinct testing approach:

| Layer | Test type | Location | Mocking strategy |
|-------|-----------|----------|-----------------|
| `domain/entities/` + `domain/value-objects/` | Unit | `test/unit/domain/` | None — pure functions, no mocks needed |
| `domain/services/` | Unit | `test/unit/domain/` | Mock repository interfaces if needed |
| `application/use-cases/` | Unit | `test/unit/application/` | Mock all ports (repository interfaces, external service ports) |
| `infrastructure/repositories/` | Integration | `test/integration/` | Real DB / test containers — never mock the database in integration tests |
| `presentation/http/` | Integration | `test/integration/` | Mock use cases — test HTTP contract only |

**Domain layer tests** are the most valuable: they test pure business logic with no setup overhead. Write them first.

**Use case tests** mock ports at the interface boundary — never mock concrete implementations.

**Factories** must mirror the domain model: `OrderFactory.build()` produces a valid `Order` aggregate, not a plain object.

## Never

- Commit with any failing test, type error, or lint error
- Mark tests `.skip()` or `.only()` without explicit user approval
- Edit a test file while `.claude/session-state/fix-mode` exists — `/fix` locks tests between the failing test and the fix; `.claude/hooks/test-protection-gate.sh` enforces it, and only the engineer removes the marker
- Mock a concrete class instead of its interface
- Write domain logic tests that require a database or HTTP setup
