using HouseholdOps.Modules.Notifications.Contracts;

namespace HouseholdOps.Modules.Notifications;

public interface IEventReminderService
{
    Task<EventReminderListResponse> ListRemindersAsync(
        Guid householdId,
        bool isOwner,
        CancellationToken cancellationToken);

    Task<EventReminderMutationResult> CreateReminderAsync(
        Guid householdId,
        CreateEventReminderRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<EventReminderMutationResult> DeleteReminderAsync(
        Guid householdId,
        Guid reminderId,
        CancellationToken cancellationToken);

    Task<EventReminderMutationResult> DismissReminderAsync(
        Guid householdId,
        Guid reminderId,
        CancellationToken cancellationToken);

    Task<EventReminderMutationResult> SnoozeReminderAsync(
        Guid householdId,
        Guid reminderId,
        int snoozeMinutes,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task ReconcileEventRemindersAsync(
        Guid householdId,
        Guid scheduledEventId,
        CancellationToken cancellationToken);

    Task RemoveEventRemindersAsync(
        Guid householdId,
        Guid scheduledEventId,
        CancellationToken cancellationToken);

    Task RemoveEventRemindersAsync(
        Guid householdId,
        IReadOnlyCollection<Guid> scheduledEventIds,
        CancellationToken cancellationToken);

    Task<int> FireDueRemindersAsync(
        DateTimeOffset asOfUtc,
        CancellationToken cancellationToken);
}
