---
name: householdops-ef-postgres-schema
description: Design HouseholdOps EF Core and PostgreSQL persistence with query-aware indexes and safe contracts. Use when Codex needs to add or revise tables, indexes, uniqueness rules, filtered indexes, query shapes, or performance-sensitive EF mappings for the HouseholdOps Postgres database.
---

# HouseholdOps EF Postgres Schema

Design schema changes around real query patterns in this repo, not generic database theory.

## Core rules

1. Start from the owning module and the actual read/write paths.
2. Keep table, column, and constraint names explicit.
3. Add indexes because a query pattern needs them, not by default.
4. Prefer projections and narrow query shapes for read paths.
5. Use raw SQL only as a last resort when EF translation is not enough.

## Index rules

- Composite indexes should match the leading filter columns used by real queries.
- Partial or filtered indexes are appropriate only when the query predicate is stable and intentional.
- Unique constraints should encode true business identity, not convenience.
- Remember that indexes speed reads but add write cost.

## EF query rules

- Use async APIs end to end.
- Avoid loading more data than the request needs.
- For read-only flows, favor direct projections and consider no-tracking when entity tracking is unnecessary.
- Keep pagination and browse queries bounded.

## Do not use this skill when

- The task is endpoint-only with no schema or query-shape effect.
- The task is frontend-only.

## References

- For repo-specific index patterns and cautions, read [index-patterns.md](references/index-patterns.md).
