---
# Written by the originator (with /intent). Plain language — no engineering vocabulary required.
id: INT-001
title: Nav bar should not be present in the Login page
author: DuoSanura
date: 2026-10-20
status: draft
source: conversation with DuoSanura
---

# Intent: Nav bar should not be present in the Login page

## Problem

When someone opens the app without being logged in, the dark bar at the top of the Login page
shows "TicketApp", "Tickets", "My Tickets", "Login" and "Register". "Tickets" and "My Tickets" are
links to pages the person can't use yet. "Login" is a link to the page they are already on. The
whole bar makes the login screen look cluttered; a login screen should be clean and focused on
signing in.

## Proposed outcome

On the Login page the top bar shows only the "TicketApp" name and a "Register" link. The Register
page gets the same treatment: the "TicketApp" name and a link back to Login. No "Tickets" or "My
Tickets" links are shown to someone who isn't logged in.

The first note said the bar should "not be present" on the Login page at all. When asked what
should be at the top instead, the originator chose to keep the name and a "Register" link, and
confirmed that reading.

## Affected users and systems

- **Users / roles:** anyone who opens the app without being logged in — Agents and Supervisors
  arriving at the Login page, and new people on the Register page. Logged-in users should notice
  nothing.
- **Systems:** the Login page, the Register page, and the top bar that appears at the top of the
  app's pages.

## Constraints

- After login, the top bar must stay exactly as it is today: "Tickets", "My Tickets" and "Logout".
- Logging out must still take the person back to the Login page.
- No other rules, policies or deadlines known.
- Not asked for: changes to any other screen, or to what the pages themselves contain.

## Open questions

None raised by the originator.
