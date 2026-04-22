namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record UpcomingEventItem(
    Guid Id,
    string Title,
    string? Description,
    bool IsAllDay,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    bool IsImported,
    string? SourceKind,
    bool IsGoogleMirrorEnabled,
    string? GoogleSyncStatus,
    string? GoogleSyncError,
    string? GoogleTargetDisplayName,
    DateTimeOffset? LastGoogleSyncSucceededAtUtc);
