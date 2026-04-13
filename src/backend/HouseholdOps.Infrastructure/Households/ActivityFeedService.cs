using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Households.Contracts;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Households;

public sealed class ActivityFeedService(HouseholdOpsDbContext dbContext) : IActivityFeedService
{
    private const int MaxItems = 20;

    public async Task<ActivityFeedResponse> GetRecentActivityAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var completions = await dbContext.ChoreCompletions
            .Where(c => c.HouseholdId == householdId)
            .OrderByDescending(c => c.CompletedAtUtc)
            .Take(MaxItems)
            .Select(c => new ActivityFeedItem(
                "ChoreCompletion",
                c.ChoreTitle,
                null,
                c.CompletedByDisplayName,
                c.CompletedAtUtc))
            .ToListAsync(cancellationToken);

        var notes = await dbContext.Notes
            .Where(n => n.HouseholdId == householdId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(MaxItems)
            .Select(n => new ActivityFeedItem(
                "NoteCreated",
                n.Title,
                n.Body,
                n.AuthorDisplayName,
                n.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        var items = completions
            .Concat(notes)
            .OrderByDescending(i => i.OccurredAtUtc)
            .Take(MaxItems)
            .ToList();

        return new ActivityFeedResponse(items);
    }
}
