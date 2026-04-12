namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record CreateManagedGoogleCalendarLinkRequest(
    Guid AccountLinkId,
    string CalendarId,
    string DisplayName,
    string? CalendarTimeZone);
