---
allowed-tools: AskUserQuestion, Read, Glob, Bash(ls:*), Bash(git:*), Write
description: Capture an idea, request, or problem as intent/NNN-<slug>.md in the originator's own words — the Plan-stage artifact the rest of the SDLC starts from. No engineering vocabulary required.
argument-hint: '[a sentence or two describing the idea / problem — or nothing, and be interviewed]'
---

# /intent

Turn a conversation into `intent/NNN-<slug>.md`: a short, human-readable record of **what is
wanted, why, and under which constraints**, written in the words of the person who wants it.
This is the first committed artifact of the SDLC (`SDLC.md` → *Phase −1: Capture*). Everything
downstream — `/requirement-intake`, `/prd`, `/rfc`, `/adr`, `/implement` — reads it; nothing
downstream rewrites it.

The person you are talking to may not be an engineer. Do not ask for, suggest, or write
technical language. Ask the questions an analyst would ask, then write what they said.

## Current State

- Branch: !`git branch --show-current`
- Existing intents: !`ls intent/*.md 2>/dev/null | grep -v README || echo "None yet"`

## Starting point

$ARGUMENTS

If empty, open with: *"Describe the problem or idea in your own words — what can't you do
today, or what goes wrong? Who does it affect?"*

## Why this skill exists

Ideas used to wait for someone with time to write them up, and what reached engineering was
several handoffs removed from what the originator meant. `/intent` captures the idea once, at
source, in a form a product owner and an agent can both act on. The file — not a meeting — is
the handoff.

## Workflow

### Phase 1 — Interview until the idea is concrete

Ask one or two questions at a time via `AskUserQuestion`, in plain language. Cover, in roughly
this order, and stop as soon as each is answered:

1. **Problem** — what cannot be done today / what goes wrong; a concrete example of it happening
2. **Who is affected** — roles, teams, customers; roughly how often it bites
3. **What better looks like** — the observable outcome, not a feature list
4. **What is out of scope** — what they are *not* asking for
5. **Constraints** — anything that must stay true (policy, security, compliance, deadlines,
   things that must not change). "None that I know of" is a valid answer; record it as such.
6. **Open questions** — anything they could not answer, and who could

Reflect the answers back in a 3–4 line summary and ask whether it is right. Repeat until the
originator says yes. Do **not** propose solutions, architectures, or effort estimates — those
belong to later stages.

### Phase 2 — Write the file

1. Read `docs/templates/intent.md.template`.
2. Determine the next number: highest existing `intent/NNN-*.md` + 1, zero-padded to three
   digits (`001` if none).
3. Write `intent/NNN-<slug>.md` — slug is 2–5 kebab-case words from the title. Fill **every**
   section; where the originator had nothing to add, write what they said ("No constraints
   known") rather than leaving it blank or inventing content. `status: draft`.
4. Record `source` honestly: "conversation with <name>", a ticket id, an incident id, or a
   monitor run id when the intent was machine-filed.

Use the originator's words. Tidy grammar; do not translate into engineering terms.

### Phase 3 — Correct, then commit

1. Show the file and ask: *"Is there anything here I misunderstood?"* Apply corrections.
2. Commit on a branch named `intent/NNN-<slug>` with message `intent: <title>`. Suggest the
   originator (or you, on their behalf) open a PR. Tell them plainly: **the product owner
   accepts the intent by merging that PR** — merge is the approval; there is no separate
   sign-off step.
3. State the next step for whoever picks it up: `/requirement-intake <doc>` when a formal
   requirement document exists, otherwise `/prd intent/NNN-<slug>.md`; `/bug file` if it is a
   defect report.

## Output

```markdown
## Intent captured

**File**: `intent/NNN-<slug>.md` — draft, on branch `intent/NNN-<slug>`
**Summary**: <2–3 sentences in the originator's words>
**Open questions**: <count> — <who can answer them>

### Next
- Product owner: review and **merge to accept** (or close with a reason)
- Then: `/prd intent/NNN-<slug>.md` · or `/requirement-intake <doc>` · or `/bug file`
```

## Quality gates

- ✅ Every template section is filled from what the originator actually said
- ✅ The originator confirmed the summary and reviewed the written file
- ✅ No solution, architecture, estimate, or engineering vocabulary in the file
- ✅ `status: draft`; the merge — not this skill — is what makes it `accepted`

## Never

- Write the file before the originator has confirmed the summary
- Decide scope, priority, or feasibility — that is the product owner's and later stages' job
- Rewrite an `accepted` intent — corrections after acceptance go in the downstream artifact
- Ask the originator to use git, GitHub, or any tool; do the mechanics for them
