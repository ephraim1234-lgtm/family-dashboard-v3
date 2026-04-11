namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record CreateScheduledEventRequest(
    string Title,
    string? Description,
    bool IsAllDay,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    ScheduledEventRecurrenceRequest? Recurrence);
