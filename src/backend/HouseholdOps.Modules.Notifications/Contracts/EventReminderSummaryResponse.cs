namespace HouseholdOps.Modules.Notifications.Contracts;

public sealed record EventReminderSummaryResponse(
    Guid Id,
    Guid ScheduledEventId,
    string EventTitle,
    int MinutesBefore,
    DateTimeOffset DueAtUtc,
    string Status,
    DateTimeOffset? FiredAtUtc,
    DateTimeOffset CreatedAtUtc,
    bool IsReadOnly,
    bool CanDismiss,
    bool CanSnooze,
    bool CanDelete);
