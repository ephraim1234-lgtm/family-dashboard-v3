# PLANS.md

## Objective
Advance Calendar Integrations from the current narrow Google Calendar iCal import slice to a robust, validated, incrementally expanded capability.

## Current capability
- One-way Google Calendar iCal feed import into local Scheduling
- Manual link management
- Manual sync
- Sync-status visibility
- Imported events treated as read-only

## Milestones
| Milestone | Status | Scope | Key files touched | Validation | Notes |
|---|---|---|---|---|---|
| Harden iCal import slice | in_progress | Idempotency, duplicate prevention, stale cleanup, timezone parsing, error handling, read-only consistency |  |  |  |
| Improve validation coverage | planned | Add/fix focused tests and validation commands |  |  |  |
| Improve local verification guidance | planned | Clarify setup/run/test path for frontend/backend/docker |  |  |  |
| Worker-managed scheduled sync | planned | Add scheduled sync for already-linked calendars |  |  |  |
| Recurring external event import | planned | Support recurrence import in a narrow, controlled way |  |  |  |
| OAuth-based Google linking | planned | Replace or augment manual feed linking with account linking |  |  |  |

## Current milestone
Harden iCal import slice

## Decisions
- Scheduling remains owner of local scheduling behavior.
- Integrations owns provider linking, sync state, and import orchestration.
- Imported external events are currently read-only.
- Prefer narrow, real milestones over broad integration architecture.

## Risks / blockers
- Frontend build environment may be incomplete locally.
- Docker runtime validation may be blocked if daemon is unavailable.
- Hosted environment may be needed later for OAuth callback validation.

## Validation log
- Pending current pass

## Next recommended step
Complete hardening of the current iCal import slice before adding the next milestone.