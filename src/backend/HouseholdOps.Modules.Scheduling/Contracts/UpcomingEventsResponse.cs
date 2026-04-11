namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record UpcomingEventsResponse(
    DateTimeOffset WindowStartUtc,
    DateTimeOffset WindowEndUtc,
    IReadOnlyList<UpcomingEventItem> Items);
