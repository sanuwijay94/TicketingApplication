---
allowed-tools: Bash(git:*), Bash(node:*), Bash(grep:*), Bash(ls:*), Read, Glob, Grep, Write
description: Generate a Knowledge Transfer (KT) document for a commit, PR, or date range — explains what changed, why, and how, so others can understand without a live session
argument-hint: '[commit-sha | PR-number | branch-name | "since <date>" | empty = last commit]'
---

Generates a self-contained KT document for a set of code changes. The document is written for a developer who was NOT involved in the change — it explains what was changed, the reasoning behind key decisions, how the new code works, and what they need to watch out for.

Output is written to `docs/kt/KT-<slug>-<date>.md` and printed in the conversation.

## Input

$ARGUMENTS

Resolve the change set:
- Empty → last commit on current branch
- Commit SHA (full or short) → that single commit
- `PR-<number>` or `#<number>` → all commits in that PR (use `gh pr view <number> --json commits`)
- Branch name → commits ahead of `main` (`git log main..<branch>`)
- `"since <date>"` → commits since that date (`git log --since="<date>"`)

## Current State

- Branch: !`git branch --show-current`
- Last 5 commits: !`git log --oneline -5`

---

## Workflow

### Phase 1: Collect the change set

Get the list of commits and the full diff.

```bash
# Example for last commit:
git log --oneline -1
git show --stat HEAD
git diff HEAD~1 HEAD
```

For multiple commits:
```bash
git log --oneline <range>
git diff <base>..<tip> --stat
git diff <base>..<tip>
```

Extract from the diff:
- List of changed files (group by package: backend / frontend / contracts / infra)
- Which layers changed (domain / application / infrastructure / presentation)
- Whether contracts changed
- Whether tests were added or modified
- Whether docs / ADRs changed

### Phase 2: Understand WHY — commit messages + ADR cross-reference

Read each commit message in full:
```bash
git log --format="%H%n%s%n%b%n---" <range>
```

Search ADRs for referenced decisions:
```bash
grep -rl '<keyword-from-diff>' .claude/planning/adr/ 2>/dev/null | head -5
```

If the change reverses or extends an existing ADR, note it. Never rewrite the ADR — only reference it.

### Phase 3: Read the key changed files (minimum scope)

For each changed file that is NOT a test or config file:
- Read only the changed function/class/method block, not the whole file
- Focus on: what the code does NOW, what it did BEFORE (from the diff), and why the change was made
- Use `git show HEAD:<file>` to read the current state of a file

Limit to the 10 most significant files. Skip generated files (`openapi.json`, `*.d.ts`, migration files).

### Phase 4: Identify impact on the rest of the codebase

Check what other code is affected by the change:

```bash
# Who imports the changed module?
grep -r '<changed-symbol>' packages/ --include="*.ts" -l | grep -v node_modules | grep -v dist | head -20
```

Cross-reference `docs/change-impact-matrix.md` if the changed file is listed there.

### Phase 5: Write the KT document

Create `docs/kt/KT-<slug>-<YYYY-MM-DD>.md` (create `docs/kt/` if it doesn't exist).

Use this exact structure:

```markdown
# KT: <short title of the change>

**Date**: <YYYY-MM-DD>
**Author**: <git author name from commits>
**Commits**: <list of commit SHAs with one-line messages>
**Affected packages**: backend | frontend | contracts
**Related ADRs**: ADR-NNN (if applicable)

---

## 1. Summary

<2–4 sentences. What was changed and why. Written for someone who has never seen this code. No jargon without definition.>

---

## 2. What Changed

### Changed files
| File | What changed |
|------|-------------|
| `<path>` | <one-line description of the change> |

### Before vs After

For each significant change, show a before/after explanation (NOT a raw diff — a plain-English description with the key code snippet):

**`<file>:<line>`**
- **Before**: <what it did / what was missing>
- **After**: <what it does now>
- **Why**: <the reason — bug, spec requirement, design decision>

---

## 3. How It Works Now

<Step-by-step walkthrough of the new behaviour. Use numbered steps. Reference file:line for each step so the reader can jump to the code. This is the core of the KT — explain the flow, not just the files.>

Example format:
1. **Request arrives** — `TicketController.updateCustomFields()` (`server/.../ticket.controller.ts:142`) receives the PATCH request
2. **Validation** — `ZodValidationPipe(UpdateCustomFieldsSchema)` validates the body against the shared schema
3. ...

---

## 4. Key Design Decisions

<Bullet list of non-obvious choices made in this change. For each decision, state: what was chosen, what the alternatives were, and why this was picked. If an ADR governs it, reference it instead of re-explaining.>

- **Chose X over Y** — reason. See ADR-NNN.
- **Did NOT implement Z** — reason (out of scope / deferred / simpler alternative chosen).

---

## 5. Impact on Existing Code

<What other parts of the codebase are affected. What callers / consumers need to know. Any behaviour changes a developer might notice when working in adjacent areas.>

- `<module>` — <what is different for someone working in this module now>
- No changes to public contracts (or: "Contract change — `<schema>` adds `<field>` as optional")

---

## 6. Testing

<How to verify the change works. List:>
- Manual test steps (browser or API call)
- Which automated tests cover it (`<test file>`)
- Any edge cases to check

---

## 7. Gotchas & Things to Watch Out For

<Short list of non-obvious things that would trip up a developer touching this area in the future.>

- <gotcha 1>
- <gotcha 2>

---

## 8. Glossary (if new terms introduced)

| Term | Definition |
|------|-----------|
| `<new term>` | <plain-English definition> |

*Omit this section if no new terms were introduced.*
```

---

## Quality Gates

- ✅ Every file:line citation is real — verified by reading the file, not from memory
- ✅ "Before vs After" section covers every non-trivial change in the diff
- ✅ "How It Works Now" is a numbered flow a new developer can follow step-by-step
- ✅ "Key Design Decisions" explains WHY, not just WHAT
- ✅ No raw git diffs pasted — everything translated to plain English
- ✅ ADRs referenced, never rewritten
- ✅ Document written for someone NOT involved in the change — no assumed context

## Never

- Paste raw diffs into the KT document — translate to plain English
- Write "refactored" or "cleaned up" without explaining what specifically changed
- Skip the "Gotchas" section — every change has at least one non-obvious implication
- Write from memory — every factual claim backed by a file read or git show
- Create the doc inside `.claude/` — KT docs belong in `docs/kt/` (reviewable by the whole team)
