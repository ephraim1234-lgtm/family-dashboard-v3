namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayAgendaDaySummaryResponse(
    DateOnly Date,
    string Label,
    int TotalCount,
    int AllDayCount,
    int TimedCount,
    DateTimeOffset? FirstStartsAtUtc);
