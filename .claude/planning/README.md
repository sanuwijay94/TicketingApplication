# Planning

This directory contains the project's planning artifacts.

## Structure

```
planning/
├── architecture/    # Living mechanism docs — update in place when mechanisms change
├── spec/            # Living requirement specs (SPEC-NNN) — what the system MUST do (README: the layer model)
├── adr/             # Architecture Decision Records — historical, do not rewrite
│   └── TEMPLATE.md  # Template for new ADRs
├── rfc/             # Formal proposals (RFC-NNN) — historical, do not rewrite
│   └── _template.md # Template for new RFCs (12 sections)
├── plan/            # Implementation plans (PLAN-NNN) — living until merged, then historical
├── qa/              # test-plans/ (TP-NNN, living) · test-cases/ (TC-<PRD#>, living) · templates/
└── prd/             # Product Requirements Documents — historical, do not rewrite
    └── _template.md # Template for new PRDs
```

## Two Types of Docs

### Living Docs (`architecture/`, `spec/`)
These describe the **current** state. Update them in place; they are not historical records.

- **`architecture/` — how the system works right now.** Queuing, auth flow, data model, sync orchestration, external integrations.
- **`spec/` — what the system must do.** Requirement specs (`SPEC-NNN`) derived from the raw requirement documents, carrying a `source_hash` so drift is caught by CI. See [`spec/README.md`](spec/README.md).

**architecture = how it works · spec = what it must do · adr/prd/rfc = why we chose it.**

### Historical Records (`adr/`, `prd/`)
These capture **why a decision was made** at a specific point in time. Never rewrite them to match code evolution.

When a previous decision is reversed: create a new ADR referencing the old one and mark the old ADR `Superseded by ADR-NNN`.

### Living-then-historical (`plan/`)
An implementation plan (`PLAN-NNN`) is **living** from approval until its PR merges — update it in the same commit as any departure — and **historical** afterwards. See [`plan/README.md`](plan/README.md).

Every subdirectory carries a `README.md` saying what lives there, its ID scheme, and whether it is living or historical — `install.sh` copies files only, so those READMEs are also what makes the folders exist in a fresh project.

## Creating New Docs

- **New ADR**: Use `/adr` slash command or copy `adr/TEMPLATE.md`. Number sequentially (ADR-NNN).
- **New PRD**: Use `/prd` slash command or copy `prd/_template.md`. Number sequentially.
- **New RFC**: Use `/rfc` or copy `rfc/_template.md`. Number sequentially (RFC-NNN).
- **New spec**: `/requirement-intake <raw doc>` — derives from `docs/templates/requirement-spec.md.template`; see `spec/README.md`.
- **New plan**: written by `/implement` from `docs/templates/plan.md.template`; see `plan/README.md`.
- **New test plan / cases**: `/test-plan <prd>` and `/write-qa-cases <prd>`; see `qa/README.md`.
- **New architecture doc**: Create a new `.md` in `architecture/` when a mechanism needs documented.
