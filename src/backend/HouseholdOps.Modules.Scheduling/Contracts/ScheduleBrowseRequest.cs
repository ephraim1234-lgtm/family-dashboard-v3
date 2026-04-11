namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record ScheduleBrowseRequest(
    Guid HouseholdId,
    DateTimeOffset WindowStartUtc,
    DateTimeOffset WindowEndUtc,
    int WindowDays);
