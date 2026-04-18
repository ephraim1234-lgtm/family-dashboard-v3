---
name: householdops-aspnet-module-endpoints
description: Add or change HouseholdOps ASP.NET Core module endpoints, contracts, and service wiring in the modular monolith. Use when Codex needs to implement backend API behavior, minimal API route groups, authorization boundaries, request/response contracts, dependency injection wiring, or worker-facing service interfaces inside the HouseholdOps backend.
---

# HouseholdOps ASP.NET Module Endpoints

Follow the repository's modular split instead of pushing everything into the API project.

## Use this structure

- Put module-facing contracts and interfaces in the relevant `HouseholdOps.Modules.*` project.
- Keep endpoint mapping in that module project's `DependencyInjection.cs`.
- Keep infrastructure implementations in `HouseholdOps.Infrastructure`.
- Wire concrete services in `HouseholdOps.Infrastructure/DependencyInjection.cs`.
- Keep `HouseholdOps.Api/Program.cs` focused on app setup and module registration.

## Endpoint rules

1. Use route groups for shared prefixes and authorization.
2. Accept explicit request DTOs and return explicit response DTOs.
3. Do not expose EF entities directly from endpoints.
4. Keep handlers async and pass `CancellationToken`.
5. Use the existing identity access services and authorization policies instead of re-reading raw HTTP state everywhere.
6. Push long-running or scheduled work into the worker, not the request path.

## Contract rules

- Name request and response types around the use case.
- Keep validation failures explicit and predictable.
- Preserve module ownership; do not blur boundaries with generic repositories or speculative shared bases.

## Do not use this skill when

- The task is frontend-only.
- The change is only a schema/index update with no backend contract or endpoint effect.

## References

- For the repo's backend file map and patterns, read [backend-patterns.md](references/backend-patterns.md).
