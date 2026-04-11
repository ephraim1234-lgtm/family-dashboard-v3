namespace HouseholdOps.Modules.Integrations;

public sealed record GoogleCalendarAutoSyncRunResult(
    int DueCount,
    int SucceededCount,
    int FailedCount);
