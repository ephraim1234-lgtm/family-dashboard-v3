# HouseholdOps Plan

## Purpose

This file tracks the current product posture and the next narrow slices worth shipping.

It is intentionally short. It should guide current work, not act as a permanent milestone changelog.

## Current shipped baseline

- modular-monolith backend with a single API host, one worker, and PostgreSQL persistence
- Next.js web frontend with separate app, admin, and display shells
- household context, identity, and persisted cookie-session auth
- scheduling with recurrence and display-safe projections
- one-way Google Calendar import with OAuth account linking, calendar discovery, manual sync, and worker-managed sync
- reminders / notifications for scheduled events
- chores / routines management
- lightweight household notes
- tokenized display devices with reminder-aware display projections

## Current product focus

The repo is no longer just a bootstrap scheduling/display foundation. It now has real narrow slices in:

- calendar integrations
- reminders / notifications
- chores / routines
- notes
- food

The next work should keep expanding these areas carefully without turning them into generalized platforms.

## Current maturity target

The current push now includes the first Food activation slice alongside the existing household-ops boundary:

- Notes should feel complete as a lightweight household support surface, while remaining intentionally narrow.
- Calendar integrations should feel trustworthy and understandable as a one-way Google import slice, without widening into bidirectional sync.
- Reminders should feel operationally useful for review and triage, not just technically implemented.
- Chores should feel dependable for recurring household operations, not just present.
- Scheduling should become easier to use day to day because it is still the center of the product.
- Food should feel cohesive from the start: recipe import, pantry, shared shopping, meal planning, and cooking mode must already work as one loop.

## Ordered execution runway

This runway is the deliberate finish-the-boundary program before Food.

- We should complete the current active household-ops boundary first.
- We should stop after the final hardening pass and do an explicit Food planning checkpoint before pantry, recipes, or shopping-list implementation begins.
- Food should open as an intentional product phase with its own first-slice decision, not as spillover from unfinished current work.

### `M57` Scheduling ergonomics continuation

Continue tightening the current scheduling surface for real daily use:

- reduce event creation/edit friction further
- make recurrence choices easier to understand at the point of action
- keep imported/read-only boundaries obvious wherever schedule actions appear

Why next:
- scheduling is still the product center
- every adjacent slice becomes more useful when schedule management is easier

### `M58` Reminder triage refinement

Improve the usefulness of the existing reminder slice without widening channels too early:

- stronger pending/fired filtering in Admin
- clearer overdue vs upcoming states
- stronger app-home triage and quality-of-life review flows

Why next:
- reminders are implemented and visible in both Admin and Display
- this turns the existing reminder slice into something households can actually work from

### `M59` Calendar integration hardening pass

Deepen the current one-way Google import slice without widening ownership:

- improve owner understanding of sync state, failures, and import outcomes
- refine narrow recurrence import behavior where it is already approved
- keep managed-link and feed-link workflows coherent and trustworthy

Why next:
- integrations is already implemented enough that trust and clarity now matter more than adding a new provider
- this strengthens an active expansion area without violating current guardrails

### `M60` Chores workflow depth

Improve the usefulness of chores as a focused household-ops surface:

- tighten assignment and completion ergonomics
- improve visibility into what needs attention now
- add narrow operational depth without turning chores into a generalized task framework

Why next:
- chores already has real household value
- the domain needs workflow depth more than new abstraction

### `M61` Notes support-surface completion

Round out Notes as a lightweight shared-information tool:

- improve the most obvious note-management ergonomics
- keep pinned/shared household information easy to capture and review
- explicitly avoid broad document-management expansion

Why next:
- Notes is already implemented and useful
- it should feel intentionally complete at its narrow scope, not accidental or unfinished

### `M62` Food activation slice

Open Food deliberately as one broad module with a premium but still narrow first slice:

- household-owned recipes with URL import review
- pantry locations and pantry state
- meal-plan slots and shared shopping generation
- mobile cooking mode with actual-usage pantry deduction
- TV-safe cooking view and recipe revision promotion from cooking sessions

Why next:
- Food is now the next major product area and already has a coherent first slice worth shipping
- cooking is the moment where pantry, planning, shopping, and recipes converge into real household use
- this keeps the product expanding intentionally instead of polishing only the earlier core forever

## Guardrails

- Scheduling owns local event behavior.
- Integrations owns linked-account state, provider mapping, and sync orchestration.
- Imported external events remain read-only in Scheduling.
- Notifications stays narrow and reminder-focused unless a broader slice is explicitly approved.
- Chores stays a focused household operations domain, not a generic task platform.
- Notes stays a lightweight shared-information surface and should not imply a document-management platform.
- Food stays one broad operational domain early on; do not split it into separate pantry/recipe/shopping modules or overbuild ingredient normalization before the workflow proves itself.

## Validation defaults

- prefer API runtime validation on port `3001`
- prefer Docker Compose runtime checks when behavior depends on the running system
- keep focused unit/integration tests close to the domain being changed
- any time, recurrence, reminder, display, or migration change should be test-backed
