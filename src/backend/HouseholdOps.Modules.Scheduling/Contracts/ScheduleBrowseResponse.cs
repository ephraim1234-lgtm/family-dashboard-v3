namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record ScheduleBrowseResponse(
    DateTimeOffset WindowStartUtc,
    DateTimeOffset WindowEndUtc,
    int WindowDays,
    IReadOnlyList<ScheduleBrowseDayGroup> Days);
