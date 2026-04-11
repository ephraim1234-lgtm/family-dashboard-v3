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
}
