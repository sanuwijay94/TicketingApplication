# QA Test Case Structure

The single canonical format for **PRD-derived QA test-case documents**. `/write-qa-cases`
and any human author MUST follow this rule. These documents are human-readable test cases
(for manual execution and as the brief for later automation) — they are **not** executable
spec code. Executable browser specs live in `test/qa/` and are a separate, downstream artifact
(ADR-053, `testing.md`).

## 1. Source precedence (binding)

When deriving what to test, weigh sources in this order:

| Priority | Source | Role |
|----------|--------|------|
| **HIGH** | The feature PRD — `.claude/planning/prd/NNN-*.md` | Authoritative for *what* the feature must do (acceptance criteria, user stories). |
| **HIGH** | the governing requirement doc — `artifacts preparation references/<requirement doc>.md` (business-reports detail also in `<business-reports>.docx`) | Authoritative business requirement. Cross-check every case against it. |
| **LOW** | The matching RFC — `.claude/planning/rfc/RFC-00N-*.md` | **Supplementary only.** Use to fill detail the PRD/requirement leave implicit — never to override them. |

**Conflict rule:** PRD/requirement win over RFC. If the **PRD and the requirement doc disagree**,
do NOT silently pick one — add a `> ⚠ Source conflict:` note on the affected case and flag it in
the generation report. `.docx` sources with no `.md` twin (e.g. `<business-reports>.docx`) must
be converted or read before they can be cited; flag if unavailable.

## 2. The canonical test-case structure

Every test case has exactly these fields, in this order. Do not add or drop fields
(traceability lives at the file level — §6, not per case). **User Workflow** names the
PRD **user story** the case belongs to, and cases are grouped under that story — see §5.

| Field | Meaning | Required |
|-------|---------|----------|
| **Feature Name** | The feature under test (matches the PRD feature). | Yes |
| **User Workflow** | The specific user flow / scenario group this case belongs to. | Yes |
| **Test Case ID** | `<FEATURE-ABBR>-<NNN>` — see §5. Unique within the file. | Yes |
| **Test Case Title** | One line: "Verify <expected behaviour>". | Yes |
| **Scenario Type** | Exactly one of: `Positive`, `Negative`, `Boundary`, `Exception`, `Integration`, `End-to-End` — see §3 for definitions. | Yes |
| **Priority** | `P1` (High) / `P2` (Medium) / `P3` (Low) — how important running this case is, from the business requirement. | Yes |
| **Severity** | `S1` (Critical) / `S2` (Major) / `S3` (Minor) / `S4` (Trivial) — business impact if the covered behaviour fails. | Yes |
| **Execution Mode** | `Automated` (becomes a `test/qa/automation/` spec) or `Manual` (a human executes it). **Only `Automated` cases feed `/write-qa-automation`.** This field — not the Test Plan's Mode column — is the source of truth; the plan's `🤖 qa`/`✋ manual` derives from it. | Yes |
| **Regression** | `Yes` (regression candidate — part of the curated subset re-run every release via `run-qa.mjs --regression`) or `No`. **Orthogonal to Priority** — a P1 one-off (e.g. a migration check) is not automatically a regression case. | Yes |
| **Pre-Conditions** | The **complete, self-contained** state that must hold before the steps — a numbered list every case carries **in full**. Do NOT write `As per US<n> common pre-conditions.` and do NOT rely on a previous case having left the app in some state: fold the shared state (who is signed in + the permission they hold, what seed data exists) and the case-specific state into one standalone list, so the case reads correctly on its own (§2.1). | Yes |
| **Navigation Steps** | The **complete, self-contained user journey** as **concrete, atomic UI actions** — one action per numbered step, imperative verb + explicit target/value: `Log in to the application with a <role> account`, `Click the **Master Data** icon in the left navigation`, `Select \`Incident (INC)\` from the **Case type** dropdown`, `Turn the **Assignee required** toggle on`, `Click **Create**`. **Always start at log-in and walk the full path** (log in → menu/navigation → the screen → **every field as its own numbered step** → the final action) — never begin mid-flow or assume the previous case left you on the page. The **first step is always a log-in line**: `Log in to the application with a <role> account.` — use a role-descriptive account for capability cases (*Master-Data management account*, *ticket-creating account*) and the named persona for permission cases (`Log in as \`agentViewer\``). **One field = one step**: every input, dropdown, toggle, or click is its own numbered action. **Never** vague steps like "fill the remaining fields validly" — spell each one out. Use the **real on-screen labels and control types** (a dropdown is *selected*, a toggle is *turned on*, a text field is *entered*). | Yes |
| **Expected Result** | Ordered list of observable outcomes that make the case pass. | Yes |
| **Actual Result** | Pre-filled at generation to **mirror the Expected Result**; testers overwrite with real observations during execution. | Yes |

### 2.1 Self-contained cases (binding)

**Every case stands alone.** A tester must be able to run any single case from a cold start —
fresh browser, not signed in — using only that case's Pre-Conditions and Navigation Steps,
without reading any other case or a shared block. This reverses the older "declare common
pre-conditions once" convention.

- **Pre-Conditions** repeat the shared state (log-in identity + permission, seed data) in full,
  then add the case-specific state. No `As per US<n>` references.
- **Navigation Steps** start with a **log-in line** and walk the whole path every time — log in → open the
  screen via the real menu/navigation → **each field as its own numbered step** → the final action. The first step is
  always `Log in to the application with a <role> account.` (role-descriptive account for capability cases; named
  persona for permission cases). Never begin at "Click New …" assuming the user is already on the page; never assume
  the previous case's state.
- A short **`## US<n>`-level "Reference data"** table at the top of the file (seed values, sample
  IDs, persona names) is allowed for *readability*, but each case's Pre-Conditions must still
  name the specific data it relies on — the table is a lookup, not a substitute.

### 2.2 Companion test-data JSON (binding)

**Concrete reused test data lives in one companion JSON file, not scattered as literals across cases.**
Names, usernames, emails, teams, case-type names/codes, ticket IDs, personas, and search strings that
recur across cases are extracted to a sibling file so a data change is a **one-file edit**, not a
find-replace over every case.

- **File** = `.claude/planning/qa/test-cases/TC-<PRD#>-<slug>.data.json` — same basename as the
  case doc, `.data.json` suffix. One per case-doc file.
- **Shape** = readable, keyed groups (e.g. `personas`, `roleAccounts`, `users`, `teams`, `caseTypes`,
  `tickets`, `searchStrings`, `counts`). Each entry holds the concrete attributes a case asserts
  (a user carries `username`/`name`/`role`/`team`/`status`/`email`). Add a top-level `$comment`
  stating the file is the single source of truth and testers must use these exact values.
- **The case doc references it.** The file-level **Reference data** table (§2.1) gains a
  `JSON key` column mapping each row to a `group.key` path, and a note naming
  `TC-<PRD#>-<slug>.data.json` as canonical. Cases still show the literal value inline (readability),
  but the JSON is authoritative — on drift, the JSON wins and is the only thing edited.
- **Values must be real.** Populate from the actual environment the cases run against (the OCM
  directory / seed data), not invented placeholders. If the target directory is the dev mock
  (`OCM_MOCK_DATA=true`, `mock-ocm.client.ts`), use its fixture users; if a case needs data the
  target env lacks (an Inactive user, a >100-user picker cap), flag it as unrunnable there rather
  than inventing a value. State the assumed environment in the JSON `$comment`.

### Rendering (Markdown)

Each case is a `###` subsection carrying its own complete Pre-Conditions and Navigation Steps.
Lists stay as numbered lists (readable, diff-friendly). Use the real on-screen labels/controls:

```markdown
## US1 — Create Case Type

### CT-001 — Verify creating the first Case Type saves it and auto-marks it the org default

- **Feature Name:** Case Type
- **User Workflow:** US1 — Create Case Type
- **Scenario Type:** Positive
- **Priority:** P1
- **Severity:** S1
- **Execution Mode:** Automated
- **Regression:** Yes
- **Pre-Conditions:**
  1. You are logged in to the application with permission to manage Master Data.
  2. A published workflow named `Incident Resolution` exists.
  3. A ticket counter with key `INC` is registered.
  4. No Case Type exists yet in the organization.
- **Navigation Steps:**
  1. Log in to the application with a Master-Data management account.
  2. In the left sidebar, click the **Master Data** icon.
  3. In the Master Data panel, click **Case Types** in the section list.
  4. Click **New case type** to open the create drawer.
  5. Enter `Incident` in the **Display name** field.
  6. Enter `INC` in the **Type code** field.
  7. In the **Hierarchy** selector, click **Parent**.
  8. Turn the **Assignee required** toggle on.
  9. Select `Incident Resolution` from the **Default workflow** dropdown.
  10. Select `INC` from the **Ticket counter** dropdown.
  11. Select `Normal` from the **Default priority** dropdown.
  12. Click **Create**.
- **Expected Result:**
  1. A "Case Type created" confirmation is shown.
  2. The new Case Type appears in the list with a Default badge.
- **Actual Result:**
  1. A "Case Type created" confirmation is shown.
  2. The new Case Type appears in the list with a Default badge.
```

> Each case is fully self-contained (§2.1): Pre-Conditions and Navigation Steps read correctly on
> their own, from log-in through the final action, using the real UI labels/control types.
> **Actual Result** is pre-filled to match Expected Result, so the case reads complete before
> a run; testers replace it with what actually happened during execution.

## 3. Coverage policy

- **Every PRD acceptance criterion maps to ≥1 test case.** An AC with no case is a blocking gap — list it in the report.
- **Cover the full scenario-type spectrum.** Across each story's cases, include every applicable type below, and the file as a whole must exercise all six. Each case is tagged with exactly one **Scenario Type**:

  | Scenario Type | What it exercises |
  |---------------|-------------------|
  | **Positive** | Valid input / happy path succeeds. |
  | **Negative** | Invalid input or a disallowed action is rejected with the right message. Includes **permission-persona** cases (ADR-037/038 — a control is present/absent for a persona; NOT an API 403, which is dev-owned). |
  | **Boundary** | Limits and edges — max/min length, zero, empty, off-by-one, first/last. |
  | **Exception** | Error / failure conditions — server error, concurrency conflict, missing dependency, unevaluable state, retry. |
  | **Integration** | Cross-feature interaction observable in the UI (e.g. workflow ↔ SLA, workflow ↔ assignment rule, workflow ↔ ticket). **Browser-level feature integration — not an API/contract integration test.** |
  | **End-to-End** | A complete multi-step user journey across screens (e.g. create → configure → publish → route → move → resolve). |

- **Priority & Severity on every case, from the business requirement.** Set **Priority** (`P1`–`P3`) by how important it is to run the case, and **Severity** (`S1`–`S4`) by the business impact if the behaviour fails. Core money-path / data-integrity / security behaviours skew P1/S1–S2; cosmetic or rarely-hit paths skew P3/S3–S4. Justify the rating against the PRD / the governing requirement, not gut feel.
- Cases stay at the **user-observable** level — **browser** *or* **API/HTTP-observable** (status, response body, contract schema, headers, error shape). Per **ADR-055**, QA now also authors black-box **API** cases; a browser case becomes a `/write-qa-automation` spec, an API-observable case a `/write-qa-api` spec (see `qa-api-tests.md`). **Unit and in-process integration** assertions remain **developer-owned** (`testing.md`, `api-contracts.md`) — do not author them here (this includes the *dev* white-box meaning of "integration"; the `Integration` scenario type above is strictly cross-feature behaviour observable at the browser or API level).

## 4. ID and file conventions

- **Test Case ID** = `<FEATURE-ABBR>-<NNN>`, `NNN` zero-padded, sequential within the feature (`WM-001`, `WM-002`, …).
- **File** = `.claude/planning/qa/test-cases/TC-<PRD#>-<slug>.md` (e.g. `TC-002-workflow-engine.md`). `TC-<PRD#>` orders the file to its PRD; the case IDs inside use the feature abbreviation.
- **Companion data file** = `.claude/planning/qa/test-cases/TC-<PRD#>-<slug>.data.json` — the reused test data for that case doc (§2.2). Same basename, `.data.json` suffix.
- **Feature abbreviation** — derive from the feature name (Workflow Management → `WM`); use this fixed map so IDs don't drift:

  | PRD | Feature | Abbr |
  |-----|---------|------|
  | 002 | Workflow Engine / Management | `WM` |
  | 003 | Case Type | `CT` |
  | 004 | Field Configuration | `FC` |
  | 005 | Ticket Counter | `TCN` |
  | 006 | Common Configuration | `CC` |
  | 007 | User Management | `UM` |
  | 008 | Notification Status | `NS` |
  | 009 | Templates | `TPL` |
  | 010 | Settings | `ST` |
  | 011 | Assignment Rules | `AR` |
  | 012 | Ticket Lobby | `TL` |
  | 013 | Saved Views | `SV` |
  | 014 | My Tickets | `MT` |
  | 015 | Rules | `RL` |
  | 016 | SLA Manager | `SLA` |
  | 017 | Reports | `RP` |

## 5. File layout

Each `TC-<PRD#>-<slug>.md` file:

```markdown
# Test Cases — <Feature Name> (PRD-<NNN>)

> Sources (precedence §1): PRD-<NNN> (HIGH) · Ticketing Application Requirement.md (HIGH) · RFC-00N (LOW)
> Generated by /write-qa-cases. Update `Actual Result` during execution only.
> Navigation convention (§2.1): every case is self-contained — Pre-Conditions and Navigation Steps stand alone (no reliance on a previous case's state). Each flow starts at log-in and walks the complete path (log in → open the screen → every field as its own step → the final action).
> Values used throughout: <shared seed values the cases reuse — e.g. published workflow `Incident Resolution`, ticket counters `INC`/`SR`, sample customer identifier `CUST-1001`>.

## Reference data used by these cases

> Canonical source: [`TC-<PRD#>-<slug>.data.json`](./TC-<PRD#>-<slug>.data.json) (§2.2). Values live in
> the JSON; this table is a readable index. On drift the JSON wins; edit the JSON only.

| Thing | JSON key | Value |
|-------|----------|-------|
| <administrator log-in + permission> | `personas.admin` / `roleAccounts.masterDataViewer` | `admin` (or a role-descriptive account, e.g. *Master-Data management account*) |
| <seed data the cases reuse> | `<group>.<key>` | … |

## Traceability (AC → cases)

| PRD acceptance criterion | Test Case IDs |
|--------------------------|---------------|
| <AC id / short text>     | WM-001, WM-002 |

## US1 — <PRD user story title>

### WM-001 — …
### WM-002 — …

## US2 — <PRD user story title>

### WM-003 — …
…
```

- **Group cases by the PRD's user stories.** Each `##` section is one user story from the feature's PRD (`## US1 — …`, `## US2 — …`), in the PRD's story order; put each case under the story whose acceptance criteria it covers. The case's **User Workflow** field repeats that story.
- **No shared pre-conditions block.** Per §2.1 every case carries its own complete Pre-Conditions and full navigation. The `## US<n>` heading only groups cases — it does not hold state. An optional file-level **Reference data** table may list reused seed values/personas for readability, but each case still names the data it depends on.
- The **Traceability table** is the file-level link back to the PRD — it replaces per-case traceability fields so the case block stays faithful to §2.

## 6. Relationship to other QA artifacts

- **This doc vs `TP-NNN` Test Plan:** the Test Plan (`/test-plan`) is the living AC→coverage
  index with dev/qa/manual Mode tags; these `TC-` docs are the detailed, executable-by-a-human
  case scripts in the QA house structure. Do not duplicate — if both exist, the PRD is the shared
  source of truth and the Test Plan's traceability may reference these case IDs.
- **This doc vs `test/qa/*.spec.ts`:** these are human-readable cases; a later step derives
  executable specs from the auto-able ones (the Expected Result is the brief). One journey lives
  in one suite (ADR-053).
