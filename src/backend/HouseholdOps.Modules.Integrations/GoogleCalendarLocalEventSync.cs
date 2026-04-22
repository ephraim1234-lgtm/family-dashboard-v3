namespace HouseholdOps.Modules.Integrations;

public sealed class GoogleCalendarLocalEventSync
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    // Plain Guid only. Scheduling remains the owner of event lifecycle.
    public Guid ScheduledEventId { get; set; }

    public Guid GoogleCalendarConnectionId { get; set; }

    public string RemoteEventId { get; set; } = string.Empty;

    public string SyncStatus { get; set; } = GoogleCalendarSyncStatuses.Pending;

    public string PendingOperation { get; set; } = GoogleCalendarSyncOperations.Upsert;

    public DateTimeOffset LastQueuedAtUtc { get; set; }

    public DateTimeOffset? NextAttemptAtUtc { get; set; }

    public DateTimeOffset? LastAttemptedAtUtc { get; set; }

    public DateTimeOffset? LastSucceededAtUtc { get; set; }

    public int AttemptCount { get; set; }

    public string? LastError { get; set; }

    public DateTimeOffset? MarkedDeletedAtUtc { get; set; }
}
