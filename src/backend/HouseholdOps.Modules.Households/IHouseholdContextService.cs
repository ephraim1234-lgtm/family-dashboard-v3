using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdContextService
{
    Task<HouseholdContextResponse?> GetCurrentAsync(CancellationToken cancellationToken);

    Task<HouseholdMemberListResponse> ListMembersAsync(Guid householdId, CancellationToken cancellationToken);
}
