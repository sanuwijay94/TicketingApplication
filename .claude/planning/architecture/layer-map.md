# Layer map

**Living document** — how the code is layered *right now*. Update it in the same PR as any change to
a row below ([documentation.md](../../rules/documentation.md)). Skills read it to judge whether a
change is legal: `/impact-check`, `/fix`, `/trace-bug`, `/review`, `/pr`, `tech-lead-agent`.

This is a **flat Express API + Angular SPA**, not clean architecture or DDD
(CLAUDE.md § *Not adopted yet*). There are no `domain/`, `application/`, `infrastructure/`, or
`presentation/` folders; do not create them without an ADR.

```
Angular SPA (clientApp, :4200) ──HTTP JSON, x-access-token──▶ Express API (server, :3000) ──Mongoose──▶ MongoDB 4.4 (ticketingApplication)
```

## Server — `server/`

| Layer | Files | Owns | May import |
|---|---|---|---|
| **S0 Entry** | `bin/www` | HTTP server, port (`$PORT`, default 3000), listen errors | S1 |
| **S1 Composition** | `app.js` | Express app: CORS, body parsing, `morgan`, Mongo connection, router mounting, 404/error handler | S2 |
| **S2 Routes** | `routes/login.js`, `routes/user.js`, `routes/ticket.js` | The API surface: path + verb → auth guard → handler | S3, S4 |
| **S3 Auth guard** | `authentication.js` | `authorization(isSupervisor)`: verify JWT from `x-access-token`, enforce Supervisor role, set `req.decoded` | `jsonwebtoken` only |
| **S4 Handlers** | `controllers/userController.js`, `controllers/ticketController.js`, `middleware/login.js` | Validate the request (`indicative`), read/write through models, shape the HTTP response | S5, S6 |
| **S5 Data helpers** | `middleware/user.js` | Multi-document `Ticket` operations shared by both controllers: `ticketsOfUser`, `deleteUserFromTicket` | S6 |
| **S6 Models** | `models/user.js`, `models/ticket.js` | Mongoose schemas: persisted shape, field rules (`required`, `enum`, unique `username`), virtuals. The de facto API contract | `mongoose` only |

> **Naming trap:** `middleware/` contains no Express middleware. `middleware/login.js` is a request
> handler (S4) and `middleware/user.js` is a data helper (S5). The only middleware is
> `authentication.js` (S3). Place new code by **layer**, not by folder name: new handlers go in
> `controllers/`.

### Allowed dependencies (server)

Every edge below exists today:

- `bin/www` → `app.js` → `routes/*`
- `routes/*` → `authentication.js` and any handler. Cross-resource is fine: `routes/user.js` → `ticketController.getUserTickets` serves `GET /user/:id/tickets`
- `controllers/*` → `models/*`, `middleware/user.js`
- `middleware/login.js` → `models/user.js`, `jsonwebtoken`
- `middleware/user.js` → `models/ticket.js`

**Not allowed** (none of these exist today, so keep it that way):

- `models/*` → any first-party file (models are leaves)
- handler → handler (`controllers/*` importing each other). Share logic through an S5 helper
- anything below S2 → `authentication.js`. Auth is applied once, at the route; handlers read `req.decoded`
- Express `req`/`res` inside S5 or S6. Helpers take ids and callbacks
- `authentication.js` → models. The guard trusts the JWT and does not touch the database

## Client — `clientApp/src/app/`

| Layer | Files | Owns | May import |
|---|---|---|---|
| **C0 Bootstrap** | `main.ts`, `app.module.ts` | Declarations; provides `AuthService`, `AuthGuard`, `TokenInterceptorService` (`HTTP_INTERCEPTORS`) | C1–C4 |
| **C1 Routing** | `app-routing.module.ts`, `auth.guard.ts` | URL → screen; `AuthGuard` = a `token` exists in `localStorage`. **Top-bar convention:** a route that wants a clean bar carries route `data` `topBar` — `data: { topBar: 'login' }` on `login`, `data: { topBar: 'register' }` on `register`; no other route has the key. Any guard that refuses a first navigation must redirect, as `AuthGuard` does, or the bar stays `pending` | C2, C3 |
| **C2 Screens** | `login/`, `register/`, `tickets/`, `my-tickets/`, `ticket-view/`, `app.component` (nav + logout) | Template, view state, role-based display rules. `app.component` chooses the top bar from the settled route (`data.topBar` of the deepest route, read on `NavigationEnd` and `NavigationError`) plus `AuthService.LoggedIn()`, re-read on every check and never stored. It stores only the screen mode: `pending` → `login` / `register` / `other`. Anything but the exact strings `'login'` and `'register'` is `other`, the normal bar | C3, `Router`, `ActivatedRoute` |
| **C3 API service** | `auth.service.ts` (`AuthService`) | **Every** HTTP call and URL; `token` / `auth-user` accessors; logout | `HttpClient`, `Router`, `localStorage` |
| **C4 Interceptor** | `token-interceptor.service.ts` | Adds `x-access-token` to each request, read per request | C3 (`getToken`) |

The literals `'login'` and `'register'` are written in both C1 (route `data`) and C2 (`app.component.ts`) on purpose: route `data` is untyped, so sharing a type would not catch a misspelling. A misspelt or missing value fails safe to the normal bar. A new pre-login route that should get a clean bar needs the `data` key **and** a matching mode in `app.component` ([ADR-001](../adr/ADR-001-login-page-nav-bar.md)).

### Allowed dependencies (client)

- screens → `AuthService` for all data. **No screen injects `HttpClient`.** Keeping HTTP in one file keeps the URL list in one place
- screens → `Router` for navigation, never → another screen's class
- `AuthService` → `HttpClient`; it never imports a screen

**Known deviation:** `tickets/`, `my-tickets/`, and `ticket-view/` read `localStorage['auth-user']` directly. They find the role with `.substring(42,47)` (`"Agent"` or `"Super"`). `tickets/` and `AuthService.setUrl()` find the user id with `.substring(8,32)`. Both depend on the serialized key order of the login response's `user` (`_id` first, `type` second). Reordering the User schema fields or the login projection in `middleware/login.js` breaks role detection silently. New code reads auth state through `AuthService`, not raw `localStorage`.

## The API contract between tiers

There is no shared contract package. The server's shape is `models/*` plus each handler's response. The client mirrors the URLs by hand in `auth.service.ts` and types every response as `any`. A change to a route path, verb, or response shape must update `AuthService` and AGENTS.md § API **in the same PR**.

## Where business rules live

| Rule | Enforced in | Server-side? |
|---|---|---|
| Ticket states are `Open` / `Progressing` / `Done` / `Closed` | `models/ticket.js` enum + `indicative` in `ticketController` | ✅ |
| Only Supervisors delete tickets and users | `authorization(supervisor)` on the `DELETE` routes | ✅ (but the Delete button shows for every role; an Agent gets a 403) |
| Only Supervisors set `Closed`; Agents don't see `Closed` tickets | `tickets/`, `my-tickets/`, `ticket-view/` components | ❌ **client-only**: `PATCH /ticket/:id/update` accepts `Closed` from any valid token |
| New tickets start `Open` | `tickets.component.ts` (`createdTicket`) | ❌ the client sets it; the server only requires *a* state |
| Deleting a user unassigns their tickets | `userController.user_delete_post` → `middleware/user.js` | ✅ |
| Usernames are unique | `models/user.js` unique index | ✅ |

A rule that must hold against a direct API call belongs in S4 (or S6), not only in a screen.

## External touchpoints (port / adapter registry)

| Dependency | Sole touchpoint(s) | Notes |
|---|---|---|
| MongoDB | `app.js` (`mongoose.connect`), `models/*` | URL hard-coded: `mongodb://127.0.0.1:27017/ticketingApplication` |
| JWT | `middleware/login.js` (sign, 50 min), `authentication.js` (verify) | Secret is the literal `'secret'` in both files, and again in `server/test/authentication.test.js` |
| Request validation | `controllers/*` via `indicative` | |
| Browser storage | `localStorage` keys `token`, `auth-user` | Written by `login.component.ts`; read by `AuthService` and the three screens above |
| API base URL | `auth.service.ts` | `http://127.0.0.1:3000` hard-coded; `environments/*.ts` is not used for it |
| UI kit | `src/index.html` | Bootstrap 4.1 + jQuery + Popper from CDN; modals via `data-toggle` |

There is no cache, queue, email, or third-party API. Adding an external dependency is **Ask First** ([boundaries.md](../../rules/boundaries.md)).

## Placing a change

- **New endpoint:** route in `routes/<resource>.js` with `authentication.authorization(...)` → handler in `controllers/<resource>Controller.js` → model. Then add the call to `AuthService` and the row to AGENTS.md § API.
- **Logic needed by two handlers:** add an S5 helper (like `middleware/user.js`), not a controller-to-controller import.
- **New screen:** a component folder, a route in `app-routing.module.ts` (add `canActivate: [AuthGuard]` if login is required), a declaration in `app.module.ts`. HTTP goes through `AuthService` only.
