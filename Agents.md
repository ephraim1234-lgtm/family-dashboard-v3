# AGENTS.md

## Purpose

This repository is for a self-hosted household operations platform.

The long-term vision is broader than the current implementation scope, but the codebase must remain disciplined and incremental. Preserve awareness of future domains without scaffolding them prematurely.

This file should help the coding agent make forward progress, not just preserve the current state.

---

## Working model

The product has:

- active core areas that must remain healthy
- active expansion areas that are approved for real implementation work
- future candidate areas that should influence planning, but not implementation unless explicitly activated

The active implementation scope is expected to evolve over time.

When the product meaningfully progresses, this file and related product/architecture docs should be updated to reflect that reality.

---

## Current active implementation scope

### Active core

These remain foundational and should stay coherent as the platform grows:

- Households
- Identity/Auth
- Scheduling
- Display
- Administration
- Worker foundation

These are the core product surfaces and enabling infrastructure.

### Active expansion track

These are approved next implementation areas. They are not just ideas to remember. They are legitimate areas for actual feature delivery when the current task calls for forward progress:

- Notifications / Reminders
- Calendar Integrations
- Chores / Routines

These should be implemented incrementally and pragmatically, without overgeneralizing for distant future domains.

---

## Current product emphasis

The platform should continue improving the current core where necessary, but it should not remain stuck in permanent MVP refinement.

Once the core is sufficiently stable for a task area, prefer moving into the active expansion track rather than repeatedly polishing low-leverage details.

Good examples of forward progress:

- adding useful reminder flows tied to scheduling
- implementing a first narrow external calendar sync path
- adding a basic recurring chores/routines capability
- improving display usefulness in support of newly active product areas

Less desirable behavior:

- endlessly reworking current modules without unlocking meaningful new user value
- introducing broad abstractions instead of shipping the next narrow capability
- treating every future-facing concern as a reason to defer implementation

---

## Future domains exist, but are not current implementation scope

Examples of future domains include:

- food operations
  - recipes
  - meal planning
  - pantry
  - shopping
  - cooking
- household notes
- household documents
- maintenance tracking
- budgeting / bills

These future domains are intentionally documented in repo docs, but they must NOT be scaffolded or abstracted for unless the task explicitly calls for them.

Use them to maintain good naming and module boundary discipline, not to justify speculative code.

---

## Required behavior before non-trivial work

Plan before coding for tasks that affect:

- architecture
- auth/session behavior
- recurrence/date-time semantics
- display projections or display access
- worker behavior
- cross-module contracts
- database design or migrations
- activation of a new expansion area

For those tasks, first summarize briefly:

- goal
- modules/files likely affected
- scope classification
  - active core maintenance
  - active expansion implementation
  - future-domain activation
- key risks/tradeoffs
- verification approach

Then implement in small, reviewable steps.

---

## Working rules

- Keep the backend modular-monolith-first.
- Keep meaningful changes deployable through Docker.
- Prefer runtime validation through Docker when runtime testing is relevant, especially when host SDK/tooling validation is unreliable.
- When runtime validation is relevant, prefer exposing the API on port `3001` and test the real running system rather than relying only on host SDK builds.
- Use Playwright/browser automation only when the user explicitly asks for it.
- Favor host-portable project setup over machine-specific local tooling assumptions.
- Do not introduce new services without clear justification.
- Do not scaffold future modules unless explicitly requested or they have been promoted into the active expansion track.
- Do not introduce speculative abstractions to support possible future domains.
- Use documented future domains only to avoid painting the architecture into a corner.
- When a current design decision could affect future domains, note the tradeoff briefly, but keep implementation centered on the active scope.
- Prefer explicit ADRs or short design notes over speculative code.
- Prefer small, reviewable changes over large scaffolds.
- Avoid generic repositories, generic service bases, and speculative extension points.
- Date/time and recurrence logic must be test-backed.
- Display must consume explicit display projection/read-model endpoints, not raw operational queries from the frontend.
- Use explicit request/response contracts instead of exposing persistence models directly.
- Keep repo guidance/docs in sync when engineering rules, product reality, roadmap status, or deferred ideas materially change.
- Future external calendar integration work should remember likely Google OAuth env vars such as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Future external calendar integration work should also assume some OAuth callback and sync-management flows may require hosted-environment testing, not only the local Docker loop.

---

## Implementation bias

When asked to choose the next sensible task, prefer in this order:

1. unblock or stabilize a core area that prevents progress
2. deliver a narrow slice in an active expansion area
3. improve ergonomics of an already-active feature that is clearly limiting usage
4. update docs to match real product evolution

Do not default to cosmetic refactors or deeper abstractions when a concrete feature slice can be shipped instead.

---

## Current architectural direction

- Backend: ASP.NET Core
- Frontend: Next.js
- Database: PostgreSQL
- Hosting: self-hosted
- Client strategy: web-only for now
- Architecture: modular monolith core + one worker/service
- Display access: tokenized / kiosk-style

---

## Active backend module areas

Core active areas:

- Households
- Identity
- Scheduling
- Display
- Administration

Active expansion areas:

- Notifications
- Integrations
- Chores

Reserved future module areas include:

- Food
- Notes
- Documents
- Maintenance
- Finance/Bills

Active expansion areas may receive real implementation. Reserved future areas should not receive speculative code.

---

## High-risk areas requiring extra care

Stop and summarize tradeoffs before major changes in:

- auth/session architecture
- recurrence model
- display token/access model
- worker mechanism
- module boundaries
- database and migration design
- sync/conflict ownership for external calendar integration
- reminder scheduling semantics

---

## Documentation usage

Before making major architecture changes, consult:

- `docs/product/vision.md`
- `docs/product/domain-roadmap.md`
- `docs/architecture/module-boundaries.md`

Use those docs to preserve long-term intent, but only implement areas explicitly in the active scope for the current task.

---

## Active-scope maintenance rule

This file should be updated when any of the following become true:

- a future candidate becomes an active expansion area
- an expansion area becomes part of stable core product reality
- the actual codebase/product behavior materially diverges from the current docs
- a new domain/module is intentionally activated

Do not let the documented active implementation scope become stale.