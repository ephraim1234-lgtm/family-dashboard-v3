namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record ScheduledEventSeriesItem(
    Guid Id,
    string Title,
    string? Description,
    bool IsAllDay,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    bool IsRecurring,
    string RecurrencePattern,
    string RecurrenceSummary,
    IReadOnlyList<string> WeeklyDays,
    DateTimeOffset? RecursUntilUtc,
    bool IsImported,
    string? SourceKind,
    DateTimeOffset? NextOccurrenceStartsAtUtc,
    DateTimeOffset CreatedAtUtc);
