namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record GoogleOAuthCalendarListResponse(
    IReadOnlyList<GoogleOAuthCalendarSummaryResponse> Items);
