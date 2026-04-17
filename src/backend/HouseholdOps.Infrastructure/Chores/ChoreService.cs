using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Chores.Contracts;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Chores;

public sealed class ChoreService(HouseholdOpsDbContext dbContext) : IChoreManagementService
{
    public async Task<ChoreListResponse> ListChoresAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.Chores
            .Where(c => c.HouseholdId == householdId)
            .OrderBy(c => c.Title)
            .Select(c => MapSummary(c))
            .ToListAsync(cancellationToken);

        return new ChoreListResponse(items);
    }

    public async Task<ChoreMutationResult> CreateChoreAsync(
        Guid householdId,
        CreateChoreRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return ChoreMutationResult.ValidationFailure("Title is required.");

        if (!Enum.TryParse<ChoreCadenceKind>(request.CadenceKind, out var cadence))
            return ChoreMutationResult.ValidationFailure(
                $"CadenceKind must be one of: {string.Join(", ", Enum.GetNames<ChoreCadenceKind>())}.");

        var validationError = ValidateCadenceFields(cadence, request.WeeklyDaysMask, request.DayOfMonth);
        if (validationError is not null)
            return ChoreMutationResult.ValidationFailure(validationError);

        var chore = new Chore
        {
            HouseholdId = householdId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            AssignedToMemberId = request.AssignedToMemberId,
            AssignedToDisplayName = request.AssignedToDisplayName?.Trim(),
            CadenceKind = cadence,
            WeeklyDaysMask = cadence == ChoreCadenceKind.Weekly ? request.WeeklyDaysMask : 0,
            DayOfMonth = cadence == ChoreCadenceKind.Monthly ? request.DayOfMonth : null,
            IsActive = true,
            CreatedAtUtc = createdAtUtc
        };

        dbContext.Chores.Add(chore);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ChoreMutationResult.Success(MapSummary(chore));
    }

    public async Task<ChoreMutationResult> UpdateChoreAsync(
        Guid householdId,
        Guid choreId,
        UpdateChoreRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return ChoreMutationResult.ValidationFailure("Title is required.");

        if (!Enum.TryParse<ChoreCadenceKind>(request.CadenceKind, out var cadence))
            return ChoreMutationResult.ValidationFailure(
                $"CadenceKind must be one of: {string.Join(", ", Enum.GetNames<ChoreCadenceKind>())}.");

        var validationError = ValidateCadenceFields(cadence, request.WeeklyDaysMask, request.DayOfMonth);
        if (validationError is not null)
            return ChoreMutationResult.ValidationFailure(validationError);

        var chore = await dbContext.Chores
            .SingleOrDefaultAsync(
                c => c.HouseholdId == householdId && c.Id == choreId,
                cancellationToken);

        if (chore is null)
            return ChoreMutationResult.NotFound();

        chore.Title = request.Title.Trim();
        chore.Description = request.Description?.Trim();
        chore.AssignedToMemberId = request.AssignedToMemberId;
        chore.AssignedToDisplayName = request.AssignedToDisplayName?.Trim();
        chore.CadenceKind = cadence;
        chore.WeeklyDaysMask = cadence == ChoreCadenceKind.Weekly ? request.WeeklyDaysMask : 0;
        chore.DayOfMonth = cadence == ChoreCadenceKind.Monthly ? request.DayOfMonth : null;
        chore.IsActive = request.IsActive;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ChoreMutationResult.Success(MapSummary(chore));
    }

    public async Task<bool> DeleteChoreAsync(
        Guid householdId,
        Guid choreId,
        CancellationToken cancellationToken)
    {
        var chore = await dbContext.Chores
            .SingleOrDefaultAsync(
                c => c.HouseholdId == householdId && c.Id == choreId,
                cancellationToken);

        if (chore is null)
            return false;

        dbContext.Chores.Remove(chore);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ChoreInstanceListResponse> ListInstancesAsync(
        Guid householdId,
        DateOnly windowStart,
        DateOnly windowEnd,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.ChoreInstances
            .Where(i =>
                i.HouseholdId == householdId
                && i.DueDate >= windowStart
                && i.DueDate <= windowEnd)
            .OrderBy(i => i.DueDate)
            .ThenBy(i => i.ChoreTitle)
            .Select(i => new ChoreInstanceSummaryResponse(
                i.Id,
                i.ChoreId,
                i.ChoreTitle,
                i.AssignedToMemberId,
                i.AssignedToDisplayName,
                i.DueDate,
                i.Status,
                i.CompletedAtUtc,
                i.CompletedByDisplayName,
                i.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new ChoreInstanceListResponse(items);
    }

    public async Task<bool> CompleteInstanceAsync(
        Guid householdId,
        Guid instanceId,
        DateTimeOffset completedAtUtc,
        Guid? completedByMemberId,
        string? completedByDisplayName,
        CancellationToken cancellationToken)
    {
        var instance = await dbContext.ChoreInstances
            .SingleOrDefaultAsync(
                i => i.HouseholdId == householdId && i.Id == instanceId,
                cancellationToken);

        if (instance is null)
            return false;

        instance.Status = ChoreInstanceStatuses.Completed;
        instance.CompletedAtUtc = completedAtUtc;
        instance.CompletedByMemberId = completedByMemberId;
        instance.CompletedByDisplayName = completedByDisplayName?.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> GenerateDueInstancesAsync(
        DateOnly asOfDate,
        int horizonDays,
        Guid? householdId,
        CancellationToken cancellationToken)
    {
        var horizon = asOfDate.AddDays(horizonDays - 1);

        var query = dbContext.Chores.Where(c => c.IsActive);
        if (householdId.HasValue)
            query = query.Where(c => c.HouseholdId == householdId.Value);

        var activeChores = await query.ToListAsync(cancellationToken);

        if (activeChores.Count == 0)
            return 0;

        var choreIds = activeChores.Select(c => c.Id).ToList();

        var existingByChore = await dbContext.ChoreInstances
            .Where(i =>
                choreIds.Contains(i.ChoreId)
                && i.DueDate >= asOfDate
                && i.DueDate <= horizon)
            .GroupBy(i => i.ChoreId)
            .ToDictionaryAsync(
                g => g.Key,
                g => g.Select(i => i.DueDate).ToHashSet(),
                cancellationToken);

        var generatedCount = 0;
        var now = DateTimeOffset.UtcNow;

        foreach (var chore in activeChores)
        {
            var existing = existingByChore.TryGetValue(chore.Id, out var set)
                ? set
                : new HashSet<DateOnly>();

            var dueDates = ComputeDueDates(chore, asOfDate, horizon)
                .Where(d => !existing.Contains(d));

            foreach (var dueDate in dueDates)
            {
                dbContext.ChoreInstances.Add(new ChoreInstance
                {
                    HouseholdId = chore.HouseholdId,
                    ChoreId = chore.Id,
                    ChoreTitle = chore.Title,
                    AssignedToMemberId = chore.AssignedToMemberId,
                    AssignedToDisplayName = chore.AssignedToDisplayName,
                    DueDate = dueDate,
                    Status = ChoreInstanceStatuses.Pending,
                    CreatedAtUtc = now
                });
                generatedCount++;
            }
        }

        if (generatedCount > 0)
            await dbContext.SaveChangesAsync(cancellationToken);

        return generatedCount;
    }

    private static IEnumerable<DateOnly> ComputeDueDates(Chore chore, DateOnly start, DateOnly end)
    {
        return chore.CadenceKind switch
        {
            ChoreCadenceKind.Daily => DatesInRange(start, end),
            ChoreCadenceKind.Weekly => DatesInRange(start, end)
                .Where(d => MatchesDayMask(d, chore.WeeklyDaysMask)),
            ChoreCadenceKind.Monthly => DatesInRange(start, end)
                .Where(d => chore.DayOfMonth.HasValue && d.Day == chore.DayOfMonth.Value),
            _ => []
        };
    }

    private static IEnumerable<DateOnly> DatesInRange(DateOnly start, DateOnly end)
    {
        for (var d = start; d <= end; d = d.AddDays(1))
            yield return d;
    }

    private static bool MatchesDayMask(DateOnly date, int mask)
    {
        var bit = date.DayOfWeek switch
        {
            DayOfWeek.Sunday => 1 << 0,
            DayOfWeek.Monday => 1 << 1,
            DayOfWeek.Tuesday => 1 << 2,
            DayOfWeek.Wednesday => 1 << 3,
            DayOfWeek.Thursday => 1 << 4,
            DayOfWeek.Friday => 1 << 5,
            DayOfWeek.Saturday => 1 << 6,
            _ => 0
        };
        return (mask & bit) != 0;
    }

    private static string? ValidateCadenceFields(ChoreCadenceKind cadence, int weeklyDaysMask, int? dayOfMonth)
    {
        if (cadence == ChoreCadenceKind.Weekly && weeklyDaysMask == 0)
            return "WeeklyDaysMask must select at least one day for a weekly chore.";

        if (cadence == ChoreCadenceKind.Monthly)
        {
            if (dayOfMonth is null or < 1 or > 28)
                return "DayOfMonth must be between 1 and 28 for a monthly chore.";
        }

        return null;
    }

    private static ChoreSummaryResponse MapSummary(Chore chore) =>
        new(
            chore.Id,
            chore.HouseholdId,
            chore.Title,
            chore.Description,
            chore.AssignedToMemberId,
            chore.AssignedToDisplayName,
            chore.CadenceKind.ToString(),
            chore.WeeklyDaysMask,
            chore.DayOfMonth,
            chore.IsActive,
            chore.CreatedAtUtc);
}
