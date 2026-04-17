using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Households.Contracts;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class HouseholdContextService(
    CurrentHouseholdContext currentHouseholdContext,
    HouseholdOpsDbContext dbContext) : IHouseholdContextService
{
    public async Task<HouseholdContextResponse?> GetCurrentAsync(CancellationToken cancellationToken)
    {
        if (!currentHouseholdContext.IsAuthenticated
            || !Guid.TryParse(currentHouseholdContext.HouseholdId, out var householdId)
            || !Guid.TryParse(currentHouseholdContext.UserId, out var userId))
        {
            return null;
        }

        return await (
            from household in dbContext.Households
            join membership in dbContext.Memberships on household.Id equals membership.HouseholdId
            where household.Id == householdId && membership.UserId == userId
            select new HouseholdContextResponse(
                household.Id.ToString(),
                household.Name,
                membership.Role.ToString(),
                "Active"))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<HouseholdMemberListResponse> ListMembersAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await (
            from membership in dbContext.Memberships
            join user in dbContext.Users on membership.UserId equals user.Id
            where membership.HouseholdId == householdId
            orderby user.DisplayName
            select new HouseholdMemberSummary(
                user.Id.ToString(),
                user.DisplayName,
                user.Email,
                membership.Role.ToString()))
            .ToListAsync(cancellationToken);

        return new HouseholdMemberListResponse(items);
    }
}
