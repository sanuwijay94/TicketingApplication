# Lessons — post-mortems that future investigations read first

One file per **S1/S2 incident**, named `YYYY-MM-<slug>.md`, written from
`docs/templates/lesson.md.template` by the team that owned the incident, **in the same PR as the
fix** (`/fix` Phase 5). Historical records: never rewritten — a later incident links back.

Why a folder in the repo and not a wiki page: this is the memory the loop reads. `/trace-bug` and
`/investigate` search here before source; the ai-factory diagnose run (`monitor.yml`, ≥ 2σ)
reads it when a control band is breached and writes its own post-mortem to the **same path** when
it handles an incident. The *What the loop learned* checklist in each file is the audit that the
incident changed something: an eval case, a `CLAUDE.md` line, a band, a hook.

```
docs/lessons/
  README.md
  2026-06-checkout-cache.md       # example name — one per incident
```

Search: `rg -n -i '<symptom or component>' docs/lessons/`.
