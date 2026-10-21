# QA planning artifacts

QA mirrors the dev artifact model — same repo tier for reasoning, GitHub for tracking. Authority:
`QA-PROCESS.md`. Formats: `.claude/rules/qa-test-cases.md` (cases), `templates/TEST-PLAN.md.template` (plans).

| Folder | Artifact | Type | Written by |
|---|---|---|---|
| `test-plans/` | `TP-NNN-<slug>.md` — one living plan per feature, the AC → coverage index | living | `/test-plan` |
| `test-cases/` | `TC-<PRD#>-<slug>.md` + `.data.json` — human-readable case scripts, grouped by user story | living | `/write-qa-cases` |
| `templates/` | the test-plan template | — | — |

Per-release *results* go to `docs/qa/reports/<version>-test-run.md` (historical), the cross-feature
index to `docs/qa/traceability.md` (living), defects to GitHub issues — never here.
