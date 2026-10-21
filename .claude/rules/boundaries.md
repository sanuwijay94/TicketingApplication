# Boundaries

## Always

- Run `/test` before committing; `/verify` before PR
- Use `/commit` for commits and `/pr` for pull requests — never direct `git commit` / `gh pr create`
- Address lint and type warnings — do not silently ignore
- Update documentation when making changes (architecture docs, `AGENTS.md`) — see [documentation.md](documentation.md) for ADR policy
- Consult the permanent knowledge layer (`.claude/planning/architecture/`) for mechanism questions before spawning research agents

## Never

- Commit secrets, API keys, credentials, or private keys
- Modify `.env` files (use `.env.example` for templates)
- Push directly to `main`
- Use `console.log` — use the project's structured logger
- Use `any` or `@ts-ignore` without a justification comment
- Bypass the custom error hierarchy — always extend the base error class

## Ask First

- Adding new dependencies to `package.json`
- Creating new background workers or long-running processes
- Modifying queue management, rate limiting, or retry logic
- Changes to infrastructure configuration
- Modifying environment variable definitions
- Architectural changes not already covered by an ADR
- Silencing a lint/type warning (present trade-offs and get approval first)
