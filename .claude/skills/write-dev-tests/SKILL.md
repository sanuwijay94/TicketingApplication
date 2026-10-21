---
allowed-tools: Task, AskUserQuestion, Bash(node:*), Bash(git:*), Bash(npm:*), Bash(find:*), Bash(ls:*), Bash(grep:*), Bash(rg:*), Read, Glob, Grep
description: Coverage gap analysis first (dependency scan + risk ranking), then generate missing tests — unit, integration, or E2E
argument-hint: '[path or layer] [--type=unit|integration|e2e] [--changed] [--gaps-only]'
disable-model-invocation: true
---

QA agent designs the test plan, developer-agent implements it. Lead coordinates only.

**Delegate mode**: You must NOT write test code or design test plans directly.

**`--gaps-only`** — run Phase 0 only; stop before generating tests. Equivalent to the old `/test-coverage` behaviour.

---

## Phase 0: Coverage Gap Analysis (MANDATORY — always runs first, before any test is written)

### 0a — Work the discovery ladder

Work the discovery ladder before touching any source file. This drives risk-ranked ordering — do not skip even for a single-file target.

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### 0b — Find source files with no corresponding test file

The mapping from source path to expected test path:

| Source path | Expected test path | Type |
|---|---|---|
| `server/src/domain/<ctx>/entities/<name>.ts` | `test/unit/domain/<ctx>/entities/<name>.spec.ts` | Unit |
| `server/src/domain/<ctx>/value-objects/<name>.ts` | `test/unit/domain/<ctx>/value-objects/<name>.spec.ts` | Unit |
| `server/src/domain/<ctx>/services/<name>.ts` | `test/unit/domain/<ctx>/services/<name>.spec.ts` | Unit |
| `server/src/domain/<ctx>/aggregates/<name>.ts` | `test/unit/domain/<ctx>/aggregates/<name>.spec.ts` | Unit |
| `server/src/application/<ctx>/use-cases/<name>.ts` | `test/unit/application/<ctx>/use-cases/<name>.spec.ts` | Unit |
| `server/src/application/ports/<name>.ts` | `test/unit/application/ports/<name>.spec.ts` | Unit |
| `server/src/infrastructure/<ctx>/<name>.repository.impl.ts` | `test/integration/<ctx>/<name>.repository.spec.ts` | Integration |
| `server/src/infrastructure/external/<svc>/<name>.client.ts` | `test/integration/external/<svc>/<name>.client.spec.ts` | Integration |
| `server/src/presentation/http/controllers/<name>.controller.ts` | `test/integration/<name>.controller.spec.ts` | Integration |
| `server/models/src/<domain>/<feature>.schemas.ts` | `server/models/src/<domain>/<feature>.handlers.test.ts` | Contract |

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### 0c — Layer-by-layer coverage summary

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### 0d — Risk-weighted priority list

Cross-references uncovered files with `docs/change-impact-matrix.md` risk levels and dependent counts. Highest score = write tests first.

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

### 0e — Recently changed files (PR gate)

Always run this regardless of target argument. Changed files with no tests are PR blockers.

```bash
node -e "
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const changed = execSync('git diff --name-only HEAD~1 2>/dev/null || git diff --name-only')
  .toString().trim().split('\n')
  .filter(f => /packages\/api\/src\/.*\.ts$/.test(f) && !f.includes('.spec.'));

function expectedTestPath(filePath) {
  const rel = filePath.replace('server/src/', '');
  if (rel.startsWith('domain/'))          return 'test/unit/' + rel.replace(/\.ts$/, '.spec.ts');
  if (rel.includes('use-cases/'))         return 'test/unit/' + rel.replace(/\.ts$/, '.spec.ts');
  if (rel.includes('application/ports/')) return 'test/unit/' + rel.replace(/\.ts$/, '.spec.ts');
  if (rel.includes('repository.impl')) { const ctx=rel.split('/')[1]; return 'test/integration/'+ctx+'/'+path.basename(rel,'.ts').replace('.impl','')+'.spec.ts'; }
  if (rel.startsWith('presentation/'))    return 'test/integration/'+path.basename(rel,'.ts')+'.spec.ts';
  return null;
}

let allCovered = true;
changed.forEach(f => {
  const tp     = expectedTestPath(f);
  const exists = tp && fs.existsSync(tp);
  if (!exists) allCovered = false;
  console.log((exists ? '✅' : '❌ MISSING'), f, '->', tp||'no test path known');
});
if (allCovered) console.log('All changed source files have corresponding test files.');
else console.log('\n❌ Missing tests on changed files — these are PR blockers.');
"
```

### 0f — Present gap report, then ask

After running Phase 0a–0e, present the coverage report (format below) and ask:

> "Here are the coverage gaps ordered by risk. Which files should I tackle first — or shall I do all?"

If `--gaps-only` was passed, **stop here**. Do not proceed to Phase 1.

---

## Coverage Report Format

```markdown
## Test Coverage Report: <target>

**Scope:** <file / layer / module / all / changed>
**Source files in scope:** N
**Covered:** N (N%)
**Uncovered:** N (N%)

### Layer summary
| Layer | Coverage | Bar | Status |
|-------|----------|-----|--------|
| `domain`         | N% (N/N) | ░░░░░░░░░░ | 🔴 CRITICAL gap |
| `application`    | N% (N/N) | ████░░░░░░ | 🟡 partial |
| `infrastructure` | N% (N/N) | ██████████ | ✅ well covered |
| `presentation`   | N% (N/N) | ██████░░░░ | 🟡 partial |

### Priority list — uncovered files ordered by risk
| # | Risk | Edges | File | Expected test |
|---|------|-------|------|---------------|
| 1 | CRITICAL | 82e | `domain/ticketing/entities/ticket.ts` | `test/unit/domain/ticketing/entities/ticket.spec.ts` |
| 2 | HIGH     | 44e | `application/ticketing/use-cases/...` | `test/unit/application/...spec.ts` |

### Recently changed — PR blockers if untested
| File | Test expected | Status |
|------|--------------|--------|
| `<path>` | `test/unit/<path>.spec.ts` | ✅ exists / ❌ MISSING |
```

---

## Phase 1: Test Plan (QA)

Invoke `qa-agent` with the gap report from Phase 0 to:
- Confirm the priority ordering and flag any gaps the script missed
- For each untested file, identify: missing scenarios, boundary conditions, negative paths, E2E journeys
- Produce a prioritised test plan

Ask the user: "Here is the full test plan. Which should I tackle first — or shall I do all?"

---

## Phase 2: Test Implementation (Developer)

Invoke `developer-agent` to implement the test plan from Phase 1, following `.claude/rules/testing.md`:

**Domain layer (`src/domain/`)** → `test/unit/domain/`
- Pure unit tests — zero mocks, zero infrastructure
- Test every aggregate method, invariant, and value object validation rule
- Use `Factory.build()` for test data — never hardcode
- Cover: happy path, boundary values, every invariant violation

**Application layer (`src/application/use-cases/`)** → `test/unit/application/`
- Unit tests with mocked port interfaces (never mock concrete classes)
- One test file per use case
- Cover: successful execution, each error path, each external call

**Infrastructure layer (`src/infrastructure/`)** → `test/integration/`
- Integration tests against real services via `docker-compose.test.yml`
- Test repository methods (findById, save, etc.) against real DB
- Cover: create, read, update, delete, not-found cases

**Presentation layer (`src/presentation/`)** → `test/integration/`
- HTTP contract tests — test the route, not the use case internals
- Mock use cases at the boundary
- Cover: request validation, HTTP status codes, response shape

**E2E (`test/e2e/`)** — only when `--type=e2e`
- Protractor tests covering user-facing flows end-to-end
- One spec file per user journey (e.g., `user-registration.spec.ts`)
- Cover: happy path + critical error states

---

## Phase 3: Validate

`developer-agent` runs `/test` and confirms zero failures, zero warnings. Any test the qa-agent planned but developer-agent could not implement is flagged in the report with a reason.

---

## Phase 4: Report

```markdown
## Tests Written

### Coverage Added
| File | Test file | Tests added | Type |
|------|-----------|------------|------|
| src/... | test/... | N | unit/integration/e2e |

### Still Uncovered
| File | Reason |
|------|--------|
| src/... | [needs integration setup / E2E / out of scope] |

### Test Run
- Status: ✅ pass / ❌ fail
- New tests: N
- Total passing: N
```

---

## Current State

- Branch: !`git branch --show-current`
- Modified files: !`git diff --name-only HEAD~1 2>/dev/null || git diff --name-only`
- Test files (unit specs): !`find test/unit -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' '`
- Test files (integration specs): !`find test/integration -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' '`
- Test files (e2e specs): !`find test/e2e -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' '`

## Target

$ARGUMENTS

Accepts:
- A file path or glob: `/write-dev-tests src/application/use-cases/CreateOrder.ts`
- A layer name: `/write-dev-tests domain`, `/write-dev-tests application`, `/write-dev-tests infrastructure`
- A type flag: `--type=unit`, `--type=integration`, `--type=e2e`
- `--changed`: only files changed since last commit (highest urgency; use before PR)
- `--gaps-only`: run Phase 0 only, show gaps, stop — no tests generated
- No args: analyse all `src/` files for missing coverage, prioritise by risk, ask before writing

---

## Important Notes

- **Navigate first** — the Phase 0 discovery pass is mandatory; risk ranking is data-driven, not alphabetical
- **Factory first** — all test data via `XxxFactory.build()` in `test/factories/`; create factory file if it doesn't exist
- **One describe per class/function** — mirror the source structure exactly
- **No over-testing** — do not test framework behaviour or trivial getters; test business rules and contracts
- **Failing tests are blockers** — never leave a failing test in the suite
- **`--changed` before every PR** — changed files with no tests are the highest-risk gap; check before opening a PR
