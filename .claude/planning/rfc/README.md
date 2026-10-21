# Requests for Comments — `RFC-NNN`

**Historical records.** A formal proposal for a change that crosses team boundaries, needs
stakeholder sign-off, or carries architectural risk. It adds requirement detail, non-functional
constraints, success metrics, and a structured approval workflow on top of a PRD. Never rewritten.

- **Written by:** `/rfc <feature | prd>` (pm-agent authors all 12 sections, tech-lead-agent
  challenges). Template: [`_template.md`](_template.md).
- **File:** `RFC-NNN-<slug>.md`, sequential three-digit number, never reused.
- **Status:** `Draft` → `In Review` → `Approved` | `Rejected` (Section 12 records who signed).
- **Next:** an approved RFC feeds `/adr RFC-NNN-<slug>`. Lightweight features skip the RFC and
  go `/prd` → `/adr` directly.
