---
allowed-tools: Task, AskUserQuestion, Read, Write, Edit, Bash(git:*), Bash(ls:*)
description: Generate QA test-case DOCUMENTS from a PRD — one TC-NNN file per PRD in the canonical structure (.claude/rules/qa-test-cases.md). Reads the PRD + the governing requirement doc (HIGH priority) and the RFC (LOW), maps every acceptance criterion to human-readable cases (each tagged Scenario Type + Priority + Severity), grouped by the PRD's user stories
argument-hint: '[NNN | prd-slug | all] [--dry-run]'
disable-model-invocation: true
---

Turn a **PRD** into QA **test-case documents** — human-readable cases in the QA house
structure (`.claude/rules/qa-test-cases.md`), one `TC-<PRD#>-<slug>.md` per PRD, every
acceptance criterion covered, cases grouped under the PRD's **user stories**.

**Format authority:** the case structure, source precedence, ID/file conventions, and
coverage policy all live in **`.claude/rules/qa-test-cases.md`** — read it first; this skill
does not restate the field list.

**Source precedence (binding — from the rule):** PRD + `artifacts preparation references/<requirement doc>.md` are **HIGH**; the matching RFC is **LOW** (fill-in only, never overrides). PRD/requirement conflict → flag, don't silently pick.

**Scope:** cases stay at the **user/browser-observable** level. API / contract / integration /
unit assertions are developer-owned (`testing.md`, `api-contracts.md`, ADR-053) — never authored here.

**Delegate mode:** `qa-agent` (read-only) designs the cases and coverage; **you orchestrate
and write the file**. Do not invent coverage the agent didn't derive.

## Current State

- Branch: !`git branch --show-current`
- PRDs: !`ls .claude/planning/prd/*.md 2>/dev/null | grep -v _template | grep -v README || echo "None"`
- Requirement doc (HIGH): `artifacts preparation references/<requirement doc>.md`
- Existing test-case docs: !`ls .claude/planning/qa/test-cases/TC-*.md 2>/dev/null || echo "none yet"`
- Structure rule: `.claude/rules/qa-test-cases.md`
- Personas: `.claude/planning/qa/test-personas.md`

## Arguments

$ARGUMENTS

Accepts a PRD number (`002`), a PRD slug (`sla-manager`), or `all` (iterate every PRD from
`002` upward). `--dry-run` lists the cases it *would* generate without writing. If empty,
list PRDs and ask which.

## Workflow

### Phase 0 — Resolve PRD(s) and load sources

1. Map the argument to one or more PRDs. `all` = every `.claude/planning/prd/NNN-*.md` from `002` up (skip `001` umbrella and `_template`).
2. For each PRD, gather its sources per the rule's precedence:
   - **HIGH** — the PRD md, and the relevant part of `artifacts preparation references/<requirement doc>.md`.
   - **LOW** — the matching `RFC-00N` (by feature), used only to fill gaps.
   - If the requirement source is a `.docx` with no `.md` twin, flag it (can't cite un-read binary) and proceed from the PRD.
3. Look up the feature's **abbreviation** in the rule's §4 map (Workflow Management → `WM`, …).

### Phase 1 — Design the cases (qa-agent)

Invoke `qa-agent` (read-only) per PRD to produce the cases, instructing it to:
- Follow **`.claude/rules/qa-test-cases.md`** exactly — the 9-field structure, one case per `###`.
- Apply the **coverage policy**: every PRD acceptance criterion → ≥1 case; across each story cover every applicable **Scenario Type** — `Positive`, `Negative` (incl. permission-persona per ADR-037/038), `Boundary`, `Exception`, `Integration` (UI-level cross-feature), `End-to-End` — and ensure the file exercises all six.
- Tag every case with exactly one **Scenario Type**, and set **Priority** (`P1`–`P3`) and **Severity** (`S1`–`S4`) from the business requirement (PRD / the governing doc), not gut feel.
- Respect **source precedence** — derive from PRD + requirement doc; use the RFC only to fill detail; surface any PRD↔requirement conflict as a `⚠ Source conflict` note.
- Group cases under the PRD's **user stories** (`## US1 — …`, `## US2 — …`), in the PRD's story order; each case's **User Workflow** field repeats its story.
- Make **every case self-contained** (rule §2.1): each case carries its own **complete** Pre-Conditions (fold in the shared log-in identity + permission + seed data, plus case-specific state — no `As per US<n>` references) and does not rely on a previous case's leftover state. An optional file-level **Reference data** table may list reused seed/persona values for readability, but each case still names what it needs.
- Write **Navigation Steps as the complete, self-contained user journey in concrete atomic actions** — **start with a log-in line every time** and walk the full path (log in → open the screen via the real menu/navigation → **each field as its own numbered step** → the final action), one action per step, imperative verb + explicit target/value. The **first step is always** `Log in to the application with a <role> account.` — role-descriptive for capability cases (*Master-Data management account*, *ticket-creating account*), named persona for permission cases (`Log in as \`agentViewer\``). **One field = one step**: every input, dropdown, toggle, and click is its own numbered action (`Click the **Master Data** icon in the left navigation`, `Select \`Incident (INC)\` from the **Case Type** dropdown`, `Click **Create ticket**`). Never begin mid-flow ("Click New …") or say "fill the rest validly"; spell out every field and click.
- **Use the real UI.** Before writing steps, verify the actual on-screen labels, control types, and navigation path against the app (`clientApp/src/**` + `public/locale/en.json`) — a dropdown is *selected*, a toggle is *turned on*, a text field is *entered*; include required fields the user must fill to complete the action. Where the PRD and the built UI disagree, keep the PRD intent in Expected Result and add a `⚠` drift flag.
- Keep cases browser/user-observable — no API/contract/integration assertions.
- Return the cases grouped, plus the **AC→case traceability** mapping and any AC it could not cover (with the reason).

### Phase 2 — Write the file

For each PRD, write `.claude/planning/qa/test-cases/TC-<PRD#>-<slug>.md` using the rule's
**§5 file layout** (title + sources line + Traceability table + cases grouped under the PRD's user stories).
`Actual Result` is pre-filled to mirror the Expected Result (testers overwrite it with real observations at execution time).
`--dry-run` → print the grouped case list instead of writing.

### Phase 3 — Synthesize

```markdown
## Report: QA test cases — PRD-<NNN>

**Written**: `.claude/planning/qa/test-cases/TC-<NNN>-<slug>.md` — <n> cases across <k> user workflows
**Coverage**: <m>/<total> acceptance criteria mapped (≥1 case each)
**Scenario types**: Positive <a> · Negative <b> · Boundary <c> · Exception <d> · Integration <e> · End-to-End <f> (flag any of the six with zero cases)
**Uncovered AC** (blocking gap): <ac → why>
**Source conflicts flagged**: <PRD↔requirement disagreements, or "none">
**Sources**: PRD-<NNN> (HIGH) · Ticketing Application Requirement.md (HIGH) · RFC-00N (LOW)

### Next
- Review the cases; commit with `/commit`.
- Automate the auto-able cases into `test/qa/` (the Expected Result is the brief).
```

## Important Notes

- **Format lives in the rule** (`.claude/rules/qa-test-cases.md`) — the single source of truth for the structure, IDs, precedence, and coverage. Don't duplicate or diverge from it here.
- **Source precedence is binding** — PRD + requirement doc HIGH, RFC LOW; never let the RFC override, always flag PRD↔requirement conflicts.
- **Every acceptance criterion must reach ≥1 case** — an uncovered AC is a blocking gap in the report.
- **Faithful structure** — exactly the fields in the rule's §2 table, in order; traceability lives in the file-level table, not in the case block.
- **Set `Execution Mode` and `Regression` per case.** `Execution Mode` = `Automated` (browser-observable, becomes a `/write-qa-automation` spec) or `Manual` (exploratory/UX-judgment or blocked-on-tooling). `Regression` = `Yes`/`No`. Suggested defaults (QA overrides): `Regression: Yes` for P1/P2 `Positive`/`Integration`/`End-to-End`; `No` for one-off `Boundary`/`Exception` edges and most `P3`. Regression is **orthogonal to Priority** — do not derive one from the other.
- **Browser-observable only** — API/contract/integration/unit cases are developer-owned; never generated here.
- **`qa-agent` designs, you write** — qa-agent is read-only; the skill orchestrator writes the file.
