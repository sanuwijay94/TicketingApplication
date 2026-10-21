# Review policy

The single policy every code review of this repository applies — the local multi-agent `/review`
today, and the CI-side review (`sukitha/ai-factory`, `pr-review.yml`) when it is installed. One
file, so a finding means the same thing wherever it was produced. Owned by the tech lead; changed
by PR like code; tuned monthly by rating findings (see *Tuning*).

Findings **inform** approval — they never approve or block a PR on their own. Branch protection
still requires a human code owner, who reads the findings and judges intent and risk.

## Passes

Run these three passes and tag **every** finding with its pass name:

| Pass | Looks for | Primary sources |
|---|---|---|
| **Bugs** | logic errors, broken edge cases, subtle regressions, unhandled failure paths, wrong types at boundaries, concurrency hazards, performance patterns (N+1, unbounded lists, O(n²) in domain code, missing indexes) | the diff, `.claude/rules/testing.md`, `.claude/rules/typescript.md` |
| **Security** | injection, auth/authz gaps, secrets or credentials in the diff, PII in logs or error messages, unsafe deserialization, missing input validation at the boundary, dependency risk | `.claude/rules/boundaries.md`, OWASP Top 10 |
| **Compliance** | the change matches what was agreed: the governing `SPEC-NNN §R<n>`, the PRD acceptance criteria, the ADR, and the committed `PLAN-NNN` (files changed vs. *Files that change*; *Proof* delivered; departures recorded); architecture rules (`clean-architecture.md`, `ddd.md`, `api-contracts.md`); documentation kept in sync (`documentation.md`) — **including whether the change has made `CLAUDE.md`, `AGENTS.md`, or an architecture doc outdated** (a command renamed, a convention changed, a mechanism altered): report that as a Compliance finding naming the stale line; UI definition of done (`ui-quality.md`) | `.claude/planning/spec/`, `prd/`, `adr/`, `plan/`, `.claude/rules/` |

## Severity — what *Important* means here

Reserve **Important** for a finding that would, if merged:

- break behaviour a user or another system depends on (including a failing or weakened test),
- leak or expose data, or widen an attack surface,
- breach a policy encoded in `.claude/rules/` or a `SPEC-NNN` rule, or
- contradict the approved `PLAN-NNN` / ADR without a recorded departure.

Everything else is a **Nit**: naming, style, comment wording, micro-refactors, preferences the
rules do not mandate. Mark severity explicitly on every finding: `**Important**` or `**Nit**`.
When unsure, it is a Nit — say what would make it Important.

## Cap the nits

Report **at most five** Nits per review, highest value first. Summarize the rest as a single
count (*"+12 further nits, mostly naming in `x/`"*). Do not pad a review with nits when there are
no Important findings — a short review is a good outcome.

## Do not report

- Generated files: `server/openapi.json`, `**/*.generated.*`, `**/gen/**`, lockfiles,
  snapshots, anything with a `GENERATED FILE` banner
- Anything CI already enforces deterministically: lint and formatter output, type errors,
  `requirements:check` drift, the contract-separation check, hook violations — CI is the source
  of truth for those; repeating them adds noise
- Pure whitespace, import-order, and formatter churn
- Files outside the diff (unless an Important finding in the diff requires a change there —
  then name it as the fix, not as a separate finding)

## Finding format

```
**<Important|Nit>** · <Bugs|Security|Compliance> · `path/file:line`
<one sentence: what is wrong>
<one or two sentences: why it matters here — the concrete failure or risk>
<the fix, concretely>
```

Each finding must point at a line in the diff and must say *why* — a label alone is not a finding.

## Feedback into CLAUDE.md

Review is where the **twice rule** (`documentation.md`) is applied. For every finding, ask: *is this
the second time this mistake has been made in this repository?* — check `git log -S` / recent PRs,
or `CLAUDE.md § Things Claude gets wrong` for a near-miss line. If it is:

- the finding **proposes the exact `CLAUDE.md` line** (one imperative sentence) as part of its fix,
  under the heading *CLAUDE.md correction*, and
- the PR that resolves the finding adds that line — so the mistake is caught from the next PR
  onwards, because review reads `CLAUDE.md`.

Do not propose a `CLAUDE.md` line for a first occurrence (that is noise), and do not propose one
for anything a hook or CI already enforces deterministically (that is the wrong layer — see
`documentation.md § Where knowledge goes`). A mistake that recurs *despite* a `CLAUDE.md` line is a
signal to promote it to a hook.

## Tuning

Monthly, the tech lead rates a sample of findings (useful / noise / wrong) and adjusts this file:
tighten *Important* when noise is high, add to *Do not report* when a class of finding is always
dismissed, add a pattern to a pass when a defect escaped to production that review should have
caught, and check how many *CLAUDE.md correction* proposals were actually merged. Every change to this file goes through PR review like code — and, once the eval suite
exists, through the agent-config evals (`sukitha/ai-factory`, `agent-evals.yml`).
