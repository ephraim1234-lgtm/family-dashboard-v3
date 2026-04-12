using HouseholdOps.Modules.Notifications.Contracts;

namespace HouseholdOps.Modules.Notifications;

public sealed class EventReminderMutationResult
{
    public EventReminderMutationStatus Status { get; private init; }
    public EventReminderSummaryResponse? Reminder { get; private init; }
    public string? Error { get; private init; }

    public static EventReminderMutationResult Success(EventReminderSummaryResponse reminder) =>
        new() { Status = EventReminderMutationStatus.Succeeded, Reminder = reminder };

    public static EventReminderMutationResult ValidationFailure(string error) =>
        new() { Status = EventReminderMutationStatus.ValidationFailed, Error = error };

    public static EventReminderMutationResult NotFound() =>
        new() { Status = EventReminderMutationStatus.NotFound };
}

public enum EventReminderMutationStatus
{
    Succeeded,
    ValidationFailed,
    NotFound
}
