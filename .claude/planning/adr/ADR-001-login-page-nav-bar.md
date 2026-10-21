---
id: ADR-001
title: Choose the top bar from the router's settled route; keep AuthService.LoggedIn() as the only sign-in signal
status: Accepted
date: 2026-10-20
implements: [.claude/planning/prd/001-login-page-nav-bar.md]
supersedes: []
deciders: tech-lead-agent (author). Developer challenge applied 2026-10-20 and PM validation applied 2026-10-21 (see Revisions). Acceptance by DuoSanura (product owner)
---

# ADR-001: Choose the top bar from the router's settled route; keep `AuthService.LoggedIn()` as the only sign-in signal

**Status**: Accepted (2026-10-21, DuoSanura)
**Amends spec**: none. No `SPEC-NNN` governs the top bar (`.claude/planning/spec/` holds only its README).

> Historical record: the reasoning at decision time. Do not rewrite when the code evolves.
> Supersede it with a new ADR. Mechanism docs in `../architecture/` carry the *current* state.
>
> **Gate.** PRD-001 is `Draft` and stays there until INT-001's branch is merged (PRD-001 §7 R4).
> This ADR should not move to `Accepted` before PRD-001 is `Approved`.

## Context

PRD-001 (`.claude/planning/prd/001-login-page-nav-bar.md`) asks for a clean top bar on Login and
Register. It binds this design with three originator decisions (/prd review, 2026-10-20):

1. Login and Register show the clean bar **in every sign-in state**. Other screens keep today's bar.
2. "TicketApp" is **plain text** on Login and Register and stays a link everywhere else.
3. The narrow-window collapse is unchanged.

The requirements this ADR has to satisfy:
- FR1/FR2: the clean bar whenever that screen is showing, however the person arrived.
- FR3: plain-text brand.
- FR4/FR5: signed-out people never see Tickets or My Tickets. An unrecognised address shows the
  "TicketApp" link, Login and Register.
- FR6/FR10: every other screen and the collapse behaviour are unchanged.
- FR8: no page refresh needed.
- NFR3: same look as today.
- NFR4: no flash of forbidden items while a page loads.

**Out of scope (PRD-001 §5).** The design must not do any of these:
- send signed-in people away from Login or Register
- change what the pages contain
- change the brand's behaviour on other screens
- change the collapse
- remove the bar
- act on an expired sign-in on other screens, fix contrast, sync across tabs, or close the menu
  after navigating (these are deferred gaps)

### What the code does today (verified 2026-10-20, not taken from the PRD)

Router and core line numbers refer to the installed `@angular/router` 8.2.3
`fesm2015/router.js` and `@angular/core` 8.2.3 `fesm2015/core.js`.

| Fact | Where |
|---|---|
| The brand is `<a class="navbar-brand" href="#">`. With `<base href="/">` this resolves to `/#`, a different path from every screen, so clicking it reloads the whole app. **Exception:** on a page whose address bar already reads `/` (see the unrecognised-address row) it is a same-document fragment change. The router handles that in-app and the page doesn't reload (reasoned from source, not observed). This is existing behaviour and stays as it is | `app.component.html` line 3, `src/index.html` line 6, `router.js` lines 7236–7253 |
| "Tickets" and "My Tickets" are **unconditional**. Login and Register are `*ngIf="!_authService.LoggedIn()"` and Logout is `*ngIf="_authService.LoggedIn()"`. All of them sit inside `.collapse.navbar-collapse#collapsibleNavbar`, which Bootstrap's CDN script toggles | `app.component.html` lines 6–25, `src/index.html` lines 14–16 |
| The template calls `LoggedIn()` on every change-detection pass, so FR8 works today. `LoggedIn()` is `!!localStorage.getItem('token')` with no expiry check, and `AuthGuard` calls the same method | `auth.service.ts` lines 60–62, `auth.guard.ts` line 11 |
| `AppComponent` injects only `AuthService` and holds no state. It uses **Default** change detection (no `changeDetection` setting). It wraps the outlet in `<div class="container">` | `app.component.ts`, `app.component.html` lines 27–29 |
| The routes are: `''` redirects to `/login` (`pathMatch: 'full'`); `tickets`, `myTickets` and `ticketView` have `canActivate: [AuthGuard]`; then `login` and `register`. There is **no wildcard route**. `Location` strips a trailing slash, so `/login/` is `/login` | `app-routing.module.ts`; `@angular/common` 8.2.3 `fesm2015/common.js` lines 369–370 and 516 |
| `RouterModule.forRoot(routes)` sets no options, so `initialNavigation` is the default (`legacy_enabled`). `ApplicationRef` runs the root component's **first change detection before the bootstrap listener starts the first navigation**. Until activation, the router state is the empty `/` state. **This is the source of PRD R8(a).** | `router.js` lines 9749–9750, 9798–9800 and 7093; `core.js` lines 41093–41105 |
| **The first navigation finishes in the same browser task as that first render.** Bootstrap runs in microtasks. Navigation adds one `Promise.resolve` (`router.js` line 6897). `AuthGuard` is synchronous. The router's only timer (line 7250) is on the popstate/hashchange path (Back, Forward, fragment changes), not on the first load or on `navigate()`. **So the frame before routing is in the DOM but is never painted.** This is read from source, not measured | as cited |
| When `AuthGuard` refuses a navigation, it calls `navigate(['/login'])` and returns `false`. The router emits `NavigationCancel` for the refused URL and then `NavigationEnd` for `/login` | `auth.guard.ts`, `router.js` lines 7022–7026 and 7121–7131 |
| A redirect still emits a `NavigationEnd`. For `/` its `url` is `/` and its `urlAfterRedirects` is `/login` | `router.js` lines 7516–7520 |
| An unmatched URL emits `NavigationError` and **never `NavigationEnd`**. Before that, the router restores the previous state **and resets the address bar** (`location.replaceState`). On a first load that likely turns `/unknown` into `/` (source-read, not observed). Segment matching is an exact, case-sensitive compare, so `/Login` matches nothing | `router.js` lines 7168–7172, 7622–7634 and 837 |
| Sign-in runs `setItem('token')`, then `setItem('auth-user')`, then `navigate(['/tickets'])`. Logout runs `removeItem('token')` and then `navigate(['/login'])`. A successful registration runs `navigate(['/login'])` and then throws a `TypeError`. The redirect still happens (`MVP-SCOPE.md` § Deferred) | `login.component.ts` lines 29–31, `auth.service.ts` lines 64–67, `register.component.ts` lines 29–32 |
| On 401/403, Tickets and My Tickets navigate to `/login`. The ticket view only logs the error | `tickets.component.ts` lines 60–65, `my-tickets.component.ts` lines 37–42 |
| **Server, any guarded API call.** A `token` that **isn't a JWT** makes `jwt.decode` return `null`, so the next line throws and the request fails with a **500**, not a 403. A JWT with an altered signature (`JsonWebTokenError`) or past its expiry (`TokenExpiredError`) gets a **403**. Verified by running the committed jsonwebtoken 8.5.1. `/login` has no auth middleware | `server/authentication.js` lines 12–18, `server/app.js` error handler, `server/routes/login.js` |
| **D1.** On `master` the interceptor reads the token once, in its constructor. The working copy (uncommitted, on branch `intent/001-login-page-nav-bar`) reads it on every request. The `master` blob uses LF line endings and the working copy CRLF; with `core.autocrlf=true` and `.gitattributes` the diff is still `3 insertions(+), 3 deletions(-)` | `git diff -- clientApp/src/app/token-interceptor.service.ts` |
| **Repository state.** `master` contains only `.idea`, `README.md`, `clientApp` and `server`. The whole harness is **untracked**: `.claude/` (including `layer-map.md`, `component-map.md`, PRD-001 and this ADR), `CLAUDE.md`, `AGENTS.md`, `MVP-SCOPE.md`, `docs/`, `scripts/`, `.github/`, `.gitignore`, `.gitattributes` and the rest. `master..HEAD` adds only `intent/001-login-page-nav-bar.md`. The working tree also has eight `.idea/*` deletions. `clientApp/node_modules` is not tracked. `gh` is not installed. Local `main` and `master` are the same commit; the PR base is `master` | `git ls-tree master`, `git status`, `git diff --name-status master HEAD`, CLAUDE.md § Workflows |
| `ng build` runs with `aot: false` (JIT), so templates are not compiled at build time. An AOT build (`--aot`) type-checks templates (`fullTemplateTypeCheck: true`). It **fails today, before any change**. The Developer's run, recounted from its output: exit 1, 51 raw error lines, which are **31 distinct** entries because each is printed twice (login 2, register 9, ticket-view 14, tickets 6). All are "Property … does not exist on type `{}`" (or on `{ ticket_state: string; }`). **None names `app.component`** | `clientApp/angular.json` (build options `aot: false`; `production` `aot: true`), `clientApp/tsconfig.json` |
| `app.component.spec.ts` holds three CLI scaffold specs. Its TestBed imports only `RouterTestingModule`, so creating the component fails with no provider for `AuthService`. The third spec looks for an `h1` reading "Welcome to ngApp!", which the template never had | `app.component.spec.ts` |
| **TypeScript 3.5.3:** `?.` and `??` are syntax errors (TS1109/TS1005). There is no `strict` option. `'logn' as TopBarMode` **compiles** (an assertion doesn't catch a misspelt literal), while `const m: TopBarMode = 'logn'` fails (TS2322). Checked with `tsc` 3.5.3 on scratch files | `clientApp/tsconfig.json` |

### Constraints

- **Client layering** (`.claude/planning/architecture/layer-map.md` § Client):
  - C1 (`app-routing.module.ts`, `auth.guard.ts`) owns URL → screen and may import C2 and C3.
  - `app.component` is a C2 screen and may import C3 (`AuthService`), `Router` and
    `ActivatedRoute`.
  - Screens never import another screen's class.
- **Not adopted** (CLAUDE.md § *Not adopted yet*): no DDD, no clean-architecture layers, no
  contract-first tooling. No API change is involved.
- **Ask First** (`boundaries.md`): no new layer, top-level folder or dependency.
- **CLAUDE.md § Things Claude gets wrong:** auth state must be read on each use and never cached
  in a constructor. PRD R9 restates this for the bar.
- **Rule conflict: do not follow it here.** `.claude/rules/typescript.md` asks for `?.` and `??`,
  but TypeScript 3.5.3 rejects both. Use explicit checks.
- **`ui-designs.md`.** There is no `Design:` file for this feature. The visual reference is
  **today's bar** (PRD NFR3: "look like today's bar"), captured as the AC4.3 "before" screenshots.
  `ui-designs.md` makes a missing design file **Ask First**, so this reading needs the user's
  confirmation (open question ADR-Q3).

## Decision

The decision has five parts, (a) to (e). They change three existing client files and no others.
No file, folder, service, dependency or layer is added.

### (a) The bar learns the screen from the router's settled state, tagged in the routing table

1. **C1, `app-routing.module.ts`.** The `login` and `register` routes get a route `data` entry
   that names the bar they want: `data: { topBar: 'login' }` and `data: { topBar: 'register' }`.
   No other route gets the key, and its absence means "any other screen". The routing table
   already decides URL → screen, so it also becomes the one place that declares which screens get
   a clean bar.
2. **C2, `AppComponent`.**
   - It declares `type TopBarMode = 'pending' | 'login' | 'register' | 'other'` in
     `app.component.ts` and holds a `public` field of that type, initially `'pending'`.
   - It also injects `Router` (allowed for C2) and subscribes to `router.events` when it is
     created. It is the root component, so it exists before the first navigation starts.
   - It reacts **only to `NavigationEnd` and `NavigationError`**. At each, it reads `data.topBar`
     from the deepest route in `router.routerState.snapshot`.
   - **The read is narrowed.** Only the exact strings `'login'` and `'register'` map to those
     modes. Anything else, including a missing key or a misspelling, maps to `'other'`. A typo
     therefore fails safe: that screen gets the normal bar, which the browser walk would catch.
   - It never parses a URL string, and never reads the event's `url` or `urlAfterRedirects`.
3. **Why each PRD R8 edge comes out right.** The design reads the route state at settle time, not
   a URL, which is what makes each of these work:
   - **`/` and `/#` (AC1.6).** The redirect to `/login` happens inside the same navigation. Its one
     `NavigationEnd` has `url` `/` and `urlAfterRedirects` `/login`. At that moment the settled
     state is the `login` route. For a bare `#`, `location.hash` is empty, so the router sees `/`.
     `/#/login` is a `/` with a fragment and lands the same way (reasoned).
   - **`/login?x=1` and `/login/`.** Query parameters play no part in matching, and `Location`
     strips the trailing slash. The matched route is `login`.
   - **Signed out, guarded address (`/tickets`, `/myTickets`, `/ticketView`).** `AuthGuard`
     refuses and redirects. The `NavigationCancel` is ignored and the bar settles on the
     `NavigationEnd` for `/login`.
   - **Expired sign-in on `/tickets` or `/myTickets`.** PRD-001 §3 defines an expired sign-in as
     a `token` the server refuses: past its expiry, or with an altered signature. The guard passes
     because a token exists. The bar settles as `'other'` and shows the signed-in bar, as FR6
     requires. The API's **403** then navigates to `/login` and the bar settles as `'login'`.
     - **A token that isn't a JWT behaves differently.** The API returns **500** (see Context;
       PRD-001 §5 Deferred), so the screen stays put with the signed-in bar and never reaches
       Login. For the bar that is still correct (FR6), but it cannot exercise AC1.6's last bullet.
       Testers must use the PRD-001 §3 setup.
   - **Unrecognised address (`/unknown`, `/Login`).** No route matches, so the router emits
     `NavigationError`. The router state is the pre-navigation one, which on a first load is empty,
     so there is no `data` and the mode is `'other'`. That gives the FR5 bar when signed out
     (AC3.1), and today's signed-in bar when signed in or with an expired sign-in (FR6, AC4.6). The
     address bar likely changes to `/`. That is existing router behaviour and is not changed
     here. The same rule also handles any later `NavigationError`: the restored state
     is the screen still showing.
   - **Back and Forward (AC1.3).** A `popstate` schedules a router navigation (after a
     `setTimeout`), which ends with `NavigationEnd`. Until it settles, both the bar and the page
     still show the previous screen, so they stay consistent.
4. **Why `NavigationStart` and `NavigationCancel` are ignored.**
   - During an in-app navigation the old screen is still showing. Keeping its mode until the new
     screen is activated means the bar and the page change in the same render.
   - With today's routes, a first-load cancel always comes from `AuthGuard`, which always
     redirects. So another navigation always follows it.
5. **Why `'pending'` is the starting value.** In `'pending'` the bar shows its shell with the
   brand as plain text and **no items**.
   - **Today the frame before routing is in the DOM but never painted** (see Context), so
     `'pending'` is invisible.
   - **It is kept because it is the only safe starting value.** It guarantees that no forbidden
     item is ever **inserted into the DOM** on a first load. That is a stronger property than "not
     painted", and it is what the DOM-level check in (e) verifies.
   - **It also keeps NFR4 true if the first navigation ever becomes asynchronous**: an async guard
     or resolver, or a lazy-loaded route, would make the frame before routing paintable. Starting
     in `'other'` would then flash Login and Register, or Tickets and Logout, on what becomes the
     Login page.
   - It costs one literal.
6. **Handler rules.** These rules are mandatory, because nothing would catch a violation:
   - **The router-event callback must be trivial and must not throw.** In rxjs 6.4, a throw inside
     a `next` handler unsubscribes it permanently and reports the error asynchronously
     (`rxjs/internal/Subscriber.js`, `__tryOrUnsub`). The bar would then freeze for the rest of the
     session, silently, and no build would catch it. The snapshot root always exists and `data` is
     always an object, so walking `firstChild` and narrowing one key is enough.
   - **`AppComponent` stays on Default change detection.** OnPush would stop both the field set in
     the callback and the per-check `LoggedIn()` reads from rendering.
   - **Members the template uses are `public`.** AOT reads them from outside the class.
   - Unsubscribing in `ngOnDestroy` is optional for the root component, which lives as long as the
     app.
7. **The literals are written twice, deliberately.** `'login'` and `'register'` appear in both C1
   (route `data`) and C2 (the narrowing). Sharing the type is legal, because C1 may import C2
   (`layer-map.md`). But `Data` is untyped, and TS 3.5's `'x' as TopBarMode` doesn't catch a
   misspelling (see Context). Real checking would need typed constants in the routing module,
   which is ceremony for two strings. The fail-safe narrowing in point 2 plus the browser walk
   cover a typo. The convention is recorded in `layer-map.md` § Client.

### (b) `AuthService.LoggedIn()` stays the single sign-in signal, re-read on every check

- The bar and `AuthGuard` keep reading the same method. **`LoggedIn()` and `AuthGuard` do not
  change.** In particular, no token-expiry check is added: FR6 requires today's signed-in bar with
  an expired sign-in on other screens, and expiry there is deferred (PRD §5).
- Every bar item that depends on sign-in calls `_authService.LoggedIn()` **when it is evaluated**,
  either from a template binding (as today) or from a `public` getter that calls it.
- `AppComponent` stores the **screen mode only, never sign-in state**: not in its constructor, not
  in the router-event handler, not in a field.
- **Why FR8 holds:**
  - Sign-in writes the token and then navigates. The `NavigationEnd` triggers change detection,
    which re-reads the token.
  - Logout removes the token and then navigates, with the same effect.
- **Note for testers:** a DevTools edit to `localStorage` doesn't trigger change detection, so
  **reload after editing**.

### (c) The plain-text brand is Bootstrap's `<span class="navbar-brand">`

- In the `'login'`, `'register'` and `'pending'` modes the brand renders as
  `<span class="navbar-brand">TicketApp</span>`.
- In the `'other'` mode it is today's `<a class="navbar-brand" href="#">`, unchanged
  (decision 2, FR10).
- **Why a `span`:**
  - A `span` has no `href`, so it is not a link, is not in the Tab order, and does nothing when
    clicked (AC1.4, AC2.3).
  - Bootstrap 4 documents `.navbar-brand` on non-anchor elements. Its layout (inline-block, font
    size, padding, margin) is set by the class, and its colour by `.navbar-dark .navbar-brand`
    (white). Only the cursor changes, and that change is intended.
- **To confirm in the browser.** Bootstrap is loaded only from the CDN; there is no local copy to
  check these CSS claims against.

### Resulting bar

This table is the whole behaviour.

| Bar mode | When | Brand | Tickets, My Tickets | Login | Register | Logout |
|---|---|---|---|---|---|---|
| `pending` | first load, before the first `NavigationEnd` or `NavigationError` | plain text | – | – | – | – |
| `login` | Login route settled, any sign-in state | plain text | – | – | shown | – |
| `register` | Register route settled, any sign-in state | plain text | – | shown | – | – |
| `other` + `LoggedIn()` | any other settled route, including an unrecognised address; signed in or expired sign-in | link (today) | shown | – | – | shown |
| `other` + not `LoggedIn()` | same, signed out | link (today) | – | shown | shown | – |

**Markup rules (NFR3, FR10, decision 3).**
- **Gate the items, not the containers.** Each nav item is shown or hidden on its own. The
  existing containers, classes and order stay:
  - the left `ul.navbar-nav.mr-auto`, kept even when empty so the remaining link stays on the
    right, where Login and Register sit today
  - the right `ul.navbar-nav`
- **The toggler button and `#collapsibleNavbar` are never wrapped in a structural directive.**
  They render in every mode, including `pending`, where the toggler would open an empty menu.
  That frame is never painted today.
  - Bootstrap's jQuery collapse finds `#collapsibleNavbar` when the toggler is clicked and keeps
    its state (`.show`, `aria-expanded`) on these persistent nodes. Re-creating either node would
    desync the menu.
- The `other` + `LoggedIn()` row renders exactly today's markup.

**Layering.** No deviation from `layer-map.md`, and no new edge:
- C1 gains route `data` and no new import.
- C2 `AppComponent` gains `Router`, which C2 is already allowed to import.
- No screen imports another screen's class.

### (d) Sequencing: D1 ships first as its own fix, and the harness reaches `master` before Story 1

1. **Precondition H: the harness and planning files must be on `master` before Story 1.**
   - **Why.** Story 1 must update `layer-map.md` and `component-map.md` in the same PR
     (`documentation.md`). Neither file exists on `master`, and neither do PRD-001 or this ADR
     (Context, repository state).
   - **Recommended.** A separate `chore` PR that adds the harness and planning files, including
     PRD-001 and this ADR.
   - **Not recommended:**
     - Riding on the intent branch. Merging it would then mean accepting INT-001 *and* adopting
       the harness in one act.
     - Riding in Story 1. That buries a three-file feature in a repository-wide tooling diff.
   - **Not decided here.** Whether the eight `.idea/*` deletions belong in that PR.
   - **Needs user go-ahead:** where and when the harness is committed, and the `.idea/*`
     deletions.
   - Story 0 doesn't depend on H.
2. **Story 0: the D1 fix, as its own `fix(auth)` change and PR from `master`.** It contains only
   `clientApp/src/app/token-interceptor.service.ts`. It does **not** ride on the intent branch
   (the product owner's acceptance vehicle for INT-001) or in the feature PR. Steps:
   1. **Needs user go-ahead: create a worktree.** `branch-isolation.md` forbids switching branches
      while the tree has uncommitted changes, which it does. Proposed:
      `git worktree add ../TicketingApplication-token-interceptor -b feature/token-interceptor-per-request master`.
      `git-workflow.md` names only the `feature/` prefix; the user may prefer `fix/`.
   2. **Re-apply the three-line change in the worktree.** Either export it with
      `git diff -- clientApp/src/app/token-interceptor.service.ts` to a patch in the session
      scratchpad and `git apply` it, or redo the edit.
   3. **Stage by explicit path only.** `git diff --cached --stat` must then read
      `1 file changed, 3 insertions(+), 3 deletions(-)`. If it shows more lines, for example a
      whole-file line-ending rewrite, stop.
   4. **Commit** through `/commit`.
   5. **Needs user go-ahead: push and open the PR by hand.** `gh` is not installed, so `/pr` is
      unavailable.
   6. **Verify in the main checkout, not the worktree.** The main checkout's client code is
      already `master` plus D1 (`master..HEAD` adds only the intent doc), and it has
      `clientApp/node_modules`. The worktree lacks those, because they are untracked. Do not
      `npm install` in the worktree.
   7. **Needs user go-ahead, after the PR merges:**
      - Discard the now-redundant uncommitted edit in the main checkout
        (`git restore clientApp/src/app/token-interceptor.service.ts`).
      - Remove the worktree (`git worktree remove …`).
      - Until then, the edit must not be committed to the intent branch.
3. **Story 1: the feature branch.** Proposed name `feature/login-page-nav-bar`
   (**needs user go-ahead**). Cut it from `master` after H and Story 0 have merged and PRD-001 is
   `Approved`, from a clean working tree. How the main checkout becomes clean depends on how H is
   done, which is the user's call.

**Why D1 ships separately and first:**
- It is a different kind of change (`fix`, not `feat`), with a different blast radius: every API
  request versus the top bar alone.
- It is valuable on its own, because it fixes the post-login 403 on `master` today.
- It has to be revertable independently. Reverting the bar must not bring back the 403.
- US4 cannot pass without it, and this feature makes R7's symptom harder to recognise.
- The feature code does not need the fix to compile or to render the bar. If the fix PR is held,
  Story 1 waits.

### (e) Verification: three automated signals, a DOM-level NFR4 check, and a concrete manual walk as the gate

**Automated signal 1: the JIT build.**
- `cd clientApp && npm run build` must exit 0 and end with `ES5 bundle generation complete.`
- It type-checks `app.component.ts` and `app-routing.module.ts` only, **not the template**.

**Automated signal 2: the AOT template check.** This is the only static check on
`app.component.html`.
- Run `cd clientApp && npx ng build --aot --output-path=<a directory in the session scratchpad>`.
  Building into the scratchpad keeps `dist/` untouched.
- **Baseline today:** exit 1, with 31 distinct errors, none naming `app.component` (Context).
- **Pass rule for Story 1:**
  - still exit 1
  - **the same set of distinct `file(line,col): message` entries**, compared after sorting and
    removing duplicates (raw line counts are not comparable, because each entry is printed twice)
  - **no entry naming `app.component`**
- This is why template members are `public` (a6).
- `ng build --prod` is not the check. It is also AOT, so it fails on the same 31 baseline errors
  (inferred; not run).
- Not yet tried: a deliberately broken `app.component.html`, to confirm this check catches it. The
  implementer should try that once.

**Automated signal 3: Karma baseline unchanged.**
- `npx ng test --watch=false --browsers=ChromeHeadless` must still report **11 of 11 FAILED**, and
  the three `AppComponent` specs must fail for the same reason as before (no `AuthService`
  provider). Compare the messages, not only the count.
- `RouterTestingModule` already provides `Router`, so injecting it adds no new failure cause.
- Specs are not edited, skipped or deleted.

**NFR4 evidence.** PRD-001 AC1.8, AC2.7 and NFR4 now name both steps below as their method. They
replace the original Performance-filmstrip method, and the first draft's CPU-throttling advice is
withdrawn.
- **Why a filmstrip can't work.** The first navigation settles in the same task as the first
  render (Context), so a Performance filmstrip can't capture the frame where a flash would happen,
  under any network or CPU throttling. The check can't fail even for a wrong implementation.
- **Step 1, required: code review against the mode table** (*Resulting bar*).
  - The initial mode is `'pending'`.
  - The mode changes only in the `NavigationEnd`/`NavigationError` handler.
  - Every forbidden item is gated as in the table.
- **Step 2, required: a DOM-level runtime check** (the PRD's "page-content check"). It is
  deterministic and stricter than a paint check.
  1. In DevTools Local Overrides, override `index.html` to add a `<head>` script.
  2. The script runs a `MutationObserver` on `document.documentElement` (subtree, childList) and
     logs the text of every element added where the mutation record's `target` is inside
     `nav.navbar`. Use `target` because it stays attached even if the added node is later
     removed.
  3. Run the four AC1.8 loads and the two AC2.7 loads.
  4. The log must contain no forbidden item. An implementation that starts in `'other'` fails this
     check; this design passes it.
  5. Disable the override afterwards.
  The exact snippet is a QA artifact (TP-001).

**The gate: a manual browser walk on a build that includes D1.** It is defined here so it doesn't
depend on `TP-001`, which doesn't exist yet.

*Prerequisites:*
- Node 10.24.1.
- MongoDB running, seeded once (`node populateDB …`).
- The API on :3000 (`node bin/www`) and the client on :4200 (`npm start`).
- **Internet access.** Bootstrap CSS and JS, jQuery and Popper come only from the CDN. Offline, the
  app is unstyled and the narrow menu doesn't open.

*The three sign-in states.* PRD-001 §3 (*Terms* and *Testing notes*) is the canonical
definition; this is a summary:

| State | How to set it up |
|---|---|
| **Signed out** | No `token` key |
| **Signed in** | A fresh sign-in |
| **Expired sign-in** (a token the server refuses) | Either wait more than 50 minutes after signing in, or sign in and change **one character in the middle of the token's third (signature) part**. **Never use arbitrary non-JWT text**: the API returns 500 and the ticket screens don't bounce |

Reload after every `localStorage` edit.

*Matrix A: first loads at 1280 px, each in all three states.*

| Address | Expected screen and bar |
|---|---|
| `/`, `/#`, `/#/login`, `/login`, `/login?x=1`, `/login/` | Login, with the clean Login bar, in every state |
| `/register` | Register, with the clean Register bar, in every state |
| `/tickets`, `/myTickets` | **Signed out:** Login with the clean bar. **Signed in:** that screen with the signed-in bar. **Expired sign-in:** the signed-in bar, then a bounce to Login with the clean bar |
| `/ticketView` | **Signed out:** Login with the clean bar. **Signed in or expired sign-in:** the ticket view with the signed-in bar (no bounce; deferred gap) |
| `/unknown`, `/Login` | Blank page. **Signed out:** the "TicketApp" link, Login and Register (AC3.1). **Signed in or expired sign-in:** today's signed-in bar (AC4.6; PRD OQ8 default). The address bar may change to `/`; that is expected |

*Matrix B: in-app transitions at 1280 px, with no refresh.*
- Sign in from signed out (AC4.1) and from an expired sign-in (AC4.2).
- Logout (AC4.5).
- Back right after signing in, then Forward (AC1.3).
- Login → Register → Login using the bar (AC1.5, AC2.4, AC3.2).
- The brand on Tickets reloads and lands on Login (AC4.4).
- On Login, type text into **Username**; on Register, into **First name**. Then click
  "TicketApp". The text must survive, which proves there was no reload. Tab must skip the brand,
  and the pointer no longer turns into a hand over it, as expected (AC1.4, AC2.3).
- A failed sign-in, and an invalid or duplicate registration, keep the clean bar (AC1.7, AC2.6).
- A successful registration, using a **new unique username each run** (AC2.5).

*Matrix C: 375 px.*
- Login and Register in each state: the menu button opens only the one remaining link
  (AC5.1, AC5.2).
- Ticket screens signed in, with the menu closed and open, compared with "before" (AC4.3).
- Keyboard only: Tab to the link and press Enter, at both widths (AC5.3).

*Also:*
- **AC4.3 "before" screenshots can be taken now**, at 1280 px and at 375 px with the menu closed
  and open. The current working copy's client code is `master` plus D1, and the bar template is
  `master`'s. Later, `git show master:clientApp/src/app/app.component.html` still recovers the
  template.
- **Console.** DevTools Console shows no new errors. Expected existing errors stay out of scope:
  the unmatched-route error on unknown addresses and the post-registration `TypeError`.

**OQ6 position (Tech Lead).** I support the PRD default of manual-only verification for this
change, for three reasons:
- The only spec that touches the bar fails during setup for an unrelated, already-deferred reason.
- The riskiest properties can't be unit-tested in any case: the look, the CDN-driven menu, and
  paint.
- The AOT check above now gives the template a static signal.

`testing.md` still requires an explicit exception, so **Story 1 must not merge until DuoSanura
answers OQ6**.

**Fallback if OQ6 is declined:**
- Repair only `app.component.spec.ts`'s TestBed by providing `AuthService` with
  `HttpClientTestingModule`.
- Add specs for the five rows of the table above, using `RouterTestingModule.withRoutes`, a
  stubbed `LoggedIn()` and settled navigations.
- That changes the baseline from 11 failing to fewer. The "Welcome to ngApp!" scaffold spec keeps
  failing, unedited.

## Alternatives considered

**(a) How the bar learns the screen**

| Option | Why not |
|---|---|
| Test the URL in the template on every check (`router.url`, `router.isActive('/login', false)` or `NavigationEnd.urlAfterRedirects`) | **The frame before routing breaks it.** Before the first navigation, `router.url` is `/`, so on `/` or `/tickets` the first render resolves to "other" and **inserts** "Login" (signed out) or "Tickets/Logout" (signed in) into the DOM of what becomes the Login page. That frame isn't painted today, but it would be once the first navigation turned asynchronous. Gating on `router.navigated` doesn't help: it stays `false` after an initial `NavigationError`, so `/unknown` would never settle and AC3.1 fails. Router events are needed anyway, so the remaining question is only what to read at settle time. A URL string also brings R8(c) back in (query string, `/#`, case, trailing slash), which the matched route already absorbs |
| Compare the settled route's `component` with `LoginComponent` and `RegisterComponent` | AppComponent (C2) would import other screens' classes, which `layer-map.md` § Client forbids |
| Compare the settled route's `routeConfig.path` with `'login'` and `'register'` | Works, with no change to the routing module. Rejected in favour of route `data`, which declares "this screen gets a clean bar" in C1 next to the path, so a future alias or new pre-login screen is tagged where it is routed. A close call; either would satisfy the PRD |
| Login and Register tell the bar through a shared service (set a flag in `ngOnInit`, clear it in `ngOnDestroy`) | A new service with no home in the layer map. The child's `ngOnInit` runs **after** the bar (above `<router-outlet>`) has been checked in the same pass, so dev mode throws `ExpressionChangedAfterItHasBeenCheckedError` and the bar lags by one cycle. Unrecognised addresses have no component to announce anything |
| Remove the shared bar on Login and Register and give each its own bar in its template | Duplicates the bar markup, which risks NFR3 drift. The outlet sits inside `<div class="container">`, so an in-page bar would be width-constrained. It edits the page templates (a PRD non-goal). And AppComponent would still need to know when to hide its own bar, which is the same problem |
| A named router outlet for the bar, with a bar component per route | Three new components and a restructured route table. Unrecognised addresses would get **no** bar (AC3.1) unless a `**` route is added, which changes what unknown addresses show (FR10) |
| `RouterModule.forRoot(routes, { initialNavigation: 'enabled' })` | **It doesn't remove the frame before routing.** In 8.2.3 it holds bootstrap only until pre-activation, and the root component's first change detection still runs before activation (`router.js` lines 9756–9772 and 9807, `core.js` lines 41093–41105). It also changes app-wide bootstrap timing |
| Start in `'other'` instead of `'pending'` (the frame isn't painted anyway) | It inserts forbidden items into the DOM on every first load. The DOM-level check would fail, and the first async guard, resolver or lazy route would turn that into a visible flash. `'pending'` costs one literal |
| Share `TopBarMode` between C1 and C2 | It is legal (C1 may import C2), but it buys nothing. Route `data` is untyped, and TS 3.5 doesn't check `'x' as TopBarMode` (verified). Typed constants in the routing module would work, but they are ceremony for two strings, and the narrowing already fails safe (a7) |

**(b) Single source of sign-in state**

| Option | Why not |
|---|---|
| An `AuthService` `BehaviorSubject` (`loggedIn$`) that the bar subscribes to | Sign-in writes `localStorage` in `login.component.ts`, not in `AuthService`, so the subject would need that write moved (a refactor outside scope). The subject would also miss writes it did not make: a tester's DevTools edit, or another tab. That makes it a second source of truth that can drift from the value `AuthGuard` reads. This is the hazard behind CLAUDE.md's warning and PRD R9 |
| Compute the full bar state, including `LoggedIn()`, once per `NavigationEnd` and store it | It works only because sign-in and logout happen to navigate after writing. Reordering those lines, or changing the token without navigating, would leave the bar stale. It saves nothing: `LoggedIn()` is one `localStorage` read |
| Check token expiry in `LoggedIn()` (decode the JWT `exp`) | It changes what counts as signed in for `AuthGuard` and for the bar on other screens, which FR6 forbids. Expiry handling is deferred (PRD §5) |
| Listen to `window` `storage` events for multi-tab sync | Deferred by PRD §5 (several tabs) and not needed for any acceptance criterion |

**(c) Plain-text brand**

| Option | Why not |
|---|---|
| Keep the `<a>` but drop `href` (or bind `[attr.href]` to `null`) | Bootstrap 4's reboot styles `a:not([href]):not([tabindex])` with `color: inherit`, which outranks `.navbar-dark .navbar-brand`. The brand would inherit the body's dark text colour on the dark bar, breaking NFR3 and AC1.4 |
| Keep `href="#"` and block the click (`preventDefault`, `tabindex="-1"`) | It is still a link to assistive technology and still shows a pointer cursor. AC1.4 requires "not a link" |

**(d) Sequencing**

| Option | Why not |
|---|---|
| Bundle the interceptor fix into the feature PR | It mixes `fix` and `feat` with different blast radii in one revert unit, and it delays a standalone fix to `master` |
| Commit it on the intent branch | Merging the intent branch is the product owner's acceptance of INT-001. A code fix there would ship without a fix review |
| Ship the feature first and the fix later | US4 fails QA, and the feature makes the 403 bounce harder to recognise (R7) |
| Create the fix branch with `git switch -c` in the main checkout | `branch-isolation.md` forbids switching with uncommitted changes, and the switch would carry the D1 edit, the `.idea/*` deletions and the untracked harness along |
| Let the harness ride in Story 1 or on the intent branch | See (d) point 1 |

**(e) Verification**

| Option | Why not |
|---|---|
| A Performance filmstrip, with network or CPU throttling, as NFR4 evidence (PRD-001's original AC1.8 method) | It can't capture a frame that lives inside one task, so it can't fail. It is replaced by code review plus the DOM-level check, which the revised PRD now names |
| Repair the client spec suite and unit-test the bar now | Deferred (`MVP-SCOPE.md` § Deferred) and out of PRD scope by default (OQ6). It is kept as the fallback |
| Require the AOT build to *pass* | It fails today on four other templates. Fixing them is outside scope, so the check is a *diff* against the known baseline instead |

## Trade-offs and consequences

- **The bar now has two inputs.** One is the screen, held as event-driven state in
  `AppComponent`. The other is sign-in, re-read on every check. This is inherent in the PRD (R8):
  decision 1 makes the bar depend on the screen. The rule that keeps it safe is that only the
  screen mode is stored, and sign-in is never stored.
- **A routing convention, with literals written twice.** Any future route that should get a clean
  bar must carry the `data` key, and C2 must recognise the value. A route without it, or with a
  misspelt value, gets the normal bar, which is safe and visible in the walk. The convention is
  recorded in `layer-map.md` § Client.
- **No visible in-between states today (source-read, not observed):**
  - `'pending'` is in the DOM at the bootstrap render but is never painted.
  - On Logout, the navigation completes within the click's microtasks, before the zone's one
    change detection. The bar goes straight from the signed-in bar to the clean Login bar.
  - Both would become visible only if navigation turned asynchronous, and `'pending'` keeps the
    first one safe even then.
- **A non-JWT token leaves ticket screens in place.** It gets a 500 from the API, an existing
  server defect outside this PRD (PRD-001 §5 Deferred), so the ticket screens don't bounce. The
  bar behaves correctly (FR6). Only the test setup has to avoid it.
- **Product consequences of decision 1 (PRD §5, accepted there, not new here).**
  - A signed-in person on Login or Register sees no Tickets or Logout.
  - The Login page no longer signals a live sign-in, which matters on shared computers.
- **No new cross-layer dependency.** No new file, folder, service, provider or package.
  `app.module.ts` is unchanged, because `Router` is already provided by `AppRoutingModule`.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A template mistake in the root component blanks every screen | Medium | High | The AOT diff check (e); the browser walk with the Console open |
| The router-event handler throws once, the rxjs subscription dies, and the bar freezes for the session with no build error | Low | High | Handler rules (a6). Matrix B transitions exercise the handler after the first load |
| The signed-in bar on ticket screens changes by accident (PRD R1) | Low | Medium | Gate items, never containers (markup rules). AC4.3 before/after screenshots |
| D1 is not merged when the feature reaches QA (PRD R7) | Medium | Medium | (d): Story 0 merges first, and Story 1 is cut after it |
| The harness is not on `master` when Story 1 starts, so its doc updates have nowhere to land | High (true today) | Medium | Precondition H, which needs user go-ahead |
| QA uses arbitrary text as the "expired" token, gets a 500 and no bounce, and files a false defect against AC1.6 (PRD R10) | Medium | Low | PRD-001 §3 setup and testing notes (summarised in (e)); the server-defect row in PRD §5 Deferred |
| A future guard refuses the first navigation without redirecting, so the bar stays `pending`. That hides Tickets, My Tickets and Logout from a signed-in person, and Login and Register from a signed-out one | Low | Medium | Any guard must redirect, as `AuthGuard` does. Recorded in `layer-map.md` with the `data` convention |
| A new pre-login route is added without the `data` key, or with a misspelt value | Low | Low | Fails safe to the normal bar; convention documented in `layer-map.md` |
| A span brand differs visually from the link brand beyond the cursor (CDN-only CSS, not checked locally) | Low | Low | Browser check under AC1.4 and AC2.3 at both widths, side by side with the "before" screenshot |
| Re-applying D1 in the worktree changes line endings and produces a whole-file diff | Low | Low | The staged-stat check in (d) point 2 |
| The narrow menu needs the CDN scripts (PRD R5) | n/a | n/a | Unchanged from today; internet access is listed as a walk prerequisite |

## Testability

| Behaviour | How it is validated | Automated? |
|---|---|---|
| The component class and route table compile | `npm run build` (JIT) | Yes |
| Template expressions bind to real, public members | `ng build --aot` diff against the 31-entry baseline, with no `app.component` entry | Yes (baseline diff) |
| No new unit-test failures | Karma: 11 of 11 FAILED, same `AppComponent` messages | Yes (baseline diff) |
| NFR4: no forbidden item on first load | Code review against *Resulting bar* and the initial value, plus the DOM-level `MutationObserver` check. PRD-001 AC1.8 and AC2.7 require both | Partly (the DOM check is a scripted run, done by hand) |
| The mode table across sign-in states, addresses and widths | Matrices A, B and C in (e), on a build that includes D1 | No (OQ6 default; fallback in (e)) |

`ui-quality.md` state checklist, as it applies to a bar that has no data:
- `pending` is its loading state.
- An unrecognised address is its no-screen state.
- There are no mutations or toasts.

The checklist's browser-verification section applies in full.

## Acceptance criteria coverage

One row per criterion in PRD-001 as revised after this ADR's review: 26 acceptance criteria, then
the five NFRs. "Expired sign-in" means PRD-001 §3's definition: a `token` the server refuses.

| PRD criterion | What it requires (short) | Satisfied by | Checked in |
|---|---|---|---|
| AC1.1 | Signed out, wide window, Login: the clean Login bar and nothing else | (a): mode `login` from route `data`; items per *Resulting bar* | Matrix A |
| AC1.2 | Expired sign-in, wide window, Login: clean Login bar, with no Tickets, My Tickets or Logout | Mode `login` never consults `LoggedIn()` (b) | Matrix A |
| AC1.3 | Signed in, reach Login by Back right after signing in, and by typing `/login`: clean Login bar each time | Back: popstate → router navigation → `NavigationEnd` → `login` (a point 3). Typed address: first load, `pending` → `login` | Matrices A, B |
| AC1.4 | Login, every state: "TicketApp" not a link. Typed Username text survives a click and the page doesn't change; Tab skips it; same text, colour and position; the pointer is no longer a hand (expected) | (c): `<span class="navbar-brand">` in `login` mode; only the cursor changes | Matrix B |
| AC1.5 | "Register" in the Login bar opens Register | Existing `routerLink` anchor, shown in `login` mode | Matrix B |
| AC1.6 | Clean Login bar via `/`, `/#`, `/#/login`, `/login?x=1`, `/login/`; signed out on a guarded address; signed in clicking "TicketApp" on Tickets; expired sign-in (§3 setup) bounced from Tickets | (a) point 3, one bullet per route. Every route settles on the `login` route's `data`. The last needs a token the server refuses with 403, never arbitrary text (500) | Matrices A, B |
| AC1.7 | Wrong credentials: the error appears and the bar stays clean | A failed submit doesn't navigate, so the mode is unchanged | Matrix B |
| AC1.8 | Tickets, My Tickets, Login and Logout never appear in the Login bar, even while loading. Checked by code review against *Resulting bar* plus the page-content check, on four loads | (a) point 5: `pending` initial value; `NavigationCancel` ignored | (e) NFR4 evidence, steps 1 and 2 |
| AC2.1 | Signed out, wide window, Register: the clean Register bar and nothing else | Mode `register` | Matrix A |
| AC2.2 | Signed in, and separately expired, on `/register`: clean Register bar, with no Tickets, My Tickets or Logout | Mode `register` never consults `LoggedIn()` | Matrix A |
| AC2.3 | Register, every state: "TicketApp" not a link, as AC1.4, using the First name field | (c), `register` mode | Matrix B |
| AC2.4 | "Login" in the Register bar opens Login, which shows the clean Login bar | Existing `routerLink` anchor in `register` mode; settles as `login` | Matrix B |
| AC2.5 | Register with an unused username: lands on Login with the clean bar. The known script error is out of scope | Registration's `navigate(['/login'])` settles as `login` before the `TypeError` (MVP-SCOPE § Deferred) | Matrix B (unique username) |
| AC2.6 | Invalid form or existing username: the error appears and the bar stays clean | No navigation, so the mode is unchanged | Matrix B |
| AC2.7 | Tickets, My Tickets, Register and Logout never appear in the Register bar while loading; checked as AC1.8 on `/register` signed out and signed in | As AC1.8 | (e) NFR4 evidence, steps 1 and 2 |
| AC3.1 | Signed out on `/unknown` or `/Login`: "TicketApp" link, Login and Register, with no Tickets or My Tickets. The address bar may change to `/`, and "TicketApp" may then move to Login without a reload (existing, not a defect) | (a) point 3: `NavigationError` leaves the empty state, so the mode is `other`; `LoggedIn()` is false. The brand is unchanged in `other` mode, so its existing fragment behaviour is untouched (Context) | Matrix A |
| AC3.2 | Signed out, Login → Register → Login using the bar: Tickets and My Tickets never appear | Modes `login` and `register` never show them | Matrix B |
| AC4.1 | Signed out, sign in: Tickets opens and, without a refresh, the bar becomes the signed-in bar, with no Login or Register | (b): token written, then navigation; at settle `other` + `LoggedIn()`. Needs D1 (d) | Matrix B |
| AC4.2 | Expired sign-in, sign in again: as AC4.1 | As AC4.1. `/login` has no auth middleware, so the stale token sent with the sign-in request is ignored | Matrix B |
| AC4.3 | Signed in, the bar on Tickets, My Tickets and the ticket view is unchanged. Before/after screenshots at 1280 px and at 375 px with the menu closed and open; "before" taken before Story 1 merges | `other` + `LoggedIn()` renders today's markup; markup rules (gate items, not containers) | (e) "before" screenshots; Matrix C |
| AC4.4 | Signed in, Tickets and My Tickets open as today. On Tickets, My Tickets and the ticket view, "TicketApp" is still a link that reloads to Login, which shows the clean bar | (c): `<a href="#">` unchanged in `other` mode; the reload goes to `/#`, which settles as `login` (AC1.6) | Matrix B |
| AC4.5 | Signed in, Logout: Login opens and shows the clean bar without a refresh | `logoutUser()` removes the token and navigates; settles as `login` | Matrix B |
| AC4.6 | Signed in, and separately expired, on `/unknown`: today's signed-in bar (PRD OQ8 default) | (a) point 3: `NavigationError` → `other`; `LoggedIn()` is true, so today's signed-in bar (FR6) | Matrix A, `/unknown` row |
| AC5.1 | 375 px, every state: name and menu button. The Login menu shows only Register, which opens Register; Register works the same with Login | Markup rules: the toggler and `#collapsibleNavbar` are persistent and unchanged; only the items inside are gated | Matrix C |
| AC5.2 | 375 px, Login and Register: no Tickets, My Tickets or Logout in the bar or the opened menu | Gated by mode inside the same collapse container | Matrix C |
| AC5.3 | Keyboard only: Tab reaches the remaining link (narrow: Enter on the menu button first), and Enter opens the other page | The remaining link is the existing `routerLink` anchor; the span brand is not in the Tab order; the toggler is unchanged | Matrix C |
| NFR1 | Keyboard, no regression | As AC5.3 | Matrix C |
| NFR2 | Two layouts either side of 992 px; the remaining link sits in the existing menu | Markup rules; collapse classes unchanged | Matrix C |
| NFR3 | Clean bars look like today's bar; the visual reference is today's bar in the AC4.3 "before" screenshots (ADR-Q3) | (c): `.navbar-brand` on a span; containers and classes unchanged | Matrices B, C against the "before" screenshots |
| NFR4 | No hidden item appears even briefly while loading; checked by code review plus the page-content check | (a) point 5 | (e) NFR4 evidence, steps 1 and 2 |
| NFR5 | Link contrast no lower than today | No colour or class changes to links | Matrix C, side by side with the "before" screenshots |

## Implementation plan

In order:

- **Precondition H: commit the harness and planning files to `master`**, including PRD-001 and
  this ADR. Not a feature story. **Needs user go-ahead** on where, when, and what happens to the
  `.idea/*` deletions. Blocks Story 1 only.
- **Story 0: make the interceptor read the token on every request (Precondition D1).**
  - Steps: as in (d) point 2, each go-ahead noted there.
  - Verify in the main checkout:
    - the build passes
    - Karma is unchanged at 11 of 11 failing
    - in the browser, sign in and the Tickets list loads without a refresh or a bounce
- **Story 1: a route-aware top bar (PRD-001 FR1–FR10, NFR1–NFR5).**
  - Branch: as in (d) point 3.
  - Verify: all of (e).
  - OQ6 was answered on 2026-10-21 (manual-only verification accepted), so it no longer blocks the merge.
  - Not split further: FR4's sign-in gating and the clean bars are the same set of conditions in
    one template. Splitting them would ship an intermediate bar that no one specified.

## Files likely touched

- **Precondition H:** the untracked harness and planning files (the user decides the exact set).
- **Story 0:** `clientApp/src/app/token-interceptor.service.ts`
- **Story 1:**
  - `clientApp/src/app/app-routing.module.ts`: `data` on the `login` and `register` routes
  - `clientApp/src/app/app.component.ts`: `TopBarMode`; inject `Router`; settle the mode on
    `NavigationEnd` and `NavigationError`, narrowed
  - `clientApp/src/app/app.component.html`: the brand switch; per-item conditions from the mode
    table
  - `.claude/planning/architecture/layer-map.md` § Client:
    - C1 row: the route `data` convention, its two literals and that guards must redirect
    - C2 row: `app.component` chooses the top bar from the settled route plus `LoggedIn()`
  - `.claude/planning/architecture/component-map.md` § Screens: the "(nav bar)" row now also reads
    the router state
- **Deliberately not touched:**
  - `auth.service.ts`, `auth.guard.ts`, `app.module.ts`, `app.component.css`
  - `login/`, `register/`, `tickets/`, `src/index.html`
  - `app.component.spec.ts` (unless the OQ6 fallback applies)
- **Owned by the PM on PRD approval, not by this ADR:**
  - the PRD-001 `implemented_by` field
  - the `MVP-SCOPE.md` rows (PRD §5)

## Open questions

| # | Question | Owner | Position in this ADR |
|---|---|---|---|
| OQ6 (PRD) | Can this ship verified by manual browser checks only? | DuoSanura, with Tech Lead | **Resolved 2026-10-21: DuoSanura accepted manual-only verification** (the explicit `testing.md` exception). The fallback in (e) is not used |
| OQ7 (PRD) | Do signed-out visitors on non-Login/Register addresses lose Tickets and My Tickets? | DuoSanura | Implemented as the PRD reads it (FR4, FR5). If reversed, one template condition changes |
| ADR-Q1 → **PRD OQ8** | Signed in or expired sign-in, on an **unrecognised** address: which bar? | DuoSanura | **Moved to PRD-001 OQ8.** The PM's default is today's signed-in bar (FR6, AC4.6), which this design implements. **Resolved 2026-10-21: DuoSanura accepted the default.** |
| ADR-Q2 | Where and when do the harness and planning files reach `master` (Precondition H), and what happens to the `.idea/*` deletions? | User (DuoSanura) | Recommended: a separate `chore` PR before Story 1. **Partly resolved 2026-10-21:** the canonical branch is `main` (read `master` as `main`, see Decisions after acceptance). The route for the harness files and the `.idea/*` deletions are still open. Blocks Story 1 |
| ADR-Q3 | `ui-designs.md`: is today's bar, captured in the "before" screenshots, the design reference, with no `Design:` file needed? | User (DuoSanura) | **Resolved 2026-10-21: yes.** DuoSanura confirmed today's bar is the design reference and no `Design:` file is needed (PRD NFR3) |
| ADR-Q4 | Branch names and the worktree for Story 0, the manual PR, and discarding the D1 working copy afterwards | User (DuoSanura) | Proposed in (d). Each step needs a go-ahead |

## Revisions after the Developer challenge (2026-10-20)

1. **(d) rewritten.**
   - Added Precondition H.
   - The worktree, re-apply, explicit-staging, manual-PR, discard and cleanup steps each now
     carry a "needs user go-ahead".
   - Verification moved to the main checkout.
   - Line endings checked: the staged diff stays at 3 lines.
2. **Expired sign-in setup.**
   - A non-JWT token gets a 500, not a 403, so it can't trigger the bounce.
   - Added the altered-signature and real-expiry setups to (a)3 and (e). PRD-001 §3 now holds the
     canonical setup.
3. **NFR4 evidence.**
   - The filmstrip check can't fail, and the CPU-throttling advice is withdrawn.
   - Replaced by code review plus a DOM-level `MutationObserver` check. Both are now required
     (see the PM-validation revisions below).
   - `'pending'` is kept, now justified as defense in depth.
   - The "pending shell" and "logout transient" trade-offs are restated as not visible today.
4. **AOT check adopted** as a baseline-diff signal. Counted as 31 distinct entries (51 raw lines,
   each printed twice), not as 50 lines.
5. **Typing.**
   - Added `TopBarMode`, narrowing at read time, and public template members.
   - Literals are written twice deliberately. The challenge said sharing the type would need a
     forbidden import or a new file. That part is corrected: C1 may import C2, but an `as`
     assertion doesn't check the literal in TS 3.5, so sharing buys nothing.
   - `?.` and `??` are banned here despite `typescript.md`.
6. **Handler rules (a6).** The callback must not throw; Default change detection is kept;
   unsubscribing is optional.
7. **Corrections.**
   - A redirect does emit a `NavigationEnd` (url `/`, urlAfterRedirects `/login`).
   - The stuck-`pending` impact is raised to Medium.
   - The address bar on unknown addresses is documented, and so is the in-app brand behaviour
     there.
8. **Concrete walk.** Matrices A to C, prerequisites, reloading after DevTools edits, `/login/` and
   `/#/login`, the text-survives test for "no reload", unique usernames, and "before" screenshots
   now.
9. **Rule gaps acknowledged.** `ui-designs.md` (ADR-Q3), the `testing.md` exception as a merge
   blocker for Story 1, and branch names (ADR-Q4).
10. **Markup rule.** The toggler and `#collapsibleNavbar` are never wrapped in a structural
    directive, and are present in `pending`.

## Revisions after PM validation (2026-10-21)

The PM confirmed that the ADR covers every PRD-001 criterion. These changes align it with the
revised PRD:

1. **Coverage table rebuilt** with one row per current criterion: 26 ACs plus NFR1–NFR5. It
   includes the new **AC4.6** (signed in or expired sign-in on an unrecognised address: today's
   signed-in bar) and the revised wording of AC1.4, AC1.6, AC1.8, AC2.3, AC2.5, AC2.7, AC3.1,
   AC4.3, AC4.4, NFR3 and NFR4.
2. **ADR-Q1 moved to PRD-001 OQ8.** The default is today's signed-in bar, and the owner is
   DuoSanura. The design is unchanged, because it already implemented that default.
3. **The DOM-level check is now required** (step 2 of the NFR4 evidence), not recommended. PRD-001
   AC1.8, AC2.7 and NFR4 name it as their method.
4. **Terminology.** "Rejected token" is renamed to the PRD's "expired sign-in", which PRD-001 §3
   defines as a token the server refuses. The (e) setup table now points to PRD-001 §3 as
   canonical.
5. **"Padding bits" reason withdrawn.** Revision 2 above told testers not to change the
   signature's last character. That reason was wrong for this server. jwa 1.4.1 compares the
   encoded signature strings (`createHmacVerifier`), so all 1,260 last-character substitutions
   across 20 tokens were rejected (Node 10.24.1). The instruction is now simply "change one
   character in the middle of the signature (third) part".
6. **References to the revised PRD.** Added PRD R10 and the §5 Deferred server-defect row to Risks
   and Trade-offs.

## Decisions after acceptance (2026-10-21)

Recorded by the lead from DuoSanura's answers. They add to the decisions above and change none of them.

1. **ADR-001 accepted** by DuoSanura. PRD-001 had been approved by merging the intent branch (PR #54, merge commit `fd8582a`).
2. **Canonical branch is `main`.** `master` was renamed to `main` on GitHub, so `origin/master` no longer exists. Every `master` in this ADR (Precondition H, Story 0, D1, the "before" screenshots, `git show master:...`) now means `main`. At the time of this decision `main` holds the intent file and the PR #54 merge commit, so the "before" template is still recoverable with `git show main:clientApp/src/app/app.component.html`.
3. **OQ6 accepted:** the change ships verified by manual browser checks only. This is the explicit `testing.md` exception. The fallback in (e) is not used.
4. **OQ8 / ADR-Q1 accepted:** a signed-in person, or one with an expired sign-in, on an unrecognised address keeps today's signed-in bar.
5. **ADR-Q3 accepted:** today's bar, captured in the "before" screenshots, is the design reference. No `Design:` file is needed.

**Still open, and each needs a user go-ahead before it runs:** ADR-Q2 (how and when the harness and planning files reach `main`, and what happens to the `.idea/*` deletions) and ADR-Q4 (branch names, the worktree and manual PR for Story 0, and discarding the D1 working copy afterwards).

## Traceability

- **PRD**: `.claude/planning/prd/001-login-page-nav-bar.md` (`Approved`)
- **Intent**: `intent/001-login-page-nav-bar.md` (INT-001, accepted by the merge of PR #54 into `main`)
- **RFC**: none (PRD §8: not expected)
- **Spec**: none
- **Plan**: `.claude/planning/plan/PLAN-NNN-<slug>.md` (added by `/implement`)
- **Architecture docs to update on implementation**:
  - `.claude/planning/architecture/layer-map.md` § Client
  - `.claude/planning/architecture/component-map.md` § Screens
