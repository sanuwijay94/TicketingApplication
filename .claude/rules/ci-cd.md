# CI/CD

> **⏳ CD not yet implemented (as of 2026-07-04).** The **deploy / CD half of this
> document describes the target state, not what exists.** Today CI stops at
> `docker-build` (images are validated, **not** pushed — `ci.yml`: no registry, no
> deploy job, no CI secrets). There is **no automated staging or production deploy**.
> Deployment is **manual** via the `deploy/` image bundle (`deploy/README.md`).
> The "Staging: Automatic" / "Production: Manual gate" rows below, and the auto-deploy
> bullets, are **planned** — introducing them is an ADR-worthy change (see "Ask First").

## Pipeline Stages (platform-agnostic)

Every CI pipeline must run these stages in order:

```
lint + typecheck → unit tests → integration tests → e2e/regression → docker build → deploy (CD only)
```

Lint and typecheck run in parallel with unit tests where the platform allows it.

## Always

- CI must mirror `/test` exactly — what passes locally must pass in CI, and vice versa
- Every PR requires all CI stages to pass before merge — no bypassing
- Integration tests run against real services (DB, cache) via containers — never mocked at CI level
- E2E tests run against a fully assembled stack (docker compose or equivalent)
- Docker images are built and validated on every PR — push to registry only on merge to main
- Secrets and credentials are stored in CI environment variables / secret store — never in code or config files
- Coverage reports are uploaded as CI artifacts and retained for 7 days minimum
- Deployment to production requires a manual approval gate
- Staging deployment runs automatically on merge to main; production requires explicit approval

## Pipeline Environment Variables

Document all required CI environment variables in `.env.example`. Every variable used in CI must have a corresponding entry. CI fails if a required variable is missing.

## Docker

- Use multi-stage builds: `builder` stage (compile + install) → `production` stage (runtime only)
- Production image must not contain `devDependencies`, source files, or test files
- Image tags: `sha-<commit>` for traceability, `latest` for the current main branch
- Health check endpoint (`/health`) must exist and be tested in post-deploy smoke tests

## Test Environments

| Environment | Triggered by | Services | Deployment |
|-------------|-------------|----------|-----------|
| CI (PR)     | Pull request | Containerised (ephemeral) | None — **implemented** (`ci.yml`) |
| Staging     | Merge to main | Shared staging DB/cache | Automatic — **⏳ planned; manual via `deploy/` today** |
| Production  | Manual approval | Production services | Manual gate — **⏳ planned; manual via `deploy/` today** |

## Deployment model — how an agent is allowed to ship (target state)

> ⏳ Like the rest of the CD half, this is the **target** the pipeline is built towards, not what
> exists today. It is here so that the first CD work builds the right shape.

- **Deployment is a tool surface, not a shell script with credentials.** Deploy, status and
  rollback are exposed to the agent as **MCP tools scoped per environment** — an allowlist the
  platform team owns. The agent never holds a deploy credential; the MCP server does.
- **Autonomy is tiered by environment:**

  | Environment | The agent may… | Gate |
  |---|---|---|
  | Development | deploy freely | none |
  | Staging | deploy on merge to `main`; run smoke; **rehearse rollback** | post-deploy smoke must be green |
  | Production | **prepare** the release (notes, tag, staging evidence) — and nothing past it | a named **release manager authorises**; `production-gate.sh` (ai-factory) blocks the deploy without `RELEASE_APPROVAL` |

- **The agent acts under its own identity** in the pipeline (`FACTORY_GITHUB_TOKEN`, not an
  engineer's token), so the log separates what the agent did from what the person who triggered
  it did.
- **Rollback is the most rehearsed path.** One command, exercised regularly in staging (at least
  once per release cycle), because the monitoring loop (Stage 6) will call it under pressure with
  no human on the keyboard. `/release` refuses a production tag if the rollback has not been
  rehearsed within the window.
- **Read-only judgment steps first.** The first `claude -p` steps in a pipeline triage a failed
  build, summarise a flaky test, or draft the changelog — they write nothing. Write steps
  (fix lint, update generated docs, address `@claude` review comments) come behind the existing
  gates and arrive as PRs through branch protection; the agent has no route to push to `main`.

## Never

- Merge with failing CI — no exceptions, no `--force`
- Store secrets, tokens, or credentials in workflow files or committed config
- Use `latest` Docker tag as a deployment artifact (use `sha-<commit>`)
- Skip the E2E stage when merging features that touch the API or UI
- Deploy to production without a passing staging smoke test
- Give an agent a standing production credential — deployment powers are an MCP allowlist, scoped per environment
- Let an agent trigger a production deploy; it prepares, a release manager authorises, the hook enforces

## Ask First

- Changing the CI platform (GitHub Actions → GitLab CI etc.) — requires an ADR
- Adding a new required CI secret
- Modifying deployment targets or approval gates, or the per-environment autonomy tiers above
- Exposing a new deployment tool to the agent (a new MCP tool is a new power — ADR-worthy)
- Increasing or decreasing parallelism in the pipeline
