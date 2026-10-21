# MVP scope — the current slice

**Binding.** PRDs and RFCs describe the long-term vision; this file says what is being built
**now**. Agents read it before building (`CLAUDE.md`), QA cross-checks it before filing a defect
against intentionally deferred behaviour (`QA-PROCESS.md`), and `/onboard` points new engineers at
it. Update it in the PR that changes the slice — it is a living document.

## Current slice

**Milestone**: Phase 1 — baseline: the application as built (Aug–Sep 2019), recorded when the agent harness was adopted. No new feature work is planned yet.
**Target**: `v0.1.0` (not tagged yet)

There are no GitHub issues, PRDs, or specs for these features; they predate the harness. The
**Built in** column cites the commit that introduced each one. The next slice starts when its first
PRD or issue is written.

## In scope

| Feature | Issue | PRD | Status | Built in |
|---|---|---|---|---|
| Login: username + password → JWT (50 min), stored in `localStorage` | — | — | done | `d2f4e64`, `eea5452` |
| Registration as Agent or Supervisor (`/register`, `POST /user/create`) | — | — | done | `d2f4e64` |
| All tickets list (`/tickets`, `GET /ticket/`) | — | — | done | `0caf77d` |
| My tickets: tickets assigned to me (`/myTickets`, `GET /user/:id/tickets`) | — | — | done | `0caf77d` |
| Ticket view (`/ticketView`, `GET /ticket/:id`) | — | — | done | `e9eba04` |
| Create ticket from the tickets screen; new tickets start `Open` | — | — | done | `19d808c`, `115489c` |
| Update ticket from the ticket view | — | — | done | `c73451f` |
| Delete ticket (Supervisor only, server-enforced) | — | — | done | `c73451f` |
| Only Supervisors can set a ticket to `Closed` (in the UI; see Deferred) | — | — | done | `115489c` |
| Closed-ticket visibility by role — **see Open questions** | — | — | done (rule disputed) | `4980d29` |
| Logout | — | — | done | `d8a33a0` |
| Validation messages on login, register, create ticket, update ticket | — | — | done | `87333fd` |
| User API: detail, update, delete (deleting a user unassigns their tickets) — **API only, no screens** | — | — | done | `59db3f0` |

## Open questions — do not change either behaviour, do not file as a defect

| Question | Evidence | Until decided |
|---|---|---|
| Who may see `Closed` tickets? | Commit `4980d29` says *"only 'Agents' can access or view 'Closed' tickets"*. The code does the opposite: `tickets/`, `my-tickets/`, and `ticket-view/` hide `Closed` from Agents, and Supervisors see everything. | Keep the current code behaviour. QA files neither behaviour as a defect. The decision belongs in a spec (`/requirement-intake`) or an ADR. |

## Deferred — do not build, do not test as a defect

| Capability | Why deferred | Revisit |
|---|---|---|
| Plain-text password storage and comparison (`server/middleware/login.js`), and passwords sent to the browser: the login response, `GET /user/`, the populated `assignee`/`submitter` on every ticket response, and `localStorage['auth-user']` (which logout does not clear) | Local development / demo use only | Before any shared or production deployment |
| Hard-coded JWT secret `'secret'` (`authentication.js`, `middleware/login.js`) | Local development / demo use only | Before any shared or production deployment |
| Open self-registration as Supervisor (`POST /user/create` needs no auth) | Local development / demo use only | Before any shared or production deployment |
| Server-side role rules: an Agent's token can set `Closed` via `PATCH /ticket/:id/update`; new tickets default to `Open` only because the client sends it | Baseline records the as-built behaviour; the UI enforces both | When a hardening slice is planned |
| Delete button visible to Agents (the server returns 403) | Known as-built gap | When a hardening slice is planned |
| Role and user id read from fixed string offsets of `localStorage['auth-user']` | Known as-built gap ([layer-map.md](.claude/planning/architecture/layer-map.md) § Client) | When a hardening slice is planned |
| Hard-coded API base URL and MongoDB URL; no environment config | Local development only | Before running anywhere but localhost |
| Client unit specs (11 of 11 failing CLI scaffolds) and lint rules (no `tslint.json`) | Never configured | When test and lint gates are adopted |
| Server tests beyond the token guard | One dependency-free script covers `authentication.js` only (`server/test/authentication.test.js`). There is no runner and nothing else is covered | When test gates are adopted |
| Register screen throws `TypeError` (`register.component.ts:32`) after a *successful* registration; the redirect to login still happens | Known as-built defect | When a hardening slice is planned |
| Unknown API routes return 500 *"Failed to lookup view"* instead of 404 (no `server/views/error.pug`) | Known as-built defect | When a hardening slice is planned |
| `middleware/user.js` calls an undefined `json(err)` on a database error (would throw `ReferenceError`) | Known as-built defect | When a hardening slice is planned |
| Ticket view dereferences `ticket.assignee._id` / `ticket.submitter._id` / `.username` unguarded, but `assignee` is optional and deleting a user clears `assignee` and leaves `submitter` dangling — so such tickets break the ticket-view screen (read from code, not reproduced) | Known as-built defect ([domain-model.md](.claude/planning/architecture/domain-model.md) § Not guaranteed) | When a hardening slice is planned |

## Explicit non-goals

None decided yet. Add one when it is a deliberate product decision, not a gap. Gaps go under **Deferred**.
