# Code Navigation

How to locate code before reading it. This rule replaces the knowledge-graph layer: the goal is
unchanged — **never open a file until you know why that file** — but the mechanism is plain search
plus maintained indexes instead of a pre-computed graph.

## The discovery ladder (binding order)

Stop at the first rung that answers the question. Going straight to rung 5 is how a session burns
context re-deriving what an index already records.

| # | Rung | Use it for |
|---|------|-----------|
| 1 | **`docs/feature-index.yaml`** | "Which files own feature X?" — maps each feature to its entry points, aggregates, contracts, and ADRs. |
| 2 | **`docs/glossary.md`** | "What does this domain term mean, and what is it called in code?" Look up the term *before* assuming its meaning. |
| 3 | **`.claude/planning/architecture/*.md`** | "How does this mechanism work?" — layer map, component map, domain model, ER diagram. |
| 4 | **Targeted search** (`rg`) | "Where is this symbol defined / used?" Search by symbol, not by guess. See the recipes below. |
| 5 | **Raw source** | Only when 1–4 cannot answer. Read the **minimum section** — one function or class block, not the whole file. |

**Specification questions skip to the spec.** "What *should* it do" (required behaviour, validation,
rules) is answered by `.claude/planning/spec/SPEC-NNN`, never by rungs 1–5. Answering a
specification question from code tells you what was built, never what was required.

## Search recipes

```bash
# Where is a symbol defined?
rg -n --type-add 'src:*.{js,ts}' -t src '\b(class|interface|function|const|def|type|struct)\s+SymbolName\b'

# Who calls / imports it? (the blast radius)
rg -n --hidden -g '!node_modules' -g '!dist' '\bSymbolName\b' | rg -v '(spec|test)\.' 

# Which tests cover it?
rg -ln 'SymbolName' test/ tests/ 2>/dev/null

# What does this module depend on?
rg -n '^\s*(import|from|require|use)\b' path/to/file

# Find the layer a file belongs to
rg -n 'path/to/file' .claude/planning/architecture/layer-map.md
```

Prefer `rg` over `grep -r` (respects ignore files, far faster) and over `find` + `cat`.

## Blast radius before change (binding)

Before editing any exported symbol, enumerate its dependents — this is what `/impact-check` does.
Never change a shared symbol on the strength of the file you happen to be reading.

1. Dependents — rung 4, "who calls it"
2. Tests that will break — rung 4, "which tests"
3. Contracts affected — `docs/feature-index.yaml` → the feature's contract entry
4. Layer legality — `.claude/planning/architecture/layer-map.md`

## Keeping the indexes honest

Rungs 1–3 are only worth trusting if they are current. They are **living docs** — update them in
the same PR as the change ([documentation.md](documentation.md)).

- `/features` regenerates `docs/feature-index.yaml`
- `/knowledge-update` syncs `docs/glossary.md`, the feature index, and the architecture docs after a change set
- A wrong index is worse than no index: if you find drift while navigating, fix it before moving on

## Always

- Name the rung that got you to a file before you read it
- Read the minimum section, not the whole file
- Use maintained indexes over ad-hoc greps when both would answer

## Never

- Open a file "to see what's in it" — that is rung 5 without rungs 1–4
- Answer a "what should it do" question from source code
- Trust an index you just saw contradicted without fixing it

## Ask First

- Adding a code-intelligence tool (graph builder, LSP index, embeddings search) — it changes the
  ladder above and belongs in an ADR
