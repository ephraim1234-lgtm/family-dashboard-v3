using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdContextService
{
    Task<HouseholdContextResponse?> GetCurrentAsync(CancellationToken cancellationToken);
}
