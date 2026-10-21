# TypeScript

## Always

- Strict mode — code must pass strict type checking
- Add types to all function signatures
- Custom errors extend the project base error class (e.g., `AppError`)
- Structured logging via the project logger — **never use `console.log`**
- Async/await preferred over raw promises/callbacks
- Optional chaining (`?.`) and nullish coalescing (`??`)

## Imports

| Location | Imports |
|----------|---------|
| `src/` — runtime | `@/` path alias (`@/*` → `./src/*`) or relative paths for same-module; `../models/` / `../models/` for workspace packages |
| `test/` | `@/` for source imports, `@test/` for test helpers/factories, `@ticketing-application/*` for workspace packages |

Import order: stdlib → third-party → first-party.

## Never

- `any` without a justification comment explaining why
- `@ts-ignore` / `@ts-expect-error` without a comment
- Generic `Error` — always extend the project base error class
- Silently add type/lint ignore comments (see [boundaries.md](boundaries.md) — Ask First)

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Files | `kebab-case.ts` | `user-service.ts` |
| Classes / Interfaces | `PascalCase` | `UserService` |
| Functions / variables | `camelCase` | `getUser` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
