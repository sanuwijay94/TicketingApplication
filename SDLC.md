# AI-Native SDLC with Claude Code

This document describes the Software Development Life Cycle (SDLC) implemented in this template. It is designed to be used with [Claude Code](https://claude.ai/code) and leverages AI agents throughout the development workflow.

> **⚠ marks a skill this harness does not ship.** `/api-trace`, `/deploy-sync`,
> `/write-qa-automation`, `/write-qa-api`, `/run-qa-test`, `/quality-gate`, and `/perf-test` were
> excluded as stack-coupled (see the harness README). The *phase* they sit in still applies —
> the command does not exist until you build its replacement for this stack. Everything unmarked
> is present in `.claude/skills/`.

---

## Overview

This SDLC is structured around the following phases:

```
CAPTURE → DOMAIN → DISCOVER → RFC → DESIGN → BUILD → VERIFY → SHIP → MAINTAIN
```

`CAPTURE` (`/intent`) is the front door: an idea recorded in the originator's own words, accepted by merge, and consumed by everything after it. Each phase has dedicated slash commands, agent roles, and quality gates. The workflow is AI-native: Claude and specialized subagents participate actively in every phase, not just code generation.

### Navigation layer (cross-cutting)

A maintained navigation layer sits under the BUILD, VERIFY, and MAINTAIN phases so changes are made with blast-radius awareness, not blind. It is three indexes plus a search discipline, defined in [`.claude/rules/code-navigation.md`](.claude/rules/code-navigation.md):

| Index | Answers |
|---|---|
| `docs/feature-index.yaml` | which files own a feature |
| `docs/glossary.md` | what a domain term means and what it is called in code |
| `.claude/planning/architecture/` | how a mechanism works, and which layer may depend on which |

- **BUILD** — `/implement` runs `/impact-check` before any edit, to map dependents, dependent tests, and contract artifacts.
- **VERIFY** — `/review` pre-flights impact to give each reviewer the dependent list and caching context of every changed file.
- **MAINTAIN** — `/fix` and `/trace-bug` localize root cause through the indexes before reading source.

These phases never inline the search logic — they call the dedicated skills (`/impact-check`, `/dependency-check`, `/explain`, `/trace-bug`), which own it in one place. Keep the indexes fresh with `/knowledge-update` (sync) and `/features` (regenerate the feature index) — a stale index gives wrong blast-radius answers, which is worse than no index.

> **Adding a code-intelligence tool** (knowledge graph, LSP index, embeddings search) slots in *above* rung 1 of the ladder and is an ADR-worthy decision — see `code-navigation.md` § Ask First.

---

## Where everything lives (binding)

Work splits into two tiers. **Reasoning/design records stay in the repo** (versioned with the code, reviewed in PRs). **Operational tracking lives on GitHub** (so QA / PM / support can participate without touching the repo).

| Artifact | Home | Type |
|---|---|---|
| Intent (what is wanted, in the originator's words) | `intent/NNN-<slug>.md` | Repo — historical record (accepted by merge; never rewritten) |
| Raw requirement documents | `artifacts preparation references/*.docx` + committed `.md` twin | Repo — **historical input** (never rewritten; goes stale by design) |
| Governing requirement specs | `.claude/planning/spec/SPEC-NNN-*.md` | Repo — **living** doc · **source of truth** (outranks the raw input) |
| Requirements (what/why) | `.claude/planning/prd/NNN-*.md` | Repo — historical record |
| Formal proposals | `.claude/planning/rfc/RFC-NNN-*.md` | Repo — historical record |
| Design decisions (how/why) | `.claude/planning/adr/ADR-NNN-*.md` | Repo — historical record |
| Implementation plans (which files, what order, what proves it) | `.claude/planning/plan/PLAN-NNN-*.md` | Repo — **living until merged**, then historical |
| How the system works now | `.claude/planning/architecture/*.md` | Repo — **living** doc |
| QA test plans (per feature) | `.claude/planning/qa/test-plans/TP-NNN-*.md` | Repo — **living** doc |
| QA test cases (per PRD) | `.claude/planning/qa/test-cases/TC-<PRD#>-*.md` + `.data.json` | Repo — **living** doc |
| QA traceability index | `docs/qa/traceability.md` | Repo — **living** doc |
| QA test-run reports (per release) | `docs/qa/reports/<version>-test-run.md` | Repo — historical record |
| Features / work items | **GitHub Issues** (`type:feature`, `track:*`) | Tracking |
| Bugs / defects | **GitHub Issues** (`type:bug`, `sev:S1–S4`, `lane:hotfix\|scheduled`) | Tracking |
| Phases | **GitHub Milestones** (`Phase 3`…`Phase 5`) | Tracking |
| Progress / board | **GitHub Project** [Ticketing Application Delivery](<your GitHub Project URL>) (Backlog → Ready → In Progress → In Review → Done; fields: Track, Severity) | Tracking |
| Releases | **GitHub Releases + Tags** (`v0.x.0` per phase, `v0.x.1` patch) | Event record |
| Migration coordination | `MIGRATIONS-LOG.md` | Repo — live log |

`IMPLEMENTATION-PLAN.md` holds the planning **conventions** only. The backlog itself lives in GitHub Issues — do not maintain a parallel list of work items in the file.

**Traceability** is automatic: a PR that says `Fixes #N` links commit → PR → issue → milestone → release/tag. Versioning: `MINOR` = phase (`v0.1.0`), `PATCH` = bug-fix release against a shipped phase (`v0.1.1`), `MAJOR` = GA (`v1.0.0`).

> **One-time board setup (UI only):** enable **Project → Workflows → "Auto-add to project"** for the `ticketing-application` repo so new `type:feature` / `type:bug` issues land on the board automatically — this toggle is not settable via API/CLI.

---

## Planning & tracking the backlog

Implementation planning is **continuous**, not a one-off phase: features and bugs live as GitHub Issues, grouped into **Milestones** (= phases) and tracked on the **Project board**. Three skills drive it:

| Skill | Purpose |
|---|---|
| **`/implementation-plan`** | Navigate the **feature** backlog — `status` (phase progress from milestones), `next` (unblocked work by track), `pick #N` (brief + contract-gate check + branch), `new` (file a feature issue). |
| **`/bug`** | File + triage **defects** — set `sev:S1–S4` and a lane (`hotfix` → patch milestone, `scheduled` → next phase), then hand off to `/fix`. |
| **`/release`** | Ship a milestone — cut `v0.x.0` (phase) or `v0.x.1` (patch), generate notes, walk the staging→prod gate. |

**Planning loop per work item:**
1. **Select** — `/implementation-plan next` (features) or triage the bug queue (`/bug`); a feature is *unblocked* only when its `Depends on: #…` issues are closed.
2. **Pick** — `/implementation-plan pick #N` prints the brief, runs the **contract gate** (any new HTTP endpoint must have a merged Mongoose contract first — ADR-016), and creates `feature/N-slug`.
3. **Build → ship** — proceed through BUILD → VERIFY → SHIP; the PR's `Closes #N` moves the board card to Done on merge.

`IMPLEMENTATION-PLAN.md` §1 remains the source for the planning **conventions** (feature-ID scheme, touched-zone codes, effort sizing, parallel-work playbook, PR hygiene) that these skills apply.

---

## Phases

### Phase −1: Capture — `/intent`

**Goal**: Record an idea, request, or problem **once, at source, in the originator's own words** as a version-controlled artifact the next stage can act on — before anyone writes a requirement, a PRD, or a design.

**Command**: `/intent <a sentence about the idea>` (or nothing — be interviewed)

**Who runs it**: anyone. A product owner, support, operations, an engineer, or an automated monitor (see *Factory mode* below). No engineering vocabulary is needed; the skill asks the questions an analyst would and writes what was said.

**What happens**:
1. Claude interviews the originator in plain language: problem, who is affected, what better looks like, what is out of scope, constraints, open questions
2. Writes `intent/NNN-<slug>.md` from `docs/templates/intent.md.template` (`status: draft`)
3. The originator corrects anything misunderstood; the file is committed on branch `intent/NNN-<slug>`
4. **The product owner accepts by merging the PR** — the merge *is* the approval; a closed PR with a reason is the rejection. Either way the decision is in git history.

**Output**: `intent/NNN-<slug>.md` — historical record; never rewritten after acceptance (see [`intent/README.md`](intent/README.md))

**Next**: `/requirement-intake <doc>` when a formal requirement document backs it · `/prd intent/NNN-<slug>.md` for a feature idea · `/bug file` for a defect report. The downstream artifact cites the intent by path.

**Why it matters**: ideas used to wait for someone to write them up, and each handoff moved the written version further from what the originator meant. The intent is the handoff — and the leading indicator for this phase is *time from first conversation to committed intent*, read straight from git.

#### How this harness maps to the AI-Native SDLC Playbook

The playbook describes the loop as `intent.md → spec.md → plan.md → diff + tests → PR + review findings → incident record`. This harness keeps its richer, governed chain and adds the playbook's two ends to it. **Do not rename the chain** — map it:

| Playbook artifact | Harness artifact | Type |
|---|---|---|
| `intent.md` | `intent/NNN-<slug>.md` (this phase) | historical |
| `spec.md` | `SPEC-NNN` (what it must do, living) **+** PRD (what/why) **+** RFC (formal proposal) | living + historical |
| — | ADR (how/why) — the playbook folds design decisions into the spec; we keep them separate | historical |
| `plan.md` | `.claude/planning/plan/PLAN-NNN-<slug>.md` (Phase 3) | living until merged, then historical |
| diff + tests | the feature branch | — |
| PR + review findings | the PR, reviewed against `REVIEW.md` (Phase 4) | event record |
| incident record | GitHub issue (`type:bug`) → `/fix` → next `intent/` if systemic | tracking |

---

### Phase 0: Domain Modelling — `/domain`

**Goal**: Establish the ubiquitous language and domain model before any technical design begins.

**Command**: `/domain <domain area>`

**What happens**:
1. `pm-agent` interviews you to elicit business processes, actors, terms, invariants, and domain events
2. `tech-lead-agent` designs bounded contexts, aggregate roots, entities, value objects, and integration patterns
3. Output is written to `.claude/planning/architecture/domain-{slug}.md` — a living document used by all subsequent phases

**Output**: `.claude/planning/architecture/domain-{slug}.md`

**When to use**: Before any RFC or ADR that introduces new domain concepts. Existing projects should run `/domain` to document the model they already have. Skip for purely infrastructural changes with no domain impact.

**Why it matters**: Every downstream artifact (RFC, ADR, code, tests) must use the exact terms from this document. Running `/domain` first prevents naming drift and ensures agents work from a shared vocabulary.

---

### Phase 0.5: Requirement Intake — `/requirement-intake`

**Goal**: Make an incoming requirement document readable, governed, and citable **before** anything downstream depends on it.

**Command**: `/requirement-intake <path to raw requirement doc>`

**When to use**: a new or revised requirement document lands · `npm requirements:check` reports `UNCONVERTED` / `ORPHAN` · you are about to start work and no `SPEC-NNN` governs the behaviour.

**What happens**:
1. Convert the raw `.docx` to a committed `.md` twin (`npm requirements:convert`) — an unconverted source is invisible to search and *will* be skipped
2. Derive `.claude/planning/spec/SPEC-NNN-*.md` from `docs/templates/requirement-spec.md.template`, stamping `source` + `section` + `source_hash`
3. `npm requirements:check` must exit 0

**Output**: a `.md` twin beside the raw source + `SPEC-NNN` (status: Active)

**Why this is a phase and not a footnote**: a measured session spent ~2.2h of 3.5h rebuilding the wrong report because two authoritative documents had no `.md` twin and were never read. `.claude/rules/qa-test-cases.md` §1 already *instructed* manual conversion — and it did not happen for two months. **A rule that depends on unautomated effort is not a control.**

**Downstream rule (binding)**: no PRD, RFC, ADR, test case, or implementation may cite a raw `.docx`/`.xlsx`/`.html`. Cite `SPEC-NNN §R<n>`. See [`.claude/rules/requirement-sources.md`](.claude/rules/requirement-sources.md).

---

### Phase 1: Discover — `/prd`

**Goal**: Clarify what to build and why before touching code.

**Command**: `/prd <feature description>`

**What happens**:
1. `pm-agent` interviews you (the stakeholder) with clarifying questions
2. PM drafts a Product Requirements Document (PRD) with problem statement, user stories, acceptance criteria, MVP scope, and risks
3. `tech-lead-agent` challenges the PRD for missing requirements, unclear scope, and technical risks
4. PM responds and revises
5. You receive a draft PRD for approval before proceeding

**Output**: `.claude/planning/prd/NNN-{slug}.md` (status: Draft)

**When to use**: Any feature that is larger than a trivial bug fix. A PRD ensures you're solving the right problem before designing a solution.

---

### Phase 1.5: RFC — `/rfc`

**Goal**: Propose the solution, surface requirements, and get formal stakeholder alignment before technical design begins.

**Command**: `/rfc <feature description or prd-slug>`

**What happens**:
1. `pm-agent` interviews you (if no PRD provided) or reads the existing PRD
2. PM authors the RFC covering: problem statement, user impact, functional/non-functional requirements, user stories, MVP scope, success metrics, risks, dependencies, documentation impact, open questions, timeline, and approval table
3. `tech-lead-agent` challenges the RFC on requirement clarity, scope, NFRs, risks, and missing technical considerations
4. PM responds and revises
5. You receive a draft RFC with a populated Approval table (Section 12) ready for stakeholder sign-off

**Output**: `.claude/planning/rfc/RFC-NNN-{slug}.md` (status: Draft)

**When to use**: Features that cross team boundaries, require stakeholder alignment, or involve architectural risk. Lightweight bug fixes and small features can go straight to `/adr`.

**RFC vs PRD**: A PRD defines *what* to build and *why*. An RFC is a formal proposal that adds requirements detail, non-functional constraints, success metrics, and a structured approval workflow. Use `/prd` for quick problem definition; use `/rfc` when you need formal sign-off before design begins.

---

### Phase 2: Design — `/adr`

**Goal**: Decide *how* to build it and document the reasoning.

**Command**: `/adr <prd-slug>`

**What happens**:
1. `tech-lead-agent` reads the PRD and existing architecture docs
2. Tech Lead designs the architecture: components, data flow, trade-offs, risks
3. Tech Lead creates an Architecture Decision Record (ADR)
4. `developer-agent` challenges the ADR for feasibility, testability, hidden complexity, and edge cases
5. Tech Lead defends or revises
6. `pm-agent` validates that the ADR satisfies all PRD acceptance criteria
7. You receive a proposed ADR for approval

**Output**: `.claude/planning/adr/ADR-NNN-{slug}.md` (status: Proposed)

**When to use**: Any change that involves architectural decisions, new components, or significant modifications to existing mechanisms.

**Full workflow**: `/design <feature>` runs PRD → ADR → implement in sequence with approval checkpoints between each phase.

---

### Phase 3: Build — `/implement`

**Goal**: Write the code following the approved design.

**Command**: `/implement <adr-slug>`

**What happens**:
1. `developer-agent` reads the ADR
2. Developer proposes an implementation plan (files to create/modify, tests, dependencies) — you approve before any code is written
2a. The approved plan is committed as `.claude/planning/plan/PLAN-NNN-<slug>.md` **before the first code edit** (Standard and Feature lanes; the Quick lane's commit is its plan). If implementation departs from it, the plan is updated in the same commit — `/review` and `/pr` diff the PR against its *Files that change* table
3. Developer implements following the ADR: custom errors, strict TypeScript, existing patterns
4. Developer writes tests mirroring the `src/` structure
5. Developer runs `/test` — must pass before continuing
6. Developer updates docs: ADR status → Implemented, architecture docs if a mechanism changed

**Output**: `PLAN-NNN`, code, tests, updated ADRs/docs

**Quality gates** (all must pass):
- All tests passing
- No type errors or warnings
- No lint errors or warnings
- Tests exist for all new code
- ADR and PRD status updated
- `PLAN-NNN` matches the final diff (every departure recorded)

---

### Phase 4: Verify — `/verify` and `/review`

**Goal**: Catch issues before they reach main.

#### Comprehensive quality check: `/verify`

Runs `verify-app` agent which checks:
- Full test suite (Karma + Jasmine + lint + typecheck)
- Test coverage for modified files
- Architecture compliance (custom errors, import patterns, Clean Architecture layer boundaries)
- DDD pattern compliance (immutable VOs, past-tense events, no domain logic in wrong layer)
- Documentation sync (ADRs, architecture docs, AGENTS.md)
- Security scan (no secrets, no `console.log`, proper error handling)
- Dependency audit (`npm audit`)
- Docker build validation (if Dockerfile changed)
- CI config validation (if pipeline files changed)

#### Full regression suite: `/regression [be|fe|e2e|all]`

Runs the complete regression suite across all test layers:
- Backend: unit tests (domain + application) + integration tests (repositories, HTTP contracts)
- Frontend: unit tests + typecheck + lint
- E2E: Protractor browser tests against the full assembled stack

Use `/regression` before opening a PR for any change that touches API contracts, UI flows, or DB schema. Use `/test` for faster feedback during development.

#### Generate missing tests: `/write-dev-tests [path] [--type=unit|integration|e2e]`

Analyses existing `src/` code for missing test coverage and generates the missing tests. Invokes `developer-agent` to write tests following the layer-by-layer strategy in `test/README.md`. Run this when retrofitting tests onto existing code or after implementing a feature to ensure full coverage.

#### QA-authored suite — the QA lane (distinct from the dev tests above)

`/verify`, `/regression`, and `/write-dev-tests` are the **developer** test path (`test/unit`, `test/integration`, `test/e2e`). The **QA-owned** browser suite is separate — authored and run by QA, and it does **not** overlap `/regression`:

- **Author:** `/write-qa-cases` (PRD → `TC-NNN` case docs) → `/write-qa-automation` ⚠ (`TC-NNN` → `test/qa/automation/` Protractor specs).
- **Run:** `npm test:qa` (behavioural a11y/console), `npm test:qa:automation` or `/run-qa-test` ⚠ (the `TC-NNN` POM specs — seeds its own fixtures), `npm test:qa:visual` (visual regression).

`QA-PROCESS.md` is the authority for the QA lane (ownership, the three suites, and the sign-off gate).

#### Multi-perspective code review: `/review [--profile=trivial|small|medium|full]`

**Policy: [`REVIEW.md`](REVIEW.md)** at the repo root defines the three passes (Bugs / Security / Compliance — the last checks the diff against `SPEC-NNN`, the PRD, the ADR and `PLAN-NNN`), what *Important* vs *Nit* means, the five-nit cap, and what not to report. `/review` applies it locally; the CI-side review (`sukitha/ai-factory`) applies the same file, so findings mean the same thing in both places. Change the policy by changing the file.

Runs an Agent Team with two phases:

**Phase 1 — Independent analysis** (agents work in parallel):
- `developer-agent` — code quality, test coverage, conventions
- `tech-lead-agent` — architecture alignment, patterns, risks
- `security-reviewer` — OWASP vulnerabilities, auth, credential handling
- `code-simplifier` — dead code, duplication, complexity
- `docs-reviewer` — documentation drift and gaps

**Phase 2 — Peer debate** (agents challenge each other's findings):
- Each agent reviews all Phase 1 findings
- Agents DM each other directly to challenge or reinforce findings
- Final positions reported to lead

**Profile selection** (auto-assessed from `.claude/patterns/change-sizing.md`):

| Profile | Use when |
|---------|---------|
| `trivial` | 1 file, <10 lines, typo/rename |
| `small` | 1-2 files, bug fix, minor update |
| `medium` | 3-5 files, new endpoint or service |
| `full` | 5+ files, new integration, migration |

#### Focused checks

| Command | Purpose |
|---------|---------|
| `/security-review` | Security-only audit via `security-reviewer` |
| `/simplify` | Simplification opportunities via `code-simplifier` |
| `/test` | Run unit tests + lint + typecheck in parallel |
| `/test integration` | Integration tests against real services (Docker) |
| `/test e2e` | E2E browser tests via Protractor |
| `/regression` | Full BE + FE + E2E regression suite |
| `/perf-test` ⚠ | Load / latency of a hot path via Artillery (`test/perf/`) — on-demand; also the opt-in CI `perf` job |
| `/write-dev-tests` | Generate missing tests for existing code |

---

### Phase 5: Ship — `/commit` and `/pr`

**Goal**: Get code merged cleanly.

#### Commit: `/commit`

1. Runs `/test` first — refuses to commit if anything fails
2. Stages appropriate files
3. Commits using [Conventional Commits](https://www.conventionalcommits.org/) format: `<type>(<scope>): <description>`
4. No AI attribution footers (enforced)

**Commit types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`

#### Pull Request: `/pr`

1. Runs `/verify` first — refuses to create PR if anything fails
2. Analyzes all commits since main
3. Creates PR with structured body: summary, changes, test plan, documentation checklist, **and `Fixes #N` linking the GitHub issue** it closes
4. Returns PR URL

#### Release: `/release` (per phase)

A phase ships as a versioned increment via **GitHub Releases + Tags** — there is no hand-maintained `CHANGELOG.md`.

1. Confirm the phase **Milestone** is complete (all issues closed), `/regression` is green, and (for production tags) **QA sign-off** is posted (`QA-PROCESS.md §6`)
2. Cut a GitHub Release tagged `v0.x.0` with notes auto-generated from the milestone's merged PRs/issues
3. Promote: staging deploy → smoke test → **manual production approval gate**. **⏳ CD is not yet implemented** — this promotion is **manual** via the `deploy/` image bundle (`deploy/README.md`) today, not an automated pipeline. GA (`v1.0.0`): `docs/qa/GA-RELEASE-RUNBOOK.md`.

---

### Phase 6: Maintain — defects & patch releases

**Goal**: Find, fix, and ship defects. Three intake paths converge on one fix engine (`/fix`), then split again at release.

#### The fix engine — `/fix` (takes a symptom *or* an issue number)

Every bug, however it arrives, is fixed the same way. `/fix` accepts a free-text symptom **or** a GitHub issue number:

Every fix also **closes the learning loop** (Phase 5): a regression eval in `evals/cases/` when the factory is installed (every production incident becomes a permanent eval), a post-mortem in `docs/lessons/` for S1/S2 (the file future investigations and the factory's diagnose run read first), and a `CLAUDE.md` correction when the twice rule applies. A fix that leaves no trace in the loop is incomplete.

```
Phase 0 capture → Phase 1 localize (parallel root-cause search) → Phase 2 failing test (red)
→ Phase 3 smallest fix (green) → Phase 4 /regression → Phase 5 report + Fixes #N + recurrence sweep
```

#### Intake — three paths

**Path A — found during developer testing (pre-release).** Ordinary work, **not** a tracked defect — no GitHub issue needed. Fix it on the current branch; it ships with the phase you're building.
```
/fix "stage transition 422s when caseType is blank"   # describe the symptom
/commit  →  /pr                                        # part of the current feature/phase
```
> Only file an issue if you found it but won't fix it now — then `/bug file` it so it isn't lost.

**Path B — reported by another party (QA / PM / support).** The tracked, post-release/external path.
```
1. Reporter files via the GitHub bug template (UI)   → type:bug issue, untriaged
2. /bug triage #210     → set sev + lane (see table)
3. /fix 210             → loads the issue (symptom/repro/found-in version) as Phase 0
4. /pr                  → "Fixes #210" → merge closes the issue, board card → Done
```

**Path C — find bugs systematically.** No single "exercise the app → emit a bug list" skill exists; generate findings, then file the confirmed ones:
| Tool | Gives you | Then |
|---|---|---|
| `/regression` | BE+FE+E2E test failures | each → `/fix` (pre-release) or `/bug file` (real tracked defect) |
| `/code-review` | correctness findings on the current diff | confirmed → `/bug file` or fix inline |
| `/review` | multi-agent review (dev / tech-lead / security / simplifier) | findings → triage → file |

None auto-create issues today. (A multi-agent Workflow that hunts and auto-files triaged issues is a possible future addition.)

#### Triage — severity drives the lane

| Severity | Meaning | Lane → release target |
|---|---|---|
| `sev:S1-critical` | prod down, data loss, security | **`lane:hotfix`** → immediate patch `v0.x.1` |
| `sev:S2-major` | key feature broken, no workaround | **`lane:hotfix`** → batched into the next patch `v0.x.1` |
| `sev:S3-minor` | broken but has a workaround | **`lane:scheduled`** → next phase `v0.x.0` |
| `sev:S4-trivial` | cosmetic / low impact | **`lane:scheduled`** → next phase `v0.x.0` |

#### Releasing the fix

- **Hotfix lane (S1/S2 on a shipped version):** branch off the release tag (or `main`) → `/fix #N` → `/pr` to `main` (`Fixes #N`) → drop the issue in a `v0.x.1` patch milestone → when its bugs are merged, **`/release v0.x.1`** (regression gate → tag → notes → staging smoke → manual prod approval) → **back-merge the patch to `develop`**. A single S1 can trigger `v0.x.1` immediately; S2s batch.
- **Scheduled lane (S3/S4):** no separate release — the fix is assigned to the next phase milestone and ships with the next **`/release v0.(n+1).0`**.
- **Pre-release (Path A):** no release action — it ships when the phase you're building ships.

#### Cheat sheet

- **You found it, fixing now** → `/fix "<symptom>"` → `/pr` (no issue)
- **Someone reported it** → `/bug triage #N` → `/fix #N` → `/pr "Fixes #N"`
- **Find bugs systematically** → `/regression` or `/code-review` → `/bug file` the real ones
- **Ship a critical fix** → patch milestone → `/release v0.x.1` → back-merge to `develop`
- **Ship a minor fix** → next phase milestone → rides the next `/release v0.x.0`

---

## Factory mode — running the loop unattended

Everything above is written for an engineer at the keyboard. The same phases can run **without
one** — on a cloud runner, triggered by a committed artifact instead of a slash command — using
the companion repository **`sukitha/ai-factory`**, which installs on top of this harness. This
section says what that changes and, more importantly, what it does not.

### What the factory runs, and what stays human

| Phase | Unattended? | Trigger | Human gate |
|---|---|---|---|
| −1 Capture | **yes** — triage run drafts `intent/NNN` from a GitHub issue (or the monitoring loop files it) | issue opened / labelled | **Gate 1 — product owner accepts the intent** (merge / `gate:approved` label). Low-risk tiers may auto-pass. |
| 0.5–2 Intake · PRD · RFC · ADR | partly — a design pass can draft the SPEC/PRD PR | intent accepted | product owner reviews the spec; tech lead for higher-risk |
| 3 Build | **yes** — plan (commits `PLAN-NNN`) → implement → feedback loop → PR | `gate:approved` | none during the build; the agent **never** writes to `main` |
| 4 Verify | **yes** — CI-side review against `REVIEW.md`, `@claude` fix loop, babysit to green | PR opened | **Gate 2 — a human code owner approves the PR.** Findings inform; they never approve. |
| 5 Ship | up to the production gate | merge | **Gate 3 — release manager authorises production**; a hook blocks the deploy without it |
| 6 Maintain | **yes** — deterministic band monitor → tiered agent response → new `intent/NNN` | metric breach, schedule | on-call owner triages the queue |

Three human touches. Everything between them runs agent-to-agent, and every handoff is a commit
or a label — so the dashboard, the conversation log, and the audit trail are the same objects.

### What this harness provides to the factory

The factory supplies the plumbing; the quality comes from here. An unattended run loads exactly
what a supervised one does, so it works to the same discipline:

- **`CLAUDE.md`, the rules, the skills** — the institutional knowledge
- **`intent/`** (Phase −1) — the format the triage run writes and the monitor files
- **`PLAN-NNN`** (Phase 3) — what the CI review checks the diff against
- **`REVIEW.md`** (Phase 4) — the one policy both the local and the CI-side review apply
- **`run-legibility.md`** — the `::stage::` markers and status format the run wrapper's heartbeat parses
- **`tool-log.sh`** and the gate hooks — the per-run allow/block audit trail the wrapper uploads
- **`docs/managed-settings.example.json`** — the sandbox posture an unattended runner needs

### Deterministic vs judgment — the separation that keeps it safe

Detection scripts, drift checks, gates, and band monitors **never call a model**. Agents run
*between* deterministic gates, never instead of them. A hook that blocks is information for a
human; an agent does not look for a way around it (`run-legibility.md` § Never).

### Order of adoption (non-negotiable)

Nothing may auto-trigger an agent run until two things are in place and green: **the CI-side
review** (so every PR gets an independent inspector) and **the agent-config evals** (so a change
to `CLAUDE.md`, a skill, or a hook is regression-tested before it merges). Autonomy last — "the
gates must exist before automation accelerates anything through them." The factory repository
enforces this ordering in its own plan.

---

## Agent Roles

The template ships with 7 specialized agents. Each has a defined scope and cannot exceed it.

| Agent | Role | Tools (frontmatter allowlist) | When used |
|-------|------|-----------|---------|
| `pm-agent` | Requirements, PRDs, domain discovery | Read, Grep, Glob, Bash, Write, Edit, AskUserQuestion — writes PRDs, RFCs, domain model only | `/prd`, `/rfc`, `/domain`, `/design` |
| `tech-lead-agent` | Architecture, ADRs, domain model design | Read, Grep, Glob, Bash, Write, Edit, AskUserQuestion — writes ADRs, domain docs only | `/adr`, `/domain`, `/design`, `/review` |
| `developer-agent` | Implementation, testing, scaffolding | Read, Grep, Glob, Bash, Write, Edit, MultiEdit — code + tests | `/implement`, `/scaffold`, `/write-dev-tests`, `/review` |
| `qa-agent` | Test plan design, scenario coverage, regression scoping | Read, Grep, Glob, Bash — read only | `/test-plan`, `/write-qa-cases`, `/write-qa-automation` ⚠, `/run-qa-test` ⚠, `/regression`, `/review` |
| `ci-cd-agent` | Pipeline design, Docker config, deployment strategy | Read, Grep, Glob, Bash, Write, Edit — pipeline + Docker files | `/ci-setup` |
| `verify-app` | QA gate — tests, layer boundaries, DDD patterns, Docker, CI | Read, Grep, Glob, Bash — read only | `/verify` |
| `code-simplifier` | Simplification analysis | Read, Grep, Glob, Bash — read only | `/simplify`, `/review` |
| `security-reviewer` | Security audit | Read, Grep, Glob, Bash — read only | `/security-review`, `/review` |
| `docs-reviewer` | Documentation drift | Read, Grep, Glob, Bash — read only | `/review` |

Every agent declares the tools it may touch in its frontmatter (`tools:`) — name, description of when to use it, tools, as the playbook prescribes for subagents. Agents that write (`pm-agent`, `tech-lead-agent`, `developer-agent`, `ci-cd-agent`) are scoped to their deliverable. Read-only agents (`qa-agent`, `verify-app`, `code-simplifier`, `security-reviewer`, `docs-reviewer`) have no `Write`/`Edit` in their allowlist — they cannot edit files, they only report.

---

## Quality Gates

Quality gates are enforced at two checkpoints:

### Before committing (`/commit`)
- All tests pass
- No type errors or warnings
- No lint errors or warnings

### Before opening a PR (`/verify` + `/pr`)
- All of the above, plus:
- Tests exist for all modified code
- Architecture docs updated if a mechanism changed
- ADR/PRD status updated if applicable
- Governing `SPEC-NNN` updated if required behaviour changed, and `npm requirements:check` exits 0
- No raw `.docx`/`.xlsx`/`.html` cited in any changed artifact — cite `SPEC-NNN §R<n>`
- No secrets, credentials, or API keys in source
- No `console.log` in `src/`
- `npm audit` passes (no high/critical vulnerabilities)

### Before opening a PR that touches API, UI, or DB schema (`/regression`)
- All unit + integration + E2E tests pass across BE and FE
- No regression in existing behaviour

### Performance — deliberately NOT a per-PR gate

Performance / load (`/perf-test` ⚠, `test/perf/`, Artillery) is **dev-supported** and kept off the per-PR critical path — browser/HTTP load is heavy. It runs at three points instead: **on-demand** while working a hot path, as an **opt-in CI `perf` job** (a PR labelled `perf`, or manual `workflow_dispatch`), and as a **reported-first** smoke at the production release gate (`QA-PROCESS.md §6`). Dev owns the scenarios; QA gates on the result at sign-off. See ADR-054 and `test/perf/README.md`.

---

## Documentation Strategy

Documentation is split into two categories with different update rules:

### Living docs — update in place

`.claude/planning/architecture/` contains mechanism docs that describe how the system works right now. When a mechanism changes, update these docs in the same PR as the code change.

Examples: auth flow, queuing system, data model, external integrations.

`.claude/planning/spec/` contains **requirement** specs (`SPEC-NNN`) — what the system *must do*, derived from the raw requirement documents. Also living: when required behaviour changes, update the spec in the same PR.

The distinction matters: **architecture = how it works · spec = what it must do · ADR/PRD/RFC = why we chose it** (historical). Answering a "what should it do" question from architecture docs or code tells you what was built, never what was required.

### Historical records — never rewrite

`.claude/planning/adr/` and `.claude/planning/prd/` capture decisions and requirements at a point in time. They are the "why" record. When code evolves past them, you don't edit the old doc — you create a new one.

When reversing an architectural decision: create a new ADR, mark the old one `Superseded by ADR-NNN`.

---

## Hooks (Automated Enforcement)

Nine shell hooks run automatically via `.claude/settings.json` (measured cost per invocation in the last column — see the rule below). Three are **gates** that block (`exit 2`) with a message that states the reason and the route — a block must explain itself:

| Hook | Trigger | What it does | Cost |
|------|---------|-------------|------|
| `test-protection-gate.sh` | **Before** every file Edit/Write | While `.claude/session-state/fix-mode` exists (set by `/fix` Phase 2, cleared in Phase 5), **blocks** any edit to a test file (`test/`, `tests/`, `__tests__/`, `*.spec.*`, `*.test.*`) — the failing test is the proof, the agent may not rewrite it | ~3 ms idle · ~13 ms when blocking |
| `protected-paths-gate.sh` | **Before** every file Edit/Write | **Blocks** edits to paths listed in `.claude/protected-paths` (generated `openapi.json`, `**/gen/**`, generated indexes, frozen packages) and repeats the listed reason and route. No `jq`, no subprocess | ~20 ms |
| `secrets-gate.sh` | **Before** every file Edit/Write | **Blocks** content carrying a credential shape (AWS, private key, Anthropic/OpenAI/GitHub/Slack/Google tokens, literal-assigned secrets with a digit) — keeps credentials out of the diff. Skips `*.md`, `.env.example`, `secret-ok:` files | ~25 ms |
| `check-console-log.sh` | After every file Edit/Write | Warns if `console.log()` appears in `src/` | ~30 ms |
| `contract-first-gate.sh` | After every file Edit/Write | Rejects a controller / FE api-slice that does not consume `../models/` (ADR-016) | ~30 ms |
| `plan-sync.sh` | After every file Edit/Write | If a `PLAN-NNN` is `status: living` for the current branch, **warns** (never blocks) when the edited file is not in its *Files that change* table — amend the plan in the same commit or revert. Exits before reading stdin when no plan is living | ~7 ms idle · ~22 ms with a living plan |
| `git-status-reminder.sh` | After every Claude response | Shows uncommitted file counts | n/a (per response) |
| `pre-compact.sh` | Before context compaction | Saves git status + diff to `.claude/session-state/` | n/a (rare) |
| `tool-log.sh` | Before **and** after every tool call (all tools) | Appends one JSON line per tool call to `.claude/session-state/tool-log.jsonl` — `{ts, tool, duration_ms, decision, target, session}`. The two gate hooks append a `decision: blocked` line when they refuse an action, so the file is the per-session audit trail of every allow/block, and the artifact an unattended run uploads (`sukitha/ai-factory`) | ~17 ms per event |

**Every Edit/Write hook must stay cheap.** These run on *every* edit, so their cost is paid
hundreds of times a session. The test-protection gate checks for its marker before it even reads stdin, which is why its idle cost is a few milliseconds. `tool-log.sh` is one `perl` process per event (~17 ms); it replaced the older timing-only `tool-timer.sh` — same cost, strictly more data (duration, target, allow/block) — and `/session-timing --hooklog` reads its `tool-log.jsonl`. If 2 × 17 ms per tool call is too much for a project, drop it from `settings.json`; nothing else depends on it except `/session-timing --hooklog` and the factory's run artifacts.

> **Do not add an auto-format-on-save Edit hook.** The source project measured one
> (`lint --fix` on every Edit/Write) and removed it: it accounted for **99.4% of all Edit-hook
> time and ~15% of total session wall-clock** across two measured sessions — 5s per edit in one
> package, ~43s in another — while auto-fixing only ~**8%** of violations, and typically **none**
> on freshly written code. It also swallowed its own output, so a fatal out-of-memory crash ran
> silently on every edit in one package while the hook appeared to be working.
>
> **Lint is gated at commit and in CI, over the whole package** — not per edit. If you want a
> per-edit hook, measure it first (`/session-timing`) and keep it under ~50ms.

---

## Conventions

### TypeScript
- Strict mode — all code must pass `tsc --strict`
- Typed function signatures — no implicit `any`
- Custom base error class — never throw `new Error()` directly
- Structured logging — never `console.log`
- Async/await — not `.then()` chains

### Testing
- Factory pattern for test data — never hardcoded objects
- Tests mirror `src/` structure under `test/unit/`
- All modified code must have corresponding tests

### Git
- [Conventional Commits](https://www.conventionalcommits.org/) — enforced via `/commit`
- Feature branches: `feature/<description>` or `feature/<ticket-id>`
- Never push directly to `main`
- No AI attribution footers in commits, PRs, or code

### YAGNI
- Build only what the task requires
- No speculative abstractions or future-proofing
- Bug fixes don't need surrounding code cleaned up
- Three similar lines > premature abstraction

---

## Workflow Quick Reference

```
# Full feature from scratch
/design "add user export to CSV"

# Front door — anyone, engineer or not
/intent "customers phone us to ask where their claim is"   # → intent/NNN-<slug>.md, accepted by merge

# Step by step (with DDD + Clean Architecture)
/domain "export"                 # → produces domain model doc
/prd "add user export to CSV"    # → produces PRD
/rfc 001-user-export-csv         # → produces RFC (formal proposal + approval)
/adr RFC-001-user-export-csv     # → produces ADR
/contract export csv           # → contract PR first: schemas + mocks + MSW handler + OpenAPI entry
/scaffold Export --type=aggregate # → generates layer skeletons
/implement ADR-001               # → produces code
/review                          # → multi-perspective review
/commit                          # → commit with validation
/pr                              # → open PR

# Dev — fast feedback during development
/test                  # unit + lint + typecheck (parallel)
/test integration      # integration tests with real services (Docker)
/test e2e              # browser E2E tests (Docker)

# Dev — regression and test coverage (test/unit · test/integration · test/e2e)
/regression            # full BE + FE + E2E regression suite (NOT the QA-owned test/qa suite)
/regression be         # backend only (unit + integration)
/regression fe         # frontend only
/regression e2e        # E2E only
/write-dev-tests           # generate missing tests for all untested src/ files
/write-dev-tests src/application/use-cases/CreateOrder.ts  # target a specific file
/write-dev-tests domain --type=unit  # target a layer

# QA — the QA-owned browser suite (authority: QA-PROCESS.md)
/write-qa-cases <PRD>            # PRD → TC-NNN case documents
/write-qa-automation <TC-NNN>    # TC-NNN case doc → test/qa/automation specs
/run-qa-test                     # run the TC-NNN specs, filtered by Feature/Story/Severity/…
npm test:qa                     # behavioural (a11y / console)
npm test:qa:automation          # the TC-NNN POM specs (seeds its own fixtures)
npm test:qa:visual              # visual regression

# Review and audit
/verify                # comprehensive pre-PR quality gate
/review                # multi-perspective code review
/simplify              # simplification analysis (read-only)
/security-review       # security analysis (read-only)

# CI/CD setup (run once when platform is chosen)
/ci-setup github       # generate GitHub Actions + Docker files
/ci-setup gitlab       # generate GitLab CI + Docker files

# Git helpers
/commit push           # commit and push
/ignore-local add .env.local
/dependabot 42         # triage security alert #42
```

---

## Setup Checklist

When adopting this template for a new project:

**Claude configuration**
- [ ] Update `AGENTS.md` with your project name, tech stack, and directory structure
- [ ] Update `CLAUDE.md` if you add project-specific rules
- [ ] Update `.claude/rules/typescript.md` with your import conventions and base error class name
- [ ] Update `.claude/rules/testing.md` with your test import aliases
- [ ] Update `.claude/skills/test/SKILL.md` with your actual `npm` script names
- [ ] Update `.claude/skills/verify/SKILL.md` with your actual local service ports
- [ ] Update `.claude/skills/pr/SKILL.md` with your issue tracker link pattern
- [ ] Read `REVIEW.md` and adjust the *Do not report* paths and *Important* definition for your repo
- [ ] Decide who the product owner is for `intent/` — they accept intents by merging
- [ ] Fill in `MVP-SCOPE.md` (the current slice — binding for agents and QA) and keep `MIGRATIONS-LOG.md` at the root (`/scaffold --migrate` claims sequence numbers there)
- [ ] Add a `tmp/` entry to `.gitignore` (used by `/review` for diff files)
- [ ] Make hooks executable: `chmod +x .claude/hooks/*.sh`
- [ ] Add project-specific rules to `.claude/rules/` if needed

**Domain modelling**
- [ ] Run `/domain` for each core domain area to populate `.claude/planning/architecture/domain-*.md`
- [ ] Fill in `.claude/planning/architecture/layer-map.md` with your port/adapter registry

**CI/CD and Docker**
- [ ] Run `/ci-setup <platform>` to generate Docker files and pipeline config (GitHub Actions / GitLab CI / CircleCI / etc.)
- [ ] Fill in all `# TODO:` items in generated Docker and pipeline files
- [ ] Add required CI secrets to your platform's secret store
- [ ] Confirm `package.json` has these scripts: `test:unit`, `test:integration`, `test:e2e`, `test:ci`, `typecheck`, `lint`, `lint:fix`
- [ ] Create a `GitHub / GitLab / etc. environment` named `staging` and `production` with appropriate approval gates

**Testing**
- [ ] Create `test/factories/` directory and one factory per domain aggregate
- [ ] Confirm `docker-compose.test.yml` starts cleanly (`docker compose -f docker-compose.test.yml up -d`)
- [ ] Run `/regression all` and confirm green before first PR
