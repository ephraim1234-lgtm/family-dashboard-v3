using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Administration;
using HouseholdOps.Modules.Administration.Contracts;
using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Administration;

public sealed class AdminStatsService(
    HouseholdOpsDbContext dbContext,
    IClock clock) : IAdminStatsService
{
    public async Task<AdminStatsResponse> GetStatsAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var nowUtc = clock.UtcNow;
        var weekStart = new DateTimeOffset(nowUtc.UtcDateTime.Date.AddDays(-(int)nowUtc.UtcDateTime.DayOfWeek), TimeSpan.Zero);
        var weekEnd = weekStart.AddDays(7);

        var memberCount = await dbContext.Memberships
            .CountAsync(m => m.HouseholdId == householdId, cancellationToken);

        var activeChoreCount = await dbContext.Chores
            .CountAsync(c => c.HouseholdId == householdId && c.IsActive, cancellationToken);

        var eventsThisWeek = await dbContext.ScheduledEvents
            .CountAsync(e => e.HouseholdId == householdId
                && e.StartsAtUtc >= weekStart
                && e.StartsAtUtc < weekEnd,
                cancellationToken);

        var completionsThisWeek = await dbContext.ChoreCompletions
            .CountAsync(c => c.HouseholdId == householdId
                && c.CompletedAtUtc >= weekStart
                && c.CompletedAtUtc < weekEnd,
                cancellationToken);

        var noteCount = await dbContext.Notes
            .CountAsync(n => n.HouseholdId == householdId, cancellationToken);

        return new AdminStatsResponse(
            memberCount,
            activeChoreCount,
            eventsThisWeek,
            completionsThisWeek,
            noteCount);
    }
}
