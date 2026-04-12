namespace HouseholdOps.Modules.Notifications.Contracts;

public sealed record CreateEventReminderRequest(
    Guid ScheduledEventId,
    int MinutesBefore);
