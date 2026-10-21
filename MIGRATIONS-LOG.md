# Migrations log

Coordination record for database migrations. Migrations are **single-threaded**: claim the next
sequence number here **before** writing any migration file (`/scaffold --migrate` does this in
Phase 0d), so two branches never produce the same `Seq`. Update the row when the PR opens and
when it merges. This is a live log — rows are appended and updated, never rewritten.

| Seq | Slug | Feature / Issue | Status | PR |
|-----|------|-----------------|--------|----|
<!-- | 001 | create_example_table | #12 | merged | #15 | -->

**Slug**: `lower_snake_case`, ≤30 chars, describes the schema change.
**Status**: `open` (claimed, not merged) · `merged` · `reverted` · `abandoned` (number is still burned).
