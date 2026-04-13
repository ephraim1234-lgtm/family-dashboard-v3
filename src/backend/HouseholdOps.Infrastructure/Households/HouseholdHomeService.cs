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

public sealed class HouseholdHomeService(
    HouseholdOpsDbContext dbContext,
    IClock clock,
    IAgendaQueryService agendaQueryService) : IHouseholdHomeService
{
    private const int RecentActivityLimit = 5;

    public async Task<HouseholdHomeResponse> GetHomeAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var nowUtc = clock.UtcNow;
        var todayStart = new DateTimeOffset(nowUtc.UtcDateTime.Date, TimeSpan.Zero);
        var todayEnd = todayStart.AddDays(1);
        var weekEnd = todayStart.AddDays(7);

        // Today's events
        var agenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(householdId, todayStart, todayEnd),
            cancellationToken);

        var todayEvents = agenda.Items
            .Select(i => new HomeEvent(i.Title, i.StartsAtUtc, i.EndsAtUtc, i.IsAllDay))
            .ToList();

        // Today's chores (daily or matching today's weekday)
        var todayDayBit = 1 << (int)nowUtc.UtcDateTime.DayOfWeek;
        var todayChoreEntities = await dbContext.Chores
            .Where(c => c.HouseholdId == householdId
                && c.IsActive
                && (c.RecurrenceKind == ChoreRecurrenceKind.Daily
                    || (c.RecurrenceKind == ChoreRecurrenceKind.Weekly
                        && (c.WeeklyDaysMask & todayDayBit) != 0)))
            .OrderBy(c => c.Title)
            .Select(c => new { c.Id, c.Title, c.AssignedMemberName })
            .ToListAsync(cancellationToken);

        // Check which chores were completed today
        var todayChoreIds = todayChoreEntities.Select(c => c.Id).ToList();
        var completedTodayIds = await dbContext.ChoreCompletions
            .Where(cc => cc.HouseholdId == householdId
                && todayChoreIds.Contains(cc.ChoreId)
                && cc.CompletedAtUtc >= todayStart
                && cc.CompletedAtUtc < todayEnd)
            .Select(cc => cc.ChoreId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var completedTodaySet = completedTodayIds.ToHashSet();
        var todayChores = todayChoreEntities
            .Select(c => new HomeChore(c.Id, c.Title, c.AssignedMemberName, completedTodaySet.Contains(c.Id)))
            .ToList();

        // Pinned notes
        var pinnedNotes = await dbContext.Notes
            .Where(n => n.HouseholdId == householdId && n.IsPinned)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Select(n => new HomeNote(n.Id, n.Title, n.Body, n.AuthorDisplayName))
            .ToListAsync(cancellationToken);

        // Recent activity (last 5 merged items)
        var recentCompletions = await dbContext.ChoreCompletions
            .Where(c => c.HouseholdId == householdId)
            .OrderByDescending(c => c.CompletedAtUtc)
            .Take(RecentActivityLimit)
            .Select(c => new HomeActivityItem(
                "ChoreCompletion", c.ChoreTitle, null, c.CompletedByDisplayName, c.CompletedAtUtc))
            .ToListAsync(cancellationToken);

        var recentNotes = await dbContext.Notes
            .Where(n => n.HouseholdId == householdId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(RecentActivityLimit)
            .Select(n => new HomeActivityItem(
                "NoteCreated", n.Title, n.Body, n.AuthorDisplayName, n.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        var recentActivity = recentCompletions
            .Concat(recentNotes)
            .OrderByDescending(i => i.OccurredAtUtc)
            .Take(RecentActivityLimit)
            .ToList();

        // Upcoming event count (next 7 days, excluding today)
        var upcomingAgenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(householdId, todayEnd, weekEnd),
            cancellationToken);
        var upcomingEventCount = upcomingAgenda.Items.Count;

        // Pending reminders today
        var pendingReminderCount = await dbContext.EventReminders
            .CountAsync(r =>
                r.HouseholdId == householdId
                && r.Status == EventReminderStatuses.Pending
                && r.DueAtUtc >= todayStart
                && r.DueAtUtc < todayEnd,
                cancellationToken);

        return new HouseholdHomeResponse(
            todayEvents,
            todayChores,
            pinnedNotes,
            recentActivity,
            upcomingEventCount,
            pendingReminderCount);
    }
}
