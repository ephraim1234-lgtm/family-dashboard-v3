namespace HouseholdOps.Modules.Integrations;

public sealed class GoogleCalendarConnection
{
    public const string LinkModeIcsFeed = "IcsFeed";
    public const string LinkModeOAuthCalendar = "OAuthCalendar";

    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    public string DisplayName { get; set; } = string.Empty;

    public string LinkMode { get; set; } = LinkModeIcsFeed;

    public string? FeedUrl { get; set; }

    public Guid? GoogleOAuthAccountLinkId { get; set; }

    public string? GoogleCalendarId { get; set; }

    public string? GoogleCalendarTimeZone { get; set; }

    public bool OutboundSyncEnabled { get; set; }

    public DateTimeOffset CreatedAtUtc { get; init; }

    public bool AutoSyncEnabled { get; set; } = true;

    public int SyncIntervalMinutes { get; set; } = 30;

    public DateTimeOffset? NextSyncDueAtUtc { get; set; }

    public DateTimeOffset? LastSyncStartedAtUtc { get; set; }

    public DateTimeOffset? LastSyncCompletedAtUtc { get; set; }

    public string LastSyncStatus { get; set; } = GoogleCalendarSyncStatuses.Pending;

    public string? LastSyncError { get; set; }

    public int ImportedEventCount { get; set; }

    public int SkippedRecurringEventCount { get; set; }

    public int SkippedRecurringOverrideCount { get; set; }
}
