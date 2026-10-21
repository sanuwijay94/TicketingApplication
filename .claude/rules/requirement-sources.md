# Requirement Sources

How a requirement becomes something AI and implementers may act on. Three layers, one gate.

```
Layer 1 · HISTORICAL INPUT   artifacts preparation references/*.docx  +  committed .md twin
Layer 2 · SPEC (truth)       .claude/planning/spec/SPEC-NNN-*.md      ← READ THIS
Layer 3 · DECISIONS          prd/ · rfc/ · adr/ — historical, unchanged
```

## The raw requirement is an INPUT, not standing truth

A requirement document records **what was asked for on a date**. Like a PRD, it is a historical
artifact and is never rewritten to match the code. It therefore **goes stale, and that is
expected** — not a defect.

This is not theoretical: `business-reports-db-column-mapping.docx` still records the Product
Service issue columns as having no read-model source, three ADRs after ADR-057 §D4 implemented
them. `SPEC-001 §R8` overrides it, and that override is **normal operation**.

| | Role | Rewritten to match code? |
|---|---|---|
| Layer 1 raw + twin | historical input — what was asked for | **Never** |
| Layer 2 `SPEC-NNN` | **the source of truth** — what must be true now | **Yes, in the same PR** |
| Layer 3 ADR/PRD/RFC | why we chose it | Never |

`source_hash` therefore means *"a new version of the input arrived"* — **not** *"the spec is
wrong."* A spec can be perfectly correct while the input that seeded it is years out of date.

## 🚦 STOP — spec before work (binding gate)

**No PRD, RFC, ADR, test case, or implementation may cite a raw `.docx` / `.xlsx` / `.html`.**
Cite `SPEC-NNN §R<n>`. A raw citation means the gate was skipped.

The sequence is non-negotiable:

1. **Convert** — `node scripts/convert-requirements.mjs`. A source with no `.md` twin is
   invisible to search and *will* be skipped. This is not hypothetical: a measured session
   spent ~2.2h rebuilding the wrong report because `<business-reports>.docx` and
   `business-reports-db-column-mapping.docx` had no twins, while `Ticketing Application Requirement.md`
   — which had one — was read and cited throughout.
2. **Derive** — write `.claude/planning/spec/SPEC-NNN-*.md` from
   `docs/templates/requirement-spec.md.template`, stamping `source` + `section` + `source_hash`.
3. **Work** — everything downstream reads the spec.

`/requirement-intake <raw file>` does 1 and 2.

## What the spec must contain (and what it need not)

**Normative rules must be answerable from the spec alone.** Bulk reference detail may be cited
by section — **a citation is not incompleteness.**

| | Lives in the spec | May be cited from the source |
|---|---|---|
| Required behaviour, validation, precedence, calculations | ✅ | ❌ |
| Known gaps, conflicts, reconciliation | ✅ | ❌ |
| Long enumerations and mapping tables | optional | ✅ |

Once a source is converted it is committed, greppable markdown — one `Read`, no conversion step.
That is what makes citation cheap and copying unnecessary. The original problem was never
"people read the requirement"; it was that the requirement was a `.docx` and therefore unreadable.

So the reading model is:

- Opening the source **because the spec cited it** → normal, by design.
- Opening the source **because the spec lacked the rule** → a defect in the spec. Fix the spec.

## Always

- Enter through the **spec**; let it tell you when to open the source. If the spec cannot answer
  a question about *required behaviour*, the spec is incomplete — fix it there, do not work
  around it from the source.
- **Name the source before the first edit.** For any change to spec-governed behaviour, state the
  governing `SPEC-NNN §R<n>` and quote the rule *before* editing. This is what surfaces a wrong
  premise in turn 2 instead of turn 4.
- Stamp `source_hash` from the **converted twin**, never the `.docx` — a Word resave changes the
  binary without changing the content.
- Update the governing spec **in the same PR** as a behaviour change.
- Treat `— none —` / blank-by-design columns and fields as **correct behaviour**, not defects,
  when the spec says so.

## Never

- Cite, quote, or link a raw `.docx` / `.xlsx` / `.html` from a downstream artifact.
- Hand-edit a generated `.md` twin (it carries a `GENERATED FILE` banner and will be overwritten).
- Overwrite a **hand-curated** twin with a machine conversion — the converter refuses; do not
  force it. Curated markdown routinely carries structure the converter cannot recover.
- Put a living requirement spec in `adr/` or `prd/` — those are **historical records**
  ([documentation.md](documentation.md)); they cannot be current truth by definition.
- Let a `source_hash` mismatch through by restamping without re-reading. `--fix-hashes` is for
  *after* re-deriving, not instead of it.

## When a decision changes required behaviour

The hash only catches **input changed → spec stale**. The drift that actually bit us ran the
other way: ADR-057 §D4 changed the behaviour, the code shipped it, and the requirement layer
stayed wrong for three ADRs with a green build.

So an ADR that changes spec-governed behaviour **declares it in its header**:

```markdown
**Status**: Proposed
**Amends spec**: SPEC-001
```

The named spec must then mention that ADR id — in a rule, in *Source divergences*, or in *Known
gaps*. CI fails with `UNACKNOWLEDGED` otherwise. Symmetric with the `Superseded by ADR-NNN`
convention the ADR layer already uses on itself.

## Enforcement

| Layer | Mechanism | Catches |
|---|---|---|
| Authoring | `/requirement-intake` | conversion + derivation in one step |
| Per-PR | `scripts/ci/check-requirement-drift.mjs` | hash drift · unconverted source · orphan requirement · malformed frontmatter · **unacknowledged ADR amendment** |
| Per-PR | **spec-conformance tests** (e.g. `spec-conformance.spec.ts`) | code contradicting a **structured** spec claim |
| Review | PR checklist | human backstop — the only control for **prose** rules |

**Coverage limit, stated plainly:** conformance tests only work where a spec claim is
machine-checkable (a column table, an enumeration). Prose rules — "must be usable by
contact-centre agents" — have no assertion and rely on review. Structured specs are enforced;
prose specs are reviewed.

```bash
npm requirements:convert    # raw → .md twins (idempotent; keeps curated twins)
npm requirements:check      # the gate — non-zero on drift
```

`ORPHAN` is a **warning**, not a failure: a converted requirement nobody derived a spec from.
It means the requirement is readable but ungoverned — fine briefly, a gap if it persists.

## Ask First

- Declaring a second requirement source authoritative over an existing one (precedence is a
  product decision — record it in the spec's *Known gaps*, do not pick silently).
- Retiring a raw `.docx` after conversion (fine when we own it; not when an external party does).
- Adding a new `SOURCE_ROOTS` directory to the converter or the gate.

## Precedence note (unresolved)

`.claude/rules/qa-test-cases.md` §1 ranks **PRD/requirement HIGH, RFC LOW**. This rule introduces
Layer 2 between them. The intended reading — **Layer 2 inherits HIGH precedence, and a
`source_hash` mismatch is what demotes it** — is *proposed*, not ratified. Until an ADR settles
it, flag any conflict rather than assuming.
