namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record ScheduledEventSeriesListResponse(
    IReadOnlyList<ScheduledEventSeriesItem> Items);
