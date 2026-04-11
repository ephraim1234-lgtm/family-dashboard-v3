namespace HouseholdOps.Modules.Scheduling;

public sealed class ScheduledEvent
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsAllDay { get; set; }

    public DateTimeOffset? StartsAtUtc { get; set; }

    public DateTimeOffset? EndsAtUtc { get; set; }

    public EventRecurrencePattern RecurrencePattern { get; set; } = EventRecurrencePattern.None;

    public int WeeklyDaysMask { get; set; }

    public DateTimeOffset? RecursUntilUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; init; }
}
