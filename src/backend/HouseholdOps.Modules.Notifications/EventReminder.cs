namespace HouseholdOps.Modules.Notifications;

public sealed class EventReminder
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    // Plain Guid — no EF FK to Scheduling to preserve module boundary.
    // Plain Guid only: this reminder row represents a live reminder instance
    // for the current eligible occurrence of a local event.
    public Guid ScheduledEventId { get; init; }

    // Denormalized so display works even if the source event is later removed.
    // Denormalized snapshot used while the reminder remains valid.
    public string EventTitle { get; set; } = string.Empty;

    public int MinutesBefore { get; init; }

    // Mutable so snooze operations can shift the due time.
    public DateTimeOffset DueAtUtc { get; set; }

    public string Status { get; set; } = EventReminderStatuses.Pending;

    public DateTimeOffset? FiredAtUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; init; }
}
