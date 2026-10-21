---
name: requirement-intake
description: Take a raw requirement document (.docx) through the gate — convert it to a committed .md twin, derive a governing SPEC-NNN, and verify the drift check passes. Run this BEFORE any PRD/RFC/ADR/implementation that depends on the document.
---

# Requirement Intake

Turns a raw requirement document into something the team and AI may act on.

**Authority**: `.claude/rules/requirement-sources.md` · Template:
`docs/templates/requirement-spec.md.template` · Layer model: `.claude/planning/spec/README.md`

Run this when: a new or revised requirement document lands · the drift gate reports
`UNCONVERTED` or `ORPHAN` · you are about to start work and the governing spec does not exist.

---

## Phase 0 — Locate and classify

1. Resolve the target. With no argument, run `npm requirements:check` and work the
   `UNCONVERTED` / `ORPHAN` list.
2. Classify it — **not every document is a requirement**:
   - **Requirement / specification** → continue.
   - **Design** (`design/**.html`) → governed by `ui-designs.md`. Stop.
   - **Process / onboarding** → not a requirement. Stop; suggest converting to `.md` for
     readability, but do not derive a spec.
3. If a hand-curated `.md` twin already exists, **keep it**. Curated markdown usually carries
   structure the converter cannot recover. Skip to Phase 2.

## Phase 1 — Convert

```bash
npm requirements:convert
```

- Writes `<name>.md` beside the raw file, with a `GENERATED FILE` banner.
- Refuses to overwrite a hand-curated twin (reports `KEEP`).
- `.html` / `.xlsx` are **unsupported** — reported, never half-converted. For those, read the
  source and author the spec by hand, and say so in the spec's *Known gaps*.

**Verify before continuing.** Open the twin and confirm headings and tables survived. If heading
levels are flat, the source styles headings directly rather than with `Heading1..6` — say so in
the spec rather than pretending the sections are clean.

## Phase 2 — Derive the spec

1. Next `SPEC-NNN` = highest in `.claude/planning/spec/` + 1. Never reuse a number.
2. Copy `docs/templates/requirement-spec.md.template` →
   `.claude/planning/spec/SPEC-NNN-<slug>.md`.
3. Fill the frontmatter. `source` is the **converted twin**, never the `.docx`. Compute:

   ```bash
   shasum -a 256 "<twin path>" | cut -c1-16
   ```

4. Write the body:
   - **Normative rules (`R1`, `R2`, …)** — statements of required behaviour, citable as
     `SPEC-NNN §R2`. **These must be answerable from the spec alone** — a reader acts on required
     behaviour without opening the source.
   - **Reference detail** — cite long, well-formed source tables by section; copy short or
     frequently-needed ones in. **A citation here is not incompleteness** — the source is
     committed, greppable markdown, so pointing at it is cheap and copying it only creates a
     second thing to maintain.
   - **Known gaps** — what the source leaves undefined, contradicts, or defers. State them
     explicitly: an unstated gap gets silently invented by the next reader.
   - **Traceability** — implementation paths, ADRs/RFCs, test ids.

5. Register the feature in `docs/feature-index.yaml` if it is not already there.

## Phase 3 — Verify the gate

```bash
npm requirements:check
```

Must exit 0 with no `FAIL`. Fix causes, do not restamp around them:

| Result | Meaning | Action |
|---|---|---|
| `DRIFT` | source changed since derivation | **Re-read the source and update the spec**, then `--fix-hashes` |
| `UNCONVERTED` | raw file with no twin | Phase 1 |
| `MALFORMED` | missing frontmatter, or `source` points at a raw file | fix the frontmatter |
| `ORPHAN` (warning) | converted, no spec consumes it | derive a spec, or record why none is needed |

`--fix-hashes` is for **after** re-deriving. Restamping without re-reading defeats the control.

## Phase 4 — Report

State plainly:

- what was converted, and **what the conversion lost** (comments, tracked changes, images are
  never preserved)
- the `SPEC-NNN` created and the rules it establishes
- **every open gap and unreconciled conflict** — especially two sources disagreeing. Do not pick
  a winner silently; precedence is a product decision (`requirement-sources.md` → Ask First).
- anything still `ORPHAN` or `UNCONVERTED`

## Never

- Derive a spec from a document you have not read end to end.
- Invent a rule the source does not state — an unstated gap goes in *Known gaps*.
- Silently resolve a conflict between two requirement sources.
- Put the spec in `adr/` or `prd/` — those are historical records and cannot be current truth.
