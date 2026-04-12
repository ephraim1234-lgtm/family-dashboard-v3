using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdTodayService
{
    Task<HouseholdTodayResponse> GetTodayAsync(Guid householdId, CancellationToken cancellationToken);
}
