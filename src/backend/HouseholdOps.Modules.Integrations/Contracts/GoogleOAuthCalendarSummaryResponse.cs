namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record GoogleOAuthCalendarSummaryResponse(
    Guid AccountLinkId,
    string AccountEmail,
    string CalendarId,
    string DisplayName,
    bool IsPrimary,
    string? AccessRole,
    string? TimeZone);
