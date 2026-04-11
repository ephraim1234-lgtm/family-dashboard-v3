namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record ScheduleBrowseDayGroup(
    DateOnly Date,
    IReadOnlyList<ScheduleBrowseItem> Items);
