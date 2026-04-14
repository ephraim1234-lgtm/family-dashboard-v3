namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayAgendaSectionResponse(
    DateTimeOffset WindowStartUtc,
    DateTimeOffset WindowEndUtc,
    DisplayAgendaItemResponse? NextItem,
    IReadOnlyList<DisplayAgendaItemResponse> AllDayItems,
    IReadOnlyList<DisplayAgendaItemResponse> SoonItems,
    IReadOnlyList<DisplayAgendaItemResponse> LaterTodayItems,
    IReadOnlyList<DisplayAgendaDaySummaryResponse> UpcomingDays,
    IReadOnlyList<DisplayAgendaDayGroupResponse> UpcomingDayGroups,
    IReadOnlyList<DisplayAgendaItemResponse> Items);
