namespace HouseholdOps.Modules.Scheduling;

public sealed record ImportedScheduledEvent(
    string SourceEventId,
    string Title,
    string? Description,
    bool IsAllDay,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    EventRecurrencePattern RecurrencePattern,
    int WeeklyDaysMask,
    DateTimeOffset? RecursUntilUtc);
