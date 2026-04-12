using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Chores.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Chores;

public sealed class ChoreService(
    HouseholdOpsDbContext dbContext,
    IClock clock) : IChoreService
{
    public async Task<ChoreListResponse> ListChoresAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var chores = await dbContext.Chores
            .Where(c => c.HouseholdId == householdId)
            .OrderByDescending(c => c.IsActive)
            .ThenBy(c => c.Title)
            .Select(c => ToItem(c))
            .ToListAsync(cancellationToken);

        return new ChoreListResponse(chores);
    }

    public async Task<(ChoreMutationResult Result, ChoreItem? Item)> CreateChoreAsync(
        Guid householdId,
        CreateChoreRequest request,
        CancellationToken cancellationToken)
    {
        var title = request.Title?.Trim();

        if (string.IsNullOrWhiteSpace(title))
        {
            return (ChoreMutationResult.ValidationFailure("Title is required."), null);
        }

        if (!TryParseRecurrence(request.RecurrenceKind, out var kind))
        {
            return (ChoreMutationResult.ValidationFailure("Invalid recurrence kind."), null);
        }

        var memberName = await ResolveMemberNameAsync(householdId, request.AssignedMembershipId, cancellationToken);

        var chore = new Chore
        {
            HouseholdId = householdId,
            Title = title,
            Description = request.Description?.Trim(),
            AssignedMembershipId = request.AssignedMembershipId,
            AssignedMemberName = memberName,
            RecurrenceKind = kind,
            WeeklyDaysMask = request.WeeklyDaysMask & 0x7F,
            IsActive = true,
            CreatedAtUtc = clock.UtcNow
        };

        dbContext.Chores.Add(chore);
        await dbContext.SaveChangesAsync(cancellationToken);

        return (ChoreMutationResult.Success(), ToItem(chore));
    }

    public async Task<(ChoreMutationResult Result, ChoreItem? Item)> UpdateChoreAsync(
        Guid householdId,
        Guid choreId,
        UpdateChoreRequest request,
        CancellationToken cancellationToken)
    {
        var chore = await dbContext.Chores
            .SingleOrDefaultAsync(c => c.HouseholdId == householdId && c.Id == choreId, cancellationToken);

        if (chore is null)
        {
            return (ChoreMutationResult.NotFound(), null);
        }

        var title = request.Title?.Trim();

        if (string.IsNullOrWhiteSpace(title))
        {
            return (ChoreMutationResult.ValidationFailure("Title is required."), null);
        }

        if (!TryParseRecurrence(request.RecurrenceKind, out var kind))
        {
            return (ChoreMutationResult.ValidationFailure("Invalid recurrence kind."), null);
        }

        var memberName = await ResolveMemberNameAsync(householdId, request.AssignedMembershipId, cancellationToken);

        chore.Title = title;
        chore.Description = request.Description?.Trim();
        chore.AssignedMembershipId = request.AssignedMembershipId;
        chore.AssignedMemberName = memberName;
        chore.RecurrenceKind = kind;
        chore.WeeklyDaysMask = request.WeeklyDaysMask & 0x7F;
        chore.IsActive = request.IsActive;

        await dbContext.SaveChangesAsync(cancellationToken);

        return (ChoreMutationResult.Success(), ToItem(chore));
    }

    public async Task<ChoreMutationResult> DeleteChoreAsync(
        Guid householdId,
        Guid choreId,
        CancellationToken cancellationToken)
    {
        var chore = await dbContext.Chores
            .SingleOrDefaultAsync(c => c.HouseholdId == householdId && c.Id == choreId, cancellationToken);

        if (chore is null)
        {
            return ChoreMutationResult.NotFound();
        }

        dbContext.Chores.Remove(chore);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ChoreMutationResult.Deleted();
    }

    public async Task<ChoreListResponse> ListMyChoresAsync(
        Guid householdId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var membership = await dbContext.Memberships
            .Where(m => m.HouseholdId == householdId && m.UserId == userId)
            .Select(m => m.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var chores = await dbContext.Chores
            .Where(c => c.HouseholdId == householdId
                && c.IsActive
                && (c.AssignedMembershipId == null || c.AssignedMembershipId == membership))
            .OrderBy(c => c.Title)
            .Select(c => ToItem(c))
            .ToListAsync(cancellationToken);

        return new ChoreListResponse(chores);
    }

    public async Task<ChoreCompletionListResponse> ListRecentCompletionsAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var completions = await dbContext.ChoreCompletions
            .Where(c => c.HouseholdId == householdId)
            .OrderByDescending(c => c.CompletedAtUtc)
            .Take(30)
            .Select(c => new ChoreCompletionItem(
                c.Id,
                c.ChoreId,
                c.ChoreTitle,
                c.CompletedByMembershipId,
                c.CompletedByDisplayName,
                c.CompletedAtUtc,
                c.Notes))
            .ToListAsync(cancellationToken);

        return new ChoreCompletionListResponse(completions);
    }

    public async Task<(ChoreMutationResult Result, ChoreCompletionItem? Item)> CompleteChoreAsync(
        Guid householdId,
        Guid choreId,
        Guid userId,
        CompleteChoreRequest request,
        CancellationToken cancellationToken)
    {
        var chore = await dbContext.Chores
            .SingleOrDefaultAsync(c => c.HouseholdId == householdId && c.Id == choreId && c.IsActive, cancellationToken);

        if (chore is null)
        {
            return (ChoreMutationResult.NotFound(), null);
        }

        var membership = await dbContext.Memberships
            .Where(m => m.HouseholdId == householdId && m.UserId == userId)
            .Join(dbContext.Users, m => m.UserId, u => u.Id, (m, u) => new { MembershipId = m.Id, u.DisplayName })
            .FirstOrDefaultAsync(cancellationToken);

        var completion = new ChoreCompletion
        {
            HouseholdId = householdId,
            ChoreId = choreId,
            ChoreTitle = chore.Title,
            CompletedByMembershipId = membership?.MembershipId,
            CompletedByDisplayName = membership?.DisplayName ?? "Unknown",
            CompletedAtUtc = clock.UtcNow,
            Notes = request.Notes?.Trim()
        };

        dbContext.ChoreCompletions.Add(completion);
        await dbContext.SaveChangesAsync(cancellationToken);

        return (ChoreMutationResult.Completed(), new ChoreCompletionItem(
            completion.Id,
            completion.ChoreId,
            completion.ChoreTitle,
            completion.CompletedByMembershipId,
            completion.CompletedByDisplayName,
            completion.CompletedAtUtc,
            completion.Notes));
    }

    private async Task<string?> ResolveMemberNameAsync(
        Guid householdId,
        Guid? membershipId,
        CancellationToken cancellationToken)
    {
        if (membershipId is null)
        {
            return null;
        }

        return await dbContext.Memberships
            .Where(m => m.HouseholdId == householdId && m.Id == membershipId)
            .Join(dbContext.Users, m => m.UserId, u => u.Id, (_, u) => u.DisplayName)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static bool TryParseRecurrence(string? value, out ChoreRecurrenceKind kind)
    {
        kind = ChoreRecurrenceKind.None;

        if (value is null)
        {
            return true;
        }

        return Enum.TryParse(value, ignoreCase: true, out kind);
    }

    private static ChoreItem ToItem(Chore c) => new(
        c.Id,
        c.Title,
        c.Description,
        c.AssignedMembershipId,
        c.AssignedMemberName,
        c.RecurrenceKind.ToString(),
        c.WeeklyDaysMask,
        c.IsActive,
        c.CreatedAtUtc);
}
