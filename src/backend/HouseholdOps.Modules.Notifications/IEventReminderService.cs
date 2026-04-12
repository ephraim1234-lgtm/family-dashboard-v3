using HouseholdOps.Modules.Notifications.Contracts;

namespace HouseholdOps.Modules.Notifications;

public interface IEventReminderService
{
    Task<EventReminderListResponse> ListRemindersAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    Task<EventReminderMutationResult> CreateReminderAsync(
        Guid householdId,
        CreateEventReminderRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<bool> DeleteReminderAsync(
        Guid householdId,
        Guid reminderId,
        CancellationToken cancellationToken);

    Task<int> FireDueRemindersAsync(
        DateTimeOffset asOfUtc,
        CancellationToken cancellationToken);
}
