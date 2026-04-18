# Time and recurrence test expectations

## Common test locations

- `tests/HouseholdOps.Modules.Scheduling.Tests/RecurrenceExpansionTests.cs`
- `tests/HouseholdOps.Modules.Scheduling.Tests/AgendaWindowFilterTests.cs`
- `tests/HouseholdOps.Modules.Scheduling.Tests/ScheduledEventManagementServiceTests.cs`
- `tests/HouseholdOps.Modules.Notifications.Tests/EventReminderServiceTests.cs`
- `tests/HouseholdOps.Modules.Households.Tests/HouseholdTimeBoundaryTests.cs`
- `tests/HouseholdOps.Modules.Display.Tests/DisplayProjectionServiceTests.cs`

## Behavior to prove

- UTC storage remains stable
- Household-local day windows are correct
- Recurrence boundaries are explicit
- All-day and timed events are handled separately when needed
- Imported events remain read-only unless intentionally changed
