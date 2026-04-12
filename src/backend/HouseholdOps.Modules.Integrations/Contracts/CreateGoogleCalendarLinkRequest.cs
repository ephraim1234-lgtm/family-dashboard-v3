namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record CreateGoogleCalendarLinkRequest(
    string DisplayName,
    string FeedUrl);
