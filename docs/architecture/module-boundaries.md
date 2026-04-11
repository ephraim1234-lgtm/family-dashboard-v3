# Module Boundaries

## Purpose

This document defines the intended architectural boundaries for the current codebase.

It exists to preserve clarity as the platform grows and to prevent future-domain ideas from leaking into current implementation prematurely.

## Current architectural stance

The platform currently uses:

- ASP.NET Core backend
- modular monolith core
- one worker/service for background jobs and future integrations
- Next.js frontend
- PostgreSQL
- self-hosted deployment

The backend should remain modular-monolith-first unless there is a strong operational reason to separate something.

## Current implemented or planned core modules

### Households
Owns:
- household identity
- membership
- household-scoped settings root
- household context

Does not own:
- scheduling rules
- display logic
- notifications
- future food/tasking logic

---

### Identity
Owns:
- authentication/session resolution
- current user resolution
- household membership binding
- coarse authorization support
- display token/device access separation

Does not own:
- household business rules
- scheduling semantics
- display projections

---

### Scheduling
Owns:
- events
- recurrence rules
- exceptions/overrides
- agenda and time-window query logic
- event lifecycle

Does not own:
- display layouts
- display device access
- notification delivery
- future chores or food logic

Important rule:
Scheduling owns scheduling behavior, even when other modules consume its outputs.

---

### Integrations
Owns:
- external provider linking records
- provider-specific sync state
- external import/update orchestration

Does not own:
- local scheduling rules
- recurrence semantics for household-managed events
- display projections

Important rule:
Integrations can ingest external events, but Scheduling remains the owner of local schedule behavior and event query semantics.

---

### Display
Owns:
- display devices
- device access tokens / kiosk-style access
- display layouts
- display configuration
- display projection assembly
- display snapshot contracts

Does not own:
- scheduling rules
- event recurrence semantics
- household membership rules
- future generalized widget/plugin infrastructure

Important rule:
Display consumes projected household state. It does not become a second scheduling engine.

---

### Administration
Owns:
- admin-facing workflows
- member management flows
- household settings management flows
- display management flows

Does not own:
- independent core business logic separate from other modules

Important rule:
Administration is mostly an application/workflow surface over existing domain modules.

---

## Worker boundary

The worker exists for:

- scheduled jobs
- future integration sync
- background processing
- future reminder scheduling

The worker should not become a second business domain center.

It should reuse core domain/application logic where appropriate, while maintaining a clear operational role.

## Reserved future module areas

The following are plausible future module areas but are not current implementation scope:

- Notifications
- Chores
- Food
- Notes
- Documents
- Maintenance
- Finance/Bills

These reserved areas exist to preserve naming and boundary discipline only.

They should not trigger speculative code or abstractions.

## Boundary rules

- Modules own their own business rules.
- Cross-module use should happen through explicit contracts, use cases, or clear query boundaries.
- Do not introduce generic shared business helpers that blur module ownership.
- Avoid creating generalized infrastructure to support not-yet-implemented modules.
- Avoid giant `Shared`, `Common`, or `Platform` dumping grounds.
- Use future domains to avoid dead-end naming, but not to justify speculative code.

## Display-specific rule

Display must consume display-safe read models or projection contracts.

The frontend display surface must not directly assemble raw operational scheduling queries in ad hoc ways.

## Future-domain rule

When future domains are added:
- add them intentionally
- define ownership explicitly
- avoid retrofitting broad generic abstractions unless existing repeated patterns truly justify them

## Review triggers

Stop and review architectural tradeoffs before major changes to:

- module boundaries
- recurrence ownership
- display projection ownership
- auth/session boundaries
- worker responsibilities
- future-domain activation
