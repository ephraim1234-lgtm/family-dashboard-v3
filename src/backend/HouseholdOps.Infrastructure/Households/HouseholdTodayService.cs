using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Households.Contracts;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Modules.Scheduling.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Households;

public sealed class HouseholdTodayService(
    HouseholdOpsDbContext dbContext,
    IClock clock,
    IAgendaQueryService agendaQueryService,
    IEventReminderService eventReminderService) : IHouseholdTodayService
{
    public async Task<HouseholdTodayResponse> GetTodayAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var nowUtc = clock.UtcNow;

        // Anchor "today" to household-local midnight so the digest matches the
        // family's wall clock rather than server UTC.
        var timeZoneId = await dbContext.Households
            .Where(h => h.Id == householdId)
            .Select(h => h.TimeZoneId)
            .SingleOrDefaultAsync(cancellationToken) ?? "UTC";
        var timeZone = HouseholdTimeBoundary.ResolveTimeZone(timeZoneId);
        var (todayStart, todayEnd) = HouseholdTimeBoundary.GetTodayWindowUtc(nowUtc, timeZone);

        var agenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(householdId, todayStart, todayEnd, IsOwner: false),
            cancellationToken);

        var todayEvents = agenda.Items
            .Select(i => new HouseholdTodayEvent(i.Title, i.StartsAtUtc, i.EndsAtUtc, i.IsAllDay))
            .ToList();

        var localNow = TimeZoneInfo.ConvertTime(nowUtc, timeZone);
        var todayDayBit = 1 << (int)localNow.DayOfWeek;
        var todayChores = await dbContext.Chores
            .Where(c => c.HouseholdId == householdId
                && c.IsActive
                && (c.RecurrenceKind == ChoreRecurrenceKind.Daily
                    || (c.RecurrenceKind == ChoreRecurrenceKind.Weekly
                        && (c.WeeklyDaysMask & todayDayBit) != 0)))
            .OrderBy(c => c.Title)
            .Select(c => new HouseholdTodayChore(c.Id, c.Title, c.AssignedMemberName))
            .ToListAsync(cancellationToken);

        var pinnedNotes = await dbContext.Notes
            .Where(n => n.HouseholdId == householdId && n.IsPinned)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Select(n => new HouseholdTodayNote(n.Id, n.Title, n.Body, n.AuthorDisplayName))
            .ToListAsync(cancellationToken);

        var reminderResponse = await eventReminderService.ListRemindersAsync(
            householdId,
            isOwner: false,
            cancellationToken);

        var pendingReminderCount = reminderResponse.Items
            .Count(reminder =>
                reminder.Status == EventReminderStatuses.Pending
                && reminder.DueAtUtc >= todayStart
                && reminder.DueAtUtc < todayEnd);

        return new HouseholdTodayResponse(todayEvents, todayChores, pinnedNotes, pendingReminderCount);
    }
}
