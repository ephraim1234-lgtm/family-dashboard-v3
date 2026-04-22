using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Households.Contracts;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class HouseholdMemberService(
    HouseholdOpsDbContext dbContext) : IHouseholdMemberService
{
    public async Task<HouseholdMemberListResponse> ListMembersAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await (
            from membership in dbContext.Memberships
            join user in dbContext.Users on membership.UserId equals user.Id
            where membership.HouseholdId == householdId
            orderby membership.CreatedAtUtc
            select new HouseholdMemberSummary(
                membership.Id.ToString(),
                user.Id.ToString(),
                user.Email,
                user.DisplayName,
                membership.Role.ToString(),
                membership.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new HouseholdMemberListResponse(items);
    }

    public async Task<HouseholdMemberMutationResult> RemoveMemberAsync(
        Guid householdId,
        Guid membershipId,
        CancellationToken cancellationToken)
    {
        var membership = await dbContext.Memberships
            .SingleOrDefaultAsync(
                m => m.HouseholdId == householdId && m.Id == membershipId,
                cancellationToken);

        if (membership is null)
        {
            return HouseholdMemberMutationResult.NotFound();
        }

        if (membership.Role == HouseholdRole.Owner)
        {
            var ownerCount = await dbContext.Memberships
                .CountAsync(
                    m => m.HouseholdId == householdId && m.Role == HouseholdRole.Owner,
                    cancellationToken);

            if (ownerCount <= 1)
            {
                return HouseholdMemberMutationResult.Conflict(
                    "Cannot remove the last owner of a household.");
            }
        }

        dbContext.Memberships.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        return HouseholdMemberMutationResult.Deleted();
    }
}
