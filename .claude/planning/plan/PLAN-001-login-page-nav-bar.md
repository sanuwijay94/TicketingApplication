---
id: PLAN-001
title: Clean top bar on the Login and Register pages
source: ADR-001 (implements PRD-001, from INT-001)
branch: feature/login-page-nav-bar
approved_by: DuoSanura
approved: 2026-10-21
status: living
---

# Plan: Clean top bar on the Login and Register pages

> Written by `/implement` **after** the plan was approved and **before** the first code edit.
> Living until the PR merges: if the implementation departs from this, update it in the same
> commit. `/review` checks the diff against the *Files that change* section.

## Source

Implements [ADR-001](../adr/ADR-001-login-page-nav-bar.md) (Accepted 2026-10-21), which satisfies
[PRD-001](../prd/001-login-page-nav-bar.md) (Approved) from
[INT-001](../../../intent/001-login-page-nav-bar.md). The ADR's *Resulting bar* table is the whole
behaviour; its (a) to (e) are the design and the verification. This plan is Story 1 of the ADR's
implementation plan. Story 0 (the interceptor fix, PRD dependency D1) merged first as PR #56
(`9d29188`), and Precondition H (harness on `main`) as PR #55.

## Files that change

| File | Change | Layer |
|---|---|---|
| `.claude/planning/plan/PLAN-001-login-page-nav-bar.md` | new: this plan, committed alone before any code | docs |
| `clientApp/src/app/app-routing.module.ts` | modified: `data: { topBar: 'login' }` on the `login` route and `data: { topBar: 'register' }` on the `register` route. No other route gets the key | presentation (C1) |
| `clientApp/src/app/app.component.ts` | modified: `type TopBarMode = 'pending' \| 'login' \| 'register' \| 'other'`; a `public` field starting `'pending'`; inject `Router`; subscribe to `router.events`, reacting only to `NavigationEnd` and `NavigationError`; read `data.topBar` from the deepest route in `router.routerState.snapshot`, narrowed so only the exact strings `'login'` and `'register'` map to those modes and anything else maps to `'other'`; the handler is trivial and never throws; no `?.` or `??` (TS 3.5.3 cannot compile them); no `console.log` | presentation (C2) |
| `clientApp/src/app/app.component.html` | modified: brand is `<span class="navbar-brand">` in `pending`, `login` and `register`, and today's `<a class="navbar-brand" href="#">` in `other`; each item gated per ADR-001 *Resulting bar*; `_authService.LoggedIn()` is called when each item is evaluated; the toggler button and `#collapsibleNavbar` are never wrapped in a structural directive; the `ul`s keep their classes and order, and the left `ul.navbar-nav.mr-auto` stays even when empty | presentation (C2) |
| `.claude/planning/architecture/layer-map.md` | modified, § Client: the C1 row gains the route `data` convention (the two literals, and that any guard on a first navigation must redirect); the C2 row says `app.component` chooses the top bar from the settled route plus `LoggedIn()`; the literals are written in both C1 and C2 on purpose | docs |
| `.claude/planning/architecture/component-map.md` | modified, § Screens: the "(nav bar)" row now also reads the router state | docs |
| `MVP-SCOPE.md` | modified: an in-scope row for this feature; the PRD-001 §5 Deferred rows under *Deferred*; the PRD-001 §5 non-goal rows under *Explicit non-goals*; and the server defect "an `x-access-token` that is not a JWT makes `authentication.js` return 500 instead of 403" as a known as-built defect. Copy from PRD §5, do not paraphrase | docs |

Deliberately **not** in this plan's diff: `auth.service.ts`, `auth.guard.ts`, `app.module.ts`,
`app.component.css`, `login/`, `register/`, `tickets/`, `src/index.html`,
`app.component.spec.ts` (OQ6 accepted manual-only verification; no spec is edited, skipped or
deleted), and the `status` fields of PRD-001 and ADR-001 (they become `Implemented` only after the
user confirms the manual walk, as a separate commit recorded under *Departures from plan*).

## Order of work

1. Commit this plan alone as the first commit on the branch (`docs(plan): ...`).
2. **Record baselines before editing code**, on this branch, with Node 10.24.1, writing build output
   to the session scratchpad so `dist/` is untouched:
   - `cd clientApp && npm run build -- --output-path=<scratchpad dir>`: exit 0.
   - `npx ng build --aot --output-path=<scratchpad dir>`: exit 1 with 31 distinct
     `file(line,col): message` entries, none naming `app.component`. Save the sorted, de-duplicated
     list (the saved baseline from the ADR review is `aot-baseline.txt` in the session scratchpad;
     regenerate it here and compare).
   - `npx ng test --watch=false --browsers=ChromeHeadless`: 11 of 11 FAILED; keep the failure
     messages.
3. `app-routing.module.ts`: add the two `data` entries.
4. `app.component.ts`: the type, field, `Router` injection and the narrowed handler (ADR-001 (a)
   points 2 and 6).
5. `app.component.html`: the brand switch and the per-item gates (ADR-001 *Resulting bar* and
   markup rules). **Riskiest step**, see *Risks*.
6. Re-run the three checks from step 2. Pass rules are in *Proof*. Then **break the template on
   purpose once** (for example reference a member that does not exist), confirm the AOT check
   reports a new `app.component` entry, and **revert** the deliberate break.
7. Docs: `layer-map.md`, `component-map.md`, `MVP-SCOPE.md` as in the table above.
8. Hand the user the manual-walk checklist (ADR-001 (e): Matrices A, B and C plus the DOM-level
   check) and remind them that the AC4.3 "before" screenshots must predate this branch's merge.
   Commit in small steps (plan, code, docs); each commit passes the build.

Implementation of steps 3 to 7 is handed to `developer-agent` (Feature lane) with this plan and
ADR-001 as input.

## Not changing

- **The signed-in bar on every other screen** (PRD FR6, FR10, decision 3): same markup, classes and
  order, today's `<a href="#">` brand, the collapse behaviour.
- **`AuthService.LoggedIn()` and `AuthGuard`**: no expiry check, no change to what counts as signed
  in. Expiry handling on other screens is deferred (PRD §5).
- **Screens' own content**, redirects away from Login for a signed-in person, multi-tab sync, the
  bar's link contrast (OQ5): non-goals or deferred in PRD §5.
- **Automated tests**: no spec is repaired or added (OQ6). The 11 failing scaffold specs are their
  own task (`MVP-SCOPE.md` § Deferred).
- **The server**: the 500 on a non-JWT token is recorded, not fixed.

## What could break

From the impact check (`/impact-check`, 2026-10-21):
- **Dependents.** `app.module.ts` is the only importer of `AppComponent` and `AppRoutingModule`
  (declares and bootstraps the first, imports the second) and is unchanged. `app.component.spec.ts`
  is the only spec that touches the bar: three specs, already failing (no `AuthService` provider;
  an `h1` that never existed). `auth.guard.ts` and `auth.service.ts` share `LoggedIn()` and do not
  change. No e2e file references the bar. No contract artifacts: no endpoint or `server/models`
  file is touched.
- **What a user would notice.** The wrong bar on a screen; a bar that stops reacting for the rest of
  the session (the handler threw once and the subscription died); the signed-in bar on ticket
  screens changing by accident; the narrow-window menu not opening (its container was wrapped or
  recreated); or the whole app blank (a root-template error).

## Risks

- **Riskiest step: step 5, the `app.component.html` edit.** `AppComponent` is the root component, so
  its template renders on every screen, and the JIT build (`angular.json` `aot:false`) does not
  compile templates. A template mistake therefore passes `npm run build` and blanks the whole app.
  Mitigations: the AOT diff check, the deliberate-breakage run in step 6, and the user's manual
  walk with the Console open.
- **Silent freeze.** A throw inside the router-event callback unsubscribes it permanently in
  rxjs 6.4. Mitigation: the handler only reads one key and narrows it (ADR-001 (a) point 6);
  Matrix B transitions exercise it after first load.
- **Flash of forbidden items on first load (NFR4).** The initial mode is `'pending'`, which shows no
  items; the mode changes only in the handler. Evidence is code review against the table plus the
  DOM-level check; a filmstrip cannot show this frame.
- **Change detection.** `AppComponent` must stay on Default change detection (OnPush would stop both
  the mode field and the per-check `LoggedIn()` reads from rendering) and the members the template
  uses must be `public`.
- **Line endings.** `.gitattributes` forces LF. If a diff shows a whole-file rewrite, stop and fix
  it before committing.

## Alternatives not chosen

The full table is ADR-001 *Alternatives considered*. In one line each:
- Test the URL in the template: the frame before routing would insert forbidden items into the DOM.
- Compare the route's `component` with the screen classes: C2 may not import other screens.
- Compare `routeConfig.path`: works, but route `data` declares the intent next to the route.
- A shared service set from the screens: no home in the layer map, and
  `ExpressionChangedAfterItHasBeenCheckedError`.
- A named outlet or per-screen bars: new components, and unknown addresses would get no bar.
- `initialNavigation: 'enabled'`: does not remove the frame before routing.
- Start in `'other'`: inserts forbidden items on every first load.
- A `BehaviorSubject` for sign-in state, or expiry in `LoggedIn()`: a second source of truth, or a
  change to `AuthGuard`.
- Keep the `<a>` without `href` for the plain brand: Bootstrap's reboot colours it as body text.

## Proof

Automated, run by me and pasted in the report:
- **Build:** `npm run build -- --output-path=<scratchpad>` exits 0 and ends
  `ES5 bundle generation complete.`
- **AOT template check:** `npx ng build --aot --output-path=<scratchpad>` still exits 1, with the
  **same set of 31 distinct `file(line,col): message` entries** (compare sorted, de-duplicated lists,
  not line counts) and **no entry naming `app.component`**; the deliberate break in step 6 produces
  a new `app.component` entry.
- **Karma:** `Executed 11 of 11 (11 FAILED)` with the same failure reasons (missing `AuthService`
  provider; missing `FormsModule`); the three `AppComponent` specs still fail only for the missing
  provider.

By the user, because I have no browser (stated plainly in the report, not claimed):
- **The manual browser walk** in ADR-001 (e): Matrix A (first loads, three sign-in states), Matrix B
  (in-app transitions), Matrix C (375 px), on a build that includes Story 0, with the Console open.
- **The DOM-level NFR4 check** (`MutationObserver` via DevTools Local Overrides) for the four AC1.8
  and two AC2.7 loads.
- **AC4.3 screenshots:** "before" (taken from `main` before this merges) and "after" of the
  signed-in bar at 1280 px and 375 px, menu closed and open.

## Departures from plan

None yet.
