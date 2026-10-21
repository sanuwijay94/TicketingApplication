# UI Quality

The definition of done for any UI feature. A feature is **not complete** until every applicable item below is satisfied **and verified in a browser** — not just when tests and lint pass. Most UI bugs ship because the code compiled and the unit test passed, but nobody opened the page.

This rule exists because of a concrete Phase 1 bug pattern: missing states, hover-only affordances, dead controls, broken create/edit parity, stale data after mutations, and raw markup leaking into editors. Every item here maps to a real bug that reached developers.

## Stack is not optional (per ADR-008)

- **Components**: use **Bootstrap 4**. Do not hand-roll buttons, selects, dialogs, menus, snackbars, text fields — Bootstrap 4 provides accessible, consistent versions. Reinventing them is the root cause of the affordance/consistency bug class.
- **Data fetching & cache**: use **Angular HttpClient services**. Do not hand-roll `useState`+`useEffect`+`fetch`. Angular HttpClient services gives tag-based cache invalidation (so data refreshes after a mutation), request dedup, and loading/error flags for free.
- **Forms**: **React Hook Form + Mongoose** (shared schemas from `../models/`).
- **Types**: import response/request types via `z.infer` from the shared schema — never hand-write an interface for an API shape (see [api-contracts.md](api-contracts.md)).

## Always — every interactive feature must handle all states

- **Loading state** — skeleton or spinner, never a blank screen
- **Empty state** — explicit "No X yet" message, never just nothing (e.g., "No description" when description is absent)
- **Error state** — a visible, recoverable error, never a silent failure or a thrown white screen
- **Success feedback** — every create/update/delete action shows a notification (toast/snackbar) on success **and** on failure. A wired toast that nobody calls is not feedback.

## Always — affordances and controls

- **Affordances are visible without hover.** An edit/delete/action control must be discoverable without mousing over the element. Hover-only reveal is a bug.
- **No dead controls.** If an action is blocked (e.g., comment edit window expired, insufficient permission), the trigger is hidden or disabled with a reason — never shown-then-rejected.
- **Correct contextual copy.** Buttons/labels match the action (a description editor's submit button is not labelled "Post comment"). Reused components must have their copy parameterised, not copied.

## Always — data integrity

- **Round-trip fidelity.** What is saved, loaded, and re-edited must be consistent. Rich content (mentions, formatting) must render in the editor as editable UI, never as raw markup (`<span data-mention-id=...>` in a textarea is a bug). Create and edit flows of the same entity share the same editor component so they cannot diverge.
- **Create/edit feature parity.** If a capability works in the create flow (mentions, validation, formatting), it must work identically in the edit flow. Build one component used by both.
- **Refresh after mutation.** After a successful create/update/delete, the affected views reflect the change without a manual page reload. With Angular HttpClient services this means correct `providesTags`/`invalidatesTags`.
- **Respect server concurrency.** Honor `ETag`/`If-Match` where the API uses it; surface conflicts via the conflict dialog. Operations that should not bump an entity's ETag must not (e.g., comment CRUD must not change the ticket ETag).

## Always — presentation details

- **Dates show time when relevant** (created/updated timestamps show date **and** time, per design).
- **No large unexplained empty space** — panels are laid out to use their space or constrained to content width.
- **Configurable behaviour is configurable**, not hard-coded. If product says a rule (e.g., comment edit window, whether editing is even allowed) may vary by deployment, it reads from config — both the feature toggle and its parameters.

## Always — accessibility & interaction

- Keyboard navigation works for every interactive element; focus is managed on open/close of dialogs and drawers
- WCAG 2.1 AA contrast for text and interactive states
- Follow the design file for the feature (see [ui-designs.md](ui-designs.md)); if a state is missing from the design, apply a sensible default and flag it in the PR

## Browser verification (mandatory before "done")

Before reporting a UI feature complete, run the app and confirm by observation:

1. Start the dev server (`npm dev:ui`, or the project's documented command)
2. Walk the full user flow described in the PRD's UX Acceptance Criteria
3. Observe **every** state listed above (force the empty, loading, and error states — don't assume them)
4. Capture a screenshot of each state and include them in the PR / report
5. If you cannot run the app, **say so explicitly** — do not claim the feature works

## Never

- Report a UI feature complete based only on passing unit tests
- Hand-roll a component Bootstrap 4 already provides
- Hand-roll data fetching when Angular HttpClient services fits
- Ship a happy-path-only screen (no empty/loading/error states)
- Leave a control visible that cannot perform its action
- Let raw API markup leak into an editable field
- Hard-code a value product has said is configurable

## Ask First

- Introducing a new Bootstrap 4-incompatible UI dependency
- Deviating from a design file (surface design-vs-spec conflicts in the PR — see [ui-designs.md](ui-designs.md))
- Adding a new global state slice vs. local component state

## Reviewer checklist (paste into PR description for UI changes)

```
UI quality (ui-quality.md):
- [ ] Loading / empty / error / success-toast states all implemented and screenshotted
- [ ] Affordances visible without hover; no dead controls
- [ ] Create & edit flows share one component (feature parity)
- [ ] Round-trip verified (save → reload → re-edit unchanged; no raw markup in editors)
- [ ] Data refreshes after mutation (Angular HttpClient services cache tags correct)
- [ ] ETag/If-Match respected; unrelated entities' ETags unchanged
- [ ] Dates show time where relevant; copy correct for context
- [ ] Keyboard + focus + WCAG AA contrast checked
- [ ] Built with Bootstrap 4 + Angular HttpClient services (no hand-rolled primitives / fetch)
- [ ] Verified in a browser (screenshots attached)
```
