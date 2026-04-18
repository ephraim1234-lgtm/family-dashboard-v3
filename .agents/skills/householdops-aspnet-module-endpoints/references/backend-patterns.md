# Backend patterns

## Key files

- App setup: `src/backend/HouseholdOps.Api/Program.cs`
- Infra registration: `src/backend/HouseholdOps.Infrastructure/DependencyInjection.cs`
- Per-module endpoint mapping: `src/backend/HouseholdOps.Modules.*/DependencyInjection.cs`
- Persistence: `src/backend/HouseholdOps.Infrastructure/Persistence/HouseholdOpsDbContext.cs`
- Worker host: `src/backend/HouseholdOps.Worker/Program.cs`

## Existing conventions

- Minimal APIs with `MapGroup(...)`
- Authorization on groups, especially owner-only admin flows
- Module interfaces in `HouseholdOps.Modules.*`
- Implementations in matching `HouseholdOps.Infrastructure/*`
- Explicit DTOs in `Contracts/`
- Auto-applied EF migrations on API startup

## High-risk areas

- Auth/session behavior
- Recurrence and time-zone semantics
- Display projection ownership
- Integration sync ownership
- Worker scheduling or idempotency
