using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Notifications.Contracts;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Notifications;

public sealed class EventReminderService(HouseholdOpsDbContext dbContext) : IEventReminderService
{
    private const int MinLeadTimeMinutes = 1;
    private const int MaxLeadTimeMinutes = 10080; // 7 days

    public async Task<EventReminderListResponse> ListRemindersAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.EventReminders
            .Where(r => r.HouseholdId == householdId)
            .OrderBy(r => r.DueAtUtc)
            .Select(r => new EventReminderSummaryResponse(
                r.Id,
                r.ScheduledEventId,
                r.EventTitle,
                r.MinutesBefore,
                r.DueAtUtc,
                r.Status,
                r.FiredAtUtc,
                r.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new EventReminderListResponse(items);
    }

    public async Task<EventReminderMutationResult> CreateReminderAsync(
        Guid householdId,
        CreateEventReminderRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        if (request.MinutesBefore < MinLeadTimeMinutes || request.MinutesBefore > MaxLeadTimeMinutes)
        {
            return EventReminderMutationResult.ValidationFailure(
                $"Lead time must be between {MinLeadTimeMinutes} and {MaxLeadTimeMinutes} minutes.");
        }

        var scheduledEvent = await dbContext.ScheduledEvents
            .Where(e => e.HouseholdId == householdId && e.Id == request.ScheduledEventId)
            .Select(e => new { e.Id, e.Title, e.IsAllDay, e.StartsAtUtc })
            .SingleOrDefaultAsync(cancellationToken);

        if (scheduledEvent is null)
        {
            return EventReminderMutationResult.ValidationFailure(
                "The scheduled event was not found for this household.");
        }

        if (scheduledEvent.IsAllDay || scheduledEvent.StartsAtUtc is null)
        {
            return EventReminderMutationResult.ValidationFailure(
                "Reminders require an event with a specific start time. All-day events are not supported.");
        }

        var dueAtUtc = scheduledEvent.StartsAtUtc.Value
            .AddMinutes(-request.MinutesBefore);

        var reminder = new EventReminder
        {
            HouseholdId = householdId,
            ScheduledEventId = request.ScheduledEventId,
            EventTitle = scheduledEvent.Title,
            MinutesBefore = request.MinutesBefore,
            DueAtUtc = dueAtUtc,
            Status = EventReminderStatuses.Pending,
            CreatedAtUtc = createdAtUtc
        };

        dbContext.EventReminders.Add(reminder);
        await dbContext.SaveChangesAsync(cancellationToken);

        return EventReminderMutationResult.Success(MapSummary(reminder));
    }

    public async Task<bool> DeleteReminderAsync(
        Guid householdId,
        Guid reminderId,
        CancellationToken cancellationToken)
    {
        var reminder = await dbContext.EventReminders
            .SingleOrDefaultAsync(
                r => r.HouseholdId == householdId && r.Id == reminderId,
                cancellationToken);

        if (reminder is null)
        {
            return false;
        }

        dbContext.EventReminders.Remove(reminder);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> FireDueRemindersAsync(
        DateTimeOffset asOfUtc,
        CancellationToken cancellationToken)
    {
        var due = await dbContext.EventReminders
            .Where(r =>
                r.Status == EventReminderStatuses.Pending
                && r.DueAtUtc <= asOfUtc)
            .ToListAsync(cancellationToken);

        if (due.Count == 0)
        {
            return 0;
        }

        foreach (var reminder in due)
        {
            reminder.Status = EventReminderStatuses.Fired;
            reminder.FiredAtUtc = asOfUtc;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return due.Count;
    }

    private static EventReminderSummaryResponse MapSummary(EventReminder reminder) =>
        new(
            reminder.Id,
            reminder.ScheduledEventId,
            reminder.EventTitle,
            reminder.MinutesBefore,
            reminder.DueAtUtc,
            reminder.Status,
            reminder.FiredAtUtc,
            reminder.CreatedAtUtc);
}
