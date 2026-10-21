# Requirement specs — `SPEC-NNN`

**Living documents, and the source of truth for required behaviour.** A spec says *what the
system must do now*. When required behaviour changes, the spec changes **in the same PR**.

## The layer model

```
Layer 1 · HISTORICAL INPUT   raw requirement (.docx) + its committed .md twin   — never rewritten
Layer 2 · SPEC (truth)       SPEC-NNN-*.md in this folder                       — READ THIS
Layer 3 · DECISIONS          ../prd  ../rfc  ../adr                              — historical
```

The raw requirement records what was asked for on a date; it goes stale by design. The spec is
derived from it, cites it by section, and overrides it where decisions have moved on. Downstream
artifacts (PRD, RFC, ADR, test cases, code) cite **`SPEC-NNN §R<n>`** — never the raw document.
Full rule: `.claude/rules/requirement-sources.md`.

- **Written by:** `/requirement-intake <raw doc>` — converts the source to a `.md` twin, then
  derives the spec from `docs/templates/requirement-spec.md.template`, stamping `source`,
  `section`, and `source_hash` (of the twin, not the `.docx`).
- **File:** `SPEC-NNN-<slug>.md`, sequential, never reused. Frontmatter is validated by
  `scripts/ci/check-requirement-drift.mjs` (`npm requirements:check`).
- **Status:** `Draft` → `Active` → `Superseded`.
- **Drift gate:** a `source_hash` mismatch means *the input changed* — re-read and re-derive,
  then restamp. An ADR that changes spec-governed behaviour declares `**Amends spec**: SPEC-NNN`;
  the spec must mention that ADR id or CI fails `UNACKNOWLEDGED`.
- **Normative rules live here;** long reference tables may be cited from the twin by section.
  Opening the source because the spec *cited* it is normal; opening it because the spec *lacked*
  the rule is a defect in the spec — fix the spec.
