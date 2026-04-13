using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Administration;
using HouseholdOps.Modules.Administration.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Administration;

public sealed class AdminChoreInsightsService(
    HouseholdOpsDbContext dbContext,
    IClock clock) : IAdminChoreInsightsService
{
    public async Task<AdminChoreInsightsResponse> GetChoreInsightsAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var nowUtc = clock.UtcNow;
        var weekStart = new DateTimeOffset(
            nowUtc.UtcDateTime.Date.AddDays(-(int)nowUtc.UtcDateTime.DayOfWeek),
            TimeSpan.Zero);
        var weekEnd = weekStart.AddDays(7);
        var monthStart = new DateTimeOffset(
            new DateTime(nowUtc.UtcDateTime.Year, nowUtc.UtcDateTime.Month, 1),
            TimeSpan.Zero);
        var monthEnd = monthStart.AddMonths(1);

        var chores = await dbContext.Chores
            .Where(c => c.HouseholdId == householdId && c.IsActive)
            .Select(c => new { c.Id, c.Title })
            .ToListAsync(cancellationToken);

        var choreIds = chores.Select(c => c.Id).ToList();

        var completions = await dbContext.ChoreCompletions
            .Where(cc => cc.HouseholdId == householdId
                && choreIds.Contains(cc.ChoreId)
                && cc.CompletedAtUtc >= monthStart
                && cc.CompletedAtUtc < monthEnd)
            .Select(cc => new
            {
                cc.ChoreId,
                cc.CompletedAtUtc,
                cc.CompletedByDisplayName
            })
            .ToListAsync(cancellationToken);

        var items = chores.Select(c =>
        {
            var choreCompletions = completions.Where(cc => cc.ChoreId == c.Id).ToList();
            var thisWeek = choreCompletions.Count(cc => cc.CompletedAtUtc >= weekStart && cc.CompletedAtUtc < weekEnd);
            var thisMonth = choreCompletions.Count;
            var last = choreCompletions.OrderByDescending(cc => cc.CompletedAtUtc).FirstOrDefault();

            return new ChoreInsightItem(
                c.Id,
                c.Title,
                thisWeek,
                thisMonth,
                last?.CompletedByDisplayName,
                last?.CompletedAtUtc);
        })
        .OrderByDescending(i => i.CompletionsThisWeek)
        .ThenByDescending(i => i.CompletionsThisMonth)
        .ToList();

        return new AdminChoreInsightsResponse(
            items,
            items.Sum(i => i.CompletionsThisWeek),
            items.Sum(i => i.CompletionsThisMonth));
    }
}
