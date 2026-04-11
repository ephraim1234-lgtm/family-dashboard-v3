# AGENTS.md

## Purpose

This repository is for a self-hosted household operations platform.

The long-term vision is broader than the current implementation scope, but the codebase must remain disciplined and incremental. Preserve awareness of future domains without scaffolding them prematurely.

## Current implementation priority

The current active scope is:

- Households
- Identity/Auth
- Scheduling
- Calendar integrations (narrow import-first slice)
- Display
- Administration
- Worker foundation

The MVP centers on:

- household membership and context
- scheduling and calendar events
- one-way external calendar import foundation
- recurrence support
- display devices and display projections
- admin/configuration for the above

## Future domains exist, but are not current implementation scope

Examples of future domains include:

- reminders/notifications
- calendar integrations
- chores/routines
- food operations
  - recipes
  - meal planning
  - pantry
  - shopping
  - cooking
- household notes
- household documents
- maintenance tracking
- budgeting/bills

These future domains are intentionally documented in repo docs, but they must NOT be scaffolded or abstracted for unless the task explicitly calls for them.

## Working rules

- Plan before coding for tasks that affect architecture, auth, recurrence, display projections, worker behavior, or database design.
- Keep the backend modular-monolith-first.
- Keep meaningful changes deployable through Docker.
- Prefer runtime validation through Docker when runtime testing is relevant, especially when host SDK/tooling validation is unreliable.
- When runtime validation is relevant, prefer exposing the API on port `3001` and test the real running system rather than relying only on host SDK builds.
- Use Playwright/browser automation only when the user explicitly asks for it.
- Favor host-portable project setup over machine-specific local tooling assumptions.
- Do not introduce new services without clear justification.
- Do not scaffold future modules unless explicitly requested.
- Do not introduce speculative abstractions to support possible future domains.
- Use documented future domains only to avoid painting the architecture into a corner.
- When a current design decision could affect future domains, note the tradeoff briefly, but keep implementation centered on the current scope.
- Prefer explicit ADRs or short design notes over speculative code.
- Prefer small, reviewable changes over large scaffolds.
- Avoid generic repositories, generic service bases, and speculative extension points.
- Date/time and recurrence logic must be test-backed.
- Display must consume explicit display projection/read-model endpoints, not raw operational queries from the frontend.
- Use explicit request/response contracts instead of exposing persistence models directly.
- Keep repo guidance/docs in sync when engineering rules, current product reality, roadmap status, or deferred ideas materially change.
- Future external calendar integration work should remember likely Google OAuth env vars such as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Future external calendar integration work should also assume some OAuth callback and sync-management flows may require hosted-environment testing, not only the local Docker loop.

## Current architectural direction

- Backend: ASP.NET Core
- Frontend: Next.js
- Database: PostgreSQL
- Hosting: self-hosted
- Client strategy: web-only for now
- Architecture: modular monolith core + one worker/service
- Display access: tokenized / kiosk-style

## Active backend module areas

- Households
- Identity
- Integrations
- Scheduling
- Display
- Administration

Reserved future module areas include:

- Notifications
- Chores
- Food
- Documents

## High-risk areas requiring extra care

Stop and summarize tradeoffs before major changes in:

- auth/session architecture
- recurrence model
- display token/access model
- worker mechanism
- module boundaries
- database and migration design

## Documentation usage

Before making major architecture changes, consult:

- `docs/product/vision.md`
- `docs/product/domain-roadmap.md`
- `docs/architecture/module-boundaries.md`

Use those docs to preserve long-term intent, but only implement the domains explicitly in scope for the current task.
