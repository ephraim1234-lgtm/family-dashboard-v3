using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdContextService
{
    Task<HouseholdContextResponse?> GetCurrentAsync(CancellationToken cancellationToken);

    Task<HouseholdContextResponse?> RenameAsync(
        string name,
        CancellationToken cancellationToken);
}
