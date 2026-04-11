namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record GoogleCalendarLinkListResponse(
    IReadOnlyList<GoogleCalendarLinkSummaryResponse> Items);
