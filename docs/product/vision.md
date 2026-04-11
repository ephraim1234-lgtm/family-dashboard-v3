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

The current product core is intentionally narrow:

- household membership and context
- scheduling
- recurring events
- display / ambient household visibility
- administration and configuration

This is the first real product boundary and should remain the implementation center until it is stable.

## Why this core comes first

Scheduling and display are the strongest foundation because they:

- create immediate household value
- work well across mobile, desktop, and TV/shared screens
- establish core household context and permissions
- create a stable base for later domains like reminders, chores, and food operations

## Product principles

- self-hosted first
- pragmatic architecture over speculative extensibility
- web-first and mobile-friendly
- ambient shared display is a first-class surface
- role-aware household access
- maintainable evolution over broad up-front scope
- future domains should be added intentionally, not pre-built into the architecture

## Near-term likely expansions

These are the most likely adjacent expansions after the initial scheduling/display MVP:

- reminders/notifications
- external calendar integrations
- chores/routines

These should be considered future roadmap candidates, not current implementation scope.

## Future domains under consideration

These are meaningful future product areas that may become real modules later:

### Food operations
- recipes
- meal planning
- pantry
- shopping
- cooking workflows

### Household tasking
- chores
- routines
- recurring responsibilities
- completion tracking

### Communication and memory
- household notes
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