---
allowed-tools: Task, AskUserQuestion, Skill, Bash(node:*), Bash(git:*), Bash(ls:*), Bash(find:*), Bash(grep:*), Read, Glob, Grep, Edit, Write
description: Scaffold Clean Architecture boilerplate for a domain concept, or create a new database migration with sequence coordination
argument-hint: '[ConceptName] [--type=aggregate|usecase|valueobject|event|port] | [--migrate "add <table> | alter <table>"]'
disable-model-invocation: true
---

Developer creates Clean Architecture layer skeletons or database migrations. Lead coordinates only.

**Delegate mode**: You must NOT write scaffold code or migration SQL directly.

## Mode Selection

| Invocation | Mode |
|-----------|------|
| `/scaffold <ConceptName> [--type=...]` | **Scaffold** — Clean Architecture boilerplate for a domain concept |
| `/scaffold --migrate <goal>` | **Migrate** — database migration with sequence coordination |

If `$ARGUMENTS` contains `--migrate`, `"add table"`, `"alter table"`, `"create table"`, `"add column"`, `"rename column"`, `"drop"`, or a migration-shaped description, treat it as **Migrate Mode** automatically.

---

## SCAFFOLD MODE

### Current State

- Branch: !`git branch --show-current`
- Domain models: !`ls .claude/planning/architecture/domain-*.md 2>/dev/null || echo "None — run /domain first"`
- src/ structure: !`ls src/ 2>/dev/null || echo "No src/ directory yet"`

### Concept

$ARGUMENTS

Format: `/scaffold <ConceptName> [--type=aggregate|usecase|valueobject|event|port]`

- **No `--type`**: Scaffold the full vertical slice (all layers)
- **`--type=aggregate`**: Domain entity + value objects + events + repository interface
- **`--type=usecase`**: Application use case + DTO only
- **`--type=valueobject`**: Single value object + test
- **`--type=event`**: Single domain event
- **`--type=port`**: Application port interface + infrastructure adapter stub

If no arguments are given, ask:
1. What concept to scaffold (e.g., `Order`, `Payment`, `User`)
2. Full vertical slice, or a specific layer only?

### Phase 1: Resolve Domain Context

Check if the concept exists in `.claude/planning/architecture/domain-*.md`. If found, read its definition (invariants, value objects, events, aggregate root). If not found, note this and proceed with the provided name only — recommend running `/domain` first.

### Phase 2: Scaffold (Developer)

Invoke `developer-agent` to create the following files based on `--type` (default: full vertical slice):

**Full vertical slice**:

```
src/domain/entities/{ConceptName}.ts
src/domain/value-objects/{ConceptName}Id.ts      (and others from domain model if known)
src/domain/events/{ConceptName}Created.ts        (and other events from domain model if known)
src/domain/repositories/I{ConceptName}Repository.ts

src/application/use-cases/Create{ConceptName}.ts
src/application/dtos/{ConceptName}Dto.ts

src/infrastructure/repositories/{ConceptName}Repository.ts

test/unit/domain/entities/{ConceptName}.test.ts
test/unit/application/use-cases/Create{ConceptName}.test.ts
```

**Every generated file must**:
- Follow naming conventions in `.claude/rules/typescript.md`
- Respect layer boundaries in `.claude/rules/clean-architecture.md`
- Follow DDD patterns in `.claude/rules/ddd.md`
- Have typed function signatures — no implicit `any`
- Use the project base error class, not `new Error()`
- Use `// TODO: implement` placeholders in method bodies — no guessed business logic
- Include a brief JSDoc comment on the class explaining its role in the architecture

**Domain entity pattern**:
```typescript
export class {ConceptName} {
  private constructor(
    private readonly id: {ConceptName}Id,
    // ... other fields from domain model
  ) {}

  static create(/* params */): {ConceptName} {
    // TODO: enforce invariants here
    return new {ConceptName}(/* ... */);
  }

  // TODO: add domain methods that enforce invariants
}
```

**Use case pattern**:
```typescript
export class Create{ConceptName} {
  constructor(private readonly repository: I{ConceptName}Repository) {}

  async execute(dto: Create{ConceptName}Dto): Promise<{ConceptName}Dto> {
    // TODO: implement
    throw new Error('Not implemented');
  }
}
```

**Repository interface pattern**:
```typescript
export interface I{ConceptName}Repository {
  findById(id: {ConceptName}Id): Promise<{ConceptName} | null>;
  save(entity: {ConceptName}): Promise<void>;
}
```

### Phase 3: Report

```markdown
## Scaffold Complete: {ConceptName}

### Files Created
- [path]: [layer and purpose]

### From Domain Model
- Invariants to implement: [list from domain-model.md, or "unknown — run /domain first"]
- Value objects needing validation: [list]
- Domain events to wire up: [list]

### Next Steps
1. Implement invariants in `domain/entities/{ConceptName}.ts`
2. Add validation to value objects
3. Implement repository using your ORM in `infrastructure/repositories/`
4. Wire up in composition root / DI container
5. Run `/test` to confirm scaffold compiles cleanly
6. If a DB table is needed for this concept, run `/scaffold --migrate "create dbo.<concept_table> table"`
```

### Scaffold Notes

- **Skeletons only** — scaffold creates structure, not business logic; business logic belongs in the aggregate
- **Read domain model first** — use exact names from `.claude/planning/architecture/domain-{slug}.md` if it exists
- **Run `/domain` first** if the concept has not been modelled yet — do not scaffold undefined domain concepts
- **Vertical slice** — the default creates all layers together so the concept is traceable end-to-end from day one

---

## MIGRATE MODE

Guided database migration creation for TKT. Claims the next sequence number, checks existing migrations and the impacted repositories for context and conflicts, proposes both up and down SQL for approval, then creates both the Mongoose `.ts` migration file and the raw SQL scripts. Updates `MIGRATIONS-LOG.md` before and after.

**Never creates a migration file before the SQL is approved.** Never skips MIGRATIONS-LOG coordination — sequence number collisions corrupt the migration history.

### Current State

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- SQL migrations (scripts/db): !`ls scripts/db/migrations/*.sql 2>/dev/null | grep -v down | sort | tail -5 || echo "none"`
- Mongoose migrations: !`ls server/src/infrastructure/database/migrations/*.ts 2>/dev/null | sort | tail -5 || echo "none"`
- MIGRATIONS-LOG last entry: !`grep '|' MIGRATIONS-LOG.md 2>/dev/null | grep -v '^| Seq' | grep -v '^|---' | tail -3 || echo "none"`

### Migration Goal

$ARGUMENTS (strip `--migrate` prefix)

If empty, ask: what schema change does this migration make? (e.g., `"add dbo.notification_status table for F-P3-11"`)

Accepts:
- A feature ID: `F-P3-06`, `F-P2-05`
- A plain description: `"create dbo.rule_execution_failures table"`, `"add deleted_at column to dbo.tickets"`, `"rename workflow_id to workflow_version_id on dbo.tickets"`
- A paired reference: `"add dbo.templates table — F-P3-17 / ADR-011"`

---

### Phase 0: Pre-flight — impact check + existing migrations + sequence coordination

#### 0a — Impact check: find affected repositories and domain entities (MANDATORY — runs before reading any migration file)

Identify which repositories, ORM entities, and domain aggregates will need co-changes when this migration lands. Do not skip this step — migration SQL without knowing the consumer chain is the leading cause of missing `@Column()` updates and broken repository queries.

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

Also check inbound callers of any matching repository to understand how many use cases depend on this data:

```bash
# Discovery ladder — see .claude/rules/code-navigation.md
rg -n -i '<keyword>' docs/feature-index.yaml docs/glossary.md
rg -n -i '<keyword>' .claude/planning/architecture/
rg -n '\b(class|interface|function|const|type|def|struct)\s+<Symbol>\b' server clientApp/src
rg -n '\b<Symbol>\b' server clientApp/src -l   # dependents
```

Record the affected files list — this becomes the **co-changes required** section in Phase 2.

#### 0b — Scan existing SQL migrations to understand current schema state

```bash
ls scripts/db/migrations/*.sql | grep -v down | sort
```

Read the most recent 2–3 up migration files to understand the current schema. Check whether the target table or column already exists — if it does, the migration is unnecessary or the goal needs to be restated.

#### 0c — Scan existing Mongoose migrations

```bash
ls server/src/infrastructure/database/migrations/*.ts | sort
```

Note the highest timestamp currently in use. The new migration's timestamp must be **greater than all existing ones**. Derive the next timestamp:

```bash
node -e "
const ts = Date.now();
const rounded = Math.ceil(ts / 100000000) * 100000000;
console.log('suggested timestamp:', rounded);
"
```

Use the next available slot in the existing project sequence (`1717200000000`, `1717300000000`, … — increment by 100000000).

#### 0d — Claim the next SQL migration sequence number in MIGRATIONS-LOG.md

Read `MIGRATIONS-LOG.md`, find the highest `Seq` value, add 1 (zero-padded to 3 digits), and **update MIGRATIONS-LOG.md immediately** with status `open` and no PR yet. This is the coordination gate per §8.2 — claim before writing any file.

Entry format:
```
| NNN | <slug>   | <F-ID>    | open     |     |
```

Slug rules: `lower_snake_case`, max 30 chars, describes the schema change (e.g., `create_rule_execution_failures`, `add_tickets_deleted_at`).

---

### Phase 1: Classify the migration

Identify which category applies — each has different reversibility and idempotency requirements:

| Type | Example | Down complexity |
|------|---------|----------------|
| **Create table** | `CREATE TABLE dbo.foo` | `DROP TABLE` — straightforward |
| **Add column (nullable)** | `ALTER TABLE … ADD col NULL` | `ALTER TABLE … DROP COLUMN` — straightforward |
| **Add column (NOT NULL)** | Requires DEFAULT or backfill | Down must drop column; up must handle existing rows |
| **Add index** | `CREATE INDEX ix_…` | `DROP INDEX` — straightforward |
| **Add constraint** | `ALTER TABLE … ADD CONSTRAINT` | `ALTER TABLE … DROP CONSTRAINT` — straightforward |
| **Rename column/table** | `sp_rename` | Reverse rename — straightforward |
| **Drop column/table** | Destructive | Down must recreate structure; **requires explicit user approval** |
| **Data migration** | UPDATE/INSERT backfill | Down must reverse or is irreversible — **flag explicitly** |
| **Grant / role** | `GRANT SELECT ON …` | `REVOKE` — straightforward |

Flag **destructive** or **data** migrations and ask for explicit confirmation before proceeding to Phase 2.

---

### Phase 2: Propose the migration SQL — CHECKPOINT (user must approve before any file is written)

Present both up and down SQL. **Do not create any file until approved.**

```markdown
## Migration Proposal: <slug>

**Sequence:** NNN (claimed in MIGRATIONS-LOG.md)
**Mongoose timestamp:** <timestamp>
**Feature:** <F-ID or description>
**Type:** <Create table | Add column | Add index | …>
**Reversible:** Yes / Partial (explain) / No (explain)

### Up migration (`scripts/db/migrations/NNN_<slug>.sql`)
```sql
-- NNN_<slug>.sql
-- <one-line description of what this migration does>
-- Feature: <F-ID> | ADR: <ADR-NNN if applicable>

IF OBJECT_ID('dbo.<table>', '<type>') IS NULL  -- idempotency guard
BEGIN
  <SQL DDL here>
END
GO
```

### Down migration (`scripts/db/migrations/NNN_<slug>.down.sql`)
```sql
-- NNN_<slug>.down.sql
-- Reverses NNN_<slug>.sql

IF OBJECT_ID('dbo.<table>', '<type>') IS NOT NULL
BEGIN
  DROP TABLE dbo.<table>;
END
GO
```

### Reversibility analysis
- **Up is idempotent:** <Yes — `IF OBJECT_ID` guard> / <No — explain>
- **Down fully reverses up:** <Yes> / <Partial — what is lost>
- **Data safety:** <No existing data affected> / <Backfill required> / <Destructive — data loss on rollback>

### Co-changes required (from Phase 0a)
- ORM entity: `<server/src/infrastructure/database/<entity>.orm-entity.ts>` — add `@Column()`
- Repository: `<server/src/infrastructure/<domain>/<name>.repository.impl.ts>` — add new column to queries
- Domain aggregate: `<server/src/domain/<domain>/entities/<name>.ts>` — if a domain field is being added
- Migration test: `test/integration/<migration-name>.migration.spec.ts` — verify up + down round-trip
```

**CHECKPOINT — wait for explicit approval before Phase 3.**

If the user requests SQL changes, revise the proposal and re-present. Do not create files with partially-approved SQL.

---

### Phase 3: Implement the approved migration

Invoke `developer-agent` to create **four files** in this exact order:

#### 3a — SQL up script: `scripts/db/migrations/NNN_<slug>.sql`

MongoDB T-SQL conventions (match existing migrations):
- Always open with a comment block: sequence, slug, feature ID, ADR reference if applicable
- Every `CREATE TABLE` wrapped in `IF OBJECT_ID('dbo.<table>', 'U') IS NULL BEGIN … END`
- Every `CREATE INDEX` wrapped in `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE …)`
- Column defaults: `CONSTRAINT df_<table>_<column> DEFAULT <value>` — named constraints prevent silent duplicates on re-run
- Use `UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_<table>_id DEFAULT NEWSEQUENTIALID()` for primary keys
- Use `DATETIME2(7)` not `DATETIME` — consistent with existing tables
- Use `NVARCHAR` not `VARCHAR` — MongoDB Unicode convention
- Use `NVARCHAR(MAX)` for JSON document columns and long text; `NVARCHAR(200/255/500)` for bounded strings
- `organization_id UNIQUEIDENTIFIER NOT NULL` on every table — multi-tenancy column, no FK (per InitialSchema convention)
- `created_at` / `updated_at` with `CONSTRAINT df_<table>_created_at DEFAULT SYSUTCDATETIME()`
- `etag UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_<table>_etag DEFAULT NEWID()` on any mutable aggregate table
- End each statement batch with `GO` when needed for MongoDB batch separation
- No `GO` inside a Mongoose `queryRunner.query()` call — split batches into separate `await queryRunner.query(...)` calls

#### 3b — SQL down script: `scripts/db/migrations/NNN_<slug>.down.sql`

- Opens with a comment: "Reverses NNN_<slug>.sql"
- Uses `IF OBJECT_ID(...) IS NOT NULL` guards before every `DROP`
- Drops objects in reverse dependency order: indexes → constraints → columns → tables
- Never uses `CASCADE` — drops must be explicit to avoid unintended side effects

#### 3c — Mongoose migration: `server/src/infrastructure/database/migrations/{timestamp}-{PascalSlug}.ts`

File name convention: `{timestamp}-{PascalCaseName}.ts` where `PascalCaseName` is the slug in `PascalCase`.

```typescript
/**
 * <PascalSlug> migration — <F-ID> / <ADR-NNN if applicable>
 *
 * <One paragraph: what schema change this makes and why. Reference the
 * feature and any design decisions (ADR, RFC) that explain the shape.
 * Note any non-obvious choices (why JSON doc vs normalised, why a
 * non-unique index, why a denormalised column, etc.)>
 */

import type { MigrationInterface, QueryRunner } from 'Mongoose';

export class {PascalSlug}{timestamp} implements MigrationInterface {
  name = '{PascalSlug}{timestamp}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.<table>', 'U') IS NULL
      BEGIN
        <SQL DDL — identical to the .sql script but without GO batches>
      END
    `);
    // Additional batches as separate await queryRunner.query() calls if needed
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.<table>', 'U') IS NOT NULL
      BEGIN
        DROP TABLE dbo.<table>;
      END
    `);
  }
}
```

Rules for the Mongoose file:
- Class name: `{PascalSlug}{timestamp}` — timestamp appended directly, no separator
- `name` field: same as class name
- SQL in `up()` and `down()` must match the `.sql` scripts exactly (same DDL, same guards)
- No `GO` statements inside `queryRunner.query()` — split into multiple calls if the SQL has batch separators
- One-paragraph JSDoc above the class explaining what it creates and why, with ADR/RFC reference

#### 3d — Register in Mongoose datasource (if not auto-discovered)

Check `server/src/infrastructure/database/data-source.ts` (or equivalent). If migrations are listed explicitly (not via glob), add the new class to the array.

---

### Phase 4: Update MIGRATIONS-LOG.md

The log entry was created in Phase 0d with status `open`. No further update is needed here — the entry stays `open` until the PR merges. At PR merge time, the developer (not this skill) updates the status to `merged` and adds the PR number.

Verify the entry is correct:

```bash
grep -A2 "| <NNN>" MIGRATIONS-LOG.md
```

---

### Phase 5: Validate

1. **TypeScript compile** — verify the new migration file compiles:
   ```bash
   npx tsc --noEmit -p server/tsconfig.json 2>&1 | grep -i "migration\|error" | head -20
   ```

2. **SQL syntax review** — re-read both `.sql` files and confirm:
   - Every `CREATE` has an idempotency guard
   - Every `DROP` has a guard
   - Named constraints follow `df_<table>_<column>` convention
   - No hardcoded org IDs or data values in DDL
   - Down migration is the clean inverse of the up migration

3. **Run migration locally** (if Docker is running):
   ```bash
   npm dev:migrate 2>&1 | tail -20
   ```
   Then verify rollback:
   ```bash
   npm dev:rollback 2>&1 | tail -10
   ```
   Then re-apply to confirm idempotency:
   ```bash
   npm dev:migrate 2>&1 | tail -10
   ```

---

### Post-Migration

Suggest, in this order:
- Implement the ORM entity changes and repository query updates identified in Phase 0a
- `/implement <F-ID>` — feature implementation that relies on this schema
- `/test integration` — integration tests against real DB to verify the new schema
- `/commit` then `/pr` — commit includes both the `.sql` files and the `.ts` file in the same commit

---

### Migration Output Format

```markdown
## Migration Created: NNN_<slug>

**Sequence:** NNN
**Mongoose timestamp:** <timestamp>
**Feature:** <F-ID>
**Type:** <migration type>
**Reversible:** Yes / Partial

### Files created
| File | Purpose |
|------|---------|
| `scripts/db/migrations/NNN_<slug>.sql` | Up migration — T-SQL DDL |
| `scripts/db/migrations/NNN_<slug>.down.sql` | Down migration — reversal DDL |
| `server/src/infrastructure/database/migrations/{timestamp}-{PascalSlug}.ts` | Mongoose wrapper |

### MIGRATIONS-LOG.md
Entry `| NNN | <slug> | <F-ID> | open |` confirmed present.

### Compile check
✅ TypeScript: no errors / ❌ errors: <list>

### Co-changes needed before this migration is useful
- `<orm-entity file>` — add `@Column()` for `<new_column>`
- `<repository file>` — update SELECT/INSERT to include `<new_column>`

### Rollback test
✅ `npm dev:rollback` applied and re-migrated cleanly / ⚠️ Not run — Docker not available
```

---

### Migration Quality Gates

- ✅ Impact check run (Phase 0a) before reading any migration file — affected repos and entities identified
- ✅ Sequence number claimed in MIGRATIONS-LOG.md **before** any file is written
- ✅ Both SQL scripts (up + down) approved before implementation
- ✅ Up migration is idempotent — `IF OBJECT_ID` guards on every `CREATE`
- ✅ Down migration is the clean inverse — `IF OBJECT_ID` guards on every `DROP`
- ✅ Mongoose `.ts` SQL matches the `.sql` scripts exactly — no divergence
- ✅ No `GO` batch separators inside Mongoose `queryRunner.query()` calls — split into separate awaits
- ✅ Named constraints follow `df_<table>_<column>` convention
- ✅ TypeScript compiles with no errors after migration file is created
- ✅ Destructive migrations (DROP TABLE, DROP COLUMN, data migrations) flagged and explicitly approved

### Never (Migrate Mode)

- Create a migration file before the SQL is approved (Phase 2 checkpoint)
- Skip the impact check in Phase 0a — co-changes to repositories and ORM entities are mandatory, not optional
- Skip MIGRATIONS-LOG.md coordination — two migrations with the same sequence number corrupt the history
- Use `GO` inside a Mongoose `queryRunner.query()` string — split batches into separate `await` calls
- Hard-code data values in DDL migrations — schema migrations must be data-agnostic
- Leave the down migration empty or as a stub — every migration must be fully reversible unless explicitly flagged and approved
- Use unnamed constraints — always use `CONSTRAINT df_<table>_<column>` to prevent duplicate-constraint errors on re-run
- Edit any previously merged migration file — create a new migration instead
- Mark the Mongoose timestamp out of order — new timestamp must be strictly greater than all existing migration timestamps
