---
id: 001
title: Clean top bar on the Login and Register pages
status: Approved
date: 2026-10-20
author: pm-agent (stakeholder: DuoSanura, originator)
intent: intent/001-login-page-nav-bar.md
spec: []                             # no SPEC governs this behaviour (.claude/planning/spec/ is empty)
implemented_by: [.claude/planning/adr/ADR-001-login-page-nav-bar.md]
issue: ""                            # no GitHub feature issue filed yet
---

# PRD-001: Clean top bar on the Login and Register pages

> Product requirements, not technical implementation. Historical record: never rewritten.
>
> **Depends on intent acceptance.** This PRD formalises `INT-001`
> ([intent/001-login-page-nav-bar.md](../../../intent/001-login-page-nav-bar.md)), which is still
> `draft`: the product owner accepts it by merging branch `intent/001-login-page-nav-bar`. This
> PRD should not move to `Approved` before that merge.
>
> **Revised after the Tech Lead challenge.** The originator answered three open questions in the
> `/prd` review on 2026-10-20 (relayed by the coordinator). They are cited below as
> **originator decision 1, 2 and 3 (/prd review, 2026-10-20)**:
>
> 1. **Clean bar for everyone.** Login and Register always show the clean bar, even when the app
>    still thinks the person is signed in, including with an expired sign-in. Screens other than
>    Login and Register keep today's bar. What an expired sign-in does on those other screens stays
>    out of scope.
> 2. **"TicketApp" is plain text on Login and Register.** It is not a clickable link there. On every
>    other screen it stays a link, as today.
> 3. **Phone-sized windows: "behind the menu, as today".** The collapse behaviour does not change.
>
> Decision 1 **refines** the intent's statement that "logged-in users should notice nothing".
> A signed-in person who lands on Login or Register now sees the clean bar. The intent itself is
> not rewritten. See §5, *Consequences the product owner must see*.
>
> **Revised again after the ADR-001 review (2026-10-20).** Developer and Tech Lead findings,
> checked against the source, changed three things: the expired sign-in test setup (§3), how the
> no-flash requirement is checked (AC1.8), and the behaviour on unrecognised addresses (§1, AC3.1,
> new OQ8).

## 1. Problem statement

From INT-001:

> When someone opens the app without being logged in, the dark bar at the top of the Login page
> shows "TicketApp", "Tickets", "My Tickets", "Login" and "Register". "Tickets" and "My Tickets" are
> links to pages the person can't use yet. "Login" is a link to the page they are already on. The
> whole bar makes the login screen look cluttered; a login screen should be clean and focused on
> signing in.

**Current behaviour.** Everything in this list was read from the code on 2026-10-20. None of it
has been watched in a browser yet. The statements marked *(least certain)* depend on browser and
router behaviour and are the most likely to differ in practice.

- **One bar on every screen.** The top bar is shared by every screen
  (`clientApp/src/app/app.component.html`). "Tickets" and "My Tickets" are **always** shown. "Login"
  and "Register" appear when the browser holds no sign-in, and "Logout" appears when it holds one.
- **What counts as "signed in".** The app treats a person as signed in whenever their browser holds
  a saved sign-in. It never checks whether that sign-in is still valid (`auth.service.ts`
  `LoggedIn()`). A sign-in expires after 50 minutes, but **closing the browser does not remove it.
  Only clicking Logout does.**
- **The most common arrival at Login shows the signed-in bar.** Opening the app's address always
  lands on Login (`app-routing.module.ts`). So someone returning later without having clicked
  Logout usually sees "TicketApp", "Tickets", "My Tickets" and "Logout" on Login. Clicking Tickets
  or My Tickets then sends them back to Login. This is not a rare mid-session case.
- **"TicketApp" usually reloads the app.** On Login, Register and the ticket screens, clicking it
  reloads the whole app, which then opens Login, whether or not the person is signed in. On the
  Login page it is therefore a link to the page you are already on.
  - **Exception: the blank page.** An address the app doesn't recognise shows a blank page. On
    first load, the address bar there may change to the app's root (`/`). If it does, clicking
    "TicketApp" moves to Login inside the app, without a reload *(least certain)*.
- **No in-page links between Login and Register.** The two forms don't link to each other, so the
  top-bar link is the only way between the two pages without typing an address.
- **Logout is incomplete.** It returns the person to Login but removes only the sign-in. A stored
  copy of the person's account details stays in the browser (`MVP-SCOPE.md` § Deferred). For this
  PRD, only the sign-in counts.

**Cost:** on the first screen every user sees, most of the bar is no use to the person looking at
it. Signed out, four of the five items lead nowhere useful. With an expired sign-in, three of the
four do.

## 2. Users and impact

| User / role | Today, on Login | After, on Login |
|---|---|---|
| Agent or Supervisor, signed out (new browser, or after Logout) | TicketApp (link), Tickets, My Tickets, Login, Register | **TicketApp (plain text) and Register** |
| Agent or Supervisor returning with an **expired** sign-in (never clicked Logout) | TicketApp (link), Tickets, My Tickets, Logout | **TicketApp (plain text) and Register** |
| Agent or Supervisor **still signed in** who reaches Login (Back button, typed address, bookmark, clicking TicketApp) | TicketApp (link), Tickets, My Tickets, Logout | **TicketApp (plain text) and Register.** No Tickets or Logout here (decision 1) |
| New person on the **Register** page, in any of the states above | Same items as on Login, with Register in place of Login | **TicketApp (plain text) and Login** |
| Signed-in person on Tickets, My Tickets or the ticket view | TicketApp (link), Tickets, My Tickets, Logout | **No change** |
| Signed-out person on an address the app doesn't recognise | TicketApp (link), Tickets, My Tickets, Login, Register | TicketApp (link), Login, Register **(default, OQ3)** |
| Signed-in person, or one with an expired sign-in, on an address the app doesn't recognise | TicketApp (link), Tickets, My Tickets, Logout | **No change (default, OQ8)** |

## 3. User stories

### Terms used in the acceptance criteria

**Sign-in states.** These are what testers set up. Each is checked in the browser's developer
tools, under Local Storage for `http://localhost:4200`.

| State | Meaning | How to set it up |
|---|---|---|
| **Signed out** | No `token` entry. A leftover `auth-user` entry does **not** count as signed in. | A fresh browser profile, or click **Logout** |
| **Signed in** | A `token` entry from a sign-in less than 50 minutes ago | Sign in on the Login page and don't click Logout |
| **Expired sign-in** | A `token` entry the server refuses | Sign in, then **either** wait more than 50 minutes (closing and reopening the browser keeps the entry), **or** change one character in the middle of the token's third part (the signature: the text after the second dot) |

**Testing notes**
- **Never use arbitrary text as an expired sign-in.** Text that isn't a token makes the server fail
  with an error (500) instead of refusing the sign-in (403). The Tickets and My Tickets screens
  only send a person back to Login on a refusal, so with arbitrary text they stay where they are.
  AC1.6's last route would then fail for a reason unrelated to this feature (§5 Deferred, server
  defect).
  - AC1.2, AC2.2 and AC4.2 don't depend on the server's answer, but use the same setup for
    consistency.
- **Reload after every edit in DevTools.** The bar doesn't notice a Local Storage edit until the
  page is reloaded.
- **Internet access is needed.** The app's styling and the narrow-window menu are loaded from the
  internet. Offline, the app is unstyled and the menu doesn't open.

**Window widths.** The bar has two layouts, separated by a breakpoint at 992 px:
- **Wide (992 px and above; tested at 1280 px):** links sit in the bar itself.
- **Narrow (below 992 px; tested at 375 px):** the bar shows the name and a menu button, and the
  links appear only when the menu is opened.

**Bar contents.**
- **Clean Login bar:** "TicketApp" as **plain text** (not a link), plus one "Register" link.
- **Clean Register bar:** "TicketApp" as plain text, plus one "Login" link.
- **Signed-in bar:** today's bar, with "TicketApp" (a link), "Tickets", "My Tickets" and "Logout".

**Precondition D1 (all US4 criteria).** The build under test must include the sign-in fix described
in §7 (R7). Without it, US4 checks fail for a reason that has nothing to do with this feature.

### US1: Sign in from an uncluttered Login page
As an Agent or Supervisor arriving at the Login page, I want its top bar to show only the app name
and a way to register, so that the page is clean and I'm not offered links that lead nowhere.

**Acceptance criteria**
- **AC1.1**: Signed out, wide window, open the Login page. The bar is the clean Login bar and
  shows nothing else.
- **AC1.2**: With an expired sign-in, wide window, open the Login page. The bar is the clean Login
  bar. "Tickets", "My Tickets" and "Logout" are not shown.
- **AC1.3**: Signed in, wide window, reach the Login page by pressing Back right after signing in,
  and again by typing `http://localhost:4200/login`. Each time the bar is the clean Login bar, with
  no "Tickets", "My Tickets" or "Logout" (decision 1).
- **AC1.4**: On the Login page, in each sign-in state, "TicketApp" is not a link (decision 2):
  - Type some text into the **Username** field, then click "TicketApp". The text is still there
    (so the page didn't reload) and the page doesn't change.
  - Pressing Tab does not stop on "TicketApp".
  - Its text, colour and position look the same as today. The mouse pointer no longer turns into a
    hand over it, which is expected for plain text.
- **AC1.5**: Clicking "Register" in the Login page's bar opens the Register page.
- **AC1.6**: The Login page shows the clean Login bar however the person got there. Check each of
  these routes into it:
  - open the app's root address `http://localhost:4200/`
  - open `http://localhost:4200/#`
  - open `http://localhost:4200/#/login`
  - open `http://localhost:4200/login?x=1`
  - open `http://localhost:4200/login/`
  - signed out, open the Tickets, My Tickets or ticket-view address
  - signed in, click "TicketApp" on the Tickets screen
  - with an expired sign-in set up as in §3 (never arbitrary text), open the Tickets screen and be
    sent back to Login
- **AC1.7**: On the Login page, submit a wrong username or password. The existing error message
  appears and the bar is still the clean Login bar.
- **AC1.8**: "Tickets", "My Tickets", "Login" and "Logout" never appear in the Login page's bar, not
  even for a moment while the page loads.
  - **Why watching or recording the screen can't check this:** on first load, the app settles on
    its screen before the browser draws anything. A wrong bar would exist only for that instant,
    so it would never be visible (read from code).
  - **How it's checked:**
    1. Review the code against the bar-behaviour table in ADR-001 (*Resulting bar*).
    2. Run the page-content check described in ADR-001 §(e). It records every item added to the top
       bar while a page loads.
  - Run the check for each of: open `/` signed out; open `/tickets` signed out; open `/login`
    signed in; open `/login` with an expired sign-in. The record must contain none of those items.

### US2: Register from an uncluttered Register page
As a new person on the Register page, I want its top bar to show only the app name and a way back
to Login, so that the page is focused on registering.

**Acceptance criteria**
- **AC2.1**: Signed out, wide window, open the Register page. The bar is the clean Register bar and
  shows nothing else.
- **AC2.2**: Signed in, and separately with an expired sign-in, wide window, open
  `http://localhost:4200/register`. The bar is the clean Register bar, with no "Tickets",
  "My Tickets" or "Logout" (decision 1).
- **AC2.3**: On the Register page, in each sign-in state, "TicketApp" is not a link, as described
  in AC1.4. Use the **First name** field for the typed-text check.
- **AC2.4**: Clicking "Login" in the Register page's bar opens the Login page, which shows the
  clean Login bar.
- **AC2.5**: Register successfully, using a username that hasn't been used before (for example,
  include the date and time). Reusing a username fails as a duplicate. The person lands on the
  Login page with the clean Login bar.
  - A known script error appears after a successful registration (`MVP-SCOPE.md` § Deferred). It is
    out of scope and does not fail this criterion.
- **AC2.6**: On the Register page, submit an invalid form, or a username that already exists. The
  existing error message appears and the bar is still the clean Register bar.
- **AC2.7**: "Tickets", "My Tickets", "Register" and "Logout" never appear in the Register page's
  bar while it loads. Check this as in AC1.8, opening `/register` signed out and again signed in.

### US3: No unusable links for signed-out visitors elsewhere
As anyone who is signed out, I want the top bar never to offer "Tickets" or "My Tickets", so that
I'm not sent in a circle back to Login.

**Acceptance criteria**
- **AC3.1**: Signed out, open an address that shows no screen, such as
  `http://localhost:4200/unknown` or `http://localhost:4200/Login` with a capital L. (Addresses are
  case-sensitive, so `/Login` matches no screen; this was read from the code.) The bar shows
  "TicketApp" (a link, as today), "Login" and "Register", and no "Tickets" or "My Tickets"
  **(default, OQ3)**.
  - Existing behaviour, read from code and not seen in a browser; not a defect here:
    - on first load, the address bar may change to `http://localhost:4200/`
    - clicking "TicketApp" on this blank page may then move to Login without reloading
- **AC3.2**: Signed out, move from Login to Register and back to Login using the bar. "Tickets" and
  "My Tickets" never appear.

### US4: The signed-in bar on other screens, and Logout, stay as today
As a signed-in Agent or Supervisor, I want the top bar on the ticket screens and Logout to behave
exactly as they do now, so that my daily work is unaffected. Precondition D1 applies to every
criterion here.

**Acceptance criteria**
- **AC4.1**: Signed out, sign in on the Login page. The Tickets screen opens and, without a page
  refresh, the bar becomes the signed-in bar, with no "Login" or "Register".
- **AC4.2**: With an expired sign-in, sign in again on the Login page. The result is the same as
  AC4.1.
- **AC4.3**: Signed in, the bar on Tickets, My Tickets and the ticket view is unchanged. Compare
  before/after screenshots at 1280 px, and at 375 px with the menu closed and again with it open:
  same items, same order, same look.
  - Take the "before" screenshots **before the change merges** (Story 1 in ADR-001). They can be
    taken now, because the bar is still today's. Later, the original bar can be recovered from
    `master`.
- **AC4.4**: Signed in, "Tickets" and "My Tickets" open their screens as today. On Tickets,
  My Tickets and the ticket view, "TicketApp" is still a link and behaves as today: it reloads the
  app and lands on Login, which now shows the clean Login bar (AC1.3, AC1.6).
- **AC4.5**: Signed in, click "Logout". The Login page opens and, without a page refresh, shows the
  clean Login bar.
- **AC4.6**: Signed in, and separately with an expired sign-in, open
  `http://localhost:4200/unknown`. The bar is today's signed-in bar **(default, OQ8)**.

### US5: Getting to the remaining link is no harder than today
As someone on the Login or Register page, I want to reach the one remaining link on a small window
and with the keyboard, at least as easily as today. This is a no-regression check; the intent does
not ask for any accessibility improvement.

**Acceptance criteria**
- **AC5.1**: Narrow window (375 px), any sign-in state. The Login page's bar shows the name and the
  menu button. Opening the menu shows only "Register", and clicking it opens the Register page. The
  Register page works the same way, with "Login" in the menu (decision 3).
- **AC5.2**: Narrow window, any sign-in state, on Login and Register. "Tickets", "My Tickets" and
  "Logout" appear neither in the bar nor in the opened menu.
- **AC5.3**: Keyboard only, any width. Tab reaches the remaining link (in a narrow window, by
  opening the menu button with Enter first), and Enter opens the other page, as it does today.
  Focus is shown the way the browser shows it today; no new focus styling is required.

## 4. Requirements

**Functional**
- **FR1**: Whenever the Login screen is showing, the bar is the clean Login bar, in every sign-in
  state and however the person arrived. (AC1.1–AC1.8; decision 1)
- **FR2**: Whenever the Register screen is showing, the bar is the clean Register bar, in every
  sign-in state. (AC2.1–AC2.7; decision 1)
- **FR3**: On Login and Register, "TicketApp" is plain text, not a link. Everywhere else it stays a
  link that behaves as today. (AC1.4, AC2.3, AC4.4; decision 2)
- **FR4**: When the person is signed out, "Tickets" and "My Tickets" are never shown, on any screen
  or at any width. (AC1.1, AC2.1, AC3.1, AC3.2, AC5.2)
- **FR5**: Signed out, on any address that is neither Login nor Register, the bar shows "TicketApp"
  (a link), "Login" and "Register", as today. **(default, OQ3)** (AC3.1)
- **FR6**: Signed in or with an expired sign-in, the bar is exactly today's signed-in bar on every
  screen other than Login and Register, and on an address the app doesn't recognise
  **(default, OQ8)**. (AC4.1–AC4.4, AC4.6; decision 1)
- **FR7**: Logout still lands on the Login page, which shows the clean Login bar. (AC4.5)
- **FR8**: The bar changes straight away, without a page refresh, after sign-in, after Logout, and
  when moving between screens. (AC1.5, AC2.4, AC4.1, AC4.5)
- **FR9**: Moving between Login and Register stays as quick as today. In a wide window that is one
  click. In a narrow window it is opening the menu, then one click. (AC1.5, AC2.4, AC5.1)
- **FR10**: Nothing else changes:
  - the contents of the Login, Register and other pages
  - how "TicketApp" looks, apart from the pointer change in AC1.4
  - what "TicketApp" does on screens other than Login and Register
  - when the bar collapses into the menu (decision 3)

**Non-functional**
- **NFR1 (keyboard, no regression)**: The remaining link can still be reached with Tab and opened
  with Enter, as today. No new focus styling is required. (AC5.3)
- **NFR2 (window widths, no regression)**: The bar keeps its two layouts either side of the 992 px
  breakpoint. Below it, the remaining link sits inside the existing menu (decision 3). It is tested
  at 1280 px and at 375 px. (AC5.1, AC5.2)
- **NFR3 (look)**: The clean bars look like today's bar: dark background, same height, colours and
  font, and the name in the same place. The intent asks for "the same treatment" on both pages,
  not a redesign. The PRD's intended visual reference is today's bar, as captured in the AC4.3
  "before" screenshots; no separate design file exists. Confirming that reference is ADR-001's
  ADR-Q3, owned by DuoSanura (ADR-001 § Open questions).
- **NFR4 (no flash)**: Items that should be hidden must not appear even briefly while a page
  loads, as checked by the method in AC1.8 (a code review plus the page-content check).
  (AC1.8, AC2.7)
- **NFR5 (contrast, no regression)**: Link text is no lower in contrast than today. Raising it to
  WCAG 2.1 AA is not part of this PRD (OQ5).

## 5. Scope

**MVP (this PRD)**: FR1–FR10 and NFR1–NFR5. Login and Register show the clean bar in every sign-in
state, with "TicketApp" as plain text. Signed-out visitors never see "Tickets" or "My Tickets".
Every other screen keeps today's signed-in bar, and Logout keeps landing on Login.

**Automated tests: out of scope (OQ6, accepted by DuoSanura on 2026-10-21).** Verification is manual, in a browser, against
the acceptance criteria. Nothing currently tests the bar automatically: its three unit tests
already fail while being set up, as do all 11 client unit tests (`CLAUDE.md` § Commands).
Repairing them is its own task, already listed in `MVP-SCOPE.md` § Deferred. `testing.md` says no
change ships untested, so this exception needed explicit approval, which **DuoSanura gave on 2026-10-21 (OQ6).**

**Deferred: known gaps left as they are.** Mirror these rows in `MVP-SCOPE.md` § Deferred when this
PRD is approved, so that QA doesn't file them as defects.

| Gap | Why deferred | Revisit |
|---|---|---|
| **Expired sign-in on screens other than Login and Register.** For example, the ticket view keeps showing the signed-in bar and doesn't send the person to Login. | Originator decision 1: only Login and Register are in scope. | When sign-in expiry is raised as its own intent |
| **Server defect: an `x-access-token` that isn't a token gets a 500, not a 403.** Because of the error status, Tickets and My Tickets don't return the person to Login. Verified 2026-10-20 by running `jwt.decode` on the committed jsonwebtoken 8.5.1 (`server/authentication.js`); not seen in a browser. | A server defect, outside this PRD (no server change is in scope). Listed so QA doesn't file it against this feature. Testers avoid it with the §3 setup. | When a hardening slice is planned |
| **The bar's link contrast is below WCAG 2.1 AA** (about 4.2:1, calculated from the UI kit's default colours and not measured; AA needs 4.5:1) | Already true today, and not made worse. Fixing it for the clean bars alone would break NFR3. It needs a decision covering the whole bar. | An accessibility pass over the whole app (OQ5) |
| **Several tabs open.** Signing in or out in one tab doesn't update another tab's bar until the person interacts with that tab or moves screens there. | Existing behaviour, not raised by the intent. Accepted, not a defect. | If raised as its own intent |
| **Narrow window: the opened menu stays open after moving to another page** (read from code, not reproduced) | Existing behaviour that applies to every bar link (decision 3 keeps the collapse as it is). Accepted, not a defect. | If raised as its own intent |

**Explicit non-goals: deliberate decisions.** Mirror these in `MVP-SCOPE.md` § Explicit non-goals
when this PRD is approved.

| Not doing | Decided by |
|---|---|
| Sending a signed-in person who opens Login or Register on to their tickets | INT-001 doesn't ask for it; decision 1 chose the clean bar instead |
| Changing what the Login and Register pages contain (for example, the "Bootstrap 4 Login Form" heading, or links inside the forms between Login and Register) | INT-001 § Constraints |
| Changing what "TicketApp" does on screens other than Login and Register | Decision 2 |
| Changing when the bar collapses into the menu on narrow windows | Decision 3 |
| Removing the top bar from the Login page entirely, as the intent's title first suggested | INT-001 § Proposed outcome: the originator chose to keep the name and a "Register" link |

### Consequences the product owner must see

These follow from decision 1, combined with decision 2 (the name stays a link on other screens):

1. **A signed-in person who reaches Login or Register sees no "Tickets", "My Tickets" or "Logout".**
   Common ways to get there: pressing **Back** straight after signing in, clicking **"TicketApp"**
   on any ticket screen, a typed address, or a bookmark. From that page the only ways back to their
   tickets are signing in again, pressing Back, or typing an address.
2. **The Login page no longer shows that someone is still signed in.** On a shared computer, a
   person who sees the clean Login page may think they are signed out. Their sign-in actually
   stays usable for up to 50 minutes, and Login offers no Logout. To sign out they have to go back
   to a ticket screen first.
3. **The intent said logged-in users "should notice nothing".** That now holds on every screen
   except Login and Register.

## 6. Success metrics

The app records no usage analytics, and the API's request log doesn't capture page views or link
clicks. For example, clicking "Tickets" while signed out never reaches the server. So usage-based
measures can't be taken without adding tracking, which this PRD doesn't propose. Every metric
below is checked in a browser during QA, in the sign-in states defined in §3, not only on a fresh
browser profile.

| Metric | Baseline (today, read from code) | Target | How measured |
|---|---|---|---|
| Items in the Login page's bar, wide window | 5 signed out; 4 signed in or expired | 2 in every state | AC1.1–AC1.3 |
| Items in the Register page's bar, wide window | 5 signed out; 4 signed in or expired | 2 in every state | AC2.1, AC2.2 |
| Bar links on Login or Register that lead nowhere useful (to a page the person can't use, or to the page they're on) | Signed out: 4 on Login (TicketApp, Tickets, My Tickets, Login) and 3 on Register (Tickets, My Tickets, Register). Expired sign-in: 3 on Login (TicketApp, Tickets, My Tickets) | 0 in every state | AC1.1–AC1.4, AC2.1–AC2.3 |
| **Arrival paths to Login that show the clean bar:** (a) fresh browser; (b) after Logout; (c) returning with an expired sign-in; (d) sent back from Tickets or My Tickets on expiry; (e) still signed in, via Back, a typed address or a bookmark; (f) clicking "TicketApp" on another screen | 0 of 6 | 6 of 6 | AC1.1–AC1.3, AC1.6, AC4.5 |
| Steps to move from Login to Register, and back | Wide: 1 click each way. Narrow: open menu, then 1 click | Unchanged | AC1.5, AC2.4, AC5.1 |
| Differences in the signed-in bar on Tickets, My Tickets and the ticket view | n/a | 0 (before/after screenshots at 1280 px and 375 px) | AC4.3 |
| Logout lands on Login | Yes | Yes, with the clean bar | AC4.5 |
| Originator acceptance | n/a | DuoSanura confirms in review that the Login page reads as "clean and focused on signing in" in the browser they normally use, not only in a fresh profile | PRD review, then demo |

**Build guardrail**: the client build still succeeds. That is the only automated signal for this
feature. Client unit tests must not get worse than today's 11 of 11 failing, but that says nothing
about the bar, whose tests fail before they reach it.

## 7. Risks and open questions

**Open**

| # | Question | Owner | Current position |
|---|---|---|---|
| OQ3 | Signed out, on an address that shows no screen: which items should the bar show? | PM default | "TicketApp" (link), "Login" and "Register": today's bar without Tickets and My Tickets (FR5, AC3.1). Low impact, because such pages are blank today. |
| OQ5 | Should the bar's link contrast be raised to WCAG 2.1 AA (today about 4.2:1)? | Product owner | Deferred (§5). Already true today and not made worse here. |
| OQ6 | Can this change ship verified by manual browser checks only, without repairing or adding automated tests for the bar? | DuoSanura (product owner), with Tech Lead | **Default: yes, out of scope** (§5). The Tech Lead supports this (ADR-001 §(e), which also gives a fallback). It needs an explicit exception to `testing.md`. **Resolved 2026-10-21: DuoSanura accepted the default** (manual browser checks only; this is the explicit exception to `testing.md`). No longer blocking. |
| OQ7 | Decision 1 says screens other than Login and Register "keep today's bar". I read that as the **signed-in and expired** states. For signed-out visitors, the intent's own outcome still applies ("no Tickets or My Tickets links are shown to someone who isn't logged in"; FR4, FR5). | DuoSanura | Confirm at review. Low impact: signed out, the only such screens are unrecognised addresses and another tab after Logout (§5 Deferred). |
| OQ8 | **Signed in, or with an expired sign-in, on an address the app doesn't recognise** (a blank page): which bar? Raised as ADR-001's ADR-Q1. | DuoSanura | **Default: today's signed-in bar**, unchanged ("TicketApp" link, Tickets, My Tickets, Logout; FR6, AC4.6). This is consistent with decision 1 ("other screens keep today's bar") and the ADR's assumption. **Resolved 2026-10-21: DuoSanura accepted the default.** Low impact: such pages are blank today. |

**Resolved by the originator (decisions in /prd review, 2026-10-20)**

| # | Question | Resolution |
|---|---|---|
| OQ1 | What bar does a signed-in person see on Login or Register? | The clean bar (decision 1). See §5, *Consequences the product owner must see*. |
| OQ2 | What bar does a person with an expired sign-in see on Login? | The clean bar on Login and Register (decision 1). Other screens are deferred (§5). |
| OQ4 | Where does the remaining link go on narrow windows? | Inside the existing menu, as today (decision 3). |

**Risks**

| # | Risk | Owner | Response |
|---|---|---|---|
| R1 | A change to the shared bar could accidentally alter the signed-in bar on other screens. | Implementer / QA | US4, plus before/after screenshots taken before the change merges (AC4.3). |
| R2 | Nothing tests the bar automatically, so all verification is manual. | QA | QA cases derived from this PRD (`/write-qa-cases`), and a browser walk-through of every acceptance criterion in every sign-in state before sign-off. See OQ6. |
| R3 | The intent's title ("should not be present") reads differently from the agreed outcome (keep the name and a Register link). | PM | §5 records the rejected option. |
| R4 | The intent is still `draft`. If the product owner changes it before merging, this PRD must be revised. | Product owner | Hold at `Draft` until the intent branch is merged. **Done: merged in PR #54; PRD approved by DuoSanura on 2026-10-21.** |
| R5 | On narrow windows, the menu button needs a UI-kit script loaded from the internet (component-map.md § Runtime components). Offline, the menu doesn't open. | n/a | Accepted: already true today for every bar link. Internet access is a testing prerequisite (§3). |
| R6 | Testers may report the deferred gaps in §5 as defects in this feature. | PM | Mirror the §5 rows into `MVP-SCOPE.md` on approval. |
| R7 | **Dependency D1: an uncommitted fix.** On `master`, after signing in, the app keeps sending an empty sign-in until the page is refreshed. The server rejects those requests, and the Tickets screen sends the person back to Login with their sign-in still held. So AC4.1, AC4.2 and every US4 check done without a refresh fail on `master`, for a reason unrelated to this feature. The fix exists only as an uncommitted change in a working copy (`clientApp/src/app/token-interceptor.service.ts`). With this PRD, the symptom changes from bouncing to a signed-in-looking Login page to bouncing to a clean Login page, so a failed sign-in may look like nothing happened. | Product owner / Tech Lead | The fix must be in the build QA tests (precondition D1, §3). ADR-001 §(d) sequences it as its own fix ahead of this feature. |
| R8 | **The bar will depend on which screen is showing, not only on sign-in state.** The edges: (a) first load, where the bar appears before the app has finished moving to its first screen (opening `/` and being taken to Login, AC1.6; a signed-out person sent away from Tickets, AC1.6); (b) unrecognised addresses, where there is no screen to go by (AC3.1, AC4.6); (c) different spellings of the Login address: a query string, a trailing slash, the `/#` left by the old "TicketApp" reload, `/#/login`, or a different case such as `/Login`. Any of these could show the wrong bar or add the wrong items for an instant. | Implementer / QA | Covered by FR1 ("whenever the Login screen is showing, however the person arrived"), AC1.6, AC1.8, AC2.7, AC3.1 and AC4.6. |
| R9 | **Staying current without a refresh.** The bar and the check that guards the ticket screens both read sign-in state from the same place. FR8 works today because the bar re-reads that state on every update. Anything that reads it only once would break FR8, the same mistake as the D1 bug (`CLAUDE.md` § Things Claude gets wrong). | Implementer / QA | AC4.1, AC4.2 and AC4.5 are checked without a page refresh. |
| R10 | **False defects from a wrong test setup.** A tester who uses arbitrary text as an "expired" sign-in gets a server error, no return to Login, and files a defect against AC1.6. | QA | The §3 setup and testing notes; the server-defect row in §5 Deferred. |

## 8. Traceability

- **Intent**: `INT-001`, [intent/001-login-page-nav-bar.md](../../../intent/001-login-page-nav-bar.md)
  (status `draft`). It is refined, not rewritten, by originator decisions 1–3 (/prd review,
  2026-10-20).
- **Spec**: none. No `SPEC-NNN` governs the top bar (`.claude/planning/spec/` holds only its
  README).
- **ADR**: [ADR-001](../adr/ADR-001-login-page-nav-bar.md) (Proposed). AC1.8 and AC2.7 refer to its
  *Resulting bar* table and §(e) check. The frontmatter `implemented_by` is set by `/adr`.
- **Baseline scope**: [MVP-SCOPE.md](../../../MVP-SCOPE.md). The current slice is the Phase 1
  as-built baseline. This PRD would start the next slice, so add its row when approved, along with
  the §5 Deferred and Explicit non-goals rows. It neither contradicts nor adopts any existing
  Deferred item or Open question there.
- **Dependency D1**: the uncommitted fix to `clientApp/src/app/token-interceptor.service.ts` that
  reads the sign-in on every request (R7). On `master`, the sign-in is read only once.
- **Current-behaviour references**:
  - [component-map.md](../architecture/component-map.md) § Screens and § Browser storage contract
  - [layer-map.md](../architecture/layer-map.md) § Client
  - `clientApp/src/app/app.component.html`
  - `clientApp/src/app/auth.service.ts`
  - `clientApp/src/app/app-routing.module.ts`
  - `clientApp/src/app/auth.guard.ts`
  - `clientApp/src/app/tickets/tickets.component.ts`
  - `clientApp/src/app/my-tickets/my-tickets.component.ts`
  - `clientApp/src/index.html`
  - `server/authentication.js`
  - `server/middleware/login.js` (50-minute sign-in)
- **RFC**: not expected. This is a small, single-owner change.
- **Test plan**: `.claude/planning/qa/test-plans/TP-001-login-page-nav-bar.md` (not yet created)
