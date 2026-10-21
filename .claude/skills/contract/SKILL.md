---
allowed-tools: AskUserQuestion, Skill, Read, Glob, Grep, Bash(rg:*), Bash(git:*), Bash(ls:*), Bash(npm:*), Edit, Write
description: Scaffold or change an API contract — Mongoose schemas, mock factory, MSW handler, OpenAPI registry entry — as its own contract PR, before any controller or FE api-slice is written. This is the command the contract-first gate (api-contracts.md, ADR-016) tells you to run.
argument-hint: '<domain> <feature> [--change] [--methods=GET,POST,...]'
---

# /contract

Create (or change) the **contract** for an HTTP endpoint as a separately mergeable unit: the
Mongoose request/response schemas in `server/models`, a mock factory, an MSW handler, and the
OpenAPI registry entry — then open the small contract PR. Only after that PR merges may a
controller (`server`) or an FE api-slice (`clientApp`) be written; the hook
`.claude/hooks/contract-first-gate.sh` and `/implement` Step 2 both enforce it.

The rule is [`api-contracts.md`](../../rules/api-contracts.md). This skill is its hands.

## Current State

- Branch: !`git branch --show-current`
- Contract package: !`ls server/models/src 2>/dev/null || echo "MISSING — server/models/src not found; check CONTRACT_PKG in harness config"`
- OpenAPI registry: !`ls server/src/openapi/registry.ts 2>/dev/null || echo "MISSING — server/src/openapi/registry.ts"`
- Open contract PRs: !`gh pr list --search "head:contract/" --json number,title --jq '.[] | "#\(.number) \(.title)"' 2>/dev/null || echo "none / gh unavailable"`

## Arguments

$ARGUMENTS

`/contract <domain> <feature> [--change] [--methods=GET,POST]`

- `<domain>` — the bounded context / folder under `server/models/src/` (e.g. `claims`)
- `<feature>` — the endpoint group, kebab-case (e.g. `status`) → files `status.schemas.ts` etc.
- `--change` — modify an existing contract instead of scaffolding (auto-selected if the files exist)
- `--methods` — which operations to scaffold; default `GET` for a read, ask if unclear

If arguments are missing, ask for domain and feature. Do not guess a domain: check
`.claude/planning/architecture/domain-*.md` and `docs/feature-index.yaml` for the bounded context
the endpoint belongs to.

## Why this skill exists

The contract is the one artifact both FE and BE depend on, so it must exist before either starts.
Without a command for it, the gate blocks and engineers hand-write four files inconsistently (or
hand-write a TypeScript `interface`, which is exactly what the rule forbids). `/contract` makes the
compliant path the fast path.

## Mode selection

| Condition | Mode |
|---|---|
| `server/models/src/<domain>/<feature>.schemas.ts` does **not** exist | **Scaffold** |
| It exists, or `--change` given | **Change** |

---

## SCAFFOLD MODE

### Phase 1 — Resolve the shape before writing anything

1. **Spec first.** Which `SPEC-NNN §R<n>` / PRD acceptance criteria define this endpoint's
   behaviour? Cite them in the schema file header. If no spec governs it, say so and stop — a
   contract with no requirement behind it is speculation ([`requirement-sources.md`](../../rules/requirement-sources.md)).
2. **Domain terms.** Field names come from the ubiquitous language in
   `.claude/planning/architecture/domain-<domain>.md` — not from the UI copy, not from the DB.
3. **Existing contracts.** `rg -n "openapi\('" server/models/src/<domain>/` — reuse shared
   schemas (ids, pagination, error shape) rather than redefining them.
4. **Consumers.** Note who will consume it (FE screen, other service) — it decides whether the
   contract PR must stand alone (see Phase 5).

### Phase 2 — Branch

```bash
git checkout main && git pull --ff-only
git checkout -b contract/<domain>-<feature>
```

A contract branch carries **contract files only**: `server/models/src/**`,
`server/src/openapi/**`, `server/openapi.json`. No controller, no FE slice.

### Phase 3 — Scaffold the four files

Write these with **real field shapes from Phase 1**, placeholders only where a decision is still
open (mark each `// TODO(contract):` and list them in the PR). The reference shapes below are the
Zod form the rule documents; if `Mongoose` is something else, keep the four artifacts and swap
the idioms per `api-contracts.md` § Source of truth.

**1. Schemas — `server/models/src/<domain>/<feature>.schemas.ts`**

```ts
// Contract: <Domain> / <Feature>. Governed by SPEC-NNN §R<n>; see PRD-NNN AC<n>.
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);

export const <Feature>ParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('<Feature>Params', { description: '...' });

export const <Feature>ResponseSchema = z.object({
  // fields in domain terms; mark pii fields: .openapi({ 'x-pii': true })
}).openapi('<Feature>Response', { description: '...', example: { /* ... */ } });

export type <Feature>Params = z.infer<typeof <Feature>ParamsSchema>;
export type <Feature>Response = z.infer<typeof <Feature>ResponseSchema>;
```

One schema per request body / params / query / response. Every public schema carries
`.openapi('Name', { description })` — without it the generated document is useless.

**2. Mock factory — `server/models/src/<domain>/<feature>.mocks.ts`**

```ts
import { generateMock } from '@anatine/zod-mock';
import { <Feature>ResponseSchema, type <Feature>Response } from './<feature>.schemas';

export const mock<Feature>Response = (overrides: Partial<<Feature>Response> = {}): <Feature>Response =>
  <Feature>ResponseSchema.parse({ ...generateMock(<Feature>ResponseSchema), ...overrides });
```

**3. MSW handler — `server/models/src/<domain>/<feature>.handlers.ts`**

```ts
import { http, HttpResponse } from 'msw';
import { mock<Feature>Response } from './<feature>.mocks';

export const <feature>Handlers = [
  http.get('*/api/<domain>/<feature>/:id', () => HttpResponse.json(mock<Feature>Response())),
];
```

Export the handlers from the domain's `index.ts` so the FE dev runtime and Karma + Jasmine fixtures
can import them. **Keep the handler after the BE lands** — it becomes a test fixture.

**4. Handler self-test — `server/models/src/<domain>/<feature>.handlers.spec.ts`**

```ts
import { setupServer } from 'msw/node';
import { <feature>Handlers } from './<feature>.handlers';
import { <Feature>ResponseSchema } from './<feature>.schemas';

const server = setupServer(...<feature>Handlers);
beforeAll(() => server.listen()); afterAll(() => server.close());

it('handler output satisfies the contract', async () => {
  const res = await fetch('http://test/api/<domain>/<feature>/00000000-0000-4000-8000-000000000000');
  expect(res.status).toBe(200);
  expect(() => <Feature>ResponseSchema.parse(await res.json())).not.toThrow();
});
```

### Phase 4 — Register and emit

1. Add the path to `server/src/openapi/registry.ts` (method, path, params/body/response
   schemas, tags, summary).
2. `npm --filter @ticketing-application/api openapi:emit` — regenerates
   `server/openapi.json`. **Never edit that file by hand**; its diff is the human-readable
   view of the contract change and a review artifact.
3. Run `/test` — the self-test and typecheck must be green.

### Phase 5 — Open the contract PR

Run `/commit` (type `feat(contracts): add <domain>/<feature> contract`) then `/pr`. The PR body
must list: governing spec sections, the `openapi.json` diff summary, open `TODO(contract)` items,
and the intended consumers.

**Separation rule** (binding, `api-contracts.md`): the contract PR contains contract files only.
Collapsing contract + implementation into one PR is allowed **only** when all hold — small
*additive optional* field, built solo and sequentially, no other consumer — and then the commit
message carries `contract-collapse-ok: <reason>`. If you cannot write that line truthfully, keep
the PRs separate.

### Phase 6 — Report

```
Contract: <domain>/<feature>  (branch contract/<domain>-<feature>, PR #N)
Files: <feature>.schemas.ts · .mocks.ts · .handlers.ts · .handlers.spec.ts · registry.ts · openapi.json
Governed by: SPEC-NNN §R<n>, PRD-NNN AC<n>
Open items: <TODO(contract) list or "none">
Unblocks: FE builds against the MSW handler now; BE implements ZodValidationPipe(<Feature>ParamsSchema)
          and ends with `return <Feature>ResponseSchema.parse(response)` once this merges.
```

---

## CHANGE MODE

For an existing contract (new field, rename, removal, new operation).

1. **Blast radius first.** Run `/impact-check server/models/src/<domain>/<feature>.schemas.ts`
   — every controller, FE slice, test and MSW fixture that imports it is a consumer.
2. **Ask First** (do not proceed without the user) when the change is **breaking** — removing or
   renaming a published schema or field, tightening a type, changing a status code — or when the
   schema has consumers outside this repo. Breaking changes need a versioning decision, recorded
   in an ADR if it sets precedent.
3. Make the schema change; update mocks, handlers and the self-test; re-register if the path or
   method changed; re-emit `openapi.json`; `/test`.
4. Additive optional field with one solo consumer → may ride the implementation PR with
   `contract-collapse-ok: <reason>`. Anything else → its own `contract/` PR, merged **before** the
   consuming change.
5. Tell the consuming branches what changed: list the affected files from step 1 in the PR body.

---

## Never

- Hand-write a TypeScript `interface` for a request/response shape — `z.infer` only
- Edit `server/openapi.json` by hand
- Put a controller or FE api-slice on a `contract/` branch
- Define the same payload twice (DTO + schema) — one source
- Delete an MSW handler because the real endpoint now exists
- Scaffold a contract no `SPEC-NNN` / PRD governs

## Ask First

- Breaking changes to a published schema (rename, remove, tighten)
- A contract with consumers in another repository
- Skipping the standalone contract PR for a "quick fix"
