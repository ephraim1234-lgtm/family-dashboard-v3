using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdHomeService
{
    Task<HouseholdHomeResponse> GetHomeAsync(
        Guid householdId,
        bool isOwner,
        CancellationToken cancellationToken);
}
