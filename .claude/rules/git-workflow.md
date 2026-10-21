# Git Workflow

## Commit Format

Follow the Conventional Commits specification.

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`
**Scopes**: Component affected (e.g., `auth`, `api`, `queue`, `db`)

Example: `feat(auth): add JWT refresh token rotation`

## AI Attribution

**Never include AI-generated footers in version control.** No "Generated with Claude Code", no "Co-Authored-By: Claude", no AI signatures/watermarks/links in commits, PRs, code comments, or documentation. Work is attributed to the developer.

## Always

- Use `/commit` for commits — never run `git commit` directly (ensures format + quality gates)
- Use `/pr` for pull requests — never run `gh pr create` directly
- Before `git push`, check if a PR is already open (`gh pr view --json state`); if so, use `/pr` instead

## Branches

- `main` — production-ready code
- Feature branches: `feature/<description>` or `feature/<ticket-id>`

## Never

- Push directly to `main`
- Commit with failing tests, type errors, or lint errors
- Commit `.env`, secrets, API keys, credentials, or private keys
