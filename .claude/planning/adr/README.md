# Architecture Decision Records — `ADR-NNN`

**Historical records.** Each ADR captures *how and why* we decided something, at the time we
decided it. Never rewrite an ADR to match later code — when a decision is reversed, write a new
ADR and mark the old one `Superseded by ADR-NNN`.

- **Written by:** `/adr <prd>` (tech-lead-agent authors, developer-agent challenges, pm-agent
  validates against the PRD). Template: [`TEMPLATE.md`](TEMPLATE.md).
- **File:** `ADR-NNN-<slug>.md`, sequential three-digit number, never reused.
- **Status:** `Proposed` → `Accepted` → `Implemented` (set by `/implement`) → `Superseded by ADR-NNN`.
- **Links:** `implements:` names the PRD path; the PRD's `implemented_by:` names this ADR — both
  directions must agree (`/adr` Phase 4). An ADR that changes spec-governed behaviour declares
  `**Amends spec**: SPEC-NNN` in its header and the spec must mention the ADR id — CI fails
  `UNACKNOWLEDGED` otherwise (`.claude/rules/requirement-sources.md`).
- **Read before designing:** `../architecture/` (how the system works now) — ADRs must not
  contradict the layer map or the domain model without saying so.
