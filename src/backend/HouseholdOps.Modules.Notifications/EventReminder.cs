namespace HouseholdOps.Modules.Notifications;

public sealed class EventReminder
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    // Plain Guid — no EF FK to Scheduling to preserve module boundary.
    public Guid ScheduledEventId { get; init; }

    // Denormalized so display works even if the source event is later removed.
    public string EventTitle { get; set; } = string.Empty;

    public int MinutesBefore { get; init; }

    public DateTimeOffset DueAtUtc { get; init; }

    public string Status { get; set; } = EventReminderStatuses.Pending;

    public DateTimeOffset? FiredAtUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; init; }
}
