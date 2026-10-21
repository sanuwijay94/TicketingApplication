# Developing Ticketing Application with the Harness

How to take a change from an idea to a merged pull request using the agent harness installed in this
repo — starting with `/intent`. Three worked examples run through it: a **feature** (notes on a
ticket), a **one-file tweak** (hide Delete from Agents), and a **bug** (a ticket with no assignee).

> **Every example here is illustrative.** The intents, PRDs, ADRs, and plans shown are not
> committed files, and the numbers (`001`, `002`) are only examples. The bugs and gaps they touch
> are real — they are listed in [MVP-SCOPE.md](../MVP-SCOPE.md) — and every file path and line
> number cited was checked against the repo on 2026-10-20.
> For orientation first, read [ONBOARDING.md](ONBOARDING.md); for the full workflow contract,
> [SDLC.md](../SDLC.md).

---

## 0. The loop at a glance

```
idea ─/intent─▶ intent/NNN ─(merge = accepted)─▶ /prd ─▶ prd/NNN ─▶ /adr ─▶ ADR-NNN
                                                                               │
 /release ◀─ merge ◀─ /pr ◀─ /commit ◀─ /review ◀─ checks ◀─ code ◀─ /implement ─▶ PLAN-NNN
```

| Stage | You type | Claude produces | Lands in | Done when |
|---|---|---|---|---|
| 1 Capture | `/intent <a sentence>` | an interview, then the intent file | `intent/NNN-<slug>.md`, on branch `intent/NNN-<slug>` | the product owner **merges** that PR — merge *is* acceptance |
| 2 Define | `/prd intent/NNN-<slug>.md` | requirements: user stories, acceptance criteria, MVP vs deferred | `.claude/planning/prd/NNN-<slug>.md` | you approve the draft |
| 3 Decide | `/adr NNN-<slug>` | the design decision, alternatives, risks | `.claude/planning/adr/ADR-NNN-<slug>.md` | you approve the proposal |
| 4 Build | `/implement ADR-NNN` | an approved plan, then code, tests, doc updates | `.claude/planning/plan/PLAN-NNN-<slug>.md` + the diff | plan approved, checks pass |
| 5 Verify | `/review` · `/security-review` | findings graded by [REVIEW.md](../REVIEW.md) | the chat | no *Important* findings left |
| 6 Ship | `/commit` → `/pr` | Conventional commits; a PR body with plan compliance | GitHub | merged |
| 7 Maintain | `/fix` · `/bug` | root cause, failing test, fix | the diff / a GitHub issue | the test passes |

**The file, not the chat, is the handoff.** Each command reads the previous stage's artifact from
disk, so you can end the session between stages and pick up tomorrow. Everything under `intent/`,
`prd/`, `adr/`, and `rfc/` is a **historical record** — never rewritten to match the code. `PLAN-NNN`
is living until its PR merges. The architecture docs and `MVP-SCOPE.md` are living: update them in
the same PR as the change.

**Who can type what.** `/prd`, `/adr`, `/rfc`, `/domain`, `/scaffold`, `/test-plan`, `/write-qa-cases`,
`/write-dev-tests` and `/ci-setup` are **user-only** (`disable-model-invocation`): you must type them,
Claude cannot start them for you. `/intent`, `/implement`, `/fix`, `/review`, `/commit`, `/pr` and the
investigation commands can be run by either of you. Open the **repo root** as the VS Code project so the hooks
find `.claude/` (they locate it from `$CLAUDE_PROJECT_DIR`).

---

## 1. Before you start

### 1.1 Set up once

Follow [ONBOARDING.md § 8](ONBOARDING.md): Node **10.24.1**, the `MongoDB` Windows service, Chrome,
and `jq` on PATH (**restart VS Code** after installing it — the safety hooks do nothing without it).
Run the stack with VS Code → **Full Stack: Server + Client**. Seeded logins: `sanuwijay94` / `1234`
(Supervisor) and `dinur-el` / `abcd` (Agent).

### 1.2 What does not work yet — read this before your first `/commit`

The harness was written for another stack. These are the places it will stop you, and what to do:

| You hit… | Why | Do this |
|---|---|---|
| `/test`, `/verify`, **`/commit`** fail | They run `npm run test:unit`, `npm run lint`, … from the repo root. There is **no root `package.json`**, and all 11 client specs fail. `/commit` runs `/test` first and refuses to commit | **Step 0** below. Until then run the commands in [CLAUDE.md](../CLAUDE.md) yourself, paste the output, and have a human make the commit |
| `/pr`, `/bug`, `/fix #12`, `/implementation-plan`, `/release` | They call the **`gh` CLI** (not installed) and expect GitHub labels and milestones that don't exist yet | `winget install GitHub.cli`, then `gh auth login`. Create the labels (`type:feature`, `type:bug`, `sev:S1-critical`…`sev:S4-trivial`, `lane:hotfix`, `lane:scheduled`, `track:backend`, `track:ui`) and a `Phase 1` milestone once. Or do the GitHub part in the browser — the skills print the text to paste |
| `/implement` halts with *"no merged contract — run `/contract`"* | Contract-first isn't adopted here ([CLAUDE.md § Not adopted yet](../CLAUDE.md)). The gate hook is unwired | Don't run `/contract`. Answer that the contract is the Mongoose model plus the route, and point it at [layer-map.md § Placing a change](../.claude/planning/architecture/layer-map.md) |
| Skills mention Zod, MSW, `openapi:emit`, `src/domain`, `docker compose`, `npm dev:*` | Left over from the harness's source project | Ignore them; use [layer-map.md](../.claude/planning/architecture/layer-map.md) and the commands in CLAUDE.md |
| `/requirement-intake` | It runs `npm requirements:convert` and `npm requirements:check`, which don't exist. You only need it if a formal requirement document (`.docx`) arrives — none has | Run the underlying `.mjs` scripts directly under **Node ≥ 14** (`"$NVM_HOME/v24.21.0/node.exe" scripts/convert-requirements.mjs`; the drift check is `scripts/ci/check-requirement-drift.mjs`) |
| `/design` stops early | It chains `/prd` → `/adr` → `/implement`, but `/prd` and `/adr` are user-only | Type each command yourself, one at a time. This guide does |
| `/fix` Phase 2 needs a failing test | The client specs need a configured `TestBed`; `server/` has no test runner (one plain-Node script covers the token guard only) | See § 8 — and adding a runner is a new dependency, which is **Ask First** |

### 1.3 Step 0 — make the gate real (the team's first task)

Until this is done, the harness's quality gates cannot pass and nobody can use `/commit`. It is a
change like any other, so size it first (§ 1.4): it is a **Medium** change.

1. Make the 9 client spec files (11 tests) pass. They fail for two different reasons: specs for screens whose
   templates use `ngModel` lack `FormsModule` (`Can't bind to 'ngModel'`), and most lack providers for
   `AuthService`, `HttpClient`, or `Router` (`NullInjectorError`).
2. Point `/test`, `/verify`, and `/commit` at the real commands. `/test` carries a `TODO` saying to
   update its npm script names; the real ones are in [CLAUDE.md](../CLAUDE.md) and
   [AGENTS.md](../AGENTS.md). Optionally add a `tslint.json` so `ng lint` checks something.
3. Decide whether `server/` gets a test runner (a new dependency — ask first).

The commit that fixes `/test` cannot go through `/commit` (which needs `/test`). That one commit has
to be made by a person with `git commit`, with the reason in the message — the rule
"never commit directly" ([boundaries.md](../.claude/rules/boundaries.md)) assumes `/commit` works.

### 1.4 Pick the ceremony to match the change

The harness is explicit that ceremony scales with the change ([change-sizing.md](../.claude/patterns/change-sizing.md),
`/implement` § lanes). Default to the **lowest** row that fits.

| Size | Looks like | Do this | Example below |
|---|---|---|---|
| **Trivial / Quick** | one file, obvious edit | `/implement --update "…"` → check it → commit. The commit *is* the plan | B — hide Delete |
| **Small / Standard** | a few files in one existing feature | `/implement --update "…"`; it runs `/impact-check` once and commits a `PLAN-NNN` | — |
| **Medium–Large / Feature** | new capability, new model or endpoint, a design choice | `/intent` → `/prd` → `/adr` → `/implement` | A — notes on a ticket |
| **Defect** | something that used to work, or never did | `/fix "<symptom>"` (add `/bug file` if it must be tracked) | C — no assignee |
| **"How does this work?"** | no change yet | `/explain` · `/investigate` · `/impact-check` · `/trace-bug` (§ 9) | — |

`/intent` is for anyone, engineer or not. For a one-file tweak you may skip it; **do** capture one when
someone else asked for the change, or when the *why* would otherwise live only in a chat.

---

## 2. Stage 1 — Capture with `/intent`

`/intent` records an idea **once, at the source, in the originator's own words**, before anyone writes a
requirement or a design. It interviews you in plain language, so the person typing it does **not** need to
be an engineer — it never asks for, suggests, or writes technical vocabulary.

### 2.1 Run it

```
/intent Supervisors keep texting agents when they hand a ticket over, because there is nowhere on the ticket to leave a note
```

or just `/intent` and be asked: *"Describe the problem or idea in your own words — what can't you do
today, or what goes wrong? Who does it affect?"*

Claude asks one or two questions at a time, in this order, stopping as soon as each is answered:

1. **Problem** — what can't be done today; a concrete example of it happening
2. **Who is affected** — roles, and roughly how often it bites
3. **What better looks like** — the observable outcome, not a feature list
4. **What is out of scope** — what you are *not* asking for
5. **Constraints** — anything that must stay true. *"None that I know of"* is a valid answer
6. **Open questions** — what you couldn't answer, and who could

It then reflects your answers back in 3–4 lines and asks *"is that right?"* — and **will not write the file
until you say yes**. It never proposes solutions, architecture, or estimates; those belong to later stages.

A paraphrased session:

```
You:     /intent Supervisors keep texting agents when they hand a ticket over …
Claude:  Who is affected, and how often does this happen?
You:     Supervisors and agents. Every time a ticket changes hands — several times a day.
Claude:  When it works well, what does the next agent see?
You:     Everything that was tried, in order, and who wrote it.
Claude:  Anything you are NOT asking for?
You:     Editing or deleting notes can wait. No emails or alerts.
Claude:  Anything that must stay true?   You: Whoever can open a ticket can read its notes.
Claude:  Here is what I understood: … Is that right?        You: Yes.
```

### 2.2 What it writes

`intent/NNN-<slug>.md` — `NNN` is the next free three-digit number, never reused; the slug is 2–5 kebab-case
words. Every section of [the template](templates/intent.md.template) is filled from what you said, or
says plainly that nothing was known:

```markdown
---
id: INT-001
title: Leave a note on a ticket when I hand it over
author: <your name> (Supervisor)
date: 2026-10-20
status: draft
source: conversation with <your name>
---

# Intent: Leave a note on a ticket when I hand it over

## Problem
When I reassign a ticket I have nowhere on it to explain what has been tried or what the customer said
on the phone. I text or call the next agent instead, and the context is lost the next time the ticket
changes hands. It happens several times a day.

## Proposed outcome
Anyone working a ticket can add a short note to it, and whoever opens the ticket later can read all the
notes in order, with who wrote each one and when.

## Affected users and systems
- **Users / roles:** Supervisors and Agents — both hand tickets over.
- **Systems:** the ticket screen. Not sure whether anything behind it has to change.

## Constraints
Whoever can open a ticket can read its notes. Nothing else known.

## Open questions
- Can a note be edited or deleted after it is posted? — product owner
- Should a Closed ticket accept new notes? — product owner
```

Note what is **not** in it: no "collection", no "endpoint", no "button". That is deliberate. The solution
goes in the ADR (§ 4).

### 2.3 After it writes: correct, commit, accept

1. Claude shows the file and asks *"Is there anything here I misunderstood?"* Say so now — **corrections after
   acceptance go in the downstream document, never in the intent.**
2. It commits on a branch named `intent/NNN-<slug>` with the message `intent: <title>`. You never have to use git.
3. Open a pull request for that branch. **The product owner accepts the intent by merging it** — the merge is
   the approval; there is no separate sign-off. A PR closed with a reason is the rejection. Either way the
   decision is in git history. (Without `gh`, push the branch and open the PR in the browser.)
4. Claude names the next step for whoever picks it up — see the routing table below.

> **Decide who your product owner is** before the first intent. The harness assumes one; this repo
> hasn't named them.

### 2.4 A good intent line, and one that isn't yet

| ✅ Intent — a problem, in plain words | ❌ Not an intent — a solution or a design |
|---|---|
| "Supervisors keep texting agents when they hand a ticket over, because there's nowhere to leave a note" | "Add a `notes` collection and a `POST /ticket/:id/notes` endpoint" |
| "Agents see a Delete button but get an error when they click it" | "Wrap the Delete button in `*ngIf`" |
| "Opening some tickets shows an empty screen" | "`ticket.assignee` is null in the template" |

If you only have the right-hand column, say what *problem* it solves and `/intent` will take it from there.

### 2.5 Where each kind of intent goes next

| The intent is… | Next | Produces |
|---|---|---|
| a feature idea | `/prd intent/NNN-<slug>.md` | `.claude/planning/prd/NNN-*.md` |
| backed by a formal requirement document (`.docx`) | `/requirement-intake <doc>` first (see § 1.2 — its npm scripts don't exist here) | a `.md` twin + `SPEC-NNN` — the source of truth that outranks the raw document |
| a defect report | `/bug file` (tracked) or `/fix` (fixing now) | a GitHub issue, or a fix |
| a small tweak | `/implement --update "…"`, citing the intent as the plan's source | a Quick/Standard-lane change |

---

## 3. Stage 2 — Define with `/prd` (Example A)

```
/prd intent/001-notes-on-tickets.md
```

Two agents work with you. **`pm-agent`** asks you clarifying questions (problem, users, outcome,
constraints) and drafts the PRD; **`tech-lead-agent`** challenges the draft for ambiguous or untestable
requirements, a badly drawn MVP line, and technical risks; the PM answers and revises. You approve the
result. The PRD says *what and why*, never *how* — no libraries, schemas, or code.

The output is `.claude/planning/prd/001-notes-on-tickets.md`, `status: Draft`, citing the intent by path.
Excerpt:

```markdown
---
id: 001
title: Notes on a ticket
status: Draft
intent: intent/001-notes-on-tickets.md
implemented_by: []
---
## 3. User stories
### US1 — Add a note
As an Agent or Supervisor, I want to add a note to a ticket I can open, so the next person has the context.
**Acceptance criteria**
- **AC1.1** — On the ticket view, a signed-in user can type a note (up to 1,000 characters) and post it.
- **AC1.2** — A posted note appears in the ticket's list without reloading the page.
- **AC1.3** — An empty note is rejected with a visible message.
### US2 — Read the notes
- **AC2.1** — Notes are listed oldest first, each with the author's username and the date and time.
- **AC2.2** — A ticket with no notes says "No notes yet".

## 5. Scope
**MVP:** add and read notes.   **Deferred:** editing or deleting a note, notifications, attachments.

## 7. Risks and open questions
| Can a note be edited or deleted? | product owner | Deferred — not in the MVP |
| Does a Closed ticket accept notes? | product owner | Yes — same visibility rule as the ticket |
```

Every open question from the intent must be **answered or carried forward** here. Stories are grouped
(`US1`, `US2`) because `/write-qa-cases` later derives test cases per story.

**Optional neighbours.** `/rfc` is a heavier proposal with a sign-off table — use it only when a change crosses
team boundaries or carries architectural risk; for this project that is rare. `/domain` is an interview
workshop for the vocabulary; [domain-model.md](../.claude/planning/architecture/domain-model.md) exists but
nobody has validated it that way, and a feature that introduces new terms (here, **Note**) is a good
reason to run it.

---

## 4. Stage 3 — Decide with `/adr` (Example A)

```
/adr 001-notes-on-tickets
```

`tech-lead-agent` reads the PRD and the architecture docs and drafts the design; `developer-agent` challenges
it (feasible? testable? hidden complexity? edge cases?); the tech lead defends or revises; `pm-agent` confirms
every acceptance criterion is covered. You approve. Output: `.claude/planning/adr/ADR-001-<slug>.md`,
`status: Proposed`; the PRD's `implemented_by` is updated to match.

The ADR works from the real layers ([layer-map.md](../.claude/planning/architecture/layer-map.md)). Excerpt:

```markdown
# ADR-001 — Store notes in their own collection

## Decision
A new Mongoose model `Note` (`server/models/note.js`): `ticket` → Ticket, `author`, `text`, `created_date`,
in its own collection. Two routes in `server/routes/ticket.js` behind `authorization(agent)` —
`POST /ticket/:id/notes` and `GET /ticket/:id/notes` — handled by a new `server/controllers/noteController.js`.
The author comes from the token (`req.decoded.username`), never from the request body. The client gets two
`AuthService` methods and a notes section in `ticket-view`.

## Alternatives considered
| Option | Why not |
|---|---|
| An array of notes inside the Ticket | `ticket-view` sends the *whole* ticket back on every edit, and `ticket_update_post` writes `req.body` wholesale — a stale edit would overwrite someone else's note |
| One appended `notes` string on the Ticket | loses who wrote each note and when (AC2.1) |
| Keep notes in the browser | not shared between users |

## Trade-offs and consequences
`GET /ticket/:id` is unchanged — notes are fetched separately. No new cross-layer dependency: the handler
imports `models/note.js` and `models/ticket.js`. Unlike `submitter` (which the browser supplies today —
[domain-model.md](../.claude/planning/architecture/domain-model.md), open question 4), the author cannot be forged.

## Testability
No server test runner exists (§ 1.3), so proof is a scripted API check plus a browser walk-through.
```

An ADR is a **historical record**: when a decision is later reversed, a new ADR supersedes it
(`Superseded by ADR-NNN`) — the old one is never edited. Skip the ADR for a change that records no decision.

---

## 5. Stage 4 — Build with `/implement`

```
/implement ADR-001
```

### 5.1 It picks a lane — and so should you

| Lane | When | What it does |
|---|---|---|
| **Quick** | one file, obvious edit | no plan; the commit is the plan |
| **Standard** | an existing feature, a handful of files | one `/impact-check`, then a plan |
| **Feature** | a new feature from an ADR, or a multi-layer change | reads the ADR, `/impact-check`, plan with **an approval checkpoint**, hands off to `developer-agent` |

It escalates a lane only when the impact check finds a shared, widely used piece in the blast radius.
`/impact-check` lists the callers, the dependent tests, and the layer of every file it would touch — **once**.

### 5.2 It writes the plan *before* any code

For the Standard and Feature lanes, Claude states the files, the order, and what it is **not** changing, and must
answer three questions *inside the plan*: **What could this break? Which step is riskiest? Which options were
rejected?** You approve it; it is committed as `.claude/planning/plan/PLAN-001-notes-on-tickets.md`
(`docs(plan): PLAN-001 …`) **before the first code edit**, on the branch named in its `branch:` field.
Excerpt for Example A:

```markdown
---
id: PLAN-001
source: ADR-001
branch: feature/notes-on-tickets
status: living
---
## Files that change
| File | Change | Layer |
|---|---|---|
| `server/models/note.js` | new — the Note schema | model |
| `server/controllers/noteController.js` | new — add and list handlers | handler |
| `server/routes/ticket.js` | modified — two routes | routes |
| `clientApp/src/app/auth.service.ts` | modified — `addNote`, `ticketNotes` | API service |
| `clientApp/src/app/ticket-view/ticket-view.component.ts` / `.html` | modified — notes list and form | screen |
| `AGENTS.md`, `MVP-SCOPE.md`, `.claude/planning/architecture/{domain-model,component-map,layer-map}.md` | modified — the new term, routes, rows | docs |

## Order of work
1. Model → 2. handlers (**riskiest: the handler must confirm the ticket exists before inserting, or notes orphan**)
→ 3. routes → API check → 4. `AuthService` → 5. screen → 6. docs.

## Not changing
`ticket_update_post`, the `populate` calls, `authentication.js`, edit/delete of notes.

## Proof
Log in as both seeded users and `curl`: `POST` a note → 201; `GET` → the note, with author and time; `POST`
empty → a validation message. In the browser: open a ticket as each role, post a note, see it appear.
```

The **Files that change** table is exhaustive on purpose. While you build, the `plan-sync` hook **warns**
every time you edit a file that isn't in it, and `/review` and `/pr` diff the PR against it. When you
genuinely need another file, **update the plan in the same commit** and add a line under *Departures from
plan* — or revert the drift.

### 5.3 Building it in this repo

Order and placement come from [layer-map.md § Placing a change](../.claude/planning/architecture/layer-map.md)
— **not** from the skill's own Zod/MSW steps, which don't apply:

- **New endpoint:** route (`routes/`, with `authentication.authorization(...)`) → handler (`controllers/`,
  validated with `indicative`, following the response conventions in
  [component-map.md](../.claude/planning/architecture/component-map.md)) → model → an `AuthService` method →
  the screen. HTTP goes through `AuthService` only.
- **Logging:** use the `debug` logger on the server (`require('debug')('project:notes')`) and remove
  `console.log` on the client — the `check-console-log` hook warns on both.
- **New terms** — here **Note** — go into `domain-model.md` *before* they are used in code.
- **Keep the response conventions**: validation errors come back as HTTP 200 with an array, failed writes as
  304, auth failures as 403, and the client matches exact message strings. A new endpoint should behave the
  same way so the existing screens' error handling works.

While you edit, expect the guardrails: `protected-paths-gate` blocks edits under `server/node_modules/`,
`secrets-gate` blocks credential-shaped strings, and `test-protection-gate` locks test files during a `/fix`.

### 5.4 Validate, then finish

Run the **real** gates (§ 1.2) — until Step 0 is done that means the commands in CLAUDE.md, and saying so.
For anything a user sees, **run the app and look**: start **Full Stack: Server + Client**, walk the flow as
both roles, force the empty, error, and success states, and screenshot them
([ui-quality.md](../.claude/rules/ui-quality.md)). If you couldn't run the app, say so — don't claim it works.

`/implement` then reports the files changed and the result, and updates docs **only where content changed**:
the ADR and PRD `status` → `Implemented`, and the mechanism docs that moved. Leave `PLAN-001` `living` until
the PR merges.

### 5.5 Example B — a one-file tweak (Quick lane)

The gap is real: the Delete button shows for Agents, who then get a 403
([MVP-SCOPE.md](../MVP-SCOPE.md) § Deferred). No PRD, no ADR:

```
/implement --update "On the ticket view, hide the Delete button from Agents — the server already returns 403 for them"
```

Claude classes it **Quick**: one file, `clientApp/src/app/ticket-view/ticket-view.component.html:14`. It reuses
the role the screen already computes (`loggedInUser`, `ticket-view.component.ts:26`) instead of adding another
`substring` read of `localStorage`. You then:

1. Log in as `dinur-el` (Agent) → no Delete button; as `sanuwijay94` (Supervisor) → the button is there;
   screenshot both.
2. Remove the row from MVP-SCOPE § Deferred in the **same** commit — a change that makes a doc stale must fix it.
3. Commit: `fix(ticket-view): hide Delete button from Agents`.

---

## 6. Stage 5 — Verify

| Command | Use it for |
|---|---|
| `/review` | the multi-agent review of the current diff, graded by [REVIEW.md](../REVIEW.md) |
| `/security-review` | a security-only pass — worth running on anything touching auth, tokens, or user data |
| `/simplify` | on request, not by default: dead code and duplication |
| `/regression` | the full suite — **blocked** until Step 0 |

`/review` sizes the change with [change-sizing.md](../.claude/patterns/change-sizing.md) and asks you to confirm a
profile: `trivial`, `small`, `medium` (3–5 files), or `full` (5+ files). Example A is 6 or so files — `full`.
Its multi-agent mode needs `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, already set in `.claude/settings.json`; without
it the review falls back to a serial single pass.

REVIEW.md defines three passes — **Bugs**, **Security**, **Compliance** (does the diff match the PRD's acceptance
criteria, the ADR, and `PLAN-NNN`, and are `CLAUDE.md`/`AGENTS.md`/the architecture docs still true?) — and reserves
**Important** for a finding that would break behaviour, leak data, breach a rule, or contradict the plan without
a recorded departure. Everything else is a **Nit**, capped at five. A finding looks like this:

```
**Important** · Bugs · `server/controllers/noteController.js:31`
The handler inserts a note without checking that the ticket exists.
A note posted to a deleted ticket is stored and can never be read or removed.
Look the ticket up first with Ticket.findById and return the project's not-found response when it is missing.
```

Findings **inform** the approval; they never approve or block a merge — a human owner still does. If a finding
is the **second** time the same mistake has been made, it proposes the one-line `CLAUDE.md` correction
("twice rule") and the fixing PR adds it.

---

## 7. Stage 6 — Ship

### 7.1 Commit

`/commit` runs `/test` first (blocked until Step 0), stages the right files, and commits in
[Conventional Commits](../.claude/rules/git-workflow.md) form — `<type>(<scope>): <description>`. **It never adds
an AI footer.** Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`. For Example A the
commits go in this order, so the history tells the story:

```
docs(prd): PRD-001 notes on a ticket
docs(adr): ADR-001 store notes in their own collection
docs(plan): PLAN-001 notes on a ticket
feat(api): add and list ticket notes
feat(ticket-view): show and post notes
docs: note term, routes, and MVP scope
```

### 7.2 Pull request

`/pr` runs `/verify` first, then opens the PR against `main`. It checks the diff against the plan —
every changed file must be in *Files that change* or recorded under *Departures from plan* — and pastes the plan's
**Proof** into the body. The body has: **Summary**, **Changes**, **Test Plan**, **Documentation** (PRD/ADR/architecture
docs), **Docs kept current**, **Plan compliance**, and **Related**. Put `Closes #N` in it if the work has a GitHub
issue. One feature per PR; squash-merge.

As of 2026-10-20 both `main` and `master` exist at the same commit, and `/pr` targets `main`. Agree which is
canonical first.

### 7.3 After the merge

- Flip `PLAN-001` to `status: merged`; the ADR and PRD to `Implemented`.
- Move the feature in [MVP-SCOPE.md](../MVP-SCOPE.md) from *Deferred* to *In scope* with the commit that built it.
- Run `/knowledge-update` if files were added or renamed; it syncs the glossary, feature index, and onboarding.

### 7.4 Release

When a set of features is done, `/release v0.2.0` cuts a GitHub Release from a milestone: it needs `gh`, the milestone
fully closed, a green `/regression`, and QA sign-off for a production tag. **There is no automated deployment** —
promotion is manual. See [SDLC.md § Release](../SDLC.md).

---

## 8. Bugs — `/fix` and `/bug` (Example C)

Every defect is fixed the same way: **find where it lives, reproduce it as a failing test, make the smallest fix,
check nothing else broke.**

| Situation | Do this |
|---|---|
| You found it while developing, and you're fixing it now | `/fix "<symptom>"` → `/commit` → `/pr` — no issue needed |
| You found it but won't fix it now | `/bug file <symptom>` so it isn't lost |
| Someone else reported it | they file it on GitHub (the *Bug / defect* template) → `/bug triage #N` sets severity (S1–S4) and lane → `/fix N` → `/pr` with `Fixes #N` |

**Severity drives the lane:** S1/S2 → `lane:hotfix` (a patch release `v0.x.1`); S3/S4 → `lane:scheduled` (the next phase).

### Example: a ticket with no assignee

[MVP-SCOPE.md](../MVP-SCOPE.md) lists this as a known, **not yet reproduced** defect, so `/fix`'s first job is to
reproduce it:

```
/fix "Opening a ticket that has no assignee shows an empty ticket page"
```

1. **Capture.** Symptom, trigger (open `/ticketView` for a ticket with no assignee), expected vs actual, and the
   browser console error — with a stack trace it skips straight to the frame.
2. **Localize.** It reads before it guesses, and **escalates to observation after two failed read-based
   guesses** — run the app and look. Here the read is enough:
   `ticket-view.component.html:9-10` and `ticket-view.component.ts:48-49` all dereference `assignee` / `submitter`
   without a guard, but `assignee` is optional ([domain-model.md](../.claude/planning/architecture/domain-model.md)).
   It then **confirms the root cause with you** before changing any code.
3. **Failing test (red).** A spec that renders `TicketViewComponent` with a ticket whose `assignee` is `null` and
   expects no error. It needs a proper `TestBed` (`FormsModule`, `RouterTestingModule`, `HttpClientTestingModule`) —
   the same setup that Step 0 adds. Claude commits it alone (`test(ticket-view): reproduce …`) and creates
   `.claude/session-state/fix-mode`. **From here the `test-protection-gate` hook blocks every edit to a test file**: a
   test the agent can't rewrite is the proof the bug is gone. Only *you* remove the marker, and only if the test
   itself is wrong.
4. **Fix (green).** The smallest change that passes. **Fix the class, not just the report**: the same defect lives
   at all four sites above (`assignee` and `submitter`, template and component), so all four are fixed in one PR —
   YAGNI forbids unrelated cleanup, not fixing the same bug where it recurs.
5. **Verify and close the loop.** The gates, plus a browser check of the empty, error, and success states. Then the
   marker is removed, the report states the root cause and the failing → passing test, and the item leaves
   MVP-SCOPE's *Deferred* list. For S1/S2 a post-mortem goes in `docs/lessons/`; if it's the second occurrence of an
   agent mistake, the one-line correction goes into `CLAUDE.md § Things Claude gets wrong`.

---

## 9. Understanding code before changing it

None of these edit anything. They read the architecture docs first, then use `rg`
([code-navigation.md](../.claude/rules/code-navigation.md)). `docs/feature-index.yaml` and `docs/glossary.md` don't exist
yet, so they fall back to search — run `/features` and `/knowledge-update` to create them.

| Ask | Command |
|---|---|
| What does this file or term mean? | `/explain server/authentication.js` · `/explain "My Tickets"` |
| How does this work end to end? | `/investigate how does a ticket get assigned when it is created` |
| What breaks if I change this? | `/impact-check clientApp/src/app/auth.service.ts` |
| Where does this bug come from? | `/trace-bug "tickets list is empty after login"` |
| What does this error mean? | `/explain-error` and paste the stack trace |
| How deep do the dependencies go? | `/dependency-check server/models/ticket.js` |

Run `/impact-check` before touching a widely used file — in this repo `auth.service.ts` (every screen, the
guard, and the interceptor use it) and `models/ticket.js` (the ticket controller and `middleware/user.js`) are
the ones that matter.

---

## 10. Keeping the docs honest

The harness treats documentation as part of the deliverable. In the same PR as a change:

| If the change… | Update |
|---|---|
| adds, removes, or reshapes an endpoint, a response, or a storage key | [component-map.md](../.claude/planning/architecture/component-map.md) and the API table in [AGENTS.md](../AGENTS.md) |
| adds a layer, an import direction, or moves where a rule is enforced | [layer-map.md](../.claude/planning/architecture/layer-map.md) |
| adds or renames a domain term, field, state, or role rule | [domain-model.md](../.claude/planning/architecture/domain-model.md) |
| ships, defers, or discovers a gap | [MVP-SCOPE.md](../MVP-SCOPE.md) |
| renames a command or changes a convention | [CLAUDE.md](../CLAUDE.md) |

`/review` reports a stale doc as a **Compliance** finding. Never rewrite an accepted intent, a PRD, an ADR, or a
merged PLAN to match the code — supersede or add instead.

---

## 11. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `/prd` (or `/adr`, `/rfc`, `/domain`) can't be started by Claude | They're user-only. Type the command yourself |
| `/test`, `/verify`, `/commit`: *missing script* | § 1.2 — Step 0 isn't done |
| `/pr` or `/bug`: `gh: command not found` | Install and authenticate `gh`, or do the GitHub step in the browser |
| `/implement`: *"no merged contract"* | § 1.2 — contract-first isn't adopted; don't run `/contract` |
| *Protected path* when editing | The reason and route are in the message. To change the list itself, edit `.claude/protected-paths` in a reviewed commit |
| *Possible credential* when writing a file | `secrets-gate` matched a key-shaped string. For a deliberately fake fixture add `// secret-ok: <reason>` |
| *plan-sync* warning | You edited a file that isn't in the plan. Add the row and a *Departures* line in the same commit, or revert |
| *Fix mode: test files are locked* | A `/fix` is in progress. Only the engineer removes `.claude/session-state/fix-mode` |
| The hooks seem to do nothing | `jq` isn't on PATH for this session — install it and restart VS Code |
| A skill talks about ADR-016, Zod, MSW, DDD layers, `docker compose` | Not adopted here — see [CLAUDE.md § Not adopted yet](../CLAUDE.md) |

---

## 12. Cheat sheet

| I want to… | Type |
|---|---|
| record an idea or a problem, in plain words | `/intent <sentence>` |
| turn an accepted intent into requirements | `/prd intent/NNN-<slug>.md` |
| get a formal requirement document under control | `/requirement-intake <doc>` |
| decide how to build it | `/adr NNN-<slug>` |
| build it | `/implement ADR-NNN` · `/implement --update "…"` for a small change |
| understand code first | `/explain` · `/investigate` · `/impact-check` · `/trace-bug` |
| check my work | `/review` · `/security-review` |
| commit and open a PR | `/commit` → `/pr` (**blocked until Step 0**) |
| fix a bug | `/fix "<symptom>"` · `/bug file <symptom>` · `/bug triage #N` |
| ship a milestone | `/release v0.x.0` |
| refresh the generated docs | `/knowledge-update` · `/features` |
| see which commands exist | `.claude/skills/<name>/SKILL.md` — one directory each |
