# Product Vision

## Product goal

Build a self-hosted household operations platform that helps a household manage the major planning, coordination, and logistics needs of daily life.

The product should eventually support both active participation and passive ambient visibility across household members and devices.

## Core idea

The platform is intended to become a household operating system, but it will be built in deliberate stages.

It should support:

- shared planning
- shared visibility
- household coordination
- recurring operations
- practical home logistics

## Current product core

The current product core is intentionally centered on:

- household membership and context
- scheduling
- recurring events
- display / ambient household visibility
- administration and configuration
- integrations, reminders, chores, and notes in narrow practical slices

This is the first real product boundary and should remain the implementation center, but the codebase has already moved beyond pure bootstrap and now includes adjacent narrow slices where they materially support household use.

## Why this core comes first

Scheduling and display are the strongest foundation because they:

- create immediate household value
- work well across mobile, desktop, and TV/shared screens
- establish core household context and permissions
- create a stable base for later domains like reminders, chores, and food operations

## Product progression principle

The product should not get trapped in permanent MVP refinement.

The current core should be improved where necessary, but once it is functional enough to support real usage, the platform should intentionally expand into adjacent, high-value domains.

That means the implementation scope should evolve over time.

The existence of a stable core is meant to unlock the next useful capability, not to justify endless polishing of the original feature set.

## Product principles

- self-hosted first
- pragmatic architecture over speculative extensibility
- web-first and mobile-friendly
- ambient shared display is a first-class surface
- role-aware household access
- maintainable evolution over broad up-front scope
- future domains should be added intentionally, not pre-built into the architecture
- active scope should evolve as the product matures

## Current active expansion areas

These are the most likely and most appropriate adjacent expansions after the initial scheduling/display core:

- reminders / notifications
- external calendar integrations
- chores / routines

Calendar integrations are now actively underway with a narrow first slice focused on disciplined one-way import rather than broad sync.

Current narrow implemented support already exists in these areas.

Notes also exists as a lightweight support surface, but it should remain intentionally narrow and should not be treated as activation of a full documents or knowledge-management domain.

They should still be built in narrow, disciplined slices.

Food operations is now being activated as the next deliberate product phase through a broad but still disciplined Food module that keeps pantry, recipes, shopping, meal planning, and cooking sessions together.

## Current maturity posture

Several adjacent domains are now implemented enough to use, but not mature enough to treat as complete:

- Notes is implemented as a practical household pinboard and shared-information surface, not as a generalized documents or knowledge-management domain.
- Calendar integrations is implemented as a disciplined one-way Google import slice with OAuth linking, managed links, and worker sync, not as a broad integration platform.
- Reminders is implemented as an event-reminder slice with worker processing and household visibility, not as a broad notification system.
- Chores is implemented as a focused recurring-operations slice with assignment and completion tracking, not as a generalized task-management platform.

The next stage is not to widen these into abstract platforms. It is to deepen each one until the current active product boundary feels coherent for real household use.

## Current finishing bias

When deciding what to "finish" next inside the active product boundary, bias toward:

1. Scheduling ergonomics, because Scheduling remains the center of day-to-day use.
2. Reminder triage and review flows, so the current reminder slice becomes operationally useful.
3. Calendar-integration hardening and import refinement, so one-way sync stays trustworthy.
4. Chore workflow depth, so chores feel like a dependable household-ops tool instead of a thin list.
5. Notes ergonomics only as a supporting household surface, without promoting it into a broader documents domain.

## Future domains under consideration

These are meaningful future product areas that may become real modules later:

### Food operations
- recipes
- meal planning
- pantry
- shopping
- cooking workflows

Current activation bias:
- keep these together as one Food domain, not three separate tools
- optimize for family coordination and cooking flow rather than pantry-perfect inventory science
- treat cooking as the operational moment where pantry, planning, shopping, and recipes meet

### Household tasking
- chores
- routines
- recurring responsibilities
- completion tracking

### Communication and memory
- shared reference information
- household documents

### Maintenance and operations
- home maintenance tracking
- recurring service reminders
- supply tracking

### Financial operations
- bills
- due dates
- budgeting support

This list is intentionally broad. It should guide future planning, not current implementation.

## Product scope discipline

The existence of a future domain in this document does not mean the codebase should prepare abstractions for it.

Future domains should influence:

- naming discipline
- module boundaries
- avoidance of dead-end architecture

Future domains should NOT automatically cause:

- speculative modules
- generic frameworks
- unused abstractions
- premature service decomposition

## Delivery discipline

Product evolution should follow this pattern:

1. stabilize the current core enough to support real use
2. promote the next adjacent capability into active implementation
3. ship a narrow, useful slice
4. update the docs to reflect the new product reality
5. repeat

The goal is deliberate expansion, not static preservation of the original MVP boundary.


