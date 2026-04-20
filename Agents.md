# AGENTS.md

## Purpose

This repository is for a self-hosted household operations platform.

Keep the codebase disciplined and incremental. Preserve awareness of future domains without scaffolding them early.

Use this file for durable repository rules. Put repeated procedural detail in shared skills under `.agents/skills/`.

## Product scope

### Active core

- Households
- Identity/Auth
- Scheduling
- Calendar integrations (narrow import-first slice)
- Display
- Administration
- Worker foundation

### Active expansion

- Notifications / Reminders
- Calendar integrations
- Chores / Routines
- Food operations

### Existing but not expansion-driving surface

- Notes exists in the current codebase as a lightweight implemented surface.
- Maintain Notes coherently when touched, but do not use it as justification for broader document or knowledge-management abstractions.

### Future domains

- Household documents
- Maintenance tracking
- Budgeting / bills

Future domains should influence naming and boundaries, not trigger speculative code.

## Required summary before non-trivial work

Before work that affects architecture, auth/session behavior, recurrence/date-time semantics, display projections/access, worker behavior, cross-module contracts, database design/migrations, or activation of a new expansion area, briefly summarize:

- goal
- modules/files likely affected
- scope classification
  - active core maintenance
  - active expansion implementation
  - future-domain activation
- key risks/tradeoffs
- verification approach

Then implement in small, reviewable steps.

## Architecture rules

- Keep the backend modular-monolith-first.
- Keep meaningful changes deployable through Docker.
- Do not introduce new services without clear justification.
- Do not scaffold future modules unless explicitly requested or intentionally promoted into active scope.
- Do not introduce speculative abstractions, generic repositories, generic service bases, or broad extension points.
- Use explicit request/response contracts instead of exposing persistence models directly.
- Keep module ownership clear. Cross-module use should happen through explicit contracts or query boundaries.

## Stack rules

- Backend: ASP.NET Core minimal APIs with module route groups and infrastructure-backed services
- Frontend: Next.js App Router with app, admin, and display shells
- Database: PostgreSQL through EF Core + Npgsql
- Hosting: self-hosted
- Client strategy: web-only for now
- Display access: tokenized / kiosk-style

## Validation rules

- Prefer runtime validation through Docker when runtime testing is relevant.
- Prefer exposing the API on port `3001` for local validation unless the user asks otherwise.
- Prefer targeted tests and builds first, then Docker runtime checks for behavior-sensitive changes.
- Date/time and recurrence logic must be test-backed.
- Display must consume explicit display projection/read-model endpoints, not raw operational queries from the frontend.

## High-risk areas

Stop and summarize tradeoffs before major changes in:

- auth/session architecture
- recurrence model
- display token/access model
- worker mechanism
- module boundaries
- database and migration design
- sync/conflict ownership for external calendar integration
- reminder scheduling semantics

## Documentation rules

- Before major architecture changes, consult:
  - `docs/product/vision.md`
  - `docs/product/domain-roadmap.md`
  - `docs/architecture/module-boundaries.md`
- Keep repo guidance and product docs in sync when product reality or engineering rules materially change.

## Codex skill usage

- Shared repository skills live in `.agents/skills/`.
- Use the approved repo skills when their trigger conditions match instead of rewriting the same workflow in prompts.
- Keep `AGENTS.md` concise and durable; keep detailed repeated procedures in skills and their references.

## Docker-first defaults

- Use Docker Compose from the repository root for runtime validation.
- Standard local validation ports are:
  - API: `3001`
  - Web: `3000`
- Keep checked-in examples sanitized. Never commit real `.env` files, OAuth secrets, or live display tokens.

## Implementation bias

When choosing the next sensible task, prefer:

1. unblock or stabilize a core area that prevents progress
2. deliver a narrow slice in an active expansion area
3. improve ergonomics of an already-active feature that is clearly limiting usage
4. update docs to match real product evolution

Do not default to cosmetic refactors or deeper abstractions when a concrete feature slice can be shipped instead.
