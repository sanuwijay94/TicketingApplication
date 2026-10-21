# Implementation plans — `PLAN-NNN`

The approved implementation plan for a change, committed **before the first code edit** so that
review can check the eventual diff against what was agreed. One file per change:
`PLAN-NNN-<slug>.md`, from `docs/templates/plan.md.template`.

This is the harness's version of the playbook's `plan.md` (see `SDLC.md` → Phase −1, mapping
table). It answers a different question from the ADR: the ADR records *how and why we chose this
design*; the plan records *which files change, in what order, and what proves it works*.

## Lifecycle

| State | Rule |
|---|---|
| **Living** — from approval until the PR merges | If implementation departs from the plan, update the plan **in the same commit** as the departure. A diff that touches files the plan does not name is a review finding, not an error — fix it by amending the plan (and saying why) or by reverting the drift. |
| **Historical** — after merge | Never rewritten. It is the record of what was agreed and how closely the result matched. |

## Who writes it

`/implement` (Standard and Feature lanes) writes the plan after the engineer approves it and
before any code changes. The Quick lane (one file, obvious edit) is exempt — the commit *is* the
plan. `/review` loads the matching plan for its compliance pass; `/pr` links it in the PR body.

## Numbering

Sequential three-digit, never reused. `PLAN-NNN` is independent of ADR/PRD numbering — a plan
names its source (`ADR-NNN`, issue `#N`, or `intent/NNN`) in its frontmatter.
