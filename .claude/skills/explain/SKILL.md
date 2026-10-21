---
allowed-tools: Bash(node:*), Bash(git:*), Bash(grep:*), Bash(rg:*), Bash(ls:*), Read, Glob, Grep
description: Explain any file, function, domain concept, or piece of code in plain English — indexes and architecture docs first, source files second
argument-hint: '[file-path | class/function name | domain concept | "what is X" | "explain X"]'
---

Read-only explanation. Given any target — a file path, a symbol name, a domain concept, or a vague description — produce a plain-English explanation of what it is, what it does, and why it exists. No code changes.

Use this when you need to *understand* a thing in isolation — before `/investigate` (which traces a full flow) or `/impact-check` (which measures blast radius).

## Current State

- Branch: !`git branch --show-current`
- Architecture docs: !`ls .claude/planning/architecture/ 2>/dev/null || echo "none"`

## Explain Target

$ARGUMENTS

If empty, ask what to explain.

Accepts any of:
- A file path: `server/src/domain/ticketing/entities/ticket.ts`
- A class or function name: `TransitionTicketUseCase`, `ETag`, `WorkflowVersion`
- A domain concept from the glossary: `AssignmentRule`, `OutboxPattern`, `IdempotencyKey`
- A module group: `infra/messaging`, `features/saved-views`
- A vague description: `"explain how auth works"`, `"what is the outbox"`, `"what does the flow engine do"`

## Why This Skill Exists

Reading a file cold gives you its mechanics but not its meaning. Meaning lives in the maintained indexes — `docs/glossary.md` defines the term, `docs/feature-index.yaml` says which feature owns it, `.claude/planning/architecture/` says how the mechanism works, and `.claude/planning/spec/` says what it was *required* to do. This skill resolves the target through those first and reads raw source only when they are insufficient or the caller asks for line-level detail.

The distinction from sibling skills:
- `/explain` → "what is X, what does it do" — description-first, can be one file or one concept
- `/investigate` → "how does X work end-to-end, why does Y happen" — causal trace across all four layers
- `/impact-check` → "what breaks if I change X" — blast-radius enumeration

---

## Workflow

> **Navigate before you read (MANDATORY):** resolve location through the discovery ladder in [`.claude/rules/code-navigation.md`](../../rules/code-navigation.md) — feature index → glossary → architecture docs → targeted `rg`. Open raw source only for the minimum section the ladder points at, never a whole file.

### Phase 1: Resolve the target

Work the discovery ladder in order. **Always do this before reading any source file.**

```bash
# 1. Is it a domain term? The glossary gives the canonical definition + code mapping.
rg -n -i '<target>' docs/glossary.md

# 2. Which feature owns it? Entry points, contracts, and ADRs in one place.
rg -n -i -A 8 '<target>' docs/feature-index.yaml

# 3. Is the mechanism already documented?
rg -n -i '<target>' .claude/planning/architecture/

# 4. Where is it defined in code?
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Target>\b' server clientApp/src
```

If zero hits: broaden with a shorter fragment (`transition` instead of `TransitionTicketUseCase`).

If the target is a **"what should it do"** question, stop here and read the governing
`.claude/planning/spec/SPEC-NNN` instead — code answers what was built, never what was required.

### Phase 2: Establish context — layer, dependencies, dependents

For the resolved file, gather the surrounding context before explaining it:

```bash
# What layer does it live in, and what is that layer allowed to depend on?
rg -n '<filename>|<directory>' .claude/planning/architecture/layer-map.md

# What does it depend on? (its imports — read the import block only)
rg -n '^\s*(import|from|require|use)\b' <resolved-file>

# What depends on it? (the callers that give it its purpose)
rg -n "from ['\"].*<filename-without-ext>['\"]|\b<ExportedSymbol>\b" server clientApp/src -l
```

Dependents matter most: a thing's purpose is usually clearer from who uses it than from its own body.

### Phase 3: Check architecture docs for domain concepts

If the target is a domain concept (not just a utility file), cross-check for documented design decisions:

- For **domain entities / aggregates / value objects** → `Read .claude/planning/architecture/domain-model.md` (bounded contexts, ubiquitous language glossary)
- For **ports or integration patterns** → `Read .claude/planning/architecture/layer-map.md`
- For **binding architectural decisions** → search `.claude/planning/adr/` for the relevant ADR:
  ```bash
  grep -rl '<concept-keyword>' .claude/planning/adr/ | head -5
  ```
- For **domain terms** → `Read docs/glossary.md` and search for the term

### Phase 4: Read source only if graph is insufficient

The indexes and architecture docs cover ~80% of cases. Read source files when:
- The summary is too brief to answer the caller's specific question
- The caller asks for line-level detail ("show me the method", "what does the constructor check")
- The node has `complexity: complex` and the caller needs the full picture

Read the **minimum necessary**: a single method or constructor block, not the whole file.

```
Read <filePath> offset=<start-line> limit=<span>
```

If the node is a `class`, read only the constructor + one key method.
If the node is a `function`, read only that function's body.
If the node is a `file` and has `complexity: simple`, read the whole file.

---

## Output Format

```markdown
## Explanation: <target name>

### What it is
<One sentence. "X is a [type] that [primary responsibility]." No jargon without definition.>

### What it does
<3–6 bullet points covering the key responsibilities and behaviours. Plain English. Each bullet answers "so what?" — not just "it calls Y" but "it calls Y so that Z is enforced".>

### Where it lives
**Layer**: `<layer name>` — `<layer one-liner>`
**File**: `<filePath>`
**Complexity**: `<simple | moderate | complex>`

### Why it exists
<1–3 sentences on the design motivation. Why was this abstraction introduced? What problem does it solve that the simpler alternative (no abstraction, inline code, etc.) does not? Reference an ADR if one explains it.>

### How it connects
**Depends on** (it calls / imports):
- `<node-id>` — <one-line role in this context>

**Used by** (callers / importers):
- `<node-id>` — <one-line role in this context>

### Key things a new engineer should know
- <Non-obvious constraint, gotcha, or invariant that the code alone does not explain>
- <Naming trap, dual meaning, or related concept that is easy to confuse with this one>

### Related
- `/investigate <flow that uses this>` — for full end-to-end trace
- `/impact-check <filePath>` — to see what breaks if this changes
- ADR-XXX (`<title>`) — if a binding decision governs this
```

Omit any section that has nothing meaningful to say. Do not pad.

---

## Depth Modes

Adjust detail level based on the question phrasing:

| Phrasing | Depth |
|---------|-------|
| `"what is X"` / `"explain X"` | Standard — all sections above |
| `"briefly explain X"` / `"quick summary of X"` | Brief — What it is + What it does only |
| `"explain X in detail"` / `"deep dive on X"` | Detailed — add raw source excerpt, full edge list, all ADR cross-references |
| `"ELI5 X"` / `"explain X simply"` | Simple — plain language, no file paths, no layer names, analogy if helpful |

---

## Quality Gates

- ✅ Discovery ladder worked before any source file is opened
- ✅ Every factual claim backed by a graph node, architecture doc, or `file:line` — no assertions from memory
- ✅ "Why it exists" section references an ADR or architecture doc whenever one exists
- ✅ "Key things a new engineer should know" contains at least one non-obvious point (not just a restatement of the summary)
- ✅ Depth matches the phrasing of the question

## Never

- Read a source file before working the discovery ladder
- Explain from memory without reading the current source or graph
- Conflate similar concepts (e.g. `AssignmentRule` vs automation `Rule`, `ConditionTree` ADR-003 vs ADR-032, `ETag` on ticket vs workflow) — call out the distinction
- Write "it is responsible for" — say what it actually does
- Pad with generic descriptions that would apply to any file in any project
