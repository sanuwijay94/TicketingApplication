# Test cases — `TC-<PRD#>-<slug>.md`

Human-readable, self-contained test-case documents derived from a PRD by `/write-qa-cases`,
following `.claude/rules/qa-test-cases.md` exactly: one `##` section per PRD user story, every
case with the canonical field set, every acceptance criterion mapped to ≥1 case, the full
scenario-type spectrum covered. `TC-<PRD#>` orders the file to its PRD; the case IDs inside use
the feature abbreviation (`WM-001`).

Each file has a companion `TC-<PRD#>-<slug>.data.json` holding the reused test data — the JSON is
canonical, the doc's reference table is a readable index. Cases run manually until the QA
automation lane is provisioned (`QA-PROCESS.md` ⚠); `Execution Mode: Automated` cases are the
input that lane will consume.
