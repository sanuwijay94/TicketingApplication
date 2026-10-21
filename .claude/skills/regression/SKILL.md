---
allowed-tools: Bash(npm:*), Bash(docker:*), Bash(npx:*)
description: Run the full regression suite — backend unit + integration + frontend unit + E2E
argument-hint: '[be|fe|e2e|all] [--bail] [--report]'
---

Run regression suites across backend, frontend, and E2E layers. All checks in parallel where possible.

## Current State

- Branch: !`git branch --show-current`
- Docker status: !`docker info --format '{{.ServerVersion}}' 2>/dev/null && echo "Docker available" || echo "Docker not available"`
- Test directories: !`ls test/ 2>/dev/null || echo "No test/ directory found"`

## Arguments

$ARGUMENTS

| Argument | Runs |
|----------|------|
| (none) / `all` | Full regression: BE unit + BE integration + FE unit + E2E |
| `be` | Backend only: unit + integration |
| `fe` | Frontend only: unit tests |
| `e2e` | E2E / browser tests only (requires stack running) |
| `unit` | All unit tests (BE + FE), no integration or E2E |
| `integration` | Integration tests only |
| `--bail` | Stop on first failure |
| `--report` | Generate and display full HTML report at end |

## Workflow

### Phase 0: Scope (QA)

Before running any tests, invoke `qa-agent` to:
- Read `git diff --name-only` to identify what changed
- Map each changed file to its layer and downstream consumers
- Identify which existing tests are relevant and which could regress
- Recommend the minimum suite to run (unit / unit + integration / full) and flag any uncovered changes
- Report the regression scope — skip this phase only when `--no-scope` is passed

### Backend regression

Run in parallel:
```bash
npm run test:unit -- --coverage        # src/domain + src/application layer tests
npm run typecheck                       # strict type validation
npm run lint                            # lint check
```

Then (after unit pass):
```bash
docker compose -f docker-compose.test.yml up -d   # start test services
npm run test:integration                           # real DB + adapters
docker compose -f docker-compose.test.yml down
```

### Frontend regression

Run in parallel:
```bash
# TODO: update working-directory to your FE directory (e.g., cd frontend &&)
npm run test:unit -- --coverage
npm run typecheck
npm run lint
```

### E2E regression (Protractor)

```bash
docker compose -f docker-compose.test.yml up -d   # full stack
npx playwright test                                # browser tests
docker compose -f docker-compose.test.yml down
```

## Failure Handling

- Report each suite's result independently — do not stop after first failing suite unless `--bail`
- Always tear down Docker services even if tests fail (`docker compose down`)
- On failure: show the exact failing test names, file:line, and error message
- On success: show total pass count, coverage summary, and duration per suite

## Quality Gates (all must pass for regression to be green)

- [ ] All backend unit tests pass with zero warnings
- [ ] All backend integration tests pass
- [ ] All frontend unit tests pass
- [ ] All E2E tests pass
- [ ] No type errors (backend + frontend)
- [ ] No lint errors or warnings (backend + frontend)

## Report Format

```markdown
## Regression Report — {branch} — {date}

| Suite | Status | Tests | Duration | Coverage |
|-------|--------|-------|----------|---------|
| BE Unit | ✅ / ❌ | N passed, N failed | Ns | N% |
| BE Integration | ✅ / ❌ | N passed, N failed | Ns | — |
| FE Unit | ✅ / ❌ | N passed, N failed | Ns | N% |
| E2E | ✅ / ❌ | N passed, N failed | Ns | — |

### Failures
- [test name] — [file:line] — [error]

### Overall: ✅ PASS / ❌ FAIL
```

## Important Notes

- **Run before `/pr`** for any feature branch touching API contracts, UI flows, or DB schema
- **docker-compose.test.yml** must be present for integration and E2E stages — run `/ci-setup` to generate it
- **Coverage** is informational in regression runs; enforcement happens in `/verify`
