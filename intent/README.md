# Intent — the front door of the SDLC

`intent/` is where an idea enters the development process **in the originator's own words**,
before anyone turns it into a requirement, a PRD, or a design. It is the Plan-stage artifact of
the AI-native SDLC: human-readable, version-controlled, and immediately consumable by the next
stage — see `SDLC.md` → *Phase −1: Capture*.

## Who writes here

Anyone. A product owner, a support lead, an operations analyst, an engineer, or an automated
monitor (the `ai-factory` loop files its findings here too). No engineering vocabulary is
required — the file records **what is wanted, why, and under which constraints**. `/intent`
runs the interview and writes the file; contributors without git access can commit through a
Claude connector to the repository host.

## Lifecycle

```
draft ──(product owner merges the PR)──▶ accepted ──▶ consumed by /requirement-intake or /prd
  │                                                       │
  └──(closed: not pursued; reason recorded)               └── status stays `accepted`; the
                                                              downstream artifact links back
```

| Status | Meaning | Who sets it |
|---|---|---|
| `draft` | Written, not yet reviewed | `/intent` on creation |
| `accepted` | The product owner has agreed this is worth pursuing. **Acceptance is the merge** of the branch that carries the file — no separate approval field. | Product owner, by merging |
| `closed` | Reviewed and not pursued. Keep the file; record the reason under *Open questions*. | Product owner |

An accepted intent is a **historical record** (like a PRD): it is never rewritten to match what
was eventually built. Corrections before acceptance are normal; after acceptance, changes go in
the downstream artifact and the intent is left as the record of what was originally asked for.

## What consumes it

| If the intent… | Next step | Produces |
|---|---|---|
| is backed by a formal requirement document | `/requirement-intake <doc>` | `.md` twin + `SPEC-NNN` |
| is a feature idea with no formal document | `/prd <intent file>` | `.claude/planning/prd/NNN-*.md` |
| is a defect report | `/bug file` | GitHub issue (`type:bug`) |

The downstream artifact cites the intent by path (`intent/NNN-<slug>.md`) so the chain
intent → spec/PRD → ADR → PLAN → PR is traceable from either end.

## Files

- `NNN-<slug>.md` — one intent per file, sequential three-digit number, kebab-case slug.
  Template: `docs/templates/intent.md.template`.
- Numbering never reuses a number, even for closed intents.
