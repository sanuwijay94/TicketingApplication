# Test plans — `TP-NNN-<slug>.md`

One **living** plan per feature, created by `/test-plan <prd>` from `../templates/TEST-PLAN.md.template`.
It is the acceptance-criteria → coverage index with a Mode per row (dev / qa / manual), edited in
place as the feature evolves and re-run every release. Status: `Draft` → `Ready` → `Active` →
`Certified <version>` (re-certified each release; never "done").

Results of a run are **not** recorded here — they go to `docs/qa/reports/<version>-test-run.md`.
Numbering: sequential `TP-NNN`, independent of the PRD number (the frontmatter names the PRD).
