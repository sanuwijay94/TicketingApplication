# QA Process & Handbook

The operating manual for the Ticketing Application in-house QA function. It defines what QA owns, the defect lifecycle, severity and release gates, and how QA plugs into the **existing** AI-native SDLC (`SDLC.md`) and GitHub delivery board — QA uses the same Claude Code workflow developers use, with a QA lens.

> **Companion docs:** `SDLC.md` (the whole lifecycle) · `.claude/rules/testing.md` (test-layer strategy) · `.claude/rules/qa-test-cases.md` (the `TC-NNN` case format) · `AGENTS.md` § Development Environment (run the app).

> ## ⚠ Read this first — the automation lane is not provisioned
>
> This harness ships the **process**, the **case-authoring** half, and the **gates**. The
> **executable QA automation lane** was deliberately excluded, because it was fully coupled to a
> browser/TypeScript toolchain (see the harness README).
>
> **Works today:** everything about ownership, the daily loop, the defect lifecycle, severity &
> lane triage, entry/exit criteria, feature certification, the sign-off gate, traceability — plus
> `/test-plan` (living per-feature plans) and `/write-qa-cases` (PRD → `TC-NNN` human-readable
> cases). Cases run **manually** until the lane exists.
>
> **Not provisioned — every reference below marked ⚠:** `/write-qa-automation`, `/write-qa-api`,
> `/run-qa-test`, `/quality-gate`, `/perf-test`, the `test/qa/**` suites, and the Allure report.
> Treat those rows as the **target state**, not the current one. §7 *Home of the QA-owned suite*
> holds the restoration plan.
>
> **To restore:** pick the stack's E2E runner + reporter, then port `ui-automation.md` and
> `qa-api-tests.md` from the source project and un-mark these references.

---

## Artifacts & the dev + QA flow (start here)

QA **mirrors the dev artifact model** — it does not run a parallel universe. Dev keeps
reasoning/design records in the repo (PRD/RFC/ADR) and operational tracking on GitHub
(features/bugs/milestones/releases); QA uses the same two tiers and the same
mechanisms. Every dev artifact has a QA parallel (or is shared):

| Dev artifact | QA parallel | Home | Type |
|---|---|---|---|
| Architecture *living* docs | **Test Strategy** = this handbook | repo | living |
| PRD (*what/why*) | *(input — QA covers its acceptance criteria; not a QA doc)* | — | — |
| RFC / ADR (a design decision) | **Test Plan** `TP-NNN` (per feature) | `.claude/planning/qa/test-plans/` | **living** |
| ADR (a *strategic* decision) | **ADR** — *shared* (e.g. ADR-053) | `.claude/planning/adr/` | historical |
| `feature-index.yaml` (living index) | **Traceability index** | `docs/qa/traceability.md` | living |
| Bug (GitHub issue) | **Bug** — *shared* | GitHub | tracking |
| Release tag + notes | **Sign-off** + **test-run report** | milestone comment + `docs/qa/reports/` | event record |

The two genuinely new QA documents are the **Test Plan** and the **Traceability
index**. A Test Plan is **living, one per feature** (edited in place, re-run every
release); per-release *results* live in a **test-run report** (`docs/qa/reports/`),
not in the plan. QA strategic decisions are just **ADRs** (ADR-053 is the precedent) —
there is no separate "QA decision record". Test cases are a **checklist inside the
Test Plan**, not GitHub issues — issues stay reserved for defects.

**QA is shift-left.** Planning starts at the PRD, in parallel with the RFC — not after
BUILD. The interleave across the SDLC (`SDLC.md`):

| Phase | Dev | QA |
|---|---|---|
| DOMAIN | `/domain` | Learn the ubiquitous language |
| DISCOVER | `/prd` → acceptance criteria | **Review criteria for testability; draft the plan** — `/test-plan` → `TP-NNN` (Draft) |
| RFC / DESIGN | `/rfc`, `/adr` | **Refine cases** — edge/negative/concurrency/**persona**; flag test-data needs; pick what to automate |
| BUILD | `/implement` (+ unit/integration) | **Prep data/personas/env; author the QA cases then the automation** — `/write-qa-cases` (PRD → `TC-NNN` case docs) then `/write-qa-automation` ⚠ (`TC-NNN` → `test/qa/` specs); api/contract stay dev (`/write-dev-tests`)**;** plan → Ready |
| VERIFY | self-`/verify` (quality gate) + `/review` | **Execute the plan (runbook §5c)** — manual state walk (`/run` + `ui-quality.md`) + `npm test:qa` + `/regression`; `/bug` misses; verify-fix loop; **update traceability** |
| SHIP | `/release` (after gate) | **Release `/regression`, write the test-run report, sign off** (no open S1/S2, every issue verified) → then `/release` |
| MAINTAIN | `/fix` shipped bugs | **Verify on the deployed build; add a regression case per fixed bug** |

Build a plan with **`/test-plan <feature>`**; reference example: `TP-001-ticket-comments.md`.

---

## 1. What QA owns

QA is a **dedicated in-house function** that owns quality end to end:

| Area | Ownership |
|---|---|
| **Manual test execution** | Run feature test cases and regression checklists each release; exploratory testing on new features. |
| **Automation authoring** | Author and maintain the QA-owned automated suite (see §7). |
| **Defect triage & tracking** | Own the bug board: file, triage (severity + lane), track the verify-fix loop, make release-blocker calls. |
| **Release sign-off** | QA sign-off is a **formal gate** before a `v0.x.0` / `v0.x.1` is promoted to production (§6). |

QA does **not** own: writing production code, cutting the release tag (that's `/release`, run by the release owner *after* QA signs off), or unit/integration test authoring for domain logic (that stays with developers per `testing.md`). QA authors the **behavioural / journey** suite.

---

## 2. The QA daily loop

```
Pick issue from board  →  understand the feature (/explain, feature index, test plan)
   →  deploy build to the QA environment  →  run the app (`/run`) + walk every state (`ui-quality.md`)
   →  misses filed with /bug (triaged on the spot)  →  dev fixes via /fix
   →  QA re-verifies the deployed fix  →  at release: /regression + QA sign-off gate
```

Everything above uses tools that already exist. QA does not learn a separate system — see the tool map in §8. For the **ordered per-feature validation procedure** (the VERIFY step above, expanded), follow the runbook in **§5c**.

---

## 3. Defect lifecycle

Bugs live as **GitHub Issues** (`type:bug`), tracked on the [Ticketing Application Delivery board]. The lifecycle maps onto the existing board columns and `/bug` labels — QA does **not** run a parallel tracker.

| State | Board column | Marker | Owner | Entry action |
|---|---|---|---|---|
| **New** | Backlog | `type:bug`, no `sev:*` | Reporter | `/bug file <symptom>` (or GitHub bug template for non-dev reporters) |
| **Triaged** | Ready | `sev:S1–S4` + `lane:*` + milestone | **QA** | `/bug triage <#>` — sets severity, lane, milestone |
| **In Progress** | In Progress / In Review | assignee + open PR | Developer | `/fix <#>` — links PR with `Fixes #<#>` |
| **Fixed** | Done | issue auto-closed by the merging PR | Developer | PR merge closes the issue (records commit→PR→issue link) |
| **Verified** | Done | `qa:verified` label + QA comment | **QA** | QA re-runs the repro (`/run` + the failing steps) against the **deployed** build |
| **Reopened** | In Progress | issue reopened + `qa:reopened` | **QA** | verification failed — reopen with evidence |

### The verify reconciliation (important)

`/bug` deliberately lets the **fixing PR close the issue** (`Fixes #<#>`) so the commit→PR→issue link is permanent — see `.claude/skills/bug`. That auto-close is *not* QA sign-off. The sequence is:

1. PR merges → issue **auto-closes** (link recorded, code on `main`/staging).
2. Build deploys to staging/QA env.
3. **QA verifies on the deployed build.** Pass → add `qa:verified`, leave the issue closed. Fail → **reopen** with `qa:reopened` and reproduction evidence; it goes back to In Progress.
4. An issue must be **verified** (not merely closed) before its fix counts toward a release sign-off (§6).

> **Pre-release bugs are different.** A defect caught in QA/CI **before** its phase ships (`v0.x.0` not yet tagged) is an ordinary fix on the feature branch — **do not file a `type:bug` issue** (per `/bug`). File issues only for defects against a **shipped** version.

---

## 4. Severity & lane (triage reference)

Aligned with `.claude/skills/bug` — QA applies exactly one `sev:*` label at triage.

| Sev | Meaning | Default lane | QA response target | Verify target |
|---|---|---|---|---|
| `sev:S1-critical` | Prod down, data loss, security breach, auth bypass | `lane:hotfix` → immediate patch | triage < 1h | verify same day as fix |
| `sev:S2-major` | Key feature broken, no workaround | `lane:hotfix` (or next patch) | triage < 4h | verify within 1 business day |
| `sev:S3-minor` | Broken but has a workaround | `lane:scheduled` → next phase | triage < 1 business day | verify with the phase |
| `sev:S4-trivial` | Cosmetic / low impact | `lane:scheduled` (backlog) | triage < 2 business days | verify with the phase |

Response/verify targets are QA's SLA layered on top of the severity table (the table itself is owned by `/bug`; do not diverge the meanings or lanes here). `lane:hotfix` → open `v0.x.1` patch milestone; `lane:scheduled` → next `Phase N` milestone.

---

## 5. Entry criteria — "ready for QA"

A feature/build enters QA only when **all** hold. QA rejects a build back to the developer (comment on the issue/PR) if any fails:

- [ ] Merged to the integration branch and **deployed to the QA/staging environment** (not "works on my machine").
- [ ] `/test` green (unit + lint + typecheck) and `/verify` self-check done by the developer.
- [ ] Every touched endpoint has a **merged Mongoose contract** (ADR-016) — no hand-written interfaces.
- [ ] The feature's **acceptance criteria** are linked (PRD/RFC) so QA can trace them to test cases.
- [ ] Known limitations / deferred scope stated (cross-check `MVP-SCOPE.md` so QA doesn't file "bugs" against intentionally-deferred behaviour).

---

## 5b. Feature certification — the Definition of Done

Distinct from the **release** sign-off (§6). This is how a QA engineer certifies **one
feature** is "tested and fine" — the rung between a verified bug (§3) and a signed-off
release (§6).

### A feature is **QA-certified** when (its Test Plan exit criteria — `TP-NNN §7`):

- [ ] **Every acceptance criterion maps to ≥1 test case, and every case is ✅** (`TP §4` — no ⬜ not-run, no ❌).
- [ ] **No open `sev:S1` / `sev:S2`** against the feature (S3/S4 allowed as documented known issues).
- [ ] **Automated cases are in the suite** (`test/qa/` or `test/e2e/`) and green — not "tested once by hand".
- [ ] **Coverage gaps (`TP §5`) are explicitly accepted or ticketed** — no silent holes.
- [ ] **Verified on the deployed build**, not a local machine.

If any fails, the feature is **not** certified — it goes back.

### The evidence (certification is traceable, not a claim)

```
acceptance criterion → test case (TP §4) → result ✅
   → automated spec id (test/qa/… | test/e2e/…) OR manual checklist run + screenshots
```

The **Test Plan is the certification artifact**; `docs/qa/traceability.md` rolls it up.

### How QA records certification (the glanceable marker)

1. Set the Test Plan **`status: Certified <version>`** and fill its §8 run-history row.
2. On the **feature's GitHub issue**, add the **`qa:verified`** label + a certification
   comment linking the `TP-NNN` and evidence (build, spec ids, screenshots) — the same
   `qa:verified` convention used for bugs (§3), now applied to features.
3. Refresh the feature's row in `docs/qa/traceability.md`.

Certified features + verified bugs are what a release sign-off (§6) aggregates.

---

## 5c. Per-feature validation runbook (VERIFY execution)

The ordered procedure to take **one feature** from "ready for QA" to certified. §5 is the
*entry* gate and §5b is the *exit* gate — **this is the sequence between them.** Each step
cross-references the section that owns the detail; don't duplicate, follow the link. Work
the feature's Test Plan (`TP-NNN`) as you go — its §4 table is the worksheet.

> Worked example of this exact sequence on a real feature: `docs/qa/WALKTHROUGH.md §4`.

| # | Step | Do | Tool | Detail |
|---|------|----|------|--------|
| 1 | **Confirm entry** | Feature is deployed to QA env, `/test` green, contract merged, ACs linked, limits stated. If not → bounce. | — | §5 |
| 2 | **Understand it** | Read the PRD ACs; open the `TP-NNN`; get the behaviour in plain English. | `/explain`, feature index | §*Artifacts* |
| 3 | **Deploy the build** | Validate on the **deployed** QA build — never a local machine (this is Gate 5). | — | §5b |
| 4 | **Run the automated suites** | Behavioural (a11y/console/journey) + the **TC-NNN automation** specs + visual + regression. `🔵 dev` unit/integration run too — reference their results, don't author them. | `npm test:qa`, `npm test:qa:automation` (or `/run-qa-test` ⚠ for a filtered slice), `npm test:qa:visual`, `/regression` | §7 |
| 5 | **Walk every state by hand** | Force loading / empty / error / success-toast; check dead controls, copy, affordances, keyboard/contrast. Screenshot each. | `/run` + `ui-quality.md` | `TP §6` |
| 6 | **Record every result** | Fill the `Last result` column in `TP §4`: ✅ / ❌ / ⬜ / ⏭️. **A ⬜ = not validated.** The filled table *is* the evidence. | — | §9 |
| 7 | **File + verify misses** | Each ❌ → file, triage one `sev:*` + lane, dev fixes, **you re-verify on the deployed build** (`qa:verified` / reopen). | `/bug file`, `/bug triage`, `/fix` | §3, §4 |
| 8 | **Resolve coverage gaps** | Every `TP §5` gap is explicitly **accepted or ticketed** — no silent holes (Gate 4). | `/bug` / discussion | §5b |
| 9 | **Certify + stamp** | All gates met (§5b) → `status: Certified <ver>` + `§8` run-history row; `qa:verified` + comment on the feature issue; refresh `traceability.md`. | `/test-plan --update` | §5b |

**Where results go:** per-release execution results belong in a test-run report
(`docs/qa/reports/<version>-test-run.md`) — the Test Plan holds the *living* case table and
its `§8` run history, not a copy per release. **Pre-release builds** (`-alpha`/`-beta`/`-rc`)
are QA *input*, so a defect found before the phase ships is an ordinary fix, **not** a filed
`type:bug` (§3) — file issues only against a shipped version.

---

## 6. Exit criteria & the QA sign-off gate

### The gate applies to production releases — not pre-releases

The sign-off gate depends on the **release type**:

- **Pre-release** (`-alpha` / `-beta` / `-rc`, e.g. `1.0.0-alpha.1`) — a *checkpoint / QA
  input*. It is cut **so QA has a fixed build to test against**; QA runs **after** the
  tag. **NOT sign-off-gated** — you cannot sign off before there is a build to test.
  Always cut with GitHub `--prerelease` so it is never mistaken for production, and
  **never deploy it to production**.
- **Production** (clean semver: `v0.x.0` phase · `v0.x.1` patch · `v1.0.0` GA) — a *QA
  output*. It must be **signed off before** the tag.

The ladder to GA: `-alpha` (build test plans + exploratory) → `-beta` (execute full
plans) → `-rc` (**sign-off lands here** — no open S1/S2) → `v1.0.0` (GA, gated). This
is enforced in `/release` (Phase 0 classifies the type; Phase 1a is production-only).

> **Release steps:** the from-alpha step list (owner/tool/data/comms per step) is
> `docs/qa/RELEASE-STEPS.md`; the tick-through GA checklist is `docs/qa/GA-RELEASE-RUNBOOK.md`.

### Production sign-off criteria

QA sign-off is a **formal release gate**. It slots into `/release` **Phase 1a (Gate)**, alongside "regression green," before a **production** tag is cut.

A **production** release (`v0.x.0` phase, `v0.x.1` patch, or `v1.0.0` GA) is **signed off** only when:

- [ ] `/regression` is **green** for the release scope (BE unit + integration + FE unit + E2E).
- [ ] Every issue in the source milestone is **verified** (§3), not merely closed.
- [ ] No open `sev:S1` or `sev:S2` bug against the release scope.
- [ ] The release-scope **regression checklist** (manual + QA-owned automated suite) has been executed against the deployed build.
- [ ] New features' acceptance criteria are all covered by at least one passing test case (traceability, §9).

> **Performance smoke — reported-first (ADR-054).** The `test/perf/` hot-path
> scenarios are run against the release build (the opt-in `perf` CI job or
> `/perf-test` ⚠) and their latency + HTTP-success result attached to the test-run
> report. At introduction a budget breach is **recorded, not blocking** — the same
> rollout as the a11y gate (ADR-053). Once the budgets in `test/perf/config/base.yml`
> are baselined against real runs, this flips to a **blocking** sign-off item (add a
> `- [ ]` line here and drop the CI `|| true` guards). It is **dev-supported**: Dev
> owns the scenarios; QA gates on the result at sign-off.

**Recording sign-off:** QA fills a **test-run report** (`docs/qa/reports/<version>-test-run.md`, from the template) — scope executed, suite results, defects, and the sign-off checklist — then posts a sign-off comment on the release milestone linking it. QA sign-off is the *human* gate; `/regression` is the *automated* one — **both** must pass.

> **Enforced in `/release`:** the `/release` **Phase 1 (QA sign-off gate)** now HALTS unless every milestone issue is closed-and-verified (no `qa:reopened`), there is no open `sev:S1`/`sev:S2` against scope, and a test-run report exists for the version. The gate is both tool-enforced (`/release`) and human (the milestone comment).

---

## 7. Manual vs automated — and where QA automation lives

**QA does not rely on manual alone.** "Does the app work?" is answered by a **layered
stack**, each layer covering what the others can't. Manual is the *first pass* and the
*judgment*; automation is what gets *re-run every release*.

| Layer | Tool | Best for | When | Owner |
|---|---|---|---|---|
| **Manual / exploratory** | `/run` + `ui-quality.md` | New features, UX judgment, forcing loading/empty/error/success, edge exploration, persona spot-checks | First pass; anything not yet automated | QA |
| **QA behavioural / quality** | `test/qa/` behavioural specs + `test/qa/visual/` (Protractor — a11y/console/journey/visual) | Repeatable quality checks | Every release; stable paths | QA |
| **QA automation (TC-NNN)** | `test/qa/automation/` (Protractor POM + Allure) | Executable versions of the `TC-NNN` case docs; run via `/run-qa-test` ⚠ (filtered) or `npm test:qa:automation` (full) — seeds its own fixtures | Every release; per-case traceability | QA |
| **QA API (contract)** | `test/qa/api/` (Protractor `request` + Mongoose contract + Allure) | Black-box HTTP contract of a **running** server — status/body/**schema**/headers/errors; authored via `/write-qa-api` ⚠, run via `npm test:qa:api` (shares the automation Allure report) | Every release; per-endpoint contract traceability | **QA** (ADR-055) |
| **E2E journeys** | `test/e2e/` (Protractor) | Full stack-internal user journeys | Every release / PR | Dev |
| **Regression (full net)** | `/regression all` (BE unit + integration + FE unit + E2E) | Catching anything that regressed anywhere | Before every release; PRs touching API/UI/DB | QA runs; Dev owns most specs |
| **Performance / load** | `/perf-test` ⚠ + `test/perf/` (Artillery) | Latency / throughput of hot paths under load (lobby, search, create) | On-demand; opt-in `perf` CI job; reported-first at the release gate — **not** per-PR | **Dev** authors; QA gates at release |
| **Code quality gate** | `/verify` (project) | tests/lint/typecheck/arch/security — **not** app behaviour | Pre-PR | Dev (QA confirms green as entry criterion) |

**The rule:** manual covers **what automation doesn't yet**; automation covers **what
must be re-checked every release**. Anything you test by hand *twice* is a candidate to
automate into `test/qa/`. There is no single "best tool" — the mix is the answer.

> **Ownership boundary (binding, amended by ADR-055):** QA authors **browser-level**
> automated tests in `test/qa/automation/` + `test/qa/visual/` (a11y, console-error, visual,
> journeys, affordance/permission *visibility*) **and black-box API contract tests** in
> `test/qa/api/` (status/body/**schema**/headers/errors of a *running* server, validated
> against the Mongoose contract — authored via `/write-qa-api` ⚠). QA does **not** write **unit** or
> **in-process integration** tests — those stay **developer-owned** (`testing.md`,
> `api-contracts.md`). The fence between the two API altitudes: **dev integration =
> in-process, white-box, coverage-oriented; QA API = black-box over the network,
> contract-oriented, in the QA report.** Do not duplicate the same assertion across both. In a
> Test Plan, browser + QA-API cases are QA's to author; in-process/unit assertions are `🔵 dev`.

> **Status note:** the *tooling* for every layer exists today; the QA journey coverage
> in `test/qa/` is still thin (one smoke + a11y spec). Growing it is driven by the Test
> Plans (each `TP-NNN` §4 marks which cases become `test/qa/` / `test/e2e/` specs) —
> tracked in the §10 backlog, not blocked on new tooling.

### When each test is created & executed (SDLC map)

Two different questions — **when is it *authored*** (which SDLC phase produces the spec) and
**when does it *run*** (pre-commit / per-PR CI / per-release / on-demand). The SDLC phases are
`DOMAIN → DISCOVER(PRD) → RFC → DESIGN(ADR+contract) → BUILD → VERIFY → SHIP → MAINTAIN`
(`SDLC.md`). The contract is the hinge: **the Mongoose contract merges first (ADR-016 gate)** and is
what unblocks *both* the dev integration/contract tests and the QA API tests.

| Test type | Authored in phase | Runs (executed) | Owner |
|---|---|---|---|
| **Unit** | BUILD — with the code (TDD) | pre-commit (`/test`) · **every PR (blocking)** · release regression | Dev |
| **Contract** (Mongoose + controller spec) | DESIGN→BUILD — the **contract PR first**, before FE/BE (ADR-016) | every PR (blocking) · release | Dev |
| **Integration** (in-process, real DB) | BUILD — alongside the repo/controller | pre-PR (`/test integration`) · **every PR (blocking)** · release regression | Dev |
| **QA API (contract)** | VERIFY — after the contract merges + `TC-NNN` cases reviewed (`/write-qa-api` ⚠) | **every release**; locally during VERIFY · *CI wiring pending* | QA |
| **E2E journeys** | BUILD→VERIFY — per journey | **every PR (blocking)** · release regression | Dev |
| **QA behavioural** (a11y/console/journey) | VERIFY — from the Test Plan | per-PR `qa-suite` (smoke+console **blocking**, a11y **reported**) · every release | QA |
| **QA automation (TC-NNN)** | VERIFY — `/write-qa-cases`→`/write-qa-automation` ⚠ | **every release** (`/run-qa-test` ⚠) · *CI wiring pending* | QA |
| **QA visual** | VERIFY | opt-in / release · *CI pending (Linux baselines)* | QA |
| **Performance / load** | BUILD→VERIFY — per hot path | **on-demand** + `perf` label/`workflow_dispatch` · **reported-first** at the release gate · **not per-PR** | Dev authors; QA gates |
| **Manual / exploratory** | DISCOVER→VERIFY | first pass on new features; anything not yet automated | QA |
| **Regression (net)** | — composes the above | **before every release**; PRs touching API/UI/DB (`/regression`) | QA runs; Dev owns most specs |

**Phase by phase:**
- **DISCOVER (PRD):** QA authors the `TC-NNN` case docs (`/write-qa-cases`) — the *brief* for every automated test; `/test-plan` tags each case `🔵 dev` / `🤖 qa` / `✋ manual`.
- **DESIGN (ADR + contract):** the **Mongoose contract lands first** (its own PR, ADR-016) — the single event that unblocks dev integration/contract tests *and* QA API tests in parallel.
- **BUILD:** dev writes **unit + integration + contract + E2E** with the code, and **perf** scenarios for any hot path touched. These run on every PR (except perf).
- **VERIFY:** QA authors the **browser automation** (`/write-qa-automation` ⚠) and **API** (`/write-qa-api` ⚠) specs from the reviewed cases + contract, then runs the layered stack + `/regression`; a **perf smoke** runs reported-first.
- **SHIP (release gate, §6):** `/regression` + perf (reported) + the QA sign-off gate — production only.
- **MAINTAIN:** every `/fix` is **test-first** — a failing regression test is authored before the fix, so the bug can't silently return.

**Rules of thumb:** *author* a test in the phase that first makes it possible (unit/integration/perf at BUILD; QA API/automation at VERIFY once the contract + cases exist). *Execute* the cheap deterministic layers (unit/integration/contract/E2E) on **every PR**; execute the heavier or less-deterministic layers (QA automation/API/visual/perf/full regression) **per release** or **on-demand**, never on the per-PR critical path.

### Making generation non-forgettable — the coverage checkpoint

Relying on QA to *remember* to generate a spec is the weak link. The safeguard is
**mechanical, not a reminder**: the case doc's `Execution Mode: Automated` field is the promise,
and a check asserts every such promise has a spec.

- **The check:** `npm test:qa:gaps` (`gen-coverage-matrix.mjs --check`) scans every `TC-NNN`
  case and lists any marked `Automated` that has **no spec in either QA lane**
  (`test/qa/automation/` browser **or** `test/qa/api/` — matched by `qaCase({ id })`). Exits
  non-zero when gaps exist.
- **Where it fires:**
  1. **DISCOVER** — an acceptance criterion with no `TC-NNN` case is a blocking gap
     (`/write-qa-cases` + `/test-plan`). *(You can't forget a case for a covered AC.)*
  2. **Every PR** — the **`qa-traceability`** CI job runs the check and posts/updates a PR
     comment listing the missing specs.
  3. **VERIFY / SHIP** — the same check is part of the feature Definition of Done (§5b) and the
     release sign-off (§6): no `Automated` case may ship without a passing spec.
- **Strictness (today): advisory.** The PR job runs `continue-on-error` — it *comments*, it does
  **not** fail the build, so a determined author can still merge past it. Coverage therefore still
  depends on QA acting on the comment. To make it a hard gate, remove `continue-on-error` from the
  job's check step (one line) — the same reported→blocking rollout used for a11y (ADR-053) and
  perf (ADR-054). Run `/write-qa-automation` ⚠ or `/write-qa-api` ⚠ to clear a gap.

### Home of the QA-owned suite

> **NOT PROVISIONED IN THIS HARNESS.** The executable QA automation lane (browser specs, API
> contract specs, visual regression, the Allure report, and the \`/write-qa-automation\`,
> \`/write-qa-api\`, \`/run-qa-test\`, \`/quality-gate\` skills) was **deliberately excluded** — it
> was fully coupled to a browser/TypeScript toolchain. Everything above this line applies as
> written; this subsection is the plan for restoring the lane.

When you add it, the shape that worked:

- A **dedicated, QA-owned suite** kept **separate** from the developer E2E suite. Separate
  ownership is the point: QA authors and runs it; developers do not edit it to make it pass.
- One directory per concern — behavioural journeys, generated case specs, black-box API specs,
  and (opt-in) visual regression — each with its own runner command.
- The suite is the home of three checks \`ui-quality.md\` requires but that nothing else enforces:
  **accessibility** (WCAG A/AA), a **console-error guard** (fail the test on any browser console
  error), and **visual regression** (opt-in).
- **Phase the CI rollout.** Make the console guard and journeys blocking immediately; run
  accessibility in *reported* mode until the existing violations are remediated, then make it
  blocking. A suite that is blocking on day one against an unremediated codebase gets disabled.
- Record the decision in an ADR — a separate QA suite diverges from \`testing.md\`'s
  single-suite convention, and that divergence needs to be owned somewhere.

**Prerequisite:** pick the stack's E2E runner and reporter first, then port
\`.claude/rules/ui-automation.md\` and \`.claude/rules/qa-api-tests.md\` from the source project.

---

## 8. Tool map — the QA workflow in Claude Code

QA inherits the existing skills; almost nothing is net-new.

| QA task | Skill / agent | Notes |
|---|---|---|
| Understand a feature without reading code | `/explain`, `/investigate` | Index-first — the fast way for QA to orient. |
| Author / update a Test Plan | **`/test-plan <feature>`** | Living, per-feature `TP-NNN` — acceptance criteria → test cases + traceability. `qa-agent` designs the cases; the skill persists them. Tag each case `🤖 qa` / `✋ manual` in §4. |
| Author QA test-case **documents** from a PRD | **`/write-qa-cases <PRD>`** | PRD + the governing requirement (HIGH) / RFC (LOW) → human-readable `TC-NNN` case docs in `.claude/planning/qa/test-cases/`, each tagged Scenario Type + Priority + Severity and grouped by user story. These are the manual scripts **and** the brief for automation — **not** executable specs. Structure: `qa-test-cases.md`. |
| Generate `test/qa/` browser specs **from a case doc** | **`/write-qa-automation <TC-NNN>`** | Exact step-for-step Protractor POM + Allure specs from a reviewed `TC-NNN` doc → `test/qa/automation/`. Browser/user-observable only (a11y/console/visual/journey/affordance); **never** api/contract/integration — those are `🔵 dev` (`/write-dev-tests` is the dev counterpart). Structure: `ui-automation.md`. |
| Generate `test/qa/api/` **API contract** specs from a case doc | **`/write-qa-api <TC-NNN>`** | Black-box Protractor `request` specs validated against the Mongoose contract (`../models/`) → `test/qa/api/`; one spec per user story, `qaCase`-tagged into the shared Allure report. Cases as the brief, the contract as the oracle. Structure: `qa-api-tests.md` (ADR-055). |
| Find coverage gaps ad hoc | `qa-agent` (via `/review`, `/regression` Phase 0) | Scopes regression; the gap table also feeds `/test-plan §5`. |
| Run the app & walk every state (manual) | `/run` + `ui-quality.md` | Launch/drive the app; QA **manually** forces loading/empty/error/success and judges them. A discipline, not an automated pass. |
| Code quality gate | **`/verify`** (project skill) | tests + lint + typecheck + coverage + arch + security + `npm audit` via `verify-app`. **NOT a browser walk** — it's the pre-PR quality gate (dev-run; QA confirms it green as an entry criterion). |
| File a defect | `/bug file` / GitHub bug template | Non-dev reporters use the template; QA uses the skill + triages. |
| Triage & route a defect | `/bug triage <#>` | Sets `sev:*` + lane + milestone. |
| Root-cause before filing (optional) | `/trace-bug` | Read-only root-cause report; makes bug reports precise. |
| Run test suites | `/test`, `/regression [be\|fe\|e2e\|all]` | `/regression` runs a QA scoping pass (Phase 0) first. **Scope:** BE unit + integration + FE unit + `test/e2e` — **not** the QA-owned `test/qa/` suite (run that separately, below). |
| Run the QA **automation** suite | **`/run-qa-test` ⚠** (filter by Feature/Story/Severity/Priority/Scenario/**Regression** → Allure report) or `npm test:qa:automation` (full run) | The `TC-NNN` POM specs in `test/qa/automation/`; seeds its own fixtures via a `setup`/`cleanup` project pair (ADR-056). Behavioural a11y/console specs run via `npm test:qa`; visual via `npm test:qa:visual`. |
| Release sign-off | milestone comment → `/release` (release owner) | §6. |

---

## 9. Traceability

Every acceptance criterion must trace to at least one test case, and every release-scope bug to its verification. The chain:

```
PRD/RFC acceptance criterion  →  QA test case (in TP-NNN §4)
   →  automated test id (test/qa/… or test/e2e/…)  →  passing run in a release report
```

The traceability record **is** each Test Plan's §4 "acceptance criteria → test cases"
table (built by **`/test-plan`**). `docs/qa/traceability.md` is the top-level index
that links every `TP-NNN` and rolls up coverage — kept in sync by the skill. A plan
not in the index is invisible; an acceptance criterion with no test case is a blocking
coverage gap.

---

## 10. What's built vs pending

| Piece | Status |
|---|---|
| This handbook (`QA-PROCESS.md`) | ✅ pass 1 |
| QA training curriculum (`docs/QA-TRAINING.md`) | ✅ pass 1 |
| `test/qa/` suite scaffold + `playwright.qa.config.ts` + blocking `qa-suite` CI job | ✅ pass 2 |
| **ADR-053** for the separate-suite decision | 🟡 **Proposed** — awaiting sign-off |
| Accessibility auditing (`@axe-core/playwright`, WCAG A/AA) | ✅ built · CI **reported** until remediation, then blocking |
| Console-error guard (fail on browser console errors) | ✅ built · CI **blocking** |
| Visual regression (`toHaveScreenshot`) | ✅ built · opt-in (`test:qa:visual`); not in CI (needs Linux baselines) |
| `/test-plan` skill + `TEST-PLAN` template + `TP-001` reference + traceability index | ✅ pass 3 |
| Test personas (`TEST_PERSONAS`, type-safe) + `test-personas.md` | ✅ pass 3 (profiles done) |
| Seeded QA env — Keycloak realm + one user per persona | ⏳ pass 3 (infra — profiles ready, realm seed pending) |
| QA sign-off folded into `/release` Phase-1 gate + `docs/qa/reports/` | ✅ pass 3 |
| **Performance / load** — Artillery `test/perf/` scaffold + `/perf-test` ⚠ skill + **ADR-054**; opt-in `perf` CI job (label / `workflow_dispatch`); reported-first release gate (§6) | ✅ built · budgets **starter** (baseline → blocking pending); dev-supported |
| **QA API (contract) suite** — `test/qa/api/` (Protractor `request` + Mongoose oracle) + `/write-qa-api` ⚠ skill + `qa-api-tests.md` rule + **ADR-055**; shares the automation Allure report | ✅ built · lobby-list + API-driven create specs · **project-dependencies** setup/teardown + **reported-first `qa-api` CI job** (ADR-056) · **ADR-055 Accepted** |
| **QA seeding strategy** — per-feature seed knob, project-deps setup/teardown (both suites), API-driven single-source fixtures (**ADR-056**) | ✅ Phase 1 + Step 1/1b + Step 2 pilot (tickets) built · **ADR-056 Proposed** · remaining: automation SQL-seed conversion, automation CI wiring |

### Backlog — pre-GA test coverage (deferred; see §6 GA gates)

| Piece | Priority | Notes |
|---|---|---|
| **Authorization test matrix** — automated persona × gated-action allow/deny suite in `test/qa/` | 🔴 High (GA-blocking) | Half-built: `TEST_PERSONAS` ready to drive it. Highest-risk gap (permission model is security-critical) and the best worked example for the QA hand-over. |
| **Populate real test plans** — `/test-plan` for the top-risk features (ticketing, workflow, auth, SLA), beyond the `TP-001` reference | 🔴 High (GA-blocking) | The framework is currently empty; coverage is unproven until plans exist and run. |
| **Performance / load — deepen** — baseline the budgets then flip the perf gate to blocking; add SLA-timer + N+1 scenarios; multi-principal (real-auth) load | 🟠 Medium (pre-GA) | Scaffold **built** (Artillery, `test/perf/`, ADR-054, opt-in CI job); this row is the deepening. Multi-principal load is blocked on the seeded Keycloak realm (above). |
| API negative / contract-breadth suite · real-env post-deploy smoke · i18n/responsive · quality metrics | 🟡 Low (post-GA) | Real but can follow GA. |

[Ticketing Application Delivery board]: <your GitHub Project URL>
