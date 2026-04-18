---
name: householdops-ef-migrations
description: Create, review, and validate HouseholdOps EF Core migrations against PostgreSQL. Use when Codex changes entity shape, DbContext mapping, indexes, constraints, or any persistence contract that requires a new migration or snapshot update in the HouseholdOps backend.
---

# HouseholdOps EF Migrations

Use migrations as the record of intentional schema changes, not as an afterthought.

## Workflow

1. Change the domain model and `HouseholdOpsDbContext` mapping intentionally.
2. Review whether the schema change belongs to an active module and fits current boundaries.
3. Generate a clearly named migration in `HouseholdOps.Infrastructure/Persistence/Migrations`.
4. Inspect both the migration and the updated model snapshot.
5. Validate startup against Postgres through the API container path when runtime behavior matters.

## Migration rules

- Keep migration names specific to the behavior change.
- Review indexes, foreign keys, delete behavior, and nullability explicitly.
- Do not hand-edit migrations unless the generated output needs a targeted correction.
- If a change affects query shape or uniqueness, review index design at the same time.

## Validation rules

- For schema-affecting work, confirm the API can start and apply migrations successfully.
- When the schema change touches high-risk domains such as scheduling, reminders, display, or integrations, pair migration validation with the relevant tests.

## Do not use this skill when

- The task changes query logic only and does not alter the model or schema.
- The task is frontend-only.

## References

- For the repo-specific migration checklist, read [migration-checklist.md](references/migration-checklist.md).
