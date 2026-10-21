---
allowed-tools: Task, AskUserQuestion, Bash(git:*), Bash(ls:*), Bash(find:*)
description: Generate CI/CD pipeline config and Docker files for your chosen platform
argument-hint: '[github|gitlab|circleci|bitbucket]'
disable-model-invocation: true
---

Tech Lead generates CI/CD pipeline configuration and Docker files tailored to the chosen platform. Lead coordinates only.

**Delegate mode**: You must NOT author CI/CD config directly.

## Current State

- Branch: !`git branch --show-current`
- Existing CI config: !`find . -name "*.yml" -path "*/.github/workflows/*" -o -name ".gitlab-ci.yml" -o -name ".circleci/config.yml" 2>/dev/null || echo "None"`
- Dockerfile present: !`ls Dockerfile 2>/dev/null || echo "No Dockerfile"`
- docker-compose present: !`ls docker-compose*.yml 2>/dev/null || echo "None"`
- Package scripts: !`node -e "const p=require('./package.json');console.log(Object.keys(p.scripts||{}).join(', '))" 2>/dev/null || echo "No package.json"`

## Platform

$ARGUMENTS

If no platform argument is given, ask:
1. Which CI/CD platform? (GitHub Actions / GitLab CI / CircleCI / Bitbucket Pipelines / Other)
2. Container registry? (GitHub Container Registry / Docker Hub / AWS ECR / Google Artifact Registry / GitLab Registry)
3. Deployment target? (Docker Compose on VPS / Kubernetes / AWS ECS / Google Cloud Run / Render / Railway / Fly.io / Other)
4. Does the project have a frontend? If yes, what framework and directory?
5. Which database(s) and cache(s) are used? (for service containers in CI)

## Workflow

### Phase 1: Read context

Invoke `ci-cd-agent` to:
- Read `.claude/rules/ci-cd.md` for pipeline requirements
- Read `.claude/rules/testing.md` for test commands and structure
- Read `AGENTS.md` for project structure, stack, and npm script names
- Read `.claude/planning/architecture/layer-map.md` for service dependencies
- Check existing `package.json` scripts to map to CI commands

### Phase 2: Generate files

Invoke `ci-cd-agent` to create all of the following:

#### Docker files

**`Dockerfile`** — multi-stage backend image:
- `builder` stage: install all deps, compile TypeScript, run asset pipeline
- `production` stage: copy compiled output and production deps only, no source, no dev tools
- Non-root user, health check instruction, explicit `EXPOSE`

**`frontend/Dockerfile`** (if FE exists) — multi-stage frontend image:
- `builder` stage: install deps, build static assets
- `production` stage: nginx or equivalent serving the built assets

**`docker-compose.yml`** — local development:
- Backend service (hot-reload in dev mode)
- Frontend service (dev server)
- Database service with named volume
- Cache service (Redis etc.) if needed
- `.env` file referenced for local secrets

**`docker-compose.test.yml`** — integration + E2E test environment:
- Services with health checks (DB, cache)
- Test DB with ephemeral volume (no persistence)
- Backend and frontend in test mode
- Protractor service or instructions for running tests against this stack

**`.env.example`** — all environment variables needed, with placeholder values and comments

#### CI/CD pipeline

Generate the platform-specific pipeline file(s) following `.claude/rules/ci-cd.md`:

**Stages (all platforms)**:
1. `lint-types` — lint + typecheck (BE + FE in parallel)
2. `unit-tests` — BE + FE unit tests with coverage upload
3. `integration-tests` — with real service containers
4. `e2e` — Protractor against assembled stack
5. `docker-build` — validate images build cleanly (no push on PRs)
6. `deploy-staging` — push images + deploy (merge to main only)
7. `deploy-production` — manual gate

**Platform-specific output**:
- GitHub Actions → `.github/workflows/ci.yml` + `.github/workflows/cd.yml`
- GitLab CI → `.gitlab-ci.yml`
- CircleCI → `.circleci/config.yml`
- Bitbucket → `bitbucket-pipelines.yml`

All generated files must include `# TODO:` comments on every line that needs project-specific values (URLs, secrets, deploy commands).

### Phase 3: Synthesize

```markdown
## Report: CI/CD Setup

### Files Created
- [path]: [purpose]

### Required Secrets
Set these in your CI platform's secret/variable store:
- `[SECRET_NAME]`: [what it is and where to get it]

### Required TODOs
Before the pipeline is functional:
- [ ] [file:line] — [what to fill in]

### npm Scripts Expected
The pipeline expects these scripts in package.json — add them if missing:
| Script | Purpose |
|--------|---------|
| `test:unit` | Unit tests |
| `test:integration` | Integration tests |
| `test:e2e` | Protractor E2E |
| `test:ci` | Full CI suite with coverage |
| `typecheck` | tsc --noEmit |
| `lint` | TSLint check |

### Next Steps
1. Add required secrets to your CI platform
2. Fill in all TODO items
3. Run `/regression` locally to validate before first CI run
4. Push branch and verify pipeline green
```

## Important Notes

- **ADR required** for platform choice — run `/adr "ci-cd-platform"` to document the decision
- **`.env.example` is mandatory** — pipeline will fail without it; never commit real secrets
- **TODO comments are the contract** — every generated file must be reviewable before use; nothing is production-ready without the TODOs resolved
