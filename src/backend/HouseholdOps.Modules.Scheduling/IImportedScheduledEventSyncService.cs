namespace HouseholdOps.Modules.Scheduling;

public interface IImportedScheduledEventSyncService
{
    Task<ImportedScheduledEventSyncResult> SyncAsync(
        Guid householdId,
        string sourceKind,
        Guid sourceCalendarId,
        IReadOnlyCollection<ImportedScheduledEvent> importedEvents,
        DateTimeOffset syncedAtUtc,
        CancellationToken cancellationToken);

    Task DeleteSourceAsync(
        Guid householdId,
        string sourceKind,
        Guid sourceCalendarId,
        CancellationToken cancellationToken);
}
