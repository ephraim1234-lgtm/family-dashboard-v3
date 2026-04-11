namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record ScheduledEventRecurrenceRequest(
    string Pattern,
    IReadOnlyList<string>? WeeklyDays,
    DateTimeOffset? RecursUntilUtc);
