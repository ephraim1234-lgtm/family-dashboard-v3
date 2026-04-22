using HouseholdOps.Modules.Integrations.Contracts;

namespace HouseholdOps.Modules.Integrations;

public enum GoogleCalendarLinkMutationStatus
{
    Succeeded,
    ValidationFailed,
    Duplicate,
    Conflict,
    NotFound
}

public sealed record GoogleCalendarLinkMutationResult(
    GoogleCalendarLinkMutationStatus Status,
    string? Error,
    GoogleCalendarLinkSummaryResponse? Link)
{
    public static GoogleCalendarLinkMutationResult Success(
        GoogleCalendarLinkSummaryResponse link) => new(
            GoogleCalendarLinkMutationStatus.Succeeded,
            null,
            link);

    public static GoogleCalendarLinkMutationResult ValidationFailure(
        string error) => new(
            GoogleCalendarLinkMutationStatus.ValidationFailed,
            error,
            null);

    public static GoogleCalendarLinkMutationResult Duplicate(
        string error) => new(
            GoogleCalendarLinkMutationStatus.Duplicate,
            error,
            null);

    public static GoogleCalendarLinkMutationResult Conflict(
        string error) => new(
            GoogleCalendarLinkMutationStatus.Conflict,
            error,
            null);

    public static GoogleCalendarLinkMutationResult NotFound() => new(
        GoogleCalendarLinkMutationStatus.NotFound,
        null,
        null);
}
