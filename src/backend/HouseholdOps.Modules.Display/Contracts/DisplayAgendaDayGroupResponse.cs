namespace HouseholdOps.Modules.Display.Contracts;

// Day-grouped agenda rollup that mirrors the /app home shape. The existing
// DisplayAgendaDaySummaryResponse kept counts only; kiosks now get the full
// per-day event list so they can render "Tomorrow: Soccer 4pm, Piano 6pm"
// without the client having to regroup the flat Items array.
public sealed record DisplayAgendaDayGroupResponse(
    DateOnly Date,
    string Label,
    IReadOnlyList<DisplayAgendaItemResponse> Events);
