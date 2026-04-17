namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayProjectionResponse(
    string AccessMode,
    string DeviceName,
    string HouseholdName,
    string PresentationMode,
    string AgendaDensityMode,
    string AccessTokenHint,
    DateTimeOffset GeneratedAtUtc,
    IReadOnlyList<DisplayProjectionSectionResponse> Sections,
    DisplayAgendaSectionResponse AgendaSection,
    IReadOnlyList<DisplayReminderItem> UpcomingReminders,
    IReadOnlyList<DisplayChoreItem> TodayChores);
