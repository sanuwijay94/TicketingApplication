# UI Designs

## Always

- Before `/implement` on any feature whose **touched zone** (in the feature issue body — the `ui.*` zone of the taxonomy in `IMPLEMENTATION-PLAN.md` §1) begins with `ui.`, read every file listed in that feature's `Design:` reference.
- Designs live under `design/phase-{n}/{feature-slug}.{ext}` — PNG, JPG, SVG, HTML (artifact), or `.jsx` (React prototype).
- Respect design tokens that will land in `themes/{name}.json` (Phase 4). For earlier phases, keep visual language consistent so tokens can be extracted later.
- Designs cover keyboard interaction, error / empty / loading states, and WCAG 2.1 AA contrast. If a state is missing, apply a sensible default and flag it in the PR.
- If a design file is still the **placeholder** (generated PNG that says "PLACEHOLDER"), halt and ask the human to provide the real design before generating UI.

## When design and spec disagree

- **Design wins** on visuals and interaction patterns.
- **RFC / PRD wins** on behaviour, contracts, validation, and security.
- Surface every disagreement in the PR description under `Design vs Spec resolutions:` — do not silently choose.

## Never

- Copy a `.jsx` artifact verbatim into the production codebase. Port the structure and interaction into the actual stack (React + Angular HttpClient services + Tailwind + Bootstrap 4) — design `.jsx` files are reference source, not vendored code.
- Hard-code colour values picked off a screenshot. Use existing tokens; if none exists, propose a token and put it in `themes/{name}.json`.

## Ask First

- A UI feature has no design file (placeholder still in place).
- The design implies a behaviour change beyond what the RFC describes (e.g., a new field, a new endpoint).
- The design implies tokens that don't exist yet (new colour, new spacing scale).
