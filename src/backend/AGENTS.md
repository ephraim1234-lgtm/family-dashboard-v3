# Backend AGENTS

## Purpose

This file adds backend-local guidance on top of the repository root `AGENTS.md`.

Use it when the current working directory is inside `src/backend/`.

## Backend defaults

- Preserve the modular-monolith structure. Prefer module-local contracts and infrastructure implementations over shared generic abstractions.
- Keep ASP.NET Core minimal API route groups explicit and module-owned.
- Use explicit request/response contracts. Do not expose EF entities directly from API endpoints.
- Treat EF Core migrations, indexes, and cross-module data access as high-risk changes that need a short tradeoff summary before implementation.

## Validation defaults

- Prefer focused `dotnet build` and targeted `dotnet test` runs first.
- When behavior depends on the running stack, validate through Docker with the API exposed on port `3001`.
- Time, recurrence, reminder, and display-projection changes must be test-backed.

## Skill routing

- Use `householdops-aspnet-module-endpoints` for backend endpoint, contract, DI, and module-wiring work.
- Use `householdops-ef-migrations` for schema changes and migration generation/review.
- Use `householdops-ef-postgres-schema` for index, constraint, and query-shape design.
- Use `householdops-time-and-recurrence` for scheduling, reminder, and time-zone logic.
