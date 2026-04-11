namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record ScheduleBrowseItem(
    Guid EventId,
    string Title,
    string? Description,
    bool IsAllDay,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    bool IsRecurring,
    string RecurrencePattern,
    string RecurrenceSummary);
