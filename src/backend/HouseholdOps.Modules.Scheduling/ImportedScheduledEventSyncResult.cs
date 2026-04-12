namespace HouseholdOps.Modules.Scheduling;

public sealed record ImportedScheduledEventSyncResult(
    int CreatedCount,
    int UpdatedCount,
    int RemovedCount,
    int ActiveCount);
