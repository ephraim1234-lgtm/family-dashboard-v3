---
name: householdops-time-and-recurrence
description: Handle HouseholdOps time, time-zone, and recurrence changes safely. Use when Codex changes scheduling windows, household-local day boundaries, recurring event expansion, reminder due-time logic, chore cadence logic, imported event timing, or display grouping that depends on DateTimeOffset, UTC storage, or local household time.
---

# HouseholdOps Time And Recurrence

Treat this area as high risk. Add or update tests whenever behavior changes.

## Guardrails

1. Persist timestamps in UTC and use `DateTimeOffset`.
2. Convert to household-local dates only at the boundary where the use case needs local-day behavior.
3. Anchor "today", browse windows, reminder due dates, and weekly masks to the household time zone, not server local time.
4. Keep imported external events read-only unless the task explicitly changes ownership rules.
5. Do not widen recurrence support casually; keep unsupported patterns explicit.

## Implementation rules

- Reuse existing helpers such as household time-boundary utilities when possible.
- Make inclusive/exclusive window semantics explicit in code and tests.
- If a change affects chores, reminders, display groupings, or agenda windows, reason through local midnight and daylight-saving boundaries.
- Preserve the distinction between local Scheduling ownership and Integrations import ownership.

## Test rules

- Add or update focused tests in the relevant module test project.
- Prefer concrete UTC timestamps in tests.
- Include at least one test that proves the intended boundary behavior, not just the happy path.

## Do not use this skill when

- The task is unrelated to time semantics.
- The change is presentation-only and does not affect grouping, filtering, or due-time behavior.

## References

- For the relevant test targets and risk checklist, read [test-expectations.md](references/test-expectations.md).
