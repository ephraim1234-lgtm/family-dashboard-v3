namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record UpcomingEventsRequest(
    Guid HouseholdId,
    DateTimeOffset WindowStartUtc,
    DateTimeOffset WindowEndUtc);
