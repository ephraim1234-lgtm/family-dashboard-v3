using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Notifications.Contracts;
using HouseholdOps.Modules.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Notifications;

public sealed class EventReminderService(HouseholdOpsDbContext dbContext) : IEventReminderService
{
    private const int MinimumReminderMinutes = 1;
    private const int MaximumReminderMinutes = 7 * 24 * 60;
    private const int MaximumSnoozeMinutes = 24 * 60;

    public async Task<EventReminderListResponse> ListRemindersAsync(
        Guid householdId,
        bool isOwner,
        CancellationToken cancellationToken)
    {
        var reminders = await dbContext.EventReminders
            .Where(reminder => reminder.HouseholdId == householdId)
            .OrderBy(reminder => reminder.DueAtUtc)
            .ThenBy(reminder => reminder.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var validReminders = await PruneInvalidRemindersAsync(reminders, cancellationToken);

        return new EventReminderListResponse(
            validReminders
                .Select(reminder => MapReminder(reminder, isOwner))
                .ToList());
    }

    public async Task<EventReminderMutationResult> CreateReminderAsync(
        Guid householdId,
        CreateEventReminderRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        if (request.MinutesBefore < MinimumReminderMinutes
            || request.MinutesBefore > MaximumReminderMinutes)
        {
            return EventReminderMutationResult.ValidationFailure(
                $"Reminder lead time must be between {MinimumReminderMinutes} and {MaximumReminderMinutes} minutes.");
        }

        var scheduledEvent = await dbContext.ScheduledEvents
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == request.ScheduledEventId,
                cancellationToken);

        var eligibilityReason = ScheduleItemPolicy.GetReminderEligibilityReason(
            scheduledEvent,
            isOwner: true);

        if (eligibilityReason is not null)
        {
            return EventReminderMutationResult.ValidationFailure(eligibilityReason);
        }

        var reminder = new EventReminder
        {
            HouseholdId = householdId,
            ScheduledEventId = request.ScheduledEventId,
            EventTitle = scheduledEvent!.Title,
            MinutesBefore = request.MinutesBefore,
            DueAtUtc = scheduledEvent.StartsAtUtc!.Value.AddMinutes(-request.MinutesBefore),
            Status = EventReminderStatuses.Pending,
            CreatedAtUtc = createdAtUtc
        };

        dbContext.EventReminders.Add(reminder);
        await dbContext.SaveChangesAsync(cancellationToken);

        return EventReminderMutationResult.Success(MapReminder(reminder, isOwner: true));
    }

    public async Task<EventReminderMutationResult> DeleteReminderAsync(
        Guid householdId,
        Guid reminderId,
        CancellationToken cancellationToken)
    {
        var reminder = await dbContext.EventReminders
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == reminderId,
                cancellationToken);

        if (reminder is null)
        {
            return EventReminderMutationResult.NotFound();
        }

        var capabilities = ScheduleItemPolicy.BuildReminderCapabilities(reminder, isOwner: true);
        if (!capabilities.CanDelete)
        {
            return EventReminderMutationResult.ValidationFailure(
                GetReminderMutationError(reminder.Status));
        }

        var response = MapReminder(reminder, isOwner: true);
        dbContext.EventReminders.Remove(reminder);
        await dbContext.SaveChangesAsync(cancellationToken);

        return EventReminderMutationResult.Success(response);
    }

    public async Task<EventReminderMutationResult> DismissReminderAsync(
        Guid householdId,
        Guid reminderId,
        CancellationToken cancellationToken)
    {
        var reminder = await dbContext.EventReminders
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == reminderId,
                cancellationToken);

        if (reminder is null)
        {
            return EventReminderMutationResult.NotFound();
        }

        var capabilities = ScheduleItemPolicy.BuildReminderCapabilities(reminder, isOwner: true);
        if (!capabilities.CanDismiss)
        {
            return EventReminderMutationResult.ValidationFailure(
                GetReminderMutationError(reminder.Status));
        }

        reminder.Status = EventReminderStatuses.Dismissed;
        await dbContext.SaveChangesAsync(cancellationToken);

        return EventReminderMutationResult.Success(MapReminder(reminder, isOwner: true));
    }

    public async Task<EventReminderMutationResult> SnoozeReminderAsync(
        Guid householdId,
        Guid reminderId,
        int snoozeMinutes,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        if (snoozeMinutes < MinimumReminderMinutes
            || snoozeMinutes > MaximumSnoozeMinutes)
        {
            return EventReminderMutationResult.ValidationFailure(
                $"Snooze time must be between {MinimumReminderMinutes} and {MaximumSnoozeMinutes} minutes.");
        }

        var reminder = await dbContext.EventReminders
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == reminderId,
                cancellationToken);

        if (reminder is null)
        {
            return EventReminderMutationResult.NotFound();
        }

        var capabilities = ScheduleItemPolicy.BuildReminderCapabilities(reminder, isOwner: true);
        if (!capabilities.CanSnooze)
        {
            return EventReminderMutationResult.ValidationFailure(
                GetReminderMutationError(reminder.Status));
        }

        reminder.DueAtUtc = nowUtc.AddMinutes(snoozeMinutes);
        reminder.Status = EventReminderStatuses.Pending;
        reminder.FiredAtUtc = null;
        await dbContext.SaveChangesAsync(cancellationToken);

        return EventReminderMutationResult.Success(MapReminder(reminder, isOwner: true));
    }

    public async Task ReconcileEventRemindersAsync(
        Guid householdId,
        Guid scheduledEventId,
        CancellationToken cancellationToken)
    {
        var reminders = await dbContext.EventReminders
            .Where(reminder =>
                reminder.HouseholdId == householdId
                && reminder.ScheduledEventId == scheduledEventId)
            .ToListAsync(cancellationToken);

        if (reminders.Count == 0)
        {
            return;
        }

        var scheduledEvent = await dbContext.ScheduledEvents
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == scheduledEventId,
                cancellationToken);

        if (!ScheduleItemPolicy.SupportsReminderLifecycle(scheduledEvent))
        {
            dbContext.EventReminders.RemoveRange(reminders);
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var nextStart = scheduledEvent!.StartsAtUtc!.Value;

        foreach (var reminder in reminders)
        {
            reminder.EventTitle = scheduledEvent.Title;
            reminder.DueAtUtc = nextStart.AddMinutes(-reminder.MinutesBefore);
            reminder.Status = EventReminderStatuses.Pending;
            reminder.FiredAtUtc = null;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task RemoveEventRemindersAsync(
        Guid householdId,
        Guid scheduledEventId,
        CancellationToken cancellationToken) =>
        RemoveEventRemindersAsync(householdId, [scheduledEventId], cancellationToken);

    public async Task RemoveEventRemindersAsync(
        Guid householdId,
        IReadOnlyCollection<Guid> scheduledEventIds,
        CancellationToken cancellationToken)
    {
        if (scheduledEventIds.Count == 0)
        {
            return;
        }

        var reminders = await dbContext.EventReminders
            .Where(reminder =>
                reminder.HouseholdId == householdId
                && scheduledEventIds.Contains(reminder.ScheduledEventId))
            .ToListAsync(cancellationToken);

        if (reminders.Count == 0)
        {
            return;
        }

        dbContext.EventReminders.RemoveRange(reminders);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> FireDueRemindersAsync(
        DateTimeOffset asOfUtc,
        CancellationToken cancellationToken)
    {
        var dueReminders = await dbContext.EventReminders
            .Where(reminder =>
                reminder.Status == EventReminderStatuses.Pending
                && reminder.DueAtUtc <= asOfUtc)
            .OrderBy(reminder => reminder.DueAtUtc)
            .ToListAsync(cancellationToken);

        if (dueReminders.Count == 0)
        {
            return 0;
        }

        var eventsById = await LoadScheduledEventsByIdAsync(
            dueReminders.Select(reminder => reminder.ScheduledEventId).ToArray(),
            cancellationToken);

        var invalidReminders = dueReminders
            .Where(reminder =>
                !ScheduleItemPolicy.SupportsReminderLifecycle(
                    eventsById.GetValueOrDefault(reminder.ScheduledEventId)))
            .ToList();

        if (invalidReminders.Count > 0)
        {
            dbContext.EventReminders.RemoveRange(invalidReminders);
        }

        var validReminders = dueReminders
            .Except(invalidReminders)
            .ToList();

        foreach (var reminder in validReminders)
        {
            if (eventsById.TryGetValue(reminder.ScheduledEventId, out var scheduledEvent))
            {
                reminder.EventTitle = scheduledEvent.Title;
            }

            reminder.Status = EventReminderStatuses.Fired;
            reminder.FiredAtUtc = asOfUtc;
        }

        if (invalidReminders.Count > 0 || validReminders.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return validReminders.Count;
    }

    private async Task<List<EventReminder>> PruneInvalidRemindersAsync(
        IReadOnlyCollection<EventReminder> reminders,
        CancellationToken cancellationToken)
    {
        if (reminders.Count == 0)
        {
            return [];
        }

        var eventsById = await LoadScheduledEventsByIdAsync(
            reminders.Select(reminder => reminder.ScheduledEventId).Distinct().ToArray(),
            cancellationToken);

        var invalidReminders = reminders
            .Where(reminder =>
                !ScheduleItemPolicy.SupportsReminderLifecycle(
                    eventsById.GetValueOrDefault(reminder.ScheduledEventId)))
            .ToList();

        if (invalidReminders.Count > 0)
        {
            dbContext.EventReminders.RemoveRange(invalidReminders);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return reminders
            .Except(invalidReminders)
            .ToList();
    }

    private async Task<Dictionary<Guid, ScheduledEvent>> LoadScheduledEventsByIdAsync(
        IReadOnlyCollection<Guid> eventIds,
        CancellationToken cancellationToken)
    {
        if (eventIds.Count == 0)
        {
            return [];
        }

        return await dbContext.ScheduledEvents
            .Where(item => eventIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, cancellationToken);
    }

    private static EventReminderSummaryResponse MapReminder(
        EventReminder reminder,
        bool isOwner)
    {
        var capabilities = ScheduleItemPolicy.BuildReminderCapabilities(reminder, isOwner);

        return new EventReminderSummaryResponse(
            reminder.Id,
            reminder.ScheduledEventId,
            reminder.EventTitle,
            reminder.MinutesBefore,
            reminder.DueAtUtc,
            reminder.Status,
            reminder.FiredAtUtc,
            reminder.CreatedAtUtc,
            capabilities.IsReadOnly,
            capabilities.CanDismiss,
            capabilities.CanSnooze,
            capabilities.CanDelete);
    }

    private static string GetReminderMutationError(string status) =>
        status switch
        {
            EventReminderStatuses.Dismissed => ScheduleItemPolicy.ReminderDismissedReadOnlyReason,
            EventReminderStatuses.Fired => ScheduleItemPolicy.ReminderFiredReadOnlyReason,
            _ => "This reminder can no longer be changed."
        };
}
