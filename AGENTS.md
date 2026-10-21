# AGENTS.md

The operational companion to `CLAUDE.md`: what this project *is*, how to run it, and where code
lives. `CLAUDE.md` holds the reading order and rules; this file holds the facts an agent needs
before touching anything.

> **Scope binding.** See `MVP-SCOPE.md` for the authoritative current-slice feature list, deferred gaps, and open questions.

## Project

**Ticketing Application** is a support-ticket tracker for two roles — **Agent** and **Supervisor**.

- **`server/`** — REST API: login (JWT), users, tickets; role checks in `authentication.js`
- **`clientApp/`** — Angular SPA: login, register, all tickets, my tickets, ticket view/edit
- **MongoDB** — collections `users` and `tickets` (Mongoose models in `server/models/`)

## Tech Stack

- **Runtime / language**: Node.js 10.24.1 (nvm-windows); server JavaScript (CommonJS), client TypeScript 3.5
- **Backend framework**: Express 4.17, `morgan` request log, `debug` logger, `indicative` request validation, `jsonwebtoken` 8
- **Frontend**: Angular 8.2 + RxJS 6.4, Bootstrap 4.1 + jQuery/Popper from CDN (`src/index.html`)
- **Primary database**: MongoDB 4.4 via Mongoose 5.6.11 (driver 3.2 — don't move to a newer MongoDB server without upgrading Mongoose)
- **Cache / messaging / external integrations**: none
- **Testing**: Karma + Jasmine (client, colocated `*.spec.ts`); Protractor e2e scaffold; server: one dependency-free script for the token guard (`server/test/authentication.test.js`), no runner
- **Linting / typechecking**: TSLint wired in `angular.json` but no `tslint.json`; TypeScript compile via `ng build`

## Development Environment

```bash
# prerequisites: Node 10.24.1 active (nvm use 10.24.1), MongoDB 4.4 service "MongoDB" running
cd clientApp && npm ci                                                      # install client deps (server deps are committed)
cd server && node populateDB mongodb://127.0.0.1:27017/ticketingApplication # seed once
cd server && node bin/www                                                   # API on :3000
cd server && npm test                                                       # runs node test/authentication.test.js — plain Node, exit 1 on failure
cd clientApp && npm start                                                   # SPA on :4200
cd clientApp && npx ng test --watch=false --browsers=ChromeHeadless         # unit suite — baseline 11/11 failing
cd clientApp && npm run build                                               # build (also the type-check)
cd clientApp && npx ng lint                                                 # runs no rules today
```

VS Code: **Full Stack: Server + Client** in `.vscode/launch.json` starts both under the debugger.

> These are the commands `/test`, `/verify`, `/regression`, and `/commit` should run. The skills
> embed harness-default commands (`npm dev:*`, `npm typecheck`, …) that don't exist here — use these.

## Project Structure

Flat Express layering (not clean architecture / DDD — see CLAUDE.md § Not adopted yet). Allowed imports
between these layers and where each business rule lives: [layer-map.md](.claude/planning/architecture/layer-map.md).

```
server/
├── bin/www                 # entry point: HTTP server on $PORT (default 3000)
├── app.js                  # Express app, Mongo connection, route mounting
├── authentication.js       # authorization(isSupervisor) middleware — verifies x-access-token
├── routes/                 # login.js, user.js, ticket.js — URL → middleware → controller
├── controllers/            # userController.js, ticketController.js — request handling, indicative validation
├── middleware/             # login.js (credential check + JWT issue), user.js
├── models/                 # user.js, ticket.js — Mongoose schemas (the de facto API contract)
├── populateDB.js           # seed script (2 users, 2 tickets)
├── test/                   # authentication.test.js — dependency-free, run with node
└── node_modules/           # COMMITTED — protected path

clientApp/src/app/
├── auth.service.ts         # every API call; base URL http://127.0.0.1:3000 hard-coded
├── token-interceptor.service.ts  # adds x-access-token from localStorage on each request
├── auth.guard.ts           # route guard: token present in localStorage
├── app-routing.module.ts   # /login, /register, /tickets, /myTickets, /ticketView
└── login/ register/ tickets/ my-tickets/ ticket-view/   # one component per screen
```

## API

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /login` | none | `{username, password}` → `{token, user}`; token expires in 50 min |
| `POST /user/create` | none | register |
| `GET /user/` · `GET /user/:id` · `GET /user/:id/tickets` | any role | read users / a user's tickets |
| `PATCH /user/:id/update` | any role | update user |
| `DELETE /user/:id/delete` | Supervisor | delete user |
| `POST /ticket/create` | any role | create ticket |
| `GET /ticket/` · `GET /ticket/:id` | any role | read tickets |
| `PATCH /ticket/:id/update` | any role | update ticket |
| `DELETE /ticket/:id/delete` | Supervisor | delete ticket |

Ticket states: `Open`, `Progressing`, `Done`, `Closed` (`server/models/ticket.js`); the client hides
`Closed` from Agents (`tickets.component.ts`). Missing/invalid token or wrong role → **403**.

## Quality Gates

Before merging:

- `npm run build` in `clientApp/` — exit 0
- Client unit suite — no new failures against the 11/11-failing baseline
- Manual API smoke (`POST /login`, then `GET /ticket/` with the token) — 200
- No new `console.log` (the `check-console-log.sh` hook warns); secrets never in source (`secrets-gate.sh` blocks)

## Agents

| Agent | Role |
|-------|------|
| `pm-agent` | Requirements, PRDs, domain discovery, stakeholder clarity |
| `tech-lead-agent` | Architecture, ADRs, feasibility, risks |
| `developer-agent` | Implementation, testing, test generation |
| `qa-agent` | Test plan design, scenario coverage, regression scoping (read-only) |
| `ci-cd-agent` | Pipeline design, deployment strategy |
| `verify-app` | Quality gate — tests, lint, build (read-only) |
| `code-simplifier` | Simplification analysis (read-only) |
| `security-reviewer` | Security audit (read-only) |
| `docs-reviewer` | Documentation drift (read-only) |

## Slash Commands

See `CLAUDE.md` § Workflows for the list, and `SDLC.md` for how they compose into phases.
