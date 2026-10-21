# CLAUDE.md

> Claude reads **all** of this at the start of every session. Keep it **under a page**: what a new
> joiner needs on day one — commands, the conventions that matter, and the things Claude keeps
> getting wrong. Anything stale is context spent for nothing. Details live in the linked files.

## Mandatory reading order (binding — follow before answering ANY codebase question)

**First, classify the question.** *"What SHOULD it do"* (required behaviour, validation, rules) is
a **specification** question → start at step 2 and stop there. *"How DOES it work"* (call chain,
where a thing lives) is a **code** question → skip step 2 and start at step 3.

Resolve Ticketing Application context in this order. Stop when answerable — don't proceed further.

1. **CLAUDE.md** — already loaded; check *Not adopted yet* and *Permanent knowledge* first
2. **`.claude/planning/spec/`** — the governing requirement spec (`SPEC-NNN`). Mandatory for any specification question.
3. **`docs/feature-index.yaml`** — not generated yet (`/features`)
4. **`docs/glossary.md`** — not generated yet (`/knowledge-update`)
5. **`.claude/planning/architecture/`** — [layer-map.md](.claude/planning/architecture/layer-map.md) (layers, allowed imports, where each rule is enforced) · [domain-model.md](.claude/planning/architecture/domain-model.md) (entities, roles, vocabulary) · [component-map.md](.claude/planning/architecture/component-map.md) (processes, ports, API contract, storage)
6. **Targeted `rg`** — per [code-navigation.md](.claude/rules/code-navigation.md); `.ignore` keeps `server/node_modules` out of searches
7. **Raw source files** — the minimum section only

**Never cite a raw `.docx`/`.xlsx`/`.html` downstream** — cite `SPEC-NNN §R<n>` ([requirement-sources.md](.claude/rules/requirement-sources.md)).

---

**MVP scope binding.** [MVP-SCOPE.md](MVP-SCOPE.md) is the Phase 1 as-built baseline. Check its *Deferred* and *Open questions* before fixing or filing anything as a bug. Project facts, layout, and API: [AGENTS.md](./AGENTS.md).

## Project

**Ticketing Application** is a support-ticket tracker: Agents and Supervisors log in, create, view, update and (Supervisors only) delete or close tickets.

- **Backend** `server/`: Node.js + Express 4, plain JavaScript (CommonJS), JWT auth (`x-access-token` header)
- **Frontend** `clientApp/`: Angular 8, TypeScript 3.5, Bootstrap 4 (CDN), Angular HttpClient services
- **Database**: MongoDB 4.4 via Mongoose 5.6 — db `ticketingApplication` on `127.0.0.1:27017`
- **Testing**: Karma + Jasmine (client only); Protractor e2e scaffold; server: one dependency-free script, `cd server && node test/authentication.test.js` (no runner; exit 1 on failure)
- **Linting**: TSLint configured in `angular.json`, but **no `tslint.json`** — see Commands

## Commands

Node **10.24.1** (nvm-windows) is required: Angular 8 / webpack 4 fails on Node 17+.

- Client dev: `cd clientApp && npm start` — `ng serve` on http://localhost:4200, healthy = `Compiled successfully`
- Client build: `cd clientApp && npm run build` — exit 0, ends `ES5 bundle generation complete.`
- Client test: `cd clientApp && npx ng test --watch=false --browsers=ChromeHeadless` — **baseline today: 11 of 11 FAILED** (CLI scaffold specs never configured: missing `FormsModule` → `Can't bind to 'ngModel'`, missing providers → `NullInjectorError`). A change must not add failures; fixing the specs is its own task. **Never skip or delete a failing test.**
- Client lint: `cd clientApp && npx ng lint` — prints `All files pass linting` but **checks nothing** (no rules without `tslint.json`). Not a gate.
- Server run: `cd server && node bin/www` — listens on :3000, silent unless `DEBUG=project:*`. There is **no** `npm start` script (README is wrong).
- Seed DB (once): `cd server && node populateDB mongodb://127.0.0.1:27017/ticketingApplication` — prints `All done`; re-running fails on the unique `username` index.
- API smoke: `POST /login` → `token`; `GET /ticket/` with header `x-access-token: <token>` → 200.
- Debug both: VS Code → Run and Debug → **Full Stack: Server + Client** (`.vscode/launch.json`, local, pins Node 10).

## Verifying your work

Run build and test **before reporting any task complete, and paste the output** — compare against the
baselines above, not against "all green". For UI work, run the app and check every state
(loading / empty / error / success) per the checklist in [ui-quality.md](.claude/rules/ui-quality.md).

## Not adopted yet — skill and rule text referencing these does not apply

The harness assumes a TypeScript DDD monorepo with a shared Zod contract package. This repo is not that:

- **Contract-first** — [api-contracts.md](.claude/rules/api-contracts.md), `/contract`, and `contract-first-gate.sh` (on disk, **not wired** in `settings.json`). Today the API contract is the Mongoose models (`server/models/`) + routes (`server/routes/`), mirrored by hard-coded URLs in `clientApp/src/app/auth.service.ts`.
- **DDD / clean architecture** — [ddd.md](.claude/rules/ddd.md), [clean-architecture.md](.claude/rules/clean-architecture.md), `/domain`, `/scaffold`, and any `server/src/{domain,application,infrastructure,presentation}` path. The server is flat Express: `routes/ → controllers/ (+ middleware/, authentication.js) → models/`.
- [typescript.md](.claude/rules/typescript.md) applies to `clientApp/` only. [testing.md](.claude/rules/testing.md)'s Vitest / `test/unit` layout doesn't apply — specs are colocated `*.spec.ts`.
- MUI / RTK Query / MSW idioms in `ui-quality.md` and `ui-designs.md` — the state checklist still applies.
- Skill commands that don't exist here: `npm dev:*`, `npm test:qa*`, `npm requirements:check`, `npm typecheck`, `npm --filter …`, `docker compose …`. Use **Commands** above.
- [ci-cd.md](.claude/rules/ci-cd.md) and the QA automation lane — no CI pipeline exists.

## Things Claude gets wrong

- Don't run `npm install` in `server/` as a side effect — `server/node_modules` is **committed** (5k+ tracked files; also protected in `.claude/protected-paths`).
- Don't switch nvm to Node 24 for client work. Harness scripts are the exception — they need Node ≥ 14: `"$NVM_HOME/v24.21.0/node.exe" scripts/<script>.mjs`.
- Auth state lives in `localStorage` (`token`, `auth-user`) and changes on login/logout — read it per call, never cache it in a constructor (that was the post-login 403 bug in `token-interceptor.service.ts`).

## Rules

Conventions in `.claude/rules/` (Always / Never / Ask First). Binding as-is: [boundaries.md](.claude/rules/boundaries.md),
[requirement-sources.md](.claude/rules/requirement-sources.md), [code-navigation.md](.claude/rules/code-navigation.md),
[git-workflow.md](.claude/rules/git-workflow.md), [documentation.md](.claude/rules/documentation.md),
[yagni.md](.claude/rules/yagni.md), [run-legibility.md](.claude/rules/run-legibility.md),
[qa-test-cases.md](.claude/rules/qa-test-cases.md). The rest: see *Not adopted yet*.

## Workflows

Slash commands in `.claude/skills/`; `SDLC.md` is the workflow contract — how they compose into phases. Day-to-day, from `/intent` to a merged PR, with examples: [docs/HARNESS-GUIDE.md](docs/HARNESS-GUIDE.md).

- Capture `/intent` · Requirements `/requirement-intake` · Feature `/prd` `/rfc` `/adr` `/design` `/implement`
- Investigate `/explain` `/investigate` `/trace-bug` `/explain-error` `/impact-check` `/dependency-check`
- Test/QA `/test` `/write-dev-tests` `/regression` `/verify` `/test-plan` `/write-qa-cases`
- Review `/review` `/security-review` `/simplify` · Docs `/document` `/knowledge-update` `/features` `/onboard` `/kt`
- Git `/commit` `/pr` `/release` (`/pr`, `/bug`, `/release` need the `gh` CLI — not installed) · Bug `/fix` `/bug` `/bug-report`

## Harness

Installed from `agent-harness-v2` (`sukitha/agent-harness-v2`) with [harness.config.json](harness.config.json).
Hooks need `jq` on PATH (`winget install jqlang.jq`). **Local patches** that `install.sh --force` reverts — re-apply after an update:

- Hooks source `.claude/hooks/lib/winpath.sh` (lines marked `# Windows (local patch)`): Windows paths and jq's CRLF output
- `check-console-log.sh` retargeted to `server/**/*.js` + `clientApp/src/**/*.ts`
- `settings.json`: every hook command is `cd "$CLAUDE_PROJECT_DIR" && bash …`; `contract-first-gate.sh` unwired
- `.claude/protected-paths`: first rule is `server/node_modules/**`

Update: `git checkout -b chore/harness-update && bash ../agent-harness-v2/install.sh . --config harness.config.json --force`, then `git diff` and keep the patches above.

## Permanent knowledge

- `.claude/planning/architecture/` — `layer-map.md`, `domain-model.md`, `component-map.md` written. `domain-model.md` is derived from code, not a stakeholder workshop (its ❓ items are unconfirmed). `.claude/planning/adr/` is still empty.
- `docs/glossary.md`, `docs/feature-index.yaml`, `docs/change-impact-matrix.md` — generated, not yet created.
- JWT secret is the literal `'secret'` and passwords are stored and compared in plain text (`server/middleware/login.js`) — known, local-dev only.
