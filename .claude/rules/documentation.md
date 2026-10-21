# Documentation

Documentation stays synchronized with the codebase. **Documentation is part of the deliverable, not an afterthought.**

## Always

- Update architecture docs (`.claude/planning/architecture/`) when mechanisms change — these are living docs
- Update `AGENTS.md` when workflows, patterns, or conventions change
- Update `test/README.md` when testing conventions change
- Fix documentation drift when noticed

## When core logic or architectural decisions change

PRDs and ADRs are **historical records** — reasoning at decision time, not living specs. Never rewrite them to match code.

When a change modifies core logic or reverses a previous architectural decision:
1. **Ask the user**: "This changes the approach from ADR-NNN. Shall I create a new ADR to document the new decision? It can go in this PR or a separate one."
2. If yes: create a new ADR referencing the superseded one, mark the old ADR as `Superseded by ADR-NNN`
3. If no: update only the architecture docs to reflect the current state

The new ADR can live in the same PR as the code change (preferred — keeps decision and implementation together) or in a separate PR if the scope warrants it. The user decides.

## Permanent knowledge layer

`.claude/planning/architecture/` — mechanism docs that change only when the mechanism changes. Update **in place** (these are not historical records).

## Keeping `.claude/` and CLAUDE.md Lean

Keep only what a senior developer using Claude would get wrong without being told — project-specific conventions, policy decisions, non-obvious gotchas. Remove generic patterns and duplicated content. One source of truth per topic; others get a one-line reference.

- **Under a page.** Claude reads all of `CLAUDE.md` at the start of every session; a stale line costs context on every task for no benefit. Details belong in the linked rule, skill, or architecture doc.
- **The twice rule.** When Claude makes the same mistake twice, the correction goes into `CLAUDE.md § Things Claude gets wrong` — one imperative line, in the PR that fixes the second occurrence. A review finding that is the second occurrence of a mistake proposes the line (`REVIEW.md § Feedback into CLAUDE.md`). Remove a line once the mistake has stopped recurring for a while.
- **Where knowledge goes** (the rule of thumb):

  | Knowledge | Home | Why |
  |---|---|---|
  | A project convention, command, or gotcha | `CLAUDE.md` / a rule in `.claude/rules/` | read every session; cheap; reviewed like code |
  | Institutional knowledge that must be applied **consistently** to a recurring task (a security standard, an API convention, a brand rule) | a **skill** in `.claude/skills/<name>/` with a named policy owner | explicit, version-controlled, triggered when relevant, updated centrally when the policy changes |
  | A policy that must hold **without exception** | a **hook** behind the skill (`.claude/hooks/`) or a CI check | a skill is advisory — it makes violations rare; the hook makes them close to impossible |

  Do not write a skill for something that belongs in `CLAUDE.md` or a prompt; do not rely on a skill alone for a policy that must never be breached.
