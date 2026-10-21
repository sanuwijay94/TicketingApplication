# Product Requirements Documents — `NNN-<slug>.md`

**Historical records.** A PRD captures *what* to build and *why*, as understood when it was
written. It is never rewritten to match what was built — required behaviour that must stay
current lives in `../spec/` (`SPEC-NNN`), decisions in `../adr/`.

- **Written by:** `/prd <feature>` (pm-agent authors, tech-lead-agent challenges) or `/design`.
  Template: [`_template.md`](_template.md). Source: an accepted `intent/NNN-<slug>.md` and/or a
  governing `SPEC-NNN` — cite them; never cite a raw `.docx`.
- **File:** `NNN-<slug>.md`, sequential three-digit number, never reused.
- **Status:** `Draft` → `Approved` → `Implemented` (set by `/implement`).
- **Links:** `implemented_by:` lists the ADR path(s); the ADR's `implements:` points back.
- **Consumers:** `/rfc`, `/adr`, `/test-plan` (`TP-NNN` derives from the acceptance criteria),
  `/write-qa-cases` (`TC-<PRD#>-<slug>.md` maps every acceptance criterion to ≥1 case).
