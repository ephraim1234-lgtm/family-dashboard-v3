using HouseholdOps.Modules.Integrations.Contracts;

namespace HouseholdOps.Modules.Integrations;

public enum GoogleCalendarSyncResultStatus
{
    Succeeded,
    NotFound,
    Failed
}

public sealed record GoogleCalendarSyncResult(
    GoogleCalendarSyncResultStatus Status,
    string? Error,
    GoogleCalendarLinkSummaryResponse? Link)
{
    public static GoogleCalendarSyncResult Success(
        GoogleCalendarLinkSummaryResponse link) => new(
            GoogleCalendarSyncResultStatus.Succeeded,
            null,
            link);

    public static GoogleCalendarSyncResult Failed(
        string error,
        GoogleCalendarLinkSummaryResponse? link) => new(
            GoogleCalendarSyncResultStatus.Failed,
            error,
            link);

    public static GoogleCalendarSyncResult NotFound() => new(
        GoogleCalendarSyncResultStatus.NotFound,
        null,
        null);
}
