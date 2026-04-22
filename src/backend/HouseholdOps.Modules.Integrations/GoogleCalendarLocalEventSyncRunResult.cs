namespace HouseholdOps.Modules.Integrations;

public sealed record GoogleCalendarLocalEventSyncRunResult(
    int DueCount,
    int SucceededCount,
    int FailedCount);
