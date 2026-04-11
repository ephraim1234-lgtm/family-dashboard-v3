namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record GoogleCalendarLinkSummaryResponse(
    Guid Id,
    string DisplayName,
    string FeedUrlHost,
    string FeedUrlPathHint,
    bool AutoSyncEnabled,
    int SyncIntervalMinutes,
    DateTimeOffset? NextSyncDueAtUtc,
    string LastSyncStatus,
    string? LastSyncError,
    DateTimeOffset? LastSyncStartedAtUtc,
    DateTimeOffset? LastSyncCompletedAtUtc,
    string? LastSyncFailureCategory,
    string? LastSyncRecoveryHint,
    int ImportedEventCount,
    int SkippedRecurringEventCount,
    DateTimeOffset CreatedAtUtc);
