# Ticketing Application — Day-One Onboarding Guide

**Audience:** full-stack engineer
**Generated:** 2026-10-20 by `/onboard full-stack`
**Graph:** none — the knowledge-graph layer isn't adopted. The tour is built from
[layer-map.md](../.claude/planning/architecture/layer-map.md) and checked line references.

> Line numbers are as of the generation date. If a cited line has moved, search for the symbol.
> Regenerate with `/onboard` after a structural change; `/knowledge-update` keeps it in sync.

---

## 1. What Ticketing Application is (30 seconds)

A small support-ticket tracker. **Agents** and **Supervisors** log in; they create, view, assign and
update tickets, and only Supervisors delete them or set one to `Closed`. A ticket records who raised
it (the *requester*, by phone number), who logged it (the *submitter*), who is working it (the
*assignee*), and its state: `Open` → `Progressing` → `Done` → `Closed`.

The code dates from Aug–Sep 2019. The agent harness was adopted in Oct 2026, so there are **no PRDs,
ADRs, specs, or GitHub issues yet** — [MVP-SCOPE.md](../MVP-SCOPE.md) records the app as built.

## 2. Repository layout

```
TicketingApplication/
  server/                  Express 4 API — plain JavaScript, CommonJS — :3000
    bin/www  app.js  authentication.js
    routes/  controllers/  middleware/  models/  populateDB.js
    node_modules/          COMMITTED (5k+ files) — protected; don't touch
  clientApp/               Angular 8 SPA — TypeScript 3.5 — :4200
    src/app/               auth.service.ts, token-interceptor.service.ts, auth.guard.ts,
                           and one folder per screen
    src/index.html         Bootstrap 4 / jQuery / Popper from a CDN
  .claude/                 agent harness: rules/ skills/ agents/ hooks/ planning/architecture/
  .vscode/                 debug configs — "Full Stack: Server + Client"
  CLAUDE.md  AGENTS.md  MVP-SCOPE.md  SDLC.md  harness.config.json
```

There is **no root `package.json`**: `server/` and `clientApp/` are two independent npm projects.

| Read | For |
|---|---|
| [CLAUDE.md](../CLAUDE.md) | commands, baselines, what *not* to trust in the harness text |
| [AGENTS.md](../AGENTS.md) | layout and the API table |
| [MVP-SCOPE.md](../MVP-SCOPE.md) | what exists, known defects, open questions |
| [layer-map.md](../.claude/planning/architecture/layer-map.md) · [component-map.md](../.claude/planning/architecture/component-map.md) · [domain-model.md](../.claude/planning/architecture/domain-model.md) | how it's layered · how it runs and its API contract · the vocabulary and rules |
| [HARNESS-GUIDE.md](HARNESS-GUIDE.md) | how to develop with the harness, from `/intent` to a merged PR, with examples |

## 3. Architecture in one diagram

```
Browser (localStorage: token, auth-user)
   │  Angular 8 SPA  :4200   screens ──► AuthService ──► HttpClient (+ token interceptor)
   │                                       every URL lives in auth.service.ts
   ▼  HTTP JSON, header x-access-token
Express API  :3000
   routes/ ──► authentication.js (JWT + role) ──► controllers/ ──► models/ (Mongoose)
   │                                                  └──► middleware/user.js (data helper)
   ▼
MongoDB 4.4  :27017   db ticketingApplication — collections users, tickets
```

**The dependency rule here:** `models/` import nothing first-party; handlers never import each
other; no screen injects `HttpClient` — all HTTP goes through `AuthService`.
Full matrix: [layer-map.md](../.claude/planning/architecture/layer-map.md).

## 4. The guided tour (9 steps)

Follow one ticket through the system. Each step is two or three files.

1. **Boot.** `server/bin/www` listens on `$PORT` (3000) and loads `server/app.js`, which connects to
   MongoDB (`app.js:19`) and mounts the three routers (`app.js:34-36`). The SPA starts at
   `clientApp/src/main.ts` → `app.module.ts`, which provides `AuthService`, `AuthGuard`, and the interceptor.
2. **The data.** `server/models/user.js` and `server/models/ticket.js` — two schemas; a ticket
   points at users by id. Read [domain-model.md](../.claude/planning/architecture/domain-model.md) alongside.
3. **Log in.** `login/login.component.ts:24` → `AuthService.loginUser` (`auth.service.ts:23`) →
   `POST /login` (`routes/login.js:6`) → `middleware/login.js:34`. It signs a 50-minute JWT
   (`:19-20`); the screen then stores `token` and `auth-user` (`login.component.ts:29-30`).
4. **Every request after that.** `token-interceptor.service.ts:16` adds `x-access-token`.
   `AuthGuard` (`auth.guard.ts:10`) only checks that a token *exists*. The server verifies it per
   route in `authentication.js` — `:15` verify, `:16` the Supervisor check that returns 403.
5. **List and create tickets.** `tickets/tickets.component.ts:27` loads tickets (`:31`) and users for
   the assignee dropdown (`:48`). `createTicket` (`:75`) fills `submitter` from `localStorage` (`:76`)
   → `ticket_create_post` (`ticketController.js:39`): `indicative` validation, then save.
6. **View, edit, delete.** `ticket-view/ticket-view.component.ts:24` loads one ticket; `:47`
   updates, `:68` deletes → `ticket_update_post` (`ticketController.js:117`) and `ticket_delete_post`
   (`:98`, Supervisor-only via `routes/ticket.js:15`).
7. **My tickets.** `my-tickets.component.ts:19` → `AuthService.myTickets` (`auth.service.ts:43`; the URL
   comes from `setUrl`, `:18`) → `GET /user/:id/tickets` (`routes/user.js:27`) → `getUserTickets`
   (`ticketController.js:168`) → `middleware/user.js`. "Mine" means **assigned to me**, not "I submitted".
8. **Users (API only).** `controllers/userController.js` — create (this is registration), update,
   delete. `user_delete_post` (`:100`) also unassigns the user's tickets. No screen calls detail,
   update, or delete.
9. **The response conventions.** Read [component-map.md](../.claude/planning/architecture/component-map.md)
   § *SPA → API contract* before changing any response — see gotcha 3.

## 5. The domain (one bounded context)

**Ticketing** is the only context — the whole application. No aggregates, value objects, or events
exist in the code ([domain-model.md](../.claude/planning/architecture/domain-model.md) says so and
doesn't invent them).

| Entity | Essentials | Invariants the code guarantees |
|---|---|---|
| **User** (`models/user.js`) | `username` (unique), `password`, `type` = `Supervisor` \| `Agent`, names, phone | unique `username`; `type` is one of two roles; deleting a user clears `assignee` on their tickets |
| **Ticket** (`models/ticket.js`) | `subject`, `description`, `created_date`, `due_date`, `ticket_state`, `submitter` → User, `assignee` → User (optional), `requester` (a phone number) | required fields; `ticket_state` is one of four values. **No** transition rules, **no** date ordering |

Roles at the API: **anyone** can log in and register (including as Supervisor); **any valid token**
can read and edit any ticket or user; only a **Supervisor token** can delete. The "Supervisor sets
`Closed`" and "Agents don't see `Closed`" rules exist only in the browser.

## 6. The contract rule — not enforced in this repo

The harness ships a contract-first workflow (`.claude/rules/api-contracts.md`, `/contract`,
`contract-first-gate.sh`, "ADR-016"): shared Zod schemas → OpenAPI → MSW mocks. **None of that
exists here.** There is no `server/models/src`, no Zod, no MSW, no `openapi.json`, and no ADRs, so
"ADR-016" is a dangling reference. The gate hook is on disk but deliberately **unwired** in
`.claude/settings.json`. Don't run `/contract`, and ignore rule text that tells you to.

**What the contract actually is:** the Mongoose models, the routes, and each handler's response on
the server — and, on the client, URLs copied by hand into `auth.service.ts` with every response
typed `any`. So the working rule is **change both sides in the same PR**. To add or change an endpoint:

1. Route in `server/routes/<resource>.js` with `authentication.authorization(...)`.
2. Handler in `server/controllers/` — validate with `indicative`, and keep the response conventions (gotcha 3).
3. The model, if the shape changes.
4. A method in `clientApp/src/app/auth.service.ts`.
5. Update AGENTS.md § API and component-map.md § *SPA → API contract* in the same PR.

Adopting a real shared contract would be an architectural change — **Ask First**
([boundaries.md](../.claude/rules/boundaries.md)).

## 7. Top 5 gotchas for week one

1. **Node 10.24.1 only — and `server/node_modules` is committed.** Angular 8's webpack 4 fails on
   Node 17+. Use `nvm use 10.24.1` (the VS Code configs pin it). Harness `.mjs` scripts are the one
   exception: they need Node ≥ 14 (`"$NVM_HOME/v24.21.0/node.exe" scripts/<script>.mjs`). Never run
   `npm install` in `server/`: its 5k+ tracked files are protected and the hook blocks edits to them.
2. **The quality gates aren't green yet.** All **11 client specs fail** (unconfigured CLI scaffolds),
   `ng lint` reports a pass but checks nothing (no `tslint.json`), and there are no server tests.
   Worse, `/test` runs `npm run test:unit`, `npm run lint`, … and there is no root `package.json`,
   so **`/test`, `/verify`, and `/commit` (which runs `/test` first) can't pass until adapted**
   (`docs/PORTING.md` step 5, not done). Run the commands in [CLAUDE.md](../CLAUDE.md) and compare
   against its baselines. Never skip or delete a failing test.
3. **The API's status codes don't mean what they say.** Validation errors return **HTTP 200** with an
   array (`[{message, field, validation}]`); a failed write returns **304**; auth failures are **403**
   (401 is login only). Screens detect success by matching exact strings — `"Created Successfully"`,
   `"Successfully Updated"`. Don't trust the status alone and don't reword those messages.
4. **Role rules live in the browser, and auth state is read by string offsets.** The server never
   checks that only Supervisors set `Closed`. Screens read the role with
   `localStorage['auth-user'].substring(42,47)` and the user id with `.substring(8,32)`
   (`tickets.component.ts:29,76`, `my-tickets.component.ts:20`, `ticket-view.component.ts:26`,
   `auth.service.ts:19`) — reordering the login projection in `middleware/login.js` silently breaks
   roles. Read auth state per call, never in a constructor: that was the post-login 403 bug fixed in
   `token-interceptor.service.ts`.
5. **Known defects are catalogued — check before filing.** [MVP-SCOPE.md](../MVP-SCOPE.md)
   § *Deferred* lists them: passwords stored in plain text *and* sent to the browser (login response,
   `GET /user/`, every populated ticket, `localStorage`), the register screen's `TypeError` after a
   successful sign-up, unknown routes returning 500, and a ticket-view that breaks on a ticket with
   no assignee. § *Open questions* holds the disputed Closed-ticket rule. Fix one by amending
   MVP-SCOPE in the same PR.

## 8. Dev environment setup

**Prerequisites:** Node 10.24.1 via nvm-windows · MongoDB 4.4 as the Windows service `MongoDB`
(`Get-Service MongoDB` → Running) · Chrome (debugging and Karma) · `jq` on PATH for the hooks
(`winget install jqlang.jq`, then **restart VS Code**) · `gh` only for `/pr`, `/bug`, `/release`.

```bash
cd clientApp && npm ci                                                       # client deps (server deps are committed)
cd server && node populateDB mongodb://127.0.0.1:27017/ticketingApplication  # seed ONCE — prints "All done"
cd server && node bin/www                                                    # API on :3000 (no `npm start` exists)
cd clientApp && npm start                                                    # SPA on :4200 — "Compiled successfully"
cd clientApp && npm run build                                                # build — also the type check
cd clientApp && npx ng test --watch=false --browsers=ChromeHeadless          # baseline: 11 of 11 FAILED
```

**Easiest:** VS Code → Run and Debug → **Full Stack: Server + Client** → F5. It starts both under the
debugger and opens Chrome. Seeded logins: `sanuwijay94` / `1234` (Supervisor) and `dinur-el` / `abcd` (Agent).

**API smoke:** `POST /login` returns a `token`; `GET /ticket/` with header `x-access-token: <token>` → 200.
The server only logs a MongoDB connection error and keeps listening, so start the MongoDB service first.

**Git:** Conventional Commits (`feat(auth): …`), no AI-attribution footers, never push straight to the
integration branch. Both `main` and `master` exist at the same commit (GitHub's default is `master`;
the harness rules name `main`) — agree which is canonical before the first PR.

## 9. Skills and guardrails

| Command | Status here |
|---|---|
| `/explain` · `/investigate` · `/trace-bug` · `/impact-check` · `/dependency-check` | **Work.** They look in `docs/feature-index.yaml` and `docs/glossary.md` first; neither exists yet, so they fall back to `rg`. `/features` and `/knowledge-update` generate them |
| `/fix <symptom>` | Works, but its test-first step needs a runnable test: client specs fail, there's no server runner |
| `/test` · `/verify` · `/commit` | **Blocked** — gotcha 2 |
| `/pr` · `/bug` · `/release` | Need the `gh` CLI (not installed) |
| `/contract` · `/scaffold` · `/domain` | **Don't use** — contract-first and DDD aren't adopted; `/domain` is an interview workshop only you can start |
| `/review` | Multi-agent mode needs `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (already in `.claude/settings.json`) |

**Hooks you will hit** (`.claude/hooks/`):

| Hook | Effect |
|---|---|
| `protected-paths-gate` | **Blocks** edits to `server/node_modules/**` and generated docs (`docs/glossary.md`, `feature-index.yaml`, `change-impact-matrix.md`), with the reason and the route |
| `secrets-gate` | **Blocks** writing credential-shaped strings (cloud/GitHub/Anthropic keys, long literal `password = '…'`). A deliberate fake fixture takes `// secret-ok: <reason>` |
| `test-protection-gate` | **Blocks** edits to test files while a `/fix` is in progress |
| `check-console-log` | Warns on `console.log` in `server/**/*.js` and `clientApp/src/**/*.ts` (not specs, and not `populateDB.js`). 7 files have one today |
| `plan-sync` | Warns when you edit a file that isn't in the branch's living `PLAN-NNN` |
| `tool-log` | Appends every tool call to `.claude/session-state/tool-log.jsonl` (gitignored) |

## 10. First-week checklist

- [ ] Read [CLAUDE.md](../CLAUDE.md), [AGENTS.md](../AGENTS.md), and [MVP-SCOPE.md](../MVP-SCOPE.md)
- [ ] Read the three architecture docs in `.claude/planning/architecture/` — `layer-map.md` first
- [ ] Install the prerequisites (§ 8); confirm `Get-Service MongoDB` is Running and `node -v` is `v10.24.1`
- [ ] Seed the database and run **Full Stack: Server + Client**; log in as both seeded users and compare
      what each sees on `/tickets`
- [ ] Walk the 9-step tour (§ 4), setting a breakpoint in `middleware/login.js` (`exports.login`, `:34`)
      and in `auth.service.ts` (`loginUser`, `:23`) — both should hit on one login
- [ ] Reproduce one **Deferred** item from MVP-SCOPE (e.g. open `/ticketView` for a ticket with no
      assignee) so you've seen how this app fails
- [ ] Run `npm run build` and the client tests; confirm you get the documented baselines (build OK, 11/11 failing)
- [ ] Skim `.claude/rules/` — `git-workflow.md`, `boundaries.md`, `code-navigation.md` apply as written;
      `api-contracts.md`, `ddd.md`, `clean-architecture.md` do not (CLAUDE.md § *Not adopted yet*)
- [ ] Skim `SDLC.md` (long) for the workflow, remembering that it assumes the full harness stack
- [ ] Ask the team: which branch is canonical, who owns the Closed-ticket rule, and whether `/test`
      should be adapted next
