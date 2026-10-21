# Architecture — living mechanism docs

**Living documents.** How the system works *right now*. When a mechanism changes, the doc changes
in the same PR as the code (`.claude/rules/documentation.md`). Rung 3 of the discovery ladder
(`.claude/rules/code-navigation.md`) — several skills read these to judge whether a change is legal.

**architecture = how it works · `../spec` = what it must do · `../adr` `../prd` `../rfc` = why we chose it.**

| File | Holds | Written by |
|---|---|---|
| `layer-map.md` | layer structure, allowed-dependency matrix, port/adapter registry — **write this first**; empty means layer checks silently pass | hand, on adoption (`docs/PORTING.md` Tier 3) |
| `domain-model.md` / `domain-<slug>.md` | bounded contexts, aggregates, value objects, domain events, the ubiquitous language — binding vocabulary for code and docs (`.claude/rules/ddd.md`) | `/domain <area>` |
| `component-map.md` | services, their responsibilities, external integration contracts | hand / `/knowledge-update` |
| `<mechanism>.md` | one doc per mechanism: auth flow, queueing, caching, sync, data model, each external integration | whoever changes the mechanism |

Keep each doc about one mechanism, current, and short enough to read before editing the code it
describes. If you find it wrong while navigating, fix it before moving on — a stale index is worse
than none.
