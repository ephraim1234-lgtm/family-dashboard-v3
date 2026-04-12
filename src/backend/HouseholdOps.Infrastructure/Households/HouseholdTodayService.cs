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
    IAgendaQueryService agendaQueryService) : IHouseholdTodayService
{
    public async Task<HouseholdTodayResponse> GetTodayAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var nowUtc = clock.UtcNow;
        var todayStart = new DateTimeOffset(nowUtc.UtcDateTime.Date, TimeSpan.Zero);
        var todayEnd = todayStart.AddDays(1);

        var agenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(householdId, todayStart, todayEnd),
            cancellationToken);

        var todayEvents = agenda.Items
            .Select(i => new HouseholdTodayEvent(i.Title, i.StartsAtUtc, i.EndsAtUtc, i.IsAllDay))
            .ToList();

        var todayDayBit = 1 << (int)nowUtc.UtcDateTime.DayOfWeek;
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

        var pendingReminderCount = await dbContext.EventReminders
            .CountAsync(r =>
                r.HouseholdId == householdId
                && r.Status == EventReminderStatuses.Pending
                && r.DueAtUtc >= todayStart
                && r.DueAtUtc < todayEnd,
                cancellationToken);

        return new HouseholdTodayResponse(todayEvents, todayChores, pinnedNotes, pendingReminderCount);
    }
}
